import fs from 'fs';
import path from 'path';

export async function processContentImages(html: string): Promise<string> {
    if (!html) return html;

    // Regex to match data:image src attributes
    // src="data:image/png;base64,..."
    const imgRegex = /src=["']data:image\/([a-zA-Z0-9\+\-\.]+);base64,([^"']*)["']/g;

    let match;
    let newHtml = html;

    // We can't simply replaceAll because we need to process each match
    // So we'll accumulate replacements
    const replacements: { match: string, url: string }[] = [];

    while ((match = imgRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        const rawExt = match[1];
        const base64Data = match[2];

        try {
            let ext = (rawExt || 'png').toLowerCase();
            if (ext === 'svg+xml') ext = 'svg';
            if (ext === 'jpeg') ext = 'jpg';

            // Prepare directory
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const relativeDir = `/uploads/questions/${year}/${month}/${day}`;
            const uploadDir = path.join(process.cwd(), 'public', relativeDir);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Save file
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const filePath = path.join(uploadDir, fileName);
            const buffer = Buffer.from(base64Data, 'base64');

            await fs.promises.writeFile(filePath, buffer);

            // Create public URL
            const publicUrl = `${relativeDir}/${fileName}`;

            replacements.push({
                match: fullMatch,
                url: `src="${publicUrl}"`
            });

        } catch (error) {
            console.error("Error processing image:", error);
        }
    }

    // Apply replacements
    replacements.forEach(({ match, url }) => {
        newHtml = newHtml.replace(match, url);
    });

    return newHtml;
}

/**
 * Processes base64 images within all fields of question content
 * (question text, MC options, matching leftItems, and matching rightItems).
 */
export async function processQuestionImages<T = any>(content: T): Promise<T> {
    if (!content || typeof content !== 'object') return content;
    const c = content as any;

    if (c.question && typeof c.question === 'string') {
        c.question = await processContentImages(c.question);
    }

    if (Array.isArray(c.options)) {
        for (let j = 0; j < c.options.length; j++) {
            if (typeof c.options[j] === 'string') {
                c.options[j] = await processContentImages(c.options[j]);
            } else if (c.options[j] && typeof c.options[j] === 'object' && c.options[j].text) {
                c.options[j].text = await processContentImages(c.options[j].text);
            }
        }
    }

    if (Array.isArray(c.leftItems)) {
        for (let j = 0; j < c.leftItems.length; j++) {
            if (typeof c.leftItems[j] === 'string') {
                c.leftItems[j] = await processContentImages(c.leftItems[j]);
            } else if (c.leftItems[j] && typeof c.leftItems[j] === 'object' && c.leftItems[j].text) {
                c.leftItems[j].text = await processContentImages(c.leftItems[j].text);
            }
        }
    }

    if (Array.isArray(c.rightItems)) {
        for (let j = 0; j < c.rightItems.length; j++) {
            if (typeof c.rightItems[j] === 'string') {
                c.rightItems[j] = await processContentImages(c.rightItems[j]);
            } else if (c.rightItems[j] && typeof c.rightItems[j] === 'object' && c.rightItems[j].text) {
                c.rightItems[j].text = await processContentImages(c.rightItems[j].text);
            }
        }
    }

    return c;
}

/**
 * Deletes all physical images referenced in question content.
 * Handles both object structure and serialized/HTML string.
 */
export function deleteQuestionImages(content: any): void {
    if (!content) return;
    try {
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        // Match relative upload paths: /uploads/questions/... or /uploads/...
        const regex = /\/uploads\/[a-zA-Z0-9_\-\.\/]+/g;
        const matches = text.match(regex);
        if (!matches) return;

        const uniquePaths = Array.from(new Set(matches));
        for (const relativePath of uniquePaths) {
            // Guard against directory traversal or invalid paths
            if (relativePath.includes('..')) continue;

            const fullPath = path.join(process.cwd(), 'public', relativePath.replace(/^\//, ''));
            if (fs.existsSync(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                    console.log(`[deleteQuestionImages] Deleted image file: ${fullPath}`);
                } catch (e) {
                    console.error(`[deleteQuestionImages] Failed to delete image: ${fullPath}`, e);
                }
            }
        }
    } catch (error) {
        console.error("Error in deleteQuestionImages:", error);
    }
}


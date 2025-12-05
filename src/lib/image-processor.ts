import fs from 'fs';
import path from 'path';

export async function processContentImages(html: string): Promise<string> {
    if (!html) return html;

    // Regex to match data:image src attributes
    // src="data:image/png;base64,..."
    const imgRegex = /src=["']data:image\/([a-zA-Z]*);base64,([^"']*)["']/g;

    let match;
    let newHtml = html;

    // We can't simply replaceAll because we need to process each match
    // So we'll accumulate replacements
    const replacements: { match: string, url: string }[] = [];

    while ((match = imgRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        const ext = match[1];
        const base64Data = match[2];

        try {
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

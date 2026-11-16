import JSZip from "jszip";
import omml2mathml from "omml2mathml";
import { MathMLToLaTeX } from "mathml-to-latex";

const MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/**
 * Clean converted LaTeX string for KaTeX compatibility
 */
function cleanLatexForKaTeX(latex: string): string {
    return latex
        .replace(/&amp;nbsp;|&nbsp;/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\\sqrt\[\]\{/g, "\\sqrt{")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Flexible element finder that works across browser DOM, xmldom, and happy-dom/jsdom
 */
function getElementsByTagNameFlexible(parent: Document | Element, ns: string, localName: string): Element[] {
    try {
        const list = parent.getElementsByTagNameNS(ns, localName);
        if (list && list.length > 0) {
            return Array.from(list) as Element[];
        }
    } catch {
        // ignore
    }

    const prefixes = ["m:", "w:", ""];
    for (const prefix of prefixes) {
        try {
            const list = parent.getElementsByTagName(prefix + localName);
            if (list && list.length > 0) {
                return Array.from(list) as Element[];
            }
        } catch {
            // ignore
        }
    }

    return [];
}

/**
 * Fallback to extract raw text characters from OMML if conversion fails
 */
function extractOmmlTextFallback(oMathNode: Element): string {
    const textNodes = getElementsByTagNameFlexible(oMathNode, MATH_NS, "t");
    const texts: string[] = [];
    for (let i = 0; i < textNodes.length; i++) {
        const val = textNodes[i].textContent;
        if (val) texts.push(val);
    }
    return texts.join(" ").trim();
}

/**
 * Convert a single OMML Element (<m:oMath>) to a LaTeX string
 */
function convertOmmlToLatex(oMathNode: Element): string | null {
    try {
        const mathmlEl = omml2mathml(oMathNode);
        if (!mathmlEl) {
            const fallback = extractOmmlTextFallback(oMathNode);
            return fallback || null;
        }

        const mathmlStr = mathmlEl.outerHTML;
        if (!mathmlStr) {
            const fallback = extractOmmlTextFallback(oMathNode);
            return fallback || null;
        }

        const rawLatex = MathMLToLaTeX.convert(mathmlStr);

        if (!rawLatex || !rawLatex.trim()) {
            return extractOmmlTextFallback(oMathNode) || null;
        }

        return cleanLatexForKaTeX(rawLatex);
    } catch (err) {
        console.warn("[docx-math-preprocessor] Failed to convert OMML to LaTeX, using fallback text:", err);
        return extractOmmlTextFallback(oMathNode) || null;
    }
}

/**
 * Pre-processes a Word DOCX ArrayBuffer by converting native Word OMML equations
 * (<m:oMath> and <m:oMathPara>) into LaTeX-wrapped Word text runs (<w:r><w:t>$latex$</w:t></w:r>).
 *
 * This allows Mammoth to parse tables, columns, and text normally without stripping math equations.
 */
export async function preprocessDocxEquations(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const docXmlFile = zip.file("word/document.xml");

        if (!docXmlFile) {
            return arrayBuffer;
        }

        const xmlText = await docXmlFile.async("string");

        // Fast-path: If document doesn't contain any OMML math tags, return original buffer
        if (!xmlText.includes("<m:oMath") && !xmlText.includes("<m:oMathPara") && !xmlText.includes(":oMath")) {
            return arrayBuffer;
        }

        const parser = typeof window !== "undefined" && window.DOMParser
            ? new window.DOMParser()
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            : new (require("@xmldom/xmldom").DOMParser)();

        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        // 1. Process block equation paragraphs (<m:oMathPara>) first
        const oMathParas = getElementsByTagNameFlexible(xmlDoc, MATH_NS, "oMathPara");
        for (const para of oMathParas) {
            const childMaths = getElementsByTagNameFlexible(para, MATH_NS, "oMath");
            const latexPieces: string[] = [];

            for (const childMath of childMaths) {
                const latex = convertOmmlToLatex(childMath);
                if (latex) {
                    latexPieces.push(latex);
                }
            }

            if (latexPieces.length > 0) {
                const combined = latexPieces.join(" ");
                const wRun = xmlDoc.createElementNS(WORD_NS, "w:r");
                const wText = xmlDoc.createElementNS(WORD_NS, "w:t");
                wText.setAttribute("xml:space", "preserve");
                wText.textContent = ` $$${combined}$$ `;
                wRun.appendChild(wText);

                if (para.parentNode) {
                    para.parentNode.replaceChild(wRun, para);
                }
            }
        }

        // 2. Process all remaining inline equations (<m:oMath>)
        const inlineMaths = getElementsByTagNameFlexible(xmlDoc, MATH_NS, "oMath");
        for (const oMath of inlineMaths) {
            const latex = convertOmmlToLatex(oMath);
            if (latex) {
                const wRun = xmlDoc.createElementNS(WORD_NS, "w:r");
                const wText = xmlDoc.createElementNS(WORD_NS, "w:t");
                wText.setAttribute("xml:space", "preserve");
                wText.textContent = ` $${latex}$ `;
                wRun.appendChild(wText);

                if (oMath.parentNode) {
                    oMath.parentNode.replaceChild(wRun, oMath);
                }
            }
        }

        // Serialize updated document.xml
        const serializer = typeof window !== "undefined" && window.XMLSerializer
            ? new window.XMLSerializer()
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            : new (require("@xmldom/xmldom").XMLSerializer)();

        const updatedXml = serializer.serializeToString(xmlDoc);
        zip.file("word/document.xml", updatedXml);

        return await zip.generateAsync({ type: "arraybuffer" });
    } catch (error) {
        console.error("[docx-math-preprocessor] Error preprocessing docx equations, continuing with original buffer:", error);
        return arrayBuffer;
    }
}

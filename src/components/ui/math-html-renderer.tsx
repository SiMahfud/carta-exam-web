"use client";

import { useEffect, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathHtmlRendererProps {
    html: string;
    className?: string;
}

/**
 * Clean and fix common LaTeX syntax glitches before passing to KaTeX
 */
function sanitizeLatexExpression(expr: string): string {
    let clean = expr.trim();
    // 1. Fix Form Feed character artifact (\f in \frac)
    clean = clean.replace(/\x0crac/g, '\\frac');
    // 2. Fix double backslashes before LaTeX command names (e.g. \\sin -> \sin, \\circ -> \circ)
    clean = clean.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
    // 3. Fix missing backslash on known keywords like frac{ or sqrt{
    clean = clean.replace(/(?<!\\)frac\{/g, '\\frac{');
    clean = clean.replace(/(?<!\\)sqrt\{/g, '\\sqrt{');
    // 4. Fix frac12 or frac 1 2 without braces if present (e.g. frac12 -> \frac{1}{2})
    clean = clean.replace(/(?<!\\)frac\s*([0-9a-zA-Z])\s*([0-9a-zA-Z])/g, '\\frac{$1}{$2}');
    return clean;
}

export function MathHtmlRenderer({ html, className }: MathHtmlRendererProps) {
    const [processedHtml, setProcessedHtml] = useState(html);

    useEffect(() => {
        if (!html) {
            setProcessedHtml("");
            return;
        }

        // Process in a detached DOM element to avoid React reconciliation conflicts
        const div = document.createElement("div");
        div.innerHTML = html;

        const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
        const nodesToReplace: { node: Text, replacement: DocumentFragment }[] = [];

        let node: Node | null;
        while (node = walker.nextNode()) {
            let text = node.nodeValue;
            if (!text) continue;

            // If text contains raw LaTeX commands or double backslashes without '$', auto-wrap for KaTeX
            // e.g. "\\sin 30^\\circ" or "\frac{1}{2}" or "x^2 + y^2"
            if (!text.includes('$')) {
                const hasLatex = /\\{1,2}(?:sin|cos|tan|cot|sec|csc|log|ln|lim|frac|sqrt|alpha|beta|gamma|theta|lambda|pi|mu|sigma|omega|Delta|phi|circ|degree|pm|times|div|leq|geq|neq|approx|to|rightarrow|leftarrow|int|sum|prod)\b|(?<!\\)frac\{|(?<!\\)sqrt\{/i.test(text);
                if (hasLatex) {
                    text = `$${text.trim()}$`;
                } else {
                    continue;
                }
            }

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let processed = false;

            // Regex matches:
            // 1. $$...$$ (Display Mode)
            // 2. $...$ (Inline Mode)
            const regex = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;

            let match;
            while ((match = regex.exec(text)) !== null) {
                processed = true;
                // Add text before match
                const before = text.slice(lastIndex, match.index);
                if (before) fragment.appendChild(document.createTextNode(before));

                const displayMath = match[1];
                const inlineMath = match[2];

                const rawExpr = displayMath || inlineMath;
                const isDisplay = !!displayMath;

                const mathExpression = sanitizeLatexExpression(rawExpr);

                const katexSpan = document.createElement('span');
                try {
                    katex.render(mathExpression, katexSpan, {
                        throwOnError: false,
                        displayMode: isDisplay,
                        strict: false,
                        trust: true
                    });
                } catch (e) {
                    console.error("KaTeX error:", e);
                    katexSpan.textContent = match[0];
                }
                fragment.appendChild(katexSpan);

                lastIndex = regex.lastIndex;
            }

            if (processed) {
                const remaining = text.slice(lastIndex);
                if (remaining) fragment.appendChild(document.createTextNode(remaining));
                nodesToReplace.push({ node: node as Text, replacement: fragment });
            }
        }

        // Apply replacements to the detached DOM
        nodesToReplace.forEach(({ node, replacement }) => {
            node.parentNode?.replaceChild(replacement, node);
        });

        setProcessedHtml(div.innerHTML);

    }, [html]);

    return (
        <div
            className={`prose dark:prose-invert max-w-none ${className || ""}`}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
    );
}

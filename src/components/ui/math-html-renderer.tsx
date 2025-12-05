"use client";

import { useEffect, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathHtmlRendererProps {
    html: string;
    className?: string;
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
            const text = node.nodeValue;
            if (!text) continue;

            // Check for delimiters
            if (!text.includes('$')) continue;

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

                const mathExpression = displayMath || inlineMath;
                const isDisplay = !!displayMath;

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

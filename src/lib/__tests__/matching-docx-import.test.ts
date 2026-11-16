import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';

// Function simulating the parsing logic in ImportQuestionsDialog
function parseQuestionsFromHtml(html: string) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const rows = Array.from(doc.querySelectorAll("table tr"));

    const allQuestions: any[] = [];
    let i = 0;

    const processDataRow = (cells: NodeList, q: any, startIndex: number, jenis: string) => {
        const cellArray = Array.from(cells) as HTMLElement[];

        // Matching (Type 3)
        if (jenis === "3") {
            const getTxt = (idx: number) => cellArray[startIndex + idx]?.textContent?.trim() || "";
            const getHtml = (idx: number) => {
                const cell = cellArray[startIndex + idx];
                if (!cell) return "";
                const hasImg = cell.querySelector("img") !== null;
                const hasText = (cell.textContent || "").replace(/\u00a0/g, ' ').trim().length > 0;
                if (hasImg || hasText) {
                    return cell.innerHTML.trim();
                }
                return "";
            };

            const kdKiri = getTxt(0);
            const txtKiri = getHtml(1);
            const kdKanan = getTxt(2);
            const txtKanan = getHtml(3);
            const keyL = getTxt(4);
            const keyR = getTxt(5);

            if (kdKiri && txtKiri) q.matching.left.push({ id: kdKiri, text: txtKiri });
            if (kdKanan && txtKanan) q.matching.right.push({ id: kdKanan, text: txtKanan });

            if (keyL && keyR) {
                const rightKeys = keyR.split(',').map(s => s.trim());
                rightKeys.forEach(rKey => {
                    q.matching.pairs.push({ left: keyL, right: rKey });
                });
            }
        }
    };

    while (i < rows.length) {
        const row = rows[i];
        const cells = row.querySelectorAll("td");

        if (cells.length < 2) {
            i++;
            continue;
        }

        const colNo = cells[0].textContent?.trim() || "";

        if (colNo && !isNaN(parseInt(colNo))) {
            const rowspanAttr = cells[0].getAttribute("rowspan");
            const totalRows = rowspanAttr ? parseInt(rowspanAttr) : 1;
            const jenis = cells.length > 2 ? cells[2].textContent?.trim() || "1" : "1";

            const q: any = {
                metadata: { originalNo: colNo, originalType: jenis },
                rawQuestion: cells[1].innerHTML,
                options: [],
                answers: [],
                matching: { left: [], right: [], pairs: [] }
            };

            processDataRow(cells, q, 3, jenis);

            if (totalRows > 1) {
                for (let j = 1; j < totalRows; j++) {
                    if ((i + j) < rows.length) {
                        const childRow = rows[i + j];
                        const childCells = childRow.querySelectorAll("td");
                        processDataRow(childCells, q, 0, jenis);
                    }
                }
                i += (totalRows - 1);
            }

            if (jenis === "3") {
                const leftItems = q.matching.left.map((item: any) => ({
                    id: `id-left-${item.id}`,
                    text: item.text,
                    originalId: item.id
                }));
                const rightItems = q.matching.right.map((item: any) => ({
                    id: `id-right-${item.id}`,
                    text: item.text,
                    originalId: item.id
                }));
                const matches = q.matching.pairs.map((pair: any) => {
                    const left = leftItems.find((l: any) => String(l.originalId).trim().toLowerCase() === String(pair.left).trim().toLowerCase());
                    const right = rightItems.find((r: any) => String(r.originalId).trim().toLowerCase() === String(pair.right).trim().toLowerCase());
                    if (left && right) return { leftId: left.id, rightId: right.id };
                    return null;
                }).filter(Boolean);

                allQuestions.push({
                    type: "matching",
                    content: {
                        question: q.rawQuestion,
                        leftItems,
                        rightItems,
                    },
                    answerKey: { matches }
                });
            }
        }
        i++;
    }

    return allQuestions;
}

describe('Matching Questions DOCX HTML Import', () => {
    it('should preserve images in left and right items of matching questions', () => {
        const dummyBase64_1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const dummyBase64_2 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

        const mockMammothHtml = `
            <table>
                <tr>
                    <td rowspan="2"><p>1</p></td>
                    <td rowspan="2"><p>Jodohkan gambar dengan keterangannya</p></td>
                    <td rowspan="2"><p>3</p></td>
                    <td><p>1</p></td>
                    <td><p><img src="${dummyBase64_1}" alt="Left Image 1" /></p></td>
                    <td><p>A</p></td>
                    <td><p>Keterangan A</p></td>
                    <td><p>1</p></td>
                    <td><p>A</p></td>
                </tr>
                <tr>
                    <td><p>2</p></td>
                    <td><p>Pernyataan 2 dengan teks</p></td>
                    <td><p>B</p></td>
                    <td><p><img src="${dummyBase64_2}" alt="Right Image B" /></p></td>
                    <td><p>2</p></td>
                    <td><p>B</p></td>
                </tr>
            </table>
        `;

        const parsed = parseQuestionsFromHtml(mockMammothHtml);

        expect(parsed).toHaveLength(1);
        const q = parsed[0];
        expect(q.type).toBe('matching');

        // Check leftItems
        expect(q.content.leftItems).toHaveLength(2);
        expect(q.content.leftItems[0].text).toContain(dummyBase64_1);
        expect(q.content.leftItems[0].text).toContain('<img');
        expect(q.content.leftItems[1].text).toContain('Pernyataan 2 dengan teks');

        // Check rightItems
        expect(q.content.rightItems).toHaveLength(2);
        expect(q.content.rightItems[0].text).toContain('Keterangan A');
        expect(q.content.rightItems[1].text).toContain(dummyBase64_2);
        expect(q.content.rightItems[1].text).toContain('<img');

        // Check matches
        expect(q.answerKey.matches).toHaveLength(2);
        expect(q.answerKey.matches[0]).toEqual({
            leftId: 'id-left-1',
            rightId: 'id-right-A'
        });
        expect(q.answerKey.matches[1]).toEqual({
            leftId: 'id-left-2',
            rightId: 'id-right-B'
        });
    });
});

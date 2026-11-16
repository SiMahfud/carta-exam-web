import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import mammoth from "mammoth";
import { preprocessDocxEquations } from "../docx-math-preprocessor";

describe("preprocessDocxEquations", () => {
    async function createTestDocx(documentXml: string): Promise<ArrayBuffer> {
        const zip = new JSZip();
        zip.file("word/document.xml", documentXml);
        zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
        zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
        return await zip.generateAsync({ type: "arraybuffer" });
    }

    it("should return the original buffer if document.xml has no math tags", async () => {
        const plainXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Halo Dunia</w:t></w:r></w:p>
  </w:body>
</w:document>`;
        const inputBuffer = await createTestDocx(plainXml);
        const resultBuffer = await preprocessDocxEquations(inputBuffer);
        expect(resultBuffer).toBe(inputBuffer);
    });

    it("should convert inline <m:oMath> equations into LaTeX $...$", async () => {
        const mathXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <w:r><w:t>Nilai dari </w:t></w:r>
      <m:oMath>
        <m:f>
          <m:num><m:r><m:t>1</m:t></m:r></m:num>
          <m:den><m:r><m:t>2</m:t></m:r></m:den>
        </m:f>
      </m:oMath>
      <w:r><w:t> adalah...</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

        const inputBuffer = await createTestDocx(mathXml);
        const processedBuffer = await preprocessDocxEquations(inputBuffer);

        const mammothResult = await mammoth.convertToHtml({
            buffer: Buffer.from(processedBuffer),
            arrayBuffer: processedBuffer
        });
        expect(mammothResult.value).toContain("$\\frac{1}{2}$");
        expect(mammothResult.value).toContain("Nilai dari");
        expect(mammothResult.value).toContain("adalah...");
    });

    it("should convert block <m:oMathPara> equations into LaTeX $$...$$", async () => {
        const mathXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <m:oMathPara>
        <m:oMath>
          <m:sSup>
            <m:e><m:r><m:t>x</m:t></m:r></m:e>
            <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
          </m:sSup>
        </m:oMath>
      </m:oMathPara>
    </w:p>
  </w:body>
</w:document>`;

        const inputBuffer = await createTestDocx(mathXml);
        const processedBuffer = await preprocessDocxEquations(inputBuffer);

        const mammothResult = await mammoth.convertToHtml({
            buffer: Buffer.from(processedBuffer),
            arrayBuffer: processedBuffer
        });
        expect(mammothResult.value).toContain("$$x^{2}$$");
    });

    it("should handle square roots and complex equations inside tables", async () => {
        const tableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc>
          <w:p>
            <w:r><w:t>Berapakah akar dari </w:t></w:r>
            <m:oMath>
              <m:rad>
                <m:radPr><m:degHide m:val="1"/></m:radPr>
                <m:deg/>
                <m:e><m:r><m:t>16</m:t></m:r></m:e>
              </m:rad>
            </m:oMath>
            <w:r><w:t>?</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

        const inputBuffer = await createTestDocx(tableXml);
        const processedBuffer = await preprocessDocxEquations(inputBuffer);

        const mammothResult = await mammoth.convertToHtml({
            buffer: Buffer.from(processedBuffer),
            arrayBuffer: processedBuffer
        });
        expect(mammothResult.value).toContain("$\\sqrt{16}$");
        expect(mammothResult.value).toContain("<table>");
        expect(mammothResult.value).toContain("<td><p>1</p></td>");
    });

    it("should convert quadratic formula with fractions, roots, plus-minus and powers", async () => {
        const quadraticXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <m:oMath>
        <m:r><m:t>x</m:t></m:r>
        <m:r><m:t>=</m:t></m:r>
        <m:f>
          <m:num>
            <m:r><m:t>-</m:t></m:r>
            <m:r><m:t>b</m:t></m:r>
            <m:r><m:t>&#177;</m:t></m:r>
            <m:rad>
              <m:radPr><m:degHide m:val="1"/></m:radPr>
              <m:deg/>
              <m:e>
                <m:sSup>
                  <m:e><m:r><m:t>b</m:t></m:r></m:e>
                  <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
                </m:sSup>
                <m:r><m:t>-4ac</m:t></m:r>
              </m:e>
            </m:rad>
          </m:num>
          <m:den>
            <m:r><m:t>2a</m:t></m:r>
          </m:den>
        </m:f>
      </m:oMath>
    </w:p>
  </w:body>
</w:document>`;

        const inputBuffer = await createTestDocx(quadraticXml);
        const processedBuffer = await preprocessDocxEquations(inputBuffer);

        const mammothResult = await mammoth.convertToHtml({
            buffer: Buffer.from(processedBuffer),
            arrayBuffer: processedBuffer
        });
        expect(mammothResult.value).toContain("\\frac");
        expect(mammothResult.value).toContain("\\sqrt");
        expect(mammothResult.value).toContain("\\pm");
    });
});

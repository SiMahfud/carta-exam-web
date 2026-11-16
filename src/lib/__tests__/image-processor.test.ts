import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteQuestionImages, processContentImages, processQuestionImages } from '../image-processor';
import fs from 'fs';
import path from 'path';

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        default: {
            ...actual,
            existsSync: vi.fn(),
            mkdirSync: vi.fn(),
            unlinkSync: vi.fn(),
            promises: {
                writeFile: vi.fn().mockResolvedValue(undefined),
            },
        },
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        unlinkSync: vi.fn(),
        promises: {
            writeFile: vi.fn().mockResolvedValue(undefined),
        },
    };
});

describe('deleteQuestionImages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should do nothing if content is empty or null', () => {
        deleteQuestionImages(null);
        deleteQuestionImages(undefined);
        deleteQuestionImages('');
        expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should find and delete images from string content', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        const html = '<p>Test question</p><img src="/uploads/questions/2026/11/10/test-uuid.png" />';
        deleteQuestionImages(html);

        expect(fs.existsSync).toHaveBeenCalledWith(
            path.join(process.cwd(), 'public', 'uploads', 'questions', '2026', '11', '10', 'test-uuid.png')
        );
        expect(fs.unlinkSync).toHaveBeenCalledWith(
            path.join(process.cwd(), 'public', 'uploads', 'questions', '2026', '11', '10', 'test-uuid.png')
        );
    });

    it('should find and delete images from object content', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        const content = {
            question: '<p>Question with <img src="/uploads/questions/2026/11/10/q.png"></p>',
            options: [
                { text: '<img src="/uploads/questions/2026/11/10/opt-a.png">' },
                'plain text option'
            ]
        };

        deleteQuestionImages(content);

        expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    it('should ignore directory traversal patterns', () => {
        const html = '<img src="/uploads/../secret.txt">';
        deleteQuestionImages(html);

        expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
});

describe('processContentImages & processQuestionImages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('should process base64 images into upload paths in HTML string', async () => {
        const dummyBase64 = Buffer.from('fake-image-data').toString('base64');
        const inputHtml = `<p>Test</p><img src="data:image/png;base64,${dummyBase64}" />`;

        const result = await processContentImages(inputHtml);

        expect(result).not.toContain('data:image/png;base64');
        expect(result).toMatch(/\/uploads\/questions\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9-]+\.png/);
        expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should process base64 images in matching leftItems and rightItems', async () => {
        const dummyBase64 = Buffer.from('fake-matching-image').toString('base64');
        const content = {
            question: '<p>Matching Question</p>',
            leftItems: [
                { id: '1', text: `<p>Left item <img src="data:image/jpeg;base64,${dummyBase64}" /></p>` },
                { id: '2', text: 'Text only item' }
            ],
            rightItems: [
                { id: 'a', text: `<img src="data:image/png;base64,${dummyBase64}" />` },
                { id: 'b', text: 'Another text item' }
            ]
        };

        const result = await processQuestionImages(content);

        expect(result.leftItems[0].text).not.toContain('data:image/jpeg;base64');
        expect(result.leftItems[0].text).toMatch(/\/uploads\/questions\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9-]+\.jpg/);
        expect(result.rightItems[0].text).not.toContain('data:image/png;base64');
        expect(result.rightItems[0].text).toMatch(/\/uploads\/questions\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9-]+\.png/);
        expect(result.leftItems[1].text).toBe('Text only item');
        expect(result.rightItems[1].text).toBe('Another text item');
    });
});


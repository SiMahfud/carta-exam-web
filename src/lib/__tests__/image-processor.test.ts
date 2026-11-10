import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteQuestionImages } from '../image-processor';
import fs from 'fs';
import path from 'path';

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        default: {
            ...actual,
            existsSync: vi.fn(),
            unlinkSync: vi.fn(),
        },
        existsSync: vi.fn(),
        unlinkSync: vi.fn(),
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


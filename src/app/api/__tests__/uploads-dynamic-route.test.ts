import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/uploads/[...path]/route';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        default: {
            ...actual,
            existsSync: vi.fn(),
            promises: {
                ...actual.promises,
                stat: vi.fn(),
                readFile: vi.fn(),
            },
        },
        existsSync: vi.fn(),
        promises: {
            ...actual.promises,
            stat: vi.fn(),
            readFile: vi.fn(),
        },
    };
});

describe('GET /uploads/[...path]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 404 if path is missing or empty', async () => {
        const req = new NextRequest('http://localhost:3333/uploads');
        const res = await GET(req, { params: Promise.resolve({ path: [] }) });
        expect(res.status).toBe(404);
    });

    it('should return 403 if directory traversal is attempted', async () => {
        const req = new NextRequest('http://localhost:3333/uploads/../secret.txt');
        const res = await GET(req, { params: Promise.resolve({ path: ['..', 'secret.txt'] }) });
        expect(res.status).toBe(403);
    });

    it('should return 404 if file does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const req = new NextRequest('http://localhost:3333/uploads/questions/not-found.png');
        const res = await GET(req, { params: Promise.resolve({ path: ['questions', 'not-found.png'] }) });
        expect(res.status).toBe(404);
    });

    it('should serve file with proper headers when it exists', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.promises.stat).mockResolvedValue({
            isFile: () => true,
            size: 1024,
        } as any);
        vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('fake image data') as any);

        const req = new NextRequest('http://localhost:3333/uploads/questions/2026/11/10/img.png');
        const res = await GET(req, { params: Promise.resolve({ path: ['questions', '2026', '11', '10', 'img.png'] }) });

        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('image/png');
        expect(res.headers.get('Cache-Control')).toContain('public');
    });
});


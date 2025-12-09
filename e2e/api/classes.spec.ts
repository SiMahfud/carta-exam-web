
import { test, expect } from '@playwright/test';

test.describe('API: Classes', () => {

    test('GET /api/classes should return list of classes', async ({ request }) => {
        const response = await request.get('/api/classes');
        expect(response.status()).toBe(200);

        const body = await response.json();
        // Standardized API response format { data: [...] }
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBeTruthy();

        // Check if seeded class exists (from seed-test.ts)
        const seededClass = body.data.find((c: any) => c.name === 'Class 10 A');
        expect(seededClass).toBeDefined();
    });

    test('POST /api/classes should create a new class', async ({ request }) => {
        // Needs proper payload
        const newClass = {
            name: "API Test Class",
            grade: 11,
            academicYear: "2025/2026"
            // teacherId is optional or can be null
        };

        const response = await request.post('/api/classes', {
            data: newClass
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.data).toBeDefined();
        expect(body.data.name).toBe("API Test Class");
    });
});

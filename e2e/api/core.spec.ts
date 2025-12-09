
import { test, expect } from '@playwright/test';

test.describe('API: Core Resources', () => {

    test('GET /api/users should return list of users', async ({ request }) => {
        const response = await request.get('/api/users');
        expect(response.status()).toBe(200);

        const body = await response.json();
        // Users API returns raw array currently (not standardized)
        expect(Array.isArray(body)).toBeTruthy();

        // Check for seeded admin
        const adminUser = body.find((u: any) => u.username === 'admin');
        expect(adminUser).toBeDefined();
    });

    test('GET /api/exam-templates should return templates', async ({ request }) => {
        const response = await request.get('/api/exam-templates');
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('data');
        expect(Array.isArray(body.data)).toBeTruthy();

        // Check for seeded template
        const seededTemplate = body.data.find((t: any) => t.name === 'Math Midterm Exam');
        expect(seededTemplate).toBeDefined();
    });
});

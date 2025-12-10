
import { test, expect } from './auth.fixture';

test.describe('Admin Flow', () => {
    test('should access admin dashboard', async ({ adminPage }) => {
        // Already authenticated as admin via fixture
        // Dashboard title is h2
        await expect(adminPage.locator('h2:has-text("Dashboard")')).toBeVisible();
    });

    test('should view seeded students', async ({ adminPage }) => {
        await adminPage.goto('/admin/users?role=student');

        // Check for seeded student
        await expect(adminPage.locator('text=Siswa Demo')).toBeVisible();
    });

    test('should view question banks', async ({ adminPage }) => {
        await adminPage.goto('/admin/question-banks');

        // Verify seeded question bank
        await expect(adminPage.locator('text=Math Basic Questions')).toBeVisible();
    });

    test('should view exam templates', async ({ adminPage }) => {
        await adminPage.goto('/admin/exam-templates');

        // Verify seeded template
        await expect(adminPage.locator('text=Math Midterm Exam')).toBeVisible();
    });
});

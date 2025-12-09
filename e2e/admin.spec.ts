
import { test, expect } from './auth.fixture';

test.describe('Admin Flow', () => {
    test('should access admin dashboard', async ({ adminPage }) => {
        // Already authenticated as admin via fixture
        await expect(adminPage.locator('h1')).toContainText(/Welcome|Selamat|Admin/i);
    });

    test('should view seeded students', async ({ adminPage }) => {
        await adminPage.goto('/admin/users?role=student');

        // Wait for table to load
        await expect(adminPage.locator('table')).toBeVisible();

        // Check for seeded student
        await expect(adminPage.locator('body')).toContainText('Test Student');
    });

    test('should view question banks', async ({ adminPage }) => {
        await adminPage.goto('/admin/question-banks');

        // Verify seeded question bank
        await expect(adminPage.locator('body')).toContainText('Math Basic Questions');
    });

    test('should view exam templates', async ({ adminPage }) => {
        await adminPage.goto('/admin/exam-templates');

        // Verify seeded template
        await expect(adminPage.locator('body')).toContainText('Math Midterm Exam');
    });
});

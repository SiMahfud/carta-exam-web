
import { test, expect } from './auth.fixture';

test.describe('Admin Flow', () => {
    test('should access admin dashboard', async ({ adminPage }) => {
        // Already authenticated as admin via fixture
        // Dashboard title is h2 in layout (main content)
        await expect(adminPage.locator('main h2')).toContainText(/Dashboard/i);
    });

    test('should view seeded students', async ({ adminPage }) => {
        await adminPage.goto('/admin/users?role=student');

        // Check for seeded student - Uses Card Grid, not Table
        await expect(adminPage.locator('body')).toContainText('Siswa Demo');
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

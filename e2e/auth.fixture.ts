
import { test as base, Page, expect } from '@playwright/test';

type AuthFixtures = {
    adminPage: Page;
    teacherPage: Page;
    studentPage: Page;
};

export const test = base.extend<AuthFixtures>({
    adminPage: async ({ page }, use) => {
        // Navigate to login
        await page.goto('/login');

        // Perform login as admin
        await page.fill('input#username', 'admin');
        await page.fill('input#password', 'password123');
        await page.click('button[type="submit"]');

        // Wait for navigation and verify admin dashboard
        await expect(page).toHaveURL(/\/admin/);
        await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

        // Use the authenticated page
        await use(page);
    },

    teacherPage: async ({ page }, use) => {
        // Navigate to login
        await page.goto('/login');

        // Perform login as teacher
        await page.fill('input#username', 'teacher');
        await page.fill('input#password', 'password123');
        await page.click('button[type="submit"]');

        // Wait for navigation (teacher sees admin view too currently)
        await expect(page).toHaveURL(/\/admin/);

        // Use the authenticated page
        await use(page);
    },

    studentPage: async ({ page }, use) => {
        // Navigate to login
        await page.goto('/login');

        // Perform login as student (SISWA)
        await page.fill('input#username', 'siswa');
        await page.fill('input#password', 'siswa123');
        await page.click('button[type="submit"]');

        // Wait for navigation
        await expect(page).toHaveURL(/\/student/);

        // Use the authenticated page
        await use(page);
    },
});

export { expect } from '@playwright/test';

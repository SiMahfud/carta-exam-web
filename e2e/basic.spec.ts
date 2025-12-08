import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
    test('should display the landing page', async ({ page }) => {
        await page.goto('/')

        // Check page loads
        await expect(page.locator('body')).toBeVisible()
    })

    test('should have navigation to login', async ({ page }) => {
        await page.goto('/')

        // Look for login link/button (case-insensitive)
        const loginElement = page.getByRole('link', { name: /login|masuk|sign in/i }).first()
        await expect(loginElement).toBeVisible({ timeout: 10000 })
    })
})

test.describe('Login Page', () => {
    test('should display login form elements', async ({ page }) => {
        await page.goto('/login')

        // Wait for page to load
        await page.waitForLoadState('networkidle')

        // Check for username and password fields (form uses username not email)
        const usernameInput = page.locator('input#username, input[name="username"]').first()
        const passwordInput = page.locator('input#password, input[name="password"]').first()

        await expect(usernameInput).toBeVisible({ timeout: 10000 })
        await expect(passwordInput).toBeVisible({ timeout: 10000 })
    })

    test('should have submit button', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle')

        const submitButton = page.locator('button[type="submit"]').first()
        await expect(submitButton).toBeVisible({ timeout: 10000 })
        await expect(submitButton).toHaveText(/masuk/i)
    })

    test('should have password visibility toggle', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle')

        // Find the toggle button
        const toggleButton = page.locator('button[aria-label*="password"]').first()
        await expect(toggleButton).toBeVisible({ timeout: 10000 })
    })
})

test.describe('404 Page', () => {
    test('should display custom 404 page', async ({ page }) => {
        await page.goto('/nonexistent-page-12345')

        // Check for 404 content
        await expect(page.locator('text=404').first()).toBeVisible({ timeout: 10000 })
    })
})

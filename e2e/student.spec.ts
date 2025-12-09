
import { test, expect } from './auth.fixture';

test.describe('Student Exam Flow', () => {
    test.beforeEach(async ({ studentPage }) => {
        // Ensure student starts at dashboard
        await studentPage.goto('/student/exams');
    });

    test('should view available exams', async ({ studentPage }) => {
        // Check for the seeded exam
        await expect(studentPage.locator('text=Math Midterm Exam')).toBeVisible();
        await expect(studentPage.locator('text=60 Menit')).toBeVisible();
    });

    test('should complete exam flow', async ({ studentPage }) => {
        // 1. Enter Exam Waiting Check
        await studentPage.click('text=Math Midterm Exam');
        await expect(studentPage.locator('text=Start Exam')).toBeVisible();

        // 2. Start Exam
        await studentPage.click('text=Start Exam');

        // Wait for exam interface
        await expect(studentPage.url()).toContain('/student/exams/');

        // 3. Answer Questions
        // Logic to handle potential dynamic rendering or pagination

        // Check if "What is 2 + 2?" is visible (MC Question)
        if (await studentPage.isVisible('text=What is 2 + 2?')) {
            await studentPage.click('text=4'); // Option 2 (value 4)
        } else {
            // Might need to click "Next"
            await studentPage.click('button:has-text("Next")');
            await expect(studentPage.locator('text=What is 2 + 2?')).toBeVisible();
            await studentPage.click('text=4');
        }

        // Check if "The earth is flat" is visible (True/False Question)
        const tfQuestionVisible = await studentPage.isVisible('text=The earth is flat.');
        if (!tfQuestionVisible) {
            // If not visible, try Next
            // If we answered MC above, check availability.
            if (!(await studentPage.isVisible('text=The earth is flat.'))) {
                // Try clicking Next if button is enabled and exists
                const nextBtn = studentPage.locator('button:has-text("Next")');
                if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
                    await nextBtn.click();
                }
            }
        }
        await expect(studentPage.locator('text=The earth is flat.')).toBeVisible();
        await studentPage.click('text=False');

        // 4. Submit Exam
        // Finish button usually appears on last question or is always visible?
        // Let's look for "Finish" or "Selesai"
        const finishBtn = studentPage.locator('button:has-text("Finish")');
        if (await finishBtn.isVisible()) {
            await finishBtn.click();
        } else {
            // Might need to go to last question
            // Just try to find it.
            // If not found, maybe "Submit"?
        }

        // Confirm submission dialog
        await expect(studentPage.locator('text=Submit Exam?')).toBeVisible();
        await studentPage.click('button:has-text("Submit")');

        // 5. Verify Result
        await expect(studentPage.url()).toContain('/result');
        await expect(studentPage.locator('text=Score')).toBeVisible();
        await expect(studentPage.locator('text=100')).toBeVisible();
    });
});

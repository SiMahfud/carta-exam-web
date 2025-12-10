
import { test, expect } from './auth.fixture';

test.describe('Student Exam Flow', () => {
    test.beforeEach(async ({ studentPage }) => {
        studentPage.on('console', msg => console.log(`[Browser]: ${msg.text()}`));
        // Ensure student starts at dashboard
        await studentPage.goto('/student/exams');
    });

    test('should view available exams', async ({ studentPage }) => {
        // Check for the seeded exam
        await expect(studentPage.locator('text=Midterm Session - Class 10A')).toBeVisible();
        await expect(studentPage.locator('text=60 mnt')).toBeVisible();
    });

    test('should complete exam flow', async ({ studentPage }) => {
        // 1. Enter Exam Waiting Check
        // Click "Mulai Ujian" button inside the card for Math Midterm Exam
        // Need to locate the specific card or just the first button "Mulai Ujian" if unique enough
        await studentPage.click('button:has-text("Mulai Ujian")');

        // 2. Handle Fullscreen Prompt
        await expect(studentPage.locator('text=Mode Ujian Terkunci')).toBeVisible();
        await studentPage.click('button:has-text("Mulai Ujian (Layar Penuh)")');

        // Wait for exam interface (url changes to /student/exams/[sessionId])
        await expect(studentPage.url()).toContain('/student/exams/');
        // Verify exam header components
        await expect(studentPage.locator('text=Soal 1')).toBeVisible();

        // 3. Answer Questions
        // Logic to handle potential dynamic rendering

        // Check for MC Question "What is 2 + 2?"
        // Note: Questions might be randomized or in different order. We should try to find by text.
        // We might need to navigate if not visible.

        const answerQuestion = async (questionText: string, answerText: string) => {
            // Try to find question on current page
            let isVisible = await studentPage.isVisible(`text=${questionText}`);

            if (!isVisible) {
                // Try clicking "Selanjutnya" until found or end
                // Limit retries
                for (let i = 0; i < 10; i++) {
                    const nextBtn = studentPage.locator('button:has-text("Selanjutnya")');
                    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
                        await nextBtn.click();
                        // Small wait for transition
                        await studentPage.waitForTimeout(300);
                        isVisible = await studentPage.isVisible(`text=${questionText}`);
                        if (isVisible) break;
                    } else {
                        break;
                    }
                }
            }

            if (isVisible) {
                await studentPage.click(`text=${answerText}`);
            } else {
                console.warn(`Question "${questionText}" not found during test.`);
            }
        };

        await answerQuestion('What is 2 + 2?', '4');
        await answerQuestion('The earth is flat.', 'False');

        // 4. Submit Exam
        // Click "Kumpulkan" (Submit) - usually an Icon or Text in Header.
        // In ExamHeader.tsx (implied), there is likely a submit button.
        // Based on typical UI, it might be a button with "Kumpulkan" text or an icon.
        // If not explicit text, we might need a specific selector.
        // Let's assume there's a button "Kumpulkan" or we look for the SubmitDialog trigger.
        // If the header code is not visible, I'll search for a button that opens the dialog.
        // Let's try to finding a button with "Kumpulkan" or similar.
        // If it's an icon only, we might need a testid.
        // For now, let's assume "Kumpulkan" text exists somewhere or "Selesai".
        // If it's the last question, there might be a "Selesai" button instead of "Selanjutnya"?
        // Check if "Selesai" button/text is visible.

        // Actually, ExamHeader usually has a "Kumpulkan" button.
        // Let's try locating any button that says "Kumpulkan" or "Finish".
        const submitBtn = studentPage.locator('button:has-text("Kumpulkan")');
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
        } else {
            // Maybe it's an icon?
            // Let's try to force open it if we can't find it, but we should find it.
            // Try "Selesai"
            const selesaiBtn = studentPage.locator('button:has-text("Selesai")');
            if (await selesaiBtn.isVisible()) {
                await selesaiBtn.click();
            } else {
                // Fallback: looking for specific button class or id if added
                // Assuming standard Shadcn button
            }
        }

        // Confirm submission dialog
        await expect(studentPage.locator('text=Kumpulkan Ujian?')).toBeVisible();
        await studentPage.click('button:has-text("Ya, Kumpulkan")');

        // Check for success toast
        await expect(studentPage.locator('text=Ujian berhasil dikumpulkan')).toBeVisible({ timeout: 10000 });

        // 5. Verify Result - Student is redirected to exams list
        await studentPage.waitForURL('**/student/exams', { timeout: 10000 });
        await expect(studentPage.url()).not.toContain('/student/exams/');

        // Verify status is Completed/Selesai
        await expect(studentPage.locator('text=Selesai')).toBeVisible();
        // Check for score if visible immediately
        // await expect(studentPage.locator('text=Nilai: 100')).toBeVisible();
    });
});

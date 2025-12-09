
import * as dotenv from 'dotenv';
dotenv.config();

import bcrypt from "bcryptjs";

async function main() {
    console.log("🌱 Seeding test database...");

    try {
        // Dynamic import to ensure env vars are loaded first
        const { db } = await import("@/lib/db");
        const schema = await import("@/lib/schema");
        const {
            users, subjects, classes, classStudents,
            questionBanks, bankQuestions, examTemplates, examSessions
        } = schema;

        // 1. Clean up existing data
        console.log("Cleaning up...");
        await db.delete(examSessions);
        await db.delete(examTemplates);
        await db.delete(bankQuestions);
        await db.delete(questionBanks);
        await db.delete(classStudents);
        await db.delete(classes);
        await db.delete(users);
        await db.delete(subjects);

        // 2. Create Users
        console.log("Creating users...");
        const hashedPassword = await bcrypt.hash("password123", 10);

        const adminId = "user_admin";
        const teacherId = "user_teacher";
        const studentId = "user_student";
        const studentPassword = await bcrypt.hash("siswa123", 10);

        await db.insert(users).values([
            {
                id: adminId,
                name: "Test Admin",
                username: "admin",
                password: hashedPassword,
                role: "admin",
            },
            {
                id: teacherId,
                name: "Test Teacher",
                username: "teacher",
                password: hashedPassword,
                role: "teacher",
            },
            {
                id: studentId,
                name: "Siswa Demo",
                username: "siswa",
                password: studentPassword,
                role: "student",
            }
        ]);

        // 3. Create Subjects
        console.log("Creating subjects...");
        const subjectId = "subject_math";
        await db.insert(subjects).values({
            id: subjectId,
            name: "Mathematics",
            code: "MATH101",
            description: "Basic Mathematics",
        });

        // 4. Create Classes
        console.log("Creating classes...");
        const classId = "class_10a";
        await db.insert(classes).values({
            id: classId,
            name: "Class 10 A",
            grade: 10,
            academicYear: "2025/2026",
            teacherId: teacherId,
        });

        // Enroll student
        await db.insert(classStudents).values({
            classId: classId,
            studentId: studentId,
        });

        // 5. Create Question Bank
        console.log("Creating question banks...");
        const bankId = "bank_math_1";
        await db.insert(questionBanks).values({
            id: bankId,
            name: "Math Basic Questions",
            subjectId: subjectId,
            createdBy: teacherId,
        });

        // 6. Create Questions in Bank
        console.log("Creating bank questions...");
        await db.insert(bankQuestions).values([
            {
                id: "q_mc_1",
                bankId: bankId,
                type: "mc",
                content: {
                    question: "What is 2 + 2?",
                    options: [
                        { id: "opt1", text: "3" },
                        { id: "opt2", text: "4" },
                        { id: "opt3", text: "5" },
                        { id: "opt4", text: "6" }
                    ]
                },
                answerKey: { correctOptionId: "opt2" },
                difficulty: "easy",
                defaultPoints: 5,
                tags: ["arithmetic"],
            },
            {
                id: "q_tf_1",
                bankId: bankId,
                type: "true_false",
                content: {
                    question: "The earth is flat.",
                    statement: "The earth is flat."
                },
                answerKey: { method: "false" },
                difficulty: "easy",
                defaultPoints: 5,
                tags: ["geography"],
            }
        ]);

        // 7. Create Exam Template
        console.log("Creating exam templates...");
        const templateId = "template_midterm";
        await db.insert(examTemplates).values({
            id: templateId,
            name: "Math Midterm Exam",
            subjectId: subjectId,
            durationMinutes: 60,
            createdBy: teacherId,
            status: "published",
            totalScore: 100,
            bankIds: [bankId],
            questionComposition: { mc: 1, true_false: 1 },
            displaySettings: { showQuestionNumber: true, showRemainingTime: true, showNavigation: true },
            violationSettings: {
                detectTabSwitch: true,
                detectCopyPaste: true,
                detectRightClick: true,
                detectScreenshot: true,
                detectDevTools: true,
                cooldownSeconds: 5,
                mode: 'strict'
            }
        });

        // 8. Create Active Exam Session
        console.log("Creating exam session...");
        const sessionId = "session_midterm";
        const now = new Date();
        const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        await db.insert(examSessions).values({
            id: sessionId,
            templateId: templateId,
            sessionName: "Midterm Session - Class 10A",
            startTime: now,
            endTime: endTime,
            status: "active",
            targetType: "class",
            targetIds: [classId],
            createdBy: teacherId,
        });

        console.log("✅ Seeding complete!");
        process.exit(0);

    } catch (e) {
        console.error("❌ Error seeding:", e);
        process.exit(1);
    }
}

main();

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    role: text("role", { enum: ["admin", "teacher", "student"] }).notNull().default("student"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const exams = sqliteTable("exams", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    startTime: integer("start_time", { mode: "timestamp" }),
    endTime: integer("end_time", { mode: "timestamp" }),
    durationMinutes: integer("duration_minutes").notNull(),
    minDurationMinutes: integer("min_duration_minutes").default(0),
    randomizeQuestions: integer("randomize_questions", { mode: "boolean" }).default(false),
    randomizeAnswers: integer("randomize_answers", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const questions = sqliteTable("questions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["mc", "complex_mc", "matching", "short", "essay"] }).notNull(),
    content: text("content", { mode: "json" }).notNull(), // { question: "...", options: [...] }
    answerKey: text("answer_key", { mode: "json" }).notNull(), // { correct: ... }
    order: integer("order").notNull().default(0),
});

export const submissions = sqliteTable("submissions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").default(0),
    startTime: integer("start_time", { mode: "timestamp" }).default(sql`(unixepoch())`),
    endTime: integer("end_time", { mode: "timestamp" }),
    questionOrder: text("question_order", { mode: "json" }), // Array of question IDs
    status: text("status", { enum: ["in_progress", "completed"] }).default("in_progress"),
});

export const answers = sqliteTable("answers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    studentAnswer: text("student_answer", { mode: "json" }),
    isCorrect: integer("is_correct", { mode: "boolean" }),
    score: integer("score").default(0),
});

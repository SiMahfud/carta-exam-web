import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = sqliteTable("users", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    role: text("role", { enum: ["admin", "teacher", "student"] }).notNull().default("student"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ============================================================================
// SUBJECT & CLASS MANAGEMENT
// ============================================================================

export const subjects = sqliteTable("subjects", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code").notNull().unique(), // e.g., "MAT", "BIN"
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const classes = sqliteTable("classes", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // e.g., "X-1", "XI IPA 2"
    grade: integer("grade").notNull(), // 10, 11, 12
    academicYear: text("academic_year").notNull(), // e.g., "2025/2026"
    teacherId: text("teacher_id").references(() => users.id, { onDelete: "set null" }), // Wali kelas
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const classStudents = sqliteTable("class_students", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: integer("enrolled_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ============================================================================
// QUESTION BANK MANAGEMENT
// ============================================================================

export const questionBanks = sqliteTable("question_banks", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Bank Soal UTS Semester 1"
    description: text("description"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }), // Nullable until auth is fully implemented
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const bankQuestions = sqliteTable("bank_questions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    bankId: text("bank_id").notNull().references(() => questionBanks.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["mc", "complex_mc", "matching", "short", "essay"] }).notNull(),
    content: text("content", { mode: "json" }).notNull(), // { question: "...", options: [...] }
    answerKey: text("answer_key", { mode: "json" }).notNull(), // { correct: ... }
    tags: text("tags", { mode: "json" }).$type<string[]>().$defaultFn(() => []), // ["Bab 1", "Trigonometri", "Sulit"]
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
    defaultPoints: integer("default_points").notNull().default(1),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(), // Additional metadata
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }), // Nullable until auth is fully implemented
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    lastUsed: integer("last_used", { mode: "timestamp" }), // Track usage
});

// ============================================================================
// SCORING TEMPLATES
// ============================================================================

export const scoringTemplates = sqliteTable("scoring_templates", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // e.g., "Standard UTS", "Ujian Akhir"
    description: text("description"),
    defaultWeights: text("default_weights", { mode: "json" }).notNull()
        .$type<{ mc: number; complex_mc: number; matching: number; short: number; essay: number }>()
        .$defaultFn(() => ({ mc: 1, complex_mc: 2, matching: 3, short: 2, essay: 5 })),
    allowPartialCredit: integer("allow_partial_credit", { mode: "boolean" }).default(true),
    partialCreditRules: text("partial_credit_rules", { mode: "json" })
        .$type<{ complex_mc?: number; matching?: number }>(), // Percentage for partial credit
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ============================================================================
// EXAM TEMPLATES & SESSIONS
// ============================================================================

export const examTemplates = sqliteTable("exam_templates", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),

    // Question selection
    bankIds: text("bank_ids", { mode: "json" }).$type<string[]>().notNull(), // Array of bank IDs
    filterTags: text("filter_tags", { mode: "json" }).$type<string[]>(), // Optional tag filters
    questionComposition: text("question_composition", { mode: "json" }).notNull()
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number }>(),

    // Question pool for randomization
    useQuestionPool: integer("use_question_pool", { mode: "boolean" }).default(false),
    poolSize: integer("pool_size"), // Total questions in pool (if useQuestionPool is true)

    // Scoring
    scoringTemplateId: text("scoring_template_id").references(() => scoringTemplates.id, { onDelete: "set null" }),
    customWeights: text("custom_weights", { mode: "json" })
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number }>(),
    totalScore: integer("total_score").default(100), // Auto-scale to this value

    // Timing
    durationMinutes: integer("duration_minutes").notNull(),
    minDurationMinutes: integer("min_duration_minutes").default(0),

    // Randomization
    randomizeQuestions: integer("randomize_questions", { mode: "boolean" }).default(false),
    randomizeAnswers: integer("randomize_answers", { mode: "boolean" }).default(false),
    essayAtEnd: integer("essay_at_end", { mode: "boolean" }).default(true),

    // Advanced Randomization Rules
    randomizationRules: text("randomization_rules", { mode: "json" })
        .$type<{
            mode: 'all' | 'by_type' | 'exclude_type' | 'specific_numbers';
            types?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay')[];
            excludeTypes?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay')[];
            questionNumbers?: number[];
        }>()
        .$defaultFn(() => ({ mode: "all" })),

    // Target Selection
    targetType: text("target_type").$type<'all' | 'classes' | 'grades' | 'students'>().default('all'),
    targetIds: text("target_ids", { mode: "json" }).$type<string[]>().$defaultFn(() => []),

    // Security & Rules
    enableLockdown: integer("enable_lockdown", { mode: "boolean" }).default(true),
    requireToken: integer("require_token", { mode: "boolean" }).default(false),
    maxViolations: integer("max_violations").default(3),
    allowReview: integer("allow_review", { mode: "boolean" }).default(false),
    showResultImmediately: integer("show_result_immediately", { mode: "boolean" }).default(false),
    allowRetake: integer("allow_retake", { mode: "boolean" }).default(false),
    maxTabSwitches: integer("max_tab_switches").default(3),

    // Display
    displaySettings: text("display_settings", { mode: "json" })
        .$type<{ showQuestionNumber?: boolean; showRemainingTime?: boolean; showNavigation?: boolean }>()
        .$defaultFn(() => ({ showQuestionNumber: true, showRemainingTime: true, showNavigation: true })),

    createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const examSessions = sqliteTable("exam_sessions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id").notNull().references(() => examTemplates.id, { onDelete: "cascade" }),
    sessionName: text("session_name").notNull(),

    // Timing
    startTime: integer("start_time", { mode: "timestamp" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp" }).notNull(),

    // Status
    status: text("status", { enum: ["scheduled", "active", "completed", "cancelled"] }).default("scheduled"),

    // Assignment
    targetType: text("target_type", { enum: ["class", "individual"] }).notNull(),
    targetIds: text("target_ids", { mode: "json" }).$type<string[]>().notNull(), // Class IDs or Student IDs

    // Generated questions (if using pool, stores per-student question selection)
    generatedQuestions: text("generated_questions", { mode: "json" })
        .$type<Record<string, string[]>>(), // { studentId: [questionIds] }

    createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const questionPools = sqliteTable("question_pools", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull().references(() => examSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    selectedQuestions: text("selected_questions", { mode: "json" }).$type<string[]>().notNull(), // Array of bankQuestion IDs
    questionOrder: text("question_order", { mode: "json" }).$type<string[]>().notNull(), // Ordered array
    generatedAt: integer("generated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ============================================================================
// LEGACY TABLES (Updated for integration)
// ============================================================================

export const exams = sqliteTable("exams", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),

    // Link to new session system
    sessionId: text("session_id").references(() => examSessions.id, { onDelete: "set null" }),

    startTime: integer("start_time", { mode: "timestamp" }),
    endTime: integer("end_time", { mode: "timestamp" }),
    durationMinutes: integer("duration_minutes").notNull(),
    minDurationMinutes: integer("min_duration_minutes").default(0),
    randomizeQuestions: integer("randomize_questions", { mode: "boolean" }).default(false),
    randomizeAnswers: integer("randomize_answers", { mode: "boolean" }).default(false),
    enableLockdown: integer("enable_lockdown", { mode: "boolean" }).default(true),
    requireToken: integer("require_token", { mode: "boolean" }).default(false),
    maxViolations: integer("max_violations").default(3),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const questions = sqliteTable("questions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),

    // Link to bank question (nullable for backward compatibility)
    bankQuestionId: text("bank_question_id").references(() => bankQuestions.id, { onDelete: "set null" }),

    type: text("type", { enum: ["mc", "complex_mc", "matching", "short", "essay"] }).notNull(),
    content: text("content", { mode: "json" }).notNull(), // { question: "...", options: [...] }
    answerKey: text("answer_key", { mode: "json" }).notNull(), // { correct: ... }
    order: integer("order").notNull().default(0),

    // Custom points for this specific question in this exam
    points: integer("points").default(1),
});

export const submissions = sqliteTable("submissions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").references(() => exams.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    // Link to session
    sessionId: text("session_id").references(() => examSessions.id, { onDelete: "set null" }),

    // Scoring
    score: integer("score").default(0), // Old score field (keep for compatibility)
    totalPoints: integer("total_points"), // Maximum possible points
    earnedPoints: integer("earned_points"), // Points earned

    startTime: integer("start_time", { mode: "timestamp" }).default(sql`(unixepoch())`),
    endTime: integer("end_time", { mode: "timestamp" }),
    questionOrder: text("question_order", { mode: "json" }), // Array of question IDs
    flaggedQuestions: text("flagged_questions", { mode: "json" }), // Array of question IDs marked as "ragu-ragu"
    violationCount: integer("violation_count").default(0),
    violationLog: text("violation_log", { mode: "json" }), // Array of { type, timestamp }
    status: text("status", { enum: ["in_progress", "completed", "terminated"] }).default("in_progress"),

    // Grading status
    gradingStatus: text("grading_status", { enum: ["auto", "pending_manual", "manual", "completed", "published"] }).default("auto"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const answers = sqliteTable("answers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
    questionId: text("question_id").references(() => questions.id, { onDelete: "cascade" }), // Legacy, nullable
    bankQuestionId: text("bank_question_id").references(() => bankQuestions.id, { onDelete: "cascade" }), // New system
    studentAnswer: text("student_answer", { mode: "json" }),
    isFlagged: integer("is_flagged", { mode: "boolean" }).default(false),
    isCorrect: integer("is_correct", { mode: "boolean" }),
    score: integer("score").default(0),

    // Enhanced scoring with partial credit
    maxPoints: integer("max_points"), // Maximum points for this question
    partialPoints: integer("partial_points"), // Partial credit earned (for complex_mc, matching)

    // Manual grading support
    gradingStatus: text("grading_status", { enum: ["auto", "pending_manual", "manual", "completed"] }).default("auto"),
    gradedBy: text("graded_by").references(() => users.id, { onDelete: "set null" }), // Teacher who graded
    gradedAt: integer("graded_at", { mode: "timestamp" }),
    gradingNotes: text("grading_notes"), // Teacher's notes/feedback
});

export const activityLogs = sqliteTable("activity_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g., "created", "updated", "deleted", "started", "completed"
    entityType: text("entity_type").notNull(), // e.g., "exam_session", "question_bank", "subject", "class", "user"
    entityId: text("entity_id"), // ID of the entity affected
    details: text("details", { mode: "json" }).$type<Record<string, unknown>>(), // Additional context
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const examTokens = sqliteTable("exam_tokens", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    validFrom: integer("valid_from", { mode: "timestamp" }).notNull(),
    validUntil: integer("valid_until", { mode: "timestamp" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

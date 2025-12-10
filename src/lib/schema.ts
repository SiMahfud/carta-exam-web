import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
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
}, (table) => ({
    roleIdx: index("users_role_idx").on(table.role),
}));

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
}, (table) => ({
    teacherIdx: index("classes_teacher_idx").on(table.teacherId),
    gradeIdx: index("classes_grade_idx").on(table.grade),
}));

export const classStudents = sqliteTable("class_students", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: integer("enrolled_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (table) => ({
    classIdx: index("class_students_class_idx").on(table.classId),
    studentIdx: index("class_students_student_idx").on(table.studentId),
}));

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
}, (table) => ({
    subjectIdx: index("question_banks_subject_idx").on(table.subjectId),
    createdByIdx: index("question_banks_created_by_idx").on(table.createdBy),
}));

export const bankQuestions = sqliteTable("bank_questions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    bankId: text("bank_id").notNull().references(() => questionBanks.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["mc", "complex_mc", "matching", "short", "essay", "true_false"] }).notNull(),
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
}, (table) => ({
    bankIdx: index("bank_questions_bank_idx").on(table.bankId),
    typeIdx: index("bank_questions_type_idx").on(table.type),
}));

// ============================================================================
// SCORING TEMPLATES
// ============================================================================

export const scoringTemplates = sqliteTable("scoring_templates", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // e.g., "Standard UTS", "Ujian Akhir"
    description: text("description"),
    defaultWeights: text("default_weights", { mode: "json" }).notNull()
        .$type<{ mc: number; complex_mc: number; matching: number; short: number; essay: number; true_false: number }>()
        .$defaultFn(() => ({ mc: 1, complex_mc: 2, matching: 3, short: 2, essay: 5, true_false: 1 })),
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
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number; true_false?: number }>(),

    // Question pool for randomization
    useQuestionPool: integer("use_question_pool", { mode: "boolean" }).default(false),
    poolSize: integer("pool_size"), // Total questions in pool (if useQuestionPool is true)

    // Scoring
    scoringTemplateId: text("scoring_template_id").references(() => scoringTemplates.id, { onDelete: "set null" }),
    customWeights: text("custom_weights", { mode: "json" })
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number; true_false?: number }>(),
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
            types?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
            excludeTypes?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
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
    violationSettings: text("violation_settings", { mode: "json" })
        .$type<{
            detectTabSwitch: boolean;
            detectCopyPaste: boolean;
            detectRightClick: boolean;
            detectScreenshot: boolean;
            detectDevTools: boolean;
            cooldownSeconds: number;
            mode: 'lenient' | 'strict' | 'disabled';
        }>()
        .$defaultFn(() => ({
            detectTabSwitch: true,
            detectCopyPaste: true,
            detectRightClick: true,
            detectScreenshot: true,
            detectDevTools: true,
            cooldownSeconds: 5,
            mode: 'strict'
        })),
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
}, (table) => ({
    subjectIdx: index("exam_templates_subject_idx").on(table.subjectId),
    createdByIdx: index("exam_templates_created_by_idx").on(table.createdBy),
}));

export const examSessions = sqliteTable("exam_sessions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id").notNull().references(() => examTemplates.id, { onDelete: "cascade" }),
    sessionName: text("session_name").notNull(),

    // Timing
    startTime: integer("start_time", { mode: "timestamp" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp" }).notNull(),

    // Status
    status: text("status", { enum: ["scheduled", "active", "completed", "cancelled"] }).default("scheduled"),

    // Access Token (for requireToken feature)
    accessToken: text("access_token"),

    // Assignment
    targetType: text("target_type", { enum: ["class", "individual"] }).notNull(),
    targetIds: text("target_ids", { mode: "json" }).$type<string[]>().notNull(), // Class IDs or Student IDs

    // Generated questions (if using pool, stores per-student question selection)
    generatedQuestions: text("generated_questions", { mode: "json" })
        .$type<Record<string, string[]>>(), // { studentId: [questionIds] }

    createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (table) => ({
    templateIdx: index("exam_sessions_template_idx").on(table.templateId),
    statusIdx: index("exam_sessions_status_idx").on(table.status),
    createdByIdx: index("exam_sessions_created_by_idx").on(table.createdBy),
}));

export const questionPools = sqliteTable("question_pools", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull().references(() => examSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    selectedQuestions: text("selected_questions", { mode: "json" }).$type<string[]>().notNull(), // Array of bankQuestion IDs
    questionOrder: text("question_order", { mode: "json" }).$type<string[]>().notNull(), // Ordered array
    generatedAt: integer("generated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (table) => ({
    sessionIdx: index("question_pools_session_idx").on(table.sessionId),
    studentIdx: index("question_pools_student_idx").on(table.studentId),
}));

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

    type: text("type", { enum: ["mc", "complex_mc", "matching", "short", "essay", "true_false"] }).notNull(),
    content: text("content", { mode: "json" }).notNull(), // { question: "...", options: [...] }
    answerKey: text("answer_key", { mode: "json" }).notNull(), // { correct: ... }
    order: integer("order").notNull().default(0),

    // Custom points for this specific question in this exam
    points: integer("points").default(1),
}, (table) => ({
    examIdx: index("questions_exam_idx").on(table.examId),
}));

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
    bonusTimeMinutes: integer("bonus_time_minutes").default(0), // Additional time granted by admin
    status: text("status", { enum: ["in_progress", "completed", "terminated"] }).default("in_progress"),

    // Grading status
    gradingStatus: text("grading_status", { enum: ["auto", "pending_manual", "manual", "completed", "published"] }).default("auto"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
    examIdx: index("submissions_exam_idx").on(table.examId),
    userIdx: index("submissions_user_idx").on(table.userId),
    sessionIdx: index("submissions_session_idx").on(table.sessionId),
    statusIdx: index("submissions_status_idx").on(table.status),
}));

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
}, (table) => ({
    submissionIdx: index("answers_submission_idx").on(table.submissionId),
    questionIdx: index("answers_question_idx").on(table.questionId),
}));

export const activityLogs = sqliteTable("activity_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g., "created", "updated", "deleted", "started", "completed"
    entityType: text("entity_type").notNull(), // e.g., "exam_session", "question_bank", "subject", "class", "user"
    entityId: text("entity_id"), // ID of the entity affected
    details: text("details", { mode: "json" }).$type<Record<string, unknown>>(), // Additional context
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (table) => ({
    userIdx: index("activity_logs_user_idx").on(table.userId),
    entityTypeIdx: index("activity_logs_entity_type_idx").on(table.entityType),
    createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
}));

export const examTokens = sqliteTable("exam_tokens", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    validFrom: integer("valid_from", { mode: "timestamp" }).notNull(),
    validUntil: integer("valid_until", { mode: "timestamp" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (table) => ({
    examIdx: index("exam_tokens_exam_idx").on(table.examId),
    tokenIdx: index("exam_tokens_token_idx").on(table.token),
}));

// ============================================================================
// USER PREFERENCES & SAVED FILTERS
// ============================================================================

export const savedFilters = sqliteTable("saved_filters", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    page: text("page").notNull(), // e.g., "grading", "exam-sessions", "question-banks"
    filters: text("filters", { mode: "json" }).notNull()
        .$type<Record<string, string | string[] | boolean | null>>(),
    isDefault: integer("is_default", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
}, (table) => ({
    userIdx: index("saved_filters_user_idx").on(table.userId),
    pageIdx: index("saved_filters_page_idx").on(table.page),
}));

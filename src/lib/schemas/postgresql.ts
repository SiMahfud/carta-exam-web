import { pgTable, text, integer, timestamp, json, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    role: text("role", { enum: ["admin", "teacher", "student"] }).notNull().default("student"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    roleIdx: index("users_role_idx").on(table.role),
}));

// ============================================================================
// SUBJECT & CLASS MANAGEMENT
// ============================================================================

export const subjects = pgTable("subjects", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code").notNull().unique(), // e.g., "MAT", "BIN"
    description: text("description"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const classes = pgTable("classes", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // e.g., "X-1", "XI IPA 2"
    grade: integer("grade").notNull(), // 10, 11, 12
    academicYear: text("academic_year").notNull(), // e.g., "2025/2026"
    teacherId: text("teacher_id").references(() => users.id, { onDelete: "set null" }), // Wali kelas
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    teacherIdx: index("classes_teacher_idx").on(table.teacherId),
    gradeIdx: index("classes_grade_idx").on(table.grade),
}));

export const classStudents = pgTable("class_students", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    classIdx: index("class_students_class_idx").on(table.classId),
    studentIdx: index("class_students_student_idx").on(table.studentId),
}));

// ============================================================================
// QUESTION BANK MANAGEMENT
// ============================================================================

export const questionBanks = pgTable("question_banks", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Bank Soal UTS Semester 1"
    description: text("description"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }), // Nullable until auth is fully implemented
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    subjectIdx: index("question_banks_subject_idx").on(table.subjectId),
    createdByIdx: index("question_banks_created_by_idx").on(table.createdBy),
}));

export const bankQuestions = pgTable("bank_questions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    bankId: text("bank_id").notNull().references(() => questionBanks.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["mc", "complex_mc", "matching", "short", "essay", "true_false"] }).notNull(),
    content: json("content").notNull(), // { question: "...", options: [...] }
    answerKey: json("answer_key").notNull(), // { correct: ... }
    tags: json("tags").$type<string[]>().$defaultFn(() => []), // ["Bab 1", "Trigonometri", "Sulit"]
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
    defaultPoints: integer("default_points").notNull().default(1),
    questionNumber: integer("question_number").default(0),
    metadata: json("metadata").$type<Record<string, unknown>>(), // Additional metadata
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }), // Nullable until auth is fully implemented
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
    lastUsed: timestamp("last_used"), // Track usage
}, (table) => ({
    bankIdx: index("bank_questions_bank_idx").on(table.bankId),
    typeIdx: index("bank_questions_type_idx").on(table.type),
}));

// ============================================================================
// SCORING TEMPLATES
// ============================================================================

export const scoringTemplates = pgTable("scoring_templates", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // e.g., "Standard UTS", "Ujian Akhir"
    description: text("description"),
    defaultWeights: json("default_weights").notNull()
        .$type<{ mc: number; complex_mc: number; matching: number; short: number; essay: number; true_false: number }>()
        .$defaultFn(() => ({ mc: 1, complex_mc: 2, matching: 3, short: 2, essay: 5, true_false: 1 })),
    allowPartialCredit: boolean("allow_partial_credit").default(true),
    partialCreditRules: json("partial_credit_rules")
        .$type<{ complex_mc?: number; matching?: number }>(), // Percentage for partial credit
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// EXAM TEMPLATES & SESSIONS
// ============================================================================

export const examTemplates = pgTable("exam_templates", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    subjectId: text("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),

    // Question selection
    bankIds: json("bank_ids").$type<string[]>().notNull(), // Array of bank IDs
    filterTags: json("filter_tags").$type<string[]>(), // Optional tag filters
    questionComposition: json("question_composition").notNull()
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number; true_false?: number }>(),

    // Question pool for randomization
    useQuestionPool: boolean("use_question_pool").default(false),
    poolSize: integer("pool_size"), // Total questions in pool (if useQuestionPool is true)

    // Scoring
    scoringTemplateId: text("scoring_template_id").references(() => scoringTemplates.id, { onDelete: "set null" }),
    customWeights: json("custom_weights")
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number; true_false?: number }>(),
    totalScore: integer("total_score").default(100), // Auto-scale to this value

    // Timing
    durationMinutes: integer("duration_minutes").notNull(),
    minDurationMinutes: integer("min_duration_minutes").default(0),

    // Randomization
    randomizeQuestions: boolean("randomize_questions").default(false),
    randomizeAnswers: boolean("randomize_answers").default(false),
    essayAtEnd: boolean("essay_at_end").default(true),

    // Advanced Randomization Rules
    randomizationRules: json("randomization_rules")
        .$type<{
            mode: 'all' | 'by_type' | 'exclude_type' | 'specific_numbers';
            types?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
            excludeTypes?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
            questionNumbers?: number[];
        }>()
        .$defaultFn(() => ({ mode: "all" })),

    // Target Selection
    targetType: text("target_type").$type<'all' | 'classes' | 'grades' | 'students'>().default('all'),
    targetIds: json("target_ids").$type<string[]>().$defaultFn(() => []),

    // Security & Rules
    enableLockdown: boolean("enable_lockdown").default(true),
    requireToken: boolean("require_token").default(false),
    maxViolations: integer("max_violations").default(3),
    violationSettings: json("violation_settings")
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
    allowReview: boolean("allow_review").default(false),
    showResultImmediately: boolean("show_result_immediately").default(false),
    allowRetake: boolean("allow_retake").default(false),
    maxTabSwitches: integer("max_tab_switches").default(3),

    // Display
    displaySettings: json("display_settings")
        .$type<{ showQuestionNumber?: boolean; showRemainingTime?: boolean; showNavigation?: boolean }>()
        .$defaultFn(() => ({ showQuestionNumber: true, showRemainingTime: true, showNavigation: true })),

    createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    subjectIdx: index("exam_templates_subject_idx").on(table.subjectId),
    createdByIdx: index("exam_templates_created_by_idx").on(table.createdBy),
}));

export const examSessions = pgTable("exam_sessions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id").notNull().references(() => examTemplates.id, { onDelete: "cascade" }),
    sessionName: text("session_name").notNull(),

    // Timing
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),

    // Status
    status: text("status", { enum: ["scheduled", "active", "completed", "cancelled"] }).default("scheduled"),

    // Access Token (for requireToken feature)
    accessToken: text("access_token"),

    // Assignment
    targetType: text("target_type", { enum: ["class", "individual"] }).notNull(),
    targetIds: json("target_ids").$type<string[]>().notNull(), // Class IDs or Student IDs

    // Generated questions (if using pool, stores per-student question selection)
    generatedQuestions: json("generated_questions")
        .$type<Record<string, string[]>>(), // { studentId: [questionIds] }

    createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    templateIdx: index("exam_sessions_template_idx").on(table.templateId),
    statusIdx: index("exam_sessions_status_idx").on(table.status),
    createdByIdx: index("exam_sessions_created_by_idx").on(table.createdBy),
}));

export const questionPools = pgTable("question_pools", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull().references(() => examSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    selectedQuestions: json("selected_questions").$type<string[]>().notNull(), // Array of bankQuestion IDs
    questionOrder: json("question_order").$type<string[]>().notNull(), // Ordered array
    generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    sessionIdx: index("question_pools_session_idx").on(table.sessionId),
    studentIdx: index("question_pools_student_idx").on(table.studentId),
}));

// ============================================================================
// LEGACY TABLES (Updated for integration)
// ============================================================================

export const exams = pgTable("exams", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),

    // Link to new session system
    sessionId: text("session_id").references(() => examSessions.id, { onDelete: "set null" }),

    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    durationMinutes: integer("duration_minutes").notNull(),
    minDurationMinutes: integer("min_duration_minutes").default(0),
    randomizeQuestions: boolean("randomize_questions").default(false),
    randomizeAnswers: boolean("randomize_answers").default(false),
    enableLockdown: boolean("enable_lockdown").default(true),
    requireToken: boolean("require_token").default(false),
    maxViolations: integer("max_violations").default(3),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const questions = pgTable("questions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),

    // Link to bank question (nullable for backward compatibility)
    bankQuestionId: text("bank_question_id").references(() => bankQuestions.id, { onDelete: "set null" }),

    type: text("type", { enum: ["mc", "complex_mc", "matching", "short", "essay", "true_false"] }).notNull(),
    content: json("content").notNull(), // { question: "...", options: [...] }
    answerKey: json("answer_key").notNull(), // { correct: ... }
    order: integer("order").notNull().default(0),

    // Custom points for this specific question in this exam
    points: integer("points").default(1),
}, (table) => ({
    examIdx: index("questions_exam_idx").on(table.examId),
}));

export const submissions = pgTable("submissions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").references(() => exams.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    // Link to session
    sessionId: text("session_id").references(() => examSessions.id, { onDelete: "set null" }),

    // Scoring
    score: integer("score").default(0), // Old score field (keep for compatibility)
    totalPoints: integer("total_points"), // Maximum possible points
    earnedPoints: integer("earned_points"), // Points earned

    startTime: timestamp("start_time").default(sql`CURRENT_TIMESTAMP`),
    endTime: timestamp("end_time"),
    questionOrder: json("question_order"), // Array of question IDs
    flaggedQuestions: json("flagged_questions"), // Array of question IDs marked as "ragu-ragu"
    violationCount: integer("violation_count").default(0),
    violationLog: json("violation_log"), // Array of { type, timestamp }
    bonusTimeMinutes: integer("bonus_time_minutes").default(0), // Additional time granted by admin
    status: text("status", { enum: ["in_progress", "completed", "terminated"] }).default("in_progress"),

    // Grading status
    gradingStatus: text("grading_status", { enum: ["auto", "pending_manual", "manual", "completed", "published"] }).default("auto"),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()),
}, (table) => ({
    examIdx: index("submissions_exam_idx").on(table.examId),
    userIdx: index("submissions_user_idx").on(table.userId),
    sessionIdx: index("submissions_session_idx").on(table.sessionId),
    statusIdx: index("submissions_status_idx").on(table.status),
}));

export const answers = pgTable("answers", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
    questionId: text("question_id").references(() => questions.id, { onDelete: "cascade" }), // Legacy, nullable
    bankQuestionId: text("bank_question_id").references(() => bankQuestions.id, { onDelete: "cascade" }), // New system
    studentAnswer: json("student_answer"),
    isFlagged: boolean("is_flagged").default(false),
    isCorrect: boolean("is_correct"),
    score: integer("score").default(0),

    // Enhanced scoring with partial credit
    maxPoints: integer("max_points"), // Maximum points for this question
    partialPoints: integer("partial_points"), // Partial credit earned (for complex_mc, matching)

    // Manual grading support
    gradingStatus: text("grading_status", { enum: ["auto", "pending_manual", "manual", "completed"] }).default("auto"),
    gradedBy: text("graded_by").references(() => users.id, { onDelete: "set null" }), // Teacher who graded
    gradedAt: timestamp("graded_at"),
    gradingNotes: text("grading_notes"), // Teacher's notes/feedback
}, (table) => ({
    submissionIdx: index("answers_submission_idx").on(table.submissionId),
    questionIdx: index("answers_question_idx").on(table.questionId),
}));

export const activityLogs = pgTable("activity_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // e.g., "created", "updated", "deleted", "started", "completed"
    entityType: text("entity_type").notNull(), // e.g., "exam_session", "question_bank", "subject", "class", "user"
    entityId: text("entity_id"), // ID of the entity affected
    details: json("details").$type<Record<string, unknown>>(), // Additional context
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdx: index("activity_logs_user_idx").on(table.userId),
    entityTypeIdx: index("activity_logs_entity_type_idx").on(table.entityType),
    createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
}));

export const examTokens = pgTable("exam_tokens", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    validFrom: timestamp("valid_from").notNull(),
    validUntil: timestamp("valid_until").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    examIdx: index("exam_tokens_exam_idx").on(table.examId),
    tokenIdx: index("exam_tokens_token_idx").on(table.token),
}));

// ============================================================================
// SCHOOL SETTINGS
// ============================================================================

export const schoolSettings = pgTable("school_settings", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    schoolName: text("school_name").notNull().default("SMAN 1 Campurdarat"),
    schoolDescription: text("school_description"),
    logoUrl: text("logo_url"), // URL relative to public or external

    // Landing Page Components
    htmlTitle: text("html_title").default("CartaExam"),
    faviconUrl: text("favicon_url"),
    heroTitle: text("hero_title").notNull().default("Ujian Modern untuk Generasi Digital"),
    heroDescription: text("hero_description").notNull().default("Platform ujian yang aman, cerdas, dan mudah digunakan."),
    heroShowStats: boolean("hero_show_stats").default(true),

    // Features Section
    featuresTitle: text("features_title").default("Fitur Unggulan"),
    featuresSubtitle: text("features_subtitle").default("Dirancang khusus untuk kebutuhan evaluasi akademik modern."),
    features: json("features")
        .$type<{ title: string; description: string; icon: string; color: string }[]>()
        .$defaultFn(() => []),

    // Footer & Contact
    footerText: text("footer_text").default("Built with ❤️ for education."),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),

    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// USER PREFERENCES & SAVED FILTERS
// ============================================================================

export const savedFilters = pgTable("saved_filters", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    page: text("page").notNull(), // e.g., "grading", "exam-sessions", "question-banks"
    filters: json("filters").notNull().$type<Record<string, string | string[] | boolean | null>>(),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdx: index("saved_filters_user_idx").on(table.userId),
    pageIdx: index("saved_filters_page_idx").on(table.page),
}));

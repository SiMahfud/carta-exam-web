import { mysqlTable, varchar, text, int, timestamp, datetime, json, boolean, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = mysqlTable("users", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 20, enum: ["admin", "teacher", "student"] }).notNull().default("student"),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    roleIdx: index("users_role_idx").on(table.role),
}));

// ============================================================================
// SUBJECT & CLASS MANAGEMENT
// ============================================================================

export const subjects = mysqlTable("subjects", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(), // e.g., "MAT", "BIN"
    description: text("description"),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const classes = mysqlTable("classes", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 100 }).notNull(), // e.g., "X-1", "XI IPA 2"
    grade: int("grade").notNull(), // 10, 11, 12
    academicYear: varchar("academic_year", { length: 20 }).notNull(), // e.g., "2025/2026"
    teacherId: varchar("teacher_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // Wali kelas
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    teacherIdx: index("classes_teacher_idx").on(table.teacherId),
    gradeIdx: index("classes_grade_idx").on(table.grade),
}));

export const classStudents = mysqlTable("class_students", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    classId: varchar("class_id", { length: 36 }).notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: varchar("student_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: datetime("enrolled_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    classIdx: index("class_students_class_idx").on(table.classId),
    studentIdx: index("class_students_student_idx").on(table.studentId),
}));

// ============================================================================
// QUESTION BANK MANAGEMENT
// ============================================================================

export const questionBanks = mysqlTable("question_banks", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    subjectId: varchar("subject_id", { length: 36 }).notNull().references(() => subjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // e.g., "Bank Soal UTS Semester 1"
    description: text("description"),
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // Nullable until auth is fully implemented
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    subjectIdx: index("question_banks_subject_idx").on(table.subjectId),
    createdByIdx: index("question_banks_created_by_idx").on(table.createdBy),
}));

export const bankQuestions = mysqlTable("bank_questions", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    bankId: varchar("bank_id", { length: 36 }).notNull().references(() => questionBanks.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20, enum: ["mc", "complex_mc", "matching", "short", "essay", "true_false"] }).notNull(),
    content: json("content").notNull(), // { question: "...", options: [...] }
    answerKey: json("answer_key").notNull(), // { correct: ... }
    tags: json("tags").$type<string[]>().$defaultFn(() => []), // ["Bab 1", "Trigonometri", "Sulit"]
    difficulty: varchar("difficulty", { length: 20, enum: ["easy", "medium", "hard"] }).default("medium"),
    defaultPoints: int("default_points").notNull().default(1),
    questionNumber: int("question_number").default(0),
    metadata: json("metadata").$type<Record<string, unknown>>(), // Additional metadata
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // Nullable until auth is fully implemented
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
    lastUsed: datetime("last_used"), // Track usage
}, (table) => ({
    bankIdx: index("bank_questions_bank_idx").on(table.bankId),
    typeIdx: index("bank_questions_type_idx").on(table.type),
}));

// ============================================================================
// SCORING TEMPLATES
// ============================================================================

export const scoringTemplates = mysqlTable("scoring_templates", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(), // e.g., "Standard UTS", "Ujian Akhir"
    description: text("description"),
    defaultWeights: json("default_weights").notNull()
        .$type<{ mc: number; complex_mc: number; matching: number; short: number; essay: number; true_false: number }>()
        .$defaultFn(() => ({ mc: 1, complex_mc: 2, matching: 3, short: 2, essay: 5, true_false: 1 })),
    allowPartialCredit: boolean("allow_partial_credit").default(true),
    partialCreditRules: json("partial_credit_rules")
        .$type<{ complex_mc?: number; matching?: number }>(), // Percentage for partial credit
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// EXAM TEMPLATES & SESSIONS
// ============================================================================

export const examTemplates = mysqlTable("exam_templates", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    subjectId: varchar("subject_id", { length: 36 }).notNull().references(() => subjects.id, { onDelete: "cascade" }),

    // Question selection
    bankIds: json("bank_ids").$type<string[]>().notNull(), // Array of bank IDs
    filterTags: json("filter_tags").$type<string[]>(), // Optional tag filters
    questionComposition: json("question_composition").notNull()
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number; true_false?: number }>(),

    // Question pool for randomization
    useQuestionPool: boolean("use_question_pool").default(false),
    poolSize: int("pool_size"), // Total questions in pool (if useQuestionPool is true)

    // Scoring
    scoringTemplateId: varchar("scoring_template_id", { length: 36 }).references(() => scoringTemplates.id, { onDelete: "set null" }),
    customWeights: json("custom_weights")
        .$type<{ mc?: number; complex_mc?: number; matching?: number; short?: number; essay?: number; true_false?: number }>(),
    totalScore: int("total_score").default(100), // Auto-scale to this value

    // Timing
    durationMinutes: int("duration_minutes").notNull(),
    minDurationMinutes: int("min_duration_minutes").default(0),

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
    targetType: varchar("target_type", { length: 20 }).$type<'all' | 'classes' | 'grades' | 'students'>().default('all'),
    targetIds: json("target_ids").$type<string[]>().$defaultFn(() => []),

    // Security & Rules
    enableLockdown: boolean("enable_lockdown").default(true),
    requireToken: boolean("require_token").default(false),
    maxViolations: int("max_violations").default(3),
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
    maxTabSwitches: int("max_tab_switches").default(3),

    // Display
    displaySettings: json("display_settings")
        .$type<{ showQuestionNumber?: boolean; showRemainingTime?: boolean; showNavigation?: boolean }>()
        .$defaultFn(() => ({ showQuestionNumber: true, showRemainingTime: true, showNavigation: true })),

    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at", { mode: 'date' }).$defaultFn(() => {
        const d = new Date(); d.setMilliseconds(0); return d;
    }).$onUpdate(() => {
        const d = new Date(); d.setMilliseconds(0); return d;
    }),
}, (table) => ({
    subjectIdx: index("exam_templates_subject_idx").on(table.subjectId),
    createdByIdx: index("exam_templates_created_by_idx").on(table.createdBy),
}));

export const examSessions = mysqlTable("exam_sessions", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    templateId: varchar("template_id", { length: 36 }).notNull().references(() => examTemplates.id, { onDelete: "cascade" }),
    sessionName: varchar("session_name", { length: 255 }).notNull(),

    // Timing
    startTime: datetime("start_time", { mode: 'date' }).notNull(),
    endTime: datetime("end_time", { mode: 'date' }).notNull(),

    // Status
    status: varchar("status", { length: 20, enum: ["scheduled", "active", "completed", "cancelled"] }).default("scheduled"),

    // Access Token (for requireToken feature)
    accessToken: varchar("access_token", { length: 100 }),

    // Assignment
    targetType: varchar("target_type", { length: 20, enum: ["class", "individual"] }).notNull(),
    targetIds: json("target_ids").$type<string[]>().notNull(), // Class IDs or Student IDs

    // Generated questions (if using pool, stores per-student question selection)
    generatedQuestions: json("generated_questions")
        .$type<Record<string, string[]>>(), // { studentId: [questionIds] }

    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    templateIdx: index("exam_sessions_template_idx").on(table.templateId),
    statusIdx: index("exam_sessions_status_idx").on(table.status),
    createdByIdx: index("exam_sessions_created_by_idx").on(table.createdBy),
}));

export const questionPools = mysqlTable("question_pools", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: varchar("session_id", { length: 36 }).notNull().references(() => examSessions.id, { onDelete: "cascade" }),
    studentId: varchar("student_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    selectedQuestions: json("selected_questions").$type<string[]>().notNull(), // Array of bankQuestion IDs
    questionOrder: json("question_order").$type<string[]>().notNull(), // Ordered array
    generatedAt: datetime("generated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    sessionIdx: index("question_pools_session_idx").on(table.sessionId),
    studentIdx: index("question_pools_student_idx").on(table.studentId),
}));

// ============================================================================
// LEGACY TABLES (Updated for integration)
// ============================================================================

export const exams = mysqlTable("exams", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Link to new session system
    sessionId: varchar("session_id", { length: 36 }).references(() => examSessions.id, { onDelete: "set null" }),

    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    durationMinutes: int("duration_minutes").notNull(),
    minDurationMinutes: int("min_duration_minutes").default(0),
    randomizeQuestions: boolean("randomize_questions").default(false),
    randomizeAnswers: boolean("randomize_answers").default(false),
    enableLockdown: boolean("enable_lockdown").default(true),
    requireToken: boolean("require_token").default(false),
    maxViolations: int("max_violations").default(3),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const questions = mysqlTable("questions", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: varchar("exam_id", { length: 36 }).notNull().references(() => exams.id, { onDelete: "cascade" }),

    // Link to bank question (nullable for backward compatibility)
    bankQuestionId: varchar("bank_question_id", { length: 36 }).references(() => bankQuestions.id, { onDelete: "set null" }),

    type: varchar("type", { length: 20, enum: ["mc", "complex_mc", "matching", "short", "essay", "true_false"] }).notNull(),
    content: json("content").notNull(), // { question: "...", options: [...] }
    answerKey: json("answer_key").notNull(), // { correct: ... }
    order: int("order").notNull().default(0),

    // Custom points for this specific question in this exam
    points: int("points").default(1),
}, (table) => ({
    examIdx: index("questions_exam_idx").on(table.examId),
}));

export const submissions = mysqlTable("submissions", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: varchar("exam_id", { length: 36 }).references(() => exams.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),

    // Link to session
    sessionId: varchar("session_id", { length: 36 }).references(() => examSessions.id, { onDelete: "set null" }),

    // Scoring
    score: int("score").default(0), // Old score field (keep for compatibility)
    totalPoints: int("total_points"), // Maximum possible points
    earnedPoints: int("earned_points"), // Points earned

    startTime: datetime("start_time", { mode: 'date' }).$defaultFn(() => new Date()),
    endTime: datetime("end_time", { mode: 'date' }),
    questionOrder: json("question_order"), // Array of question IDs
    flaggedQuestions: json("flagged_questions"), // Array of question IDs marked as "ragu-ragu"
    violationCount: int("violation_count").default(0),
    violationLog: json("violation_log"), // Array of { type, timestamp }
    bonusTimeMinutes: int("bonus_time_minutes").default(0), // Additional time granted by admin
    status: varchar("status", { length: 20, enum: ["in_progress", "completed", "terminated"] }).default("in_progress"),

    // Grading status
    gradingStatus: varchar("grading_status", { length: 20, enum: ["auto", "pending_manual", "manual", "completed", "published"] }).default("auto"),
    createdAt: datetime("created_at", { mode: 'date' }).$defaultFn(() => new Date()),
}, (table) => ({
    examIdx: index("submissions_exam_idx").on(table.examId),
    userIdx: index("submissions_user_idx").on(table.userId),
    sessionIdx: index("submissions_session_idx").on(table.sessionId),
    statusIdx: index("submissions_status_idx").on(table.status),
}));

export const answers = mysqlTable("answers", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    submissionId: varchar("submission_id", { length: 36 }).notNull().references(() => submissions.id, { onDelete: "cascade" }),
    questionId: varchar("question_id", { length: 36 }).references(() => questions.id, { onDelete: "cascade" }), // Legacy, nullable
    bankQuestionId: varchar("bank_question_id", { length: 36 }).references(() => bankQuestions.id, { onDelete: "cascade" }), // New system
    studentAnswer: json("student_answer"),
    isFlagged: boolean("is_flagged").default(false),
    isCorrect: boolean("is_correct"),
    score: int("score").default(0),

    // Enhanced scoring with partial credit
    maxPoints: int("max_points"), // Maximum points for this question
    partialPoints: int("partial_points"), // Partial credit earned (for complex_mc, matching)

    // Manual grading support
    gradingStatus: varchar("grading_status", { length: 20, enum: ["auto", "pending_manual", "manual", "completed"] }).default("auto"),
    gradedBy: varchar("graded_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }), // Teacher who graded
    gradedAt: datetime("graded_at"),
    gradingNotes: text("grading_notes"), // Teacher's notes/feedback
}, (table) => ({
    submissionIdx: index("answers_submission_idx").on(table.submissionId),
    questionIdx: index("answers_question_idx").on(table.questionId),
}));

export const activityLogs = mysqlTable("activity_logs", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(), // e.g., "created", "updated", "deleted", "started", "completed"
    entityType: varchar("entity_type", { length: 50 }).notNull(), // e.g., "exam_session", "question_bank", "subject", "class", "user"
    entityId: varchar("entity_id", { length: 36 }), // ID of the entity affected
    details: json("details").$type<Record<string, unknown>>(), // Additional context
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdx: index("activity_logs_user_idx").on(table.userId),
    entityTypeIdx: index("activity_logs_entity_type_idx").on(table.entityType),
    createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt),
}));

export const examTokens = mysqlTable("exam_tokens", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    examId: varchar("exam_id", { length: 36 }).notNull().references(() => exams.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 50 }).notNull(),
    validFrom: datetime("valid_from").notNull(),
    validUntil: datetime("valid_until").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    examIdx: index("exam_tokens_exam_idx").on(table.examId),
    tokenIdx: index("exam_tokens_token_idx").on(table.token),
}));

// ============================================================================
// SCHOOL SETTINGS
// ============================================================================

export const schoolSettings = mysqlTable("school_settings", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    schoolName: varchar("school_name", { length: 255 }).notNull().default("SMAN 1 Campurdarat"),
    schoolDescription: text("school_description"),
    logoUrl: varchar("logo_url", { length: 500 }),

    // Landing Page Components
    htmlTitle: varchar("html_title", { length: 255 }).default("CartaExam"),
    faviconUrl: varchar("favicon_url", { length: 500 }),
    heroTitle: varchar("hero_title", { length: 255 }).notNull().default("Ujian Modern untuk Generasi Digital"),
    heroDescription: varchar("hero_description", { length: 500 }).notNull().default("Platform ujian yang aman, cerdas, dan mudah digunakan."),
    heroShowStats: boolean("hero_show_stats").default(true),

    // Features Section
    featuresTitle: varchar("features_title", { length: 255 }).default("Fitur Unggulan"),
    featuresSubtitle: varchar("features_subtitle", { length: 255 }).default("Dirancang khusus untuk kebutuhan evaluasi akademik modern."),
    features: json("features")
        .$type<{ title: string; description: string; icon: string; color: string }[]>()
        .$defaultFn(() => []),

    // Footer & Contact
    footerText: varchar("footer_text", { length: 255 }).default("Built with ❤️ for education."),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    address: text("address"),

    // Announcement
    announcementTitle: varchar("announcement_title", { length: 255 }),
    announcementContent: text("announcement_content"),

    updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
    updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// USER PREFERENCES & SAVED FILTERS
// ============================================================================

export const savedFilters = mysqlTable("saved_filters", {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    page: varchar("page", { length: 255 }).notNull(), // e.g., "grading", "exam-sessions", "question-banks"
    filters: json("filters").notNull().$type<Record<string, string | string[] | boolean | null>>(),
    isDefault: boolean("is_default").default(false),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    userIdx: index("saved_filters_user_idx").on(table.userId),
    pageIdx: index("saved_filters_page_idx").on(table.page),
}));

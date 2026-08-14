import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import * as schemaSqlite from './schemas/sqlite';
import * as schemaMysql from './schemas/mysql';
import * as schemaPg from './schemas/postgresql';

const provider = process.env.DB_TYPE || 'sqlite';

const s = (provider === 'mysql' ? schemaMysql : (provider === 'postgres' ? schemaPg : schemaSqlite));

export const users = s.users;
export const subjects = s.subjects;
export const classes = s.classes;
export const classStudents = s.classStudents;
export const questionBanks = s.questionBanks;
export const bankQuestions = s.bankQuestions;
export const scoringTemplates = s.scoringTemplates;
export const examTemplates = s.examTemplates;
export const examSessions = s.examSessions;
export const questionPools = s.questionPools;
export const exams = s.exams;
export const questions = s.questions;
export const submissions = s.submissions;
export const answers = s.answers;
export const activityLogs = s.activityLogs;
export const examTokens = s.examTokens;
export const schoolSettings = s.schoolSettings;
export const savedFilters = s.savedFilters;

// Model Types (Inferred from schema)
export type User = InferSelectModel<typeof schemaSqlite.users>;
export type NewUser = InferInsertModel<typeof schemaSqlite.users>;

export type Subject = InferSelectModel<typeof schemaSqlite.subjects>;
export type NewSubject = InferInsertModel<typeof schemaSqlite.subjects>;

export type Class = InferSelectModel<typeof schemaSqlite.classes>;
export type NewClass = InferInsertModel<typeof schemaSqlite.classes>;

export type ClassStudent = InferSelectModel<typeof schemaSqlite.classStudents>;
export type NewClassStudent = InferInsertModel<typeof schemaSqlite.classStudents>;

export type QuestionBank = InferSelectModel<typeof schemaSqlite.questionBanks>;
export type NewQuestionBank = InferInsertModel<typeof schemaSqlite.questionBanks>;

export type BankQuestion = InferSelectModel<typeof schemaSqlite.bankQuestions>;
export type NewBankQuestion = InferInsertModel<typeof schemaSqlite.bankQuestions>;

export type ScoringTemplate = InferSelectModel<typeof schemaSqlite.scoringTemplates>;
export type NewScoringTemplate = InferInsertModel<typeof schemaSqlite.scoringTemplates>;

export type ExamTemplate = InferSelectModel<typeof schemaSqlite.examTemplates>;
export type NewExamTemplate = InferInsertModel<typeof schemaSqlite.examTemplates>;

export type ExamSession = InferSelectModel<typeof schemaSqlite.examSessions>;
export type NewExamSession = InferInsertModel<typeof schemaSqlite.examSessions>;

export type QuestionPool = InferSelectModel<typeof schemaSqlite.questionPools>;
export type NewQuestionPool = InferInsertModel<typeof schemaSqlite.questionPools>;

export type Exam = InferSelectModel<typeof schemaSqlite.exams>;
export type NewExam = InferInsertModel<typeof schemaSqlite.exams>;

export type Question = InferSelectModel<typeof schemaSqlite.questions>;
export type NewQuestion = InferInsertModel<typeof schemaSqlite.questions>;

export type Submission = InferSelectModel<typeof schemaSqlite.submissions>;
export type NewSubmission = InferInsertModel<typeof schemaSqlite.submissions>;

export type Answer = InferSelectModel<typeof schemaSqlite.answers>;
export type NewAnswer = InferInsertModel<typeof schemaSqlite.answers>;

export type ActivityLog = InferSelectModel<typeof schemaSqlite.activityLogs>;
export type NewActivityLog = InferInsertModel<typeof schemaSqlite.activityLogs>;

export type ExamToken = InferSelectModel<typeof schemaSqlite.examTokens>;
export type NewExamToken = InferInsertModel<typeof schemaSqlite.examTokens>;

export type SchoolSetting = InferSelectModel<typeof schemaSqlite.schoolSettings>;
export type NewSchoolSetting = InferInsertModel<typeof schemaSqlite.schoolSettings>;

export type SavedFilter = InferSelectModel<typeof schemaSqlite.savedFilters>;
export type NewSavedFilter = InferInsertModel<typeof schemaSqlite.savedFilters>;

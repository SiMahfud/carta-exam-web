import * as schemaSqlite from './schemas/sqlite';
import * as schemaMysql from './schemas/mysql';
import * as schemaPg from './schemas/postgresql';

const provider = process.env.DATABASE_PROVIDER || 'sqlite';

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

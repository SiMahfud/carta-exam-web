# CartaExam Database Schema Documentation

This document describes the database schema for the CartaExam application. The application uses SQLite with Drizzle ORM.

## Overview

The database is organized into several modules:
- **User Management**: Users, roles.
- **Subject & Class Management**: Subjects, classes, student enrollments.
- **Question Bank Management**: Question banks, questions.
- **Scoring Templates**: Reusable scoring configurations.
- **Exam Templates & Sessions**: Exam configurations and scheduled sessions.
- **Legacy/Integration**: Tables for backward compatibility and active exam taking.

## Tables

### User Management

#### `users`
Stores user information for admins, teachers, and students.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Full name |
| `username` | TEXT | Unique username |
| `password` | TEXT | Hashed password |
| `role` | TEXT | Enum: `admin`, `teacher`, `student` |
| `created_at` | INTEGER | Timestamp |

### Subject & Class Management

#### `subjects`
Subjects taught in the school.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Subject name |
| `code` | TEXT | Unique subject code (e.g., "MAT") |
| `description` | TEXT | Optional description |
| `created_at` | INTEGER | Timestamp |

#### `classes`
Classes or grade levels.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Class name (e.g., "X-1") |
| `grade` | INTEGER | Grade level (10, 11, 12) |
| `academic_year` | TEXT | Academic year (e.g., "2025/2026") |
| `teacher_id` | TEXT | Foreign Key -> `users.id` (Homeroom teacher) |
| `created_at` | INTEGER | Timestamp |

#### `class_students`
Many-to-many relationship between classes and students.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `class_id` | TEXT | Foreign Key -> `classes.id` |
| `student_id` | TEXT | Foreign Key -> `users.id` |
| `enrolled_at` | INTEGER | Timestamp |

### Question Bank Management

#### `question_banks`
Collections of questions for a specific subject.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `subject_id` | TEXT | Foreign Key -> `subjects.id` |
| `name` | TEXT | Bank name |
| `description` | TEXT | Optional description |
| `created_by` | TEXT | Foreign Key -> `users.id` |
| `created_at` | INTEGER | Timestamp |
| `updated_at` | INTEGER | Timestamp |

#### `bank_questions`
Individual questions within a bank.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `bank_id` | TEXT | Foreign Key -> `question_banks.id` |
| `type` | TEXT | Enum: `mc`, `complex_mc`, `matching`, `short`, `essay` |
| `content` | JSON | Question content and options |
| `answer_key` | JSON | Correct answer data |
| `tags` | JSON | Array of tags |
| `difficulty` | TEXT | Enum: `easy`, `medium`, `hard` |
| `default_points` | INTEGER | Default points for the question |
| `created_by` | TEXT | Foreign Key -> `users.id` |
| `created_at` | INTEGER | Timestamp |

### Scoring Templates

#### `scoring_templates`
Reusable scoring rules.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Template name |
| `default_weights` | JSON | Weights for each question type |
| `allow_partial_credit` | BOOLEAN | Whether to allow partial credit |
| `partial_credit_rules` | JSON | Rules for partial credit calculation |

### Exam Templates & Sessions

#### `exam_templates`
Blueprints for exams, defining rules, timing, and question selection.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `name` | TEXT | Template name |
| `subject_id` | TEXT | Foreign Key -> `subjects.id` |
| `bank_ids` | JSON | Array of source bank IDs |
| `duration_minutes` | INTEGER | Exam duration |
| `randomize_questions` | BOOLEAN | Randomize question order |
| `randomize_answers` | BOOLEAN | Randomize answer options |
| `enable_lockdown` | BOOLEAN | Enable browser lockdown |
| `created_by` | TEXT | Foreign Key -> `users.id` |

#### `exam_sessions`
Scheduled instances of an exam template.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `template_id` | TEXT | Foreign Key -> `exam_templates.id` |
| `session_name` | TEXT | Name of the session |
| `start_time` | INTEGER | Scheduled start time |
| `end_time` | INTEGER | Scheduled end time |
| `status` | TEXT | Enum: `scheduled`, `active`, `completed`, `cancelled` |
| `target_type` | TEXT | Enum: `class`, `individual` |
| `target_ids` | JSON | IDs of assigned classes or students |

#### `question_pools`
Stores the specific set of questions generated for a student in a session (if randomization is used).

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `session_id` | TEXT | Foreign Key -> `exam_sessions.id` |
| `student_id` | TEXT | Foreign Key -> `users.id` |
| `selected_questions` | JSON | Array of `bank_questions.id` |
| `question_order` | JSON | Order of questions |

### Exam Execution (Legacy/Active)

#### `exams`
(Legacy/Integration) Represents an exam instance.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `title` | TEXT | Exam title |
| `session_id` | TEXT | Foreign Key -> `exam_sessions.id` |
| `duration_minutes` | INTEGER | Duration |

#### `questions`
Questions instantiated for a specific exam.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `exam_id` | TEXT | Foreign Key -> `exams.id` |
| `bank_question_id` | TEXT | Foreign Key -> `bank_questions.id` |
| `type` | TEXT | Question type |
| `content` | JSON | Content |
| `answer_key` | JSON | Answer key |

#### `submissions`
Student submissions for an exam.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `exam_id` | TEXT | Foreign Key -> `exams.id` |
| `user_id` | TEXT | Foreign Key -> `users.id` |
| `session_id` | TEXT | Foreign Key -> `exam_sessions.id` |
| `score` | INTEGER | Total score |
| `status` | TEXT | Enum: `in_progress`, `completed`, `terminated` |
| `violation_count` | INTEGER | Number of detected violations |

#### `answers`
Individual answers within a submission.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `submission_id` | TEXT | Foreign Key -> `submissions.id` |
| `question_id` | TEXT | Foreign Key -> `questions.id` |
| `student_answer` | JSON | The student's answer |
| `is_correct` | BOOLEAN | Correctness status |
| `score` | INTEGER | Score for this answer |

#### `exam_tokens`
Dynamic tokens for exam access.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT | Primary Key (UUID) |
| `exam_id` | TEXT | Foreign Key -> `exams.id` |
| `token` | TEXT | The token string |
| `valid_until` | INTEGER | Expiration time |

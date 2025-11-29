# CartaExam API Documentation

This document outlines the API endpoints available in the CartaExam application. All API routes are located under `/api`.

## Base URL
`/api`

## Endpoints

### Classes
Manage classes and student enrollments.

- **GET** `/api/classes`
  - Retrieve a list of all classes.
- **POST** `/api/classes`
  - Create a new class.
- **GET** `/api/classes/[id]`
  - Retrieve details of a specific class.
- **PUT** `/api/classes/[id]`
  - Update a specific class.
- **DELETE** `/api/classes/[id]`
  - Delete a specific class.

### Subjects
Manage subjects.

- **GET** `/api/subjects`
  - Retrieve a list of all subjects.
- **POST** `/api/subjects`
  - Create a new subject.
- **GET** `/api/subjects/[id]`
  - Retrieve details of a specific subject.
- **PUT** `/api/subjects/[id]`
  - Update a specific subject.
- **DELETE** `/api/subjects/[id]`
  - Delete a specific subject.

### Question Banks
Manage question banks and questions.

- **GET** `/api/question-banks`
  - List all question banks.
- **POST** `/api/question-banks`
  - Create a new question bank.
- **GET** `/api/question-banks/[id]`
  - Get details of a question bank (including questions).
- **PUT** `/api/question-banks/[id]`
  - Update a question bank.
- **DELETE** `/api/question-banks/[id]`
  - Delete a question bank.

### Exam Templates
Manage exam templates (blueprints).

- **GET** `/api/exam-templates`
  - List all exam templates.
- **POST** `/api/exam-templates`
  - Create a new exam template.
- **GET** `/api/exam-templates/[id]`
  - Get details of an exam template.
- **PUT** `/api/exam-templates/[id]`
  - Update an exam template.
- **DELETE** `/api/exam-templates/[id]`
  - Delete an exam template.

### Exam Sessions
Manage scheduled exam sessions.

- **GET** `/api/exam-sessions`
  - List all exam sessions.
- **POST** `/api/exam-sessions`
  - Schedule a new exam session.
- **GET** `/api/exam-sessions/[id]`
  - Get details of an exam session.
- **PUT** `/api/exam-sessions/[id]`
  - Update an exam session (e.g., change status, time).
- **DELETE** `/api/exam-sessions/[id]`
  - Cancel/Delete an exam session.

### Grading
Manage grading of submissions.

- **GET** `/api/grading`
  - List submissions requiring grading.
- **GET** `/api/grading/[submissionId]`
  - Get a specific submission for grading.
- **POST** `/api/grading/[submissionId]`
  - Submit grades for a submission.

### Scoring Templates
Manage reusable scoring rules.

- **GET** `/api/scoring-templates`
  - List scoring templates.
- **POST** `/api/scoring-templates`
  - Create a scoring template.

### Users
Manage users (students, teachers, admins).

- **GET** `/api/users`
  - List users.
- **POST** `/api/users`
  - Create a new user.

### Student
Endpoints for student exam taking.

- **GET** `/api/student/exams`
  - List assigned exams for the current student.
- **POST** `/api/student/exam/[examId]/start`
  - Start an exam session.
- **POST** `/api/student/exam/[examId]/submit`
  - Submit an exam.
- **POST** `/api/student/exam/[examId]/answer`
  - Save an answer.

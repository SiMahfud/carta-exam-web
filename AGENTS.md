# 🤖 AGENTS.md - AI Agent Development Guide

> **Version**: 1.0.0  
> **Last Updated**: December 2, 2025  
> **Purpose**: This document provides comprehensive context for AI coding agents (like GitHub Copilot, Cursor, Codeium, or Claude) to effectively contribute to the CartaExam project.

---

## 📚 Project Overview

**CartaExam** is a modern, web-based exam platform for SMAN 1 Campurdarat, built with **Next.js 14 (App Router)**, **SQLite/Drizzle ORM**, **Tailwind CSS**, and **shadcn/ui**.

### Core Purpose
Enable secure, efficient, and user-friendly digital examinations for teachers and students with features like:
- Multi-type question support (MC, Complex MC, Matching, Short Answer, Essay)
- Exam security with lockdown mode
- Real-time monitoring and analytics
- Auto-grading and manual grading workflows

---

## 🏗️ Architecture Quick Reference

### Tech Stack
```
Frontend:  Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
Backend:   Next.js API Routes (serverless functions)
Database:  SQLite (development) → PostgreSQL (production planned)
ORM:       Drizzle ORM
Styling:   Tailwind CSS + CSS-in-JS
UI Kit:    shadcn/ui (Radix UI primitives)
Icons:     Lucide React
Forms:     React Hook Form + Zod validation
Editor:    TipTap (rich text with math support via KaTeX)
State:     Zustand (minimal usage), React Context
```

### Project Structure
```
carta-exam-web/
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard and management
│   │   ├── api/               # API routes (backend)
│   │   ├── student/           # Student exam interface
│   │   └── login/             # Authentication
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── exam/              # Exam-specific components
│   │   ├── question-editor/   # Question type editors
│   │   └── grading/           # Grading interface components
│   ├── lib/                   # Utilities and configurations
│   │   ├── schema.ts          # Database schema (Drizzle)
│   │   └── db.ts              # Database connection
│   ├── hooks/                 # Custom React hooks
│   └── middleware.ts          # Next.js middleware (auth, etc.)
├── docs/                      # Documentation
│   ├── api_documentation.md
│   ├── database_schema.md
│   └── user_guide_teachers.md
├── public/                    # Static assets
├── ROADMAP.md                 # Development roadmap
├── AGENTS.md                  # This file
└── CONTRIBUTING.md            # Contribution guidelines
```

---

## 🗄️ Database Schema Summary

### Key Tables
```typescript
// Core Entities
users              // Admin, teachers, students (role-based)
subjects           // School subjects (Math, Science, etc.)
classes            // Class groups (X-1, XI IPA 2, etc.)
class_students     // Many-to-many enrollment

// Question Management
question_banks     // Collections of questions per subject
bank_questions     // Individual questions (5 types)

// Exam System
exam_templates     // Reusable exam configurations
exam_sessions      // Scheduled exam instances
question_pools     // Per-student randomized question sets

// Execution (Legacy but active)
exams              // Exam instances
questions          // Exam-specific questions
submissions        // Student exam submissions
answers            // Individual answers per submission

// Support
activity_logs      // System activity tracking
exam_tokens        // Dynamic access tokens
scoring_templates  // Reusable grading configs
```

**Full Schema**: See `src/lib/schema.ts` and `docs/database_schema.md`

---

## 📝 Coding Standards & Conventions

### General Principles
1. **TypeScript First**: Always use TypeScript with proper typing (avoid `any`)
2. **Functional Components**: Use React function components with hooks
3. **Server Components**: Prefer Next.js Server Components unless interactivity needed
4. **API Routes**: Follow RESTful conventions where possible
5. **Error Handling**: Always handle errors gracefully with user-friendly messages

### File Naming
- **Components**: PascalCase (e.g., `ExamSession.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Pages**: Next.js convention (e.g., `page.tsx`, `[id]/page.tsx`)
- **API Routes**: kebab-case (e.g., `exam-sessions/route.ts`)

### Code Style
```typescript
// ✅ Good: Explicit types, clear naming
interface ExamSessionProps {
  sessionId: string;
  studentId: string;
}

export function ExamSession({ sessionId, studentId }: ExamSessionProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Clear, descriptive function names
  const handleSubmitExam = async () => {
    try {
      await submitExam(sessionId, studentId);
      toast.success('Exam submitted successfully');
    } catch (error) {
      toast.error('Failed to submit exam');
      console.error(error);
    }
  };
  
  return (
    // ...
  );
}

// ❌ Avoid: Any types, unclear names
export function Component({ data }: any) {
  const handle = () => {
    // ...
  };
}
```

### Component Organization
```typescript
// 1. Imports (grouped: React, third-party, local)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component Definition
export function MyComponent({ prop1, prop2 }: Props) {
  // 4. Hooks (useState, useEffect, custom hooks)
  const [state, setState] = useState();
  
  // 5. Event Handlers
  const handleClick = () => {
    // ...
  };
  
  // 6. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 7. Render
  return (
    // ...
  );
}
```

### API Route Structure
```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Input validation schema
const requestSchema = z.object({
  field: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const validatedData = requestSchema.parse(body);
    
    // 2. Business logic
    const result = await db.query.users.findFirst({
      where: eq(users.id, validatedData.field),
    });
    
    // 3. Return response
    return NextResponse.json({ 
      success: true, 
      data: result 
    });
    
  } catch (error) {
    // 4. Error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 UI/UX Guidelines

### Design System
- **Colors**: Follow Tailwind's color system with custom theme in `tailwind.config.ts`
- **Typography**: Use Tailwind's text utility classes
- **Spacing**: Use Tailwind's spacing scale (4px increments)
- **Components**: Use shadcn/ui components for consistency

### Component Usage
```typescript
// ✅ Use shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Standard button variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>

// Consistent spacing
<div className="space-y-4">  {/* Vertical spacing */}
<div className="flex gap-4">  {/* Horizontal spacing */}
```

### Responsive Design
```typescript
// ✅ Mobile-first approach
<div className="
  p-4          // Mobile: padding-4
  md:p-6       // Tablet: padding-6
  lg:p-8       // Desktop: padding-8
  grid 
  grid-cols-1  // Mobile: 1 column
  md:grid-cols-2  // Tablet: 2 columns
  lg:grid-cols-3  // Desktop: 3 columns
  gap-4
">
```

### Accessibility
```typescript
// ✅ Always include accessibility attributes
<button
  aria-label="Delete question"
  aria-describedby="delete-description"
  onClick={handleDelete}
>
  <TrashIcon />
</button>
<span id="delete-description" className="sr-only">
  This will permanently delete the question
</span>

// ✅ Keyboard navigation
<div 
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleAction();
    }
  }}
>
```

---

## 🔐 Security Best Practices

### Authentication
```typescript
// ✅ Check authentication in API routes
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(); // Implement this helper
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Continue with authenticated logic
}
```

### Input Validation
```typescript
// ✅ Always validate user input with Zod
import { z } from 'zod';

const questionSchema = z.object({
  type: z.enum(['mc', 'complex_mc', 'matching', 'short', 'essay']),
  content: z.object({
    question: z.string().min(1, 'Question is required'),
    options: z.array(z.string()).optional(),
  }),
  answerKey: z.unknown(), // Validate based on type
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

// Use it
const validatedData = questionSchema.parse(userInput);
```

### SQL Injection Prevention
```typescript
// ✅ Drizzle ORM automatically prevents SQL injection
// Use parameterized queries, NOT string concatenation

// ✅ Good
import { eq } from 'drizzle-orm';
const user = await db.query.users.findFirst({
  where: eq(users.username, inputUsername),
});

// ❌ Never do this (raw SQL with concatenation)
db.run(`SELECT * FROM users WHERE username = '${inputUsername}'`);
```

---

## 🧪 Testing Guidelines

### Unit Tests (To be implemented)
```typescript
// Example test structure (Vitest)
import { describe, it, expect } from 'vitest';
import { calculateScore } from '@/lib/grading';

describe('calculateScore', () => {
  it('should calculate correct score for MC questions', () => {
    const result = calculateScore({
      type: 'mc',
      studentAnswer: 'A',
      correctAnswer: 'A',
      points: 1,
    });
    
    expect(result).toBe(1);
  });
  
  it('should return 0 for incorrect MC answers', () => {
    const result = calculateScore({
      type: 'mc',
      studentAnswer: 'B',
      correctAnswer: 'A',
      points: 1,
    });
    
    expect(result).toBe(0);
  });
});
```

### E2E Tests (To be implemented)
```typescript
// Example Playwright test
import { test, expect } from '@playwright/test';

test('teacher can create exam session', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/exam-sessions');
  
  await page.click('text=Create Session');
  await page.fill('[name="sessionName"]', 'Test Exam');
  await page.click('text=Save');
  
  await expect(page.locator('text=Test Exam')).toBeVisible();
});
```

---

## 📦 Common Tasks & Code Snippets

### Adding a New API Endpoint

**Step 1**: Create route file
```bash
# Create: src/app/api/my-feature/route.ts
```

**Step 2**: Implement handler
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  // define your schema
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    
    // Your logic here
    const result = await db.insert(myTable).values(data);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Adding a New Database Table

**Step 1**: Update schema
```typescript
// src/lib/schema.ts
export const myNewTable = sqliteTable('my_new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
});
```

**Step 2**: Push to database
```bash
npm run db:push
# or
npx drizzle-kit push
```

### Adding a New shadcn/ui Component

```bash
# Use the CLI
npx shadcn@latest add [component-name]

# Example: Add a dialog
npx shadcn@latest add dialog
```

### Creating a New Page

**Step 1**: Create page file
```typescript
// src/app/my-page/page.tsx
export default function MyPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Page</h1>
      {/* Content */}
    </div>
  );
}
```

**Step 2**: Add to navigation (if needed)
```typescript
// Update relevant navigation component
```

---

## 🐛 Common Issues & Solutions

### Issue: Database Lock Error
**Problem**: SQLite database is locked during concurrent writes  
**Solution**: 
1. Ensure proper connection handling
2. Use WAL mode (already configured)
3. For production, migrate to PostgreSQL

### Issue: Build Errors with Dynamic Imports
**Problem**: Next.js can't optimize certain dynamic imports  
**Solution**:
```typescript
// ✅ Use dynamic import with ssr: false for client-only components
import dynamic from 'next/dynamic';

const ClientComponent = dynamic(
  () => import('@/components/ClientComponent'),
  { ssr: false }
);
```

### Issue: Hydration Mismatch
**Problem**: Server and client render differently  
**Solution**:
```typescript
// ✅ Use useEffect for client-only rendering
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;
```

### Issue: TypeScript Errors with Drizzle
**Problem**: Type errors with Drizzle queries  
**Solution**:
```typescript
// ✅ Use proper types from schema
import { users } from '@/lib/schema';
import type { InferSelectModel } from 'drizzle-orm';

type User = InferSelectModel<typeof users>;
```

---

## 🎯 Feature Implementation Checklist

When implementing a new feature, follow this checklist:

### Planning
- [ ] Review ROADMAP.md for context and priority
- [ ] Check existing implementations for similar features
- [ ] Design database schema changes (if needed)
- [ ] Plan API endpoints and data flow

### Implementation
- [ ] Create/update database schema
- [ ] Implement API endpoints with validation
- [ ] Create UI components
- [ ] Add proper error handling
- [ ] Implement loading states
- [ ] Add accessibility attributes
- [ ] Ensure responsive design

### Quality Assurance
- [ ] Test all user flows
- [ ] Check mobile responsiveness
- [ ] Verify accessibility (keyboard nav, screen readers)
- [ ] Check for console errors/warnings
- [ ] Validate TypeScript types (no `any`)
- [ ] Test edge cases and error scenarios

### Documentation
- [ ] Update API documentation (if new endpoints)
- [ ] Add code comments for complex logic
- [ ] Update ROADMAP.md (check off completed items)
- [ ] Update user guide (if user-facing feature)

---

## 🤝 Working with Question Types

Each question type has specific data structures:

### Multiple Choice (mc)
```typescript
content: {
  question: string;           // Rich text HTML
  options: string[];          // Array of 5 options (A-E)
}
answerKey: {
  correct: number;            // Index of correct option (0-4)
}
```

### Complex Multiple Choice (complex_mc)
```typescript
content: {
  question: string;
  options: string[];          // 2-10 options
}
answerKey: {
  correct: number[];          // Array of correct indices
}
```

### Matching (matching)
```typescript
content: {
  question: string;
  leftItems: string[];        // Items on left
  rightItems: string[];       // Items on right
}
answerKey: {
  pairs: Record<number, number>;  // { leftIndex: rightIndex }
}
```

### Short Answer (short)
```typescript
content: {
  question: string;
}
answerKey: {
  acceptedAnswers: string[];  // Case-insensitive matching
}
```

### Essay (essay)
```typescript
content: {
  question: string;
  maxWords?: number;          // Optional word limit
}
answerKey: {
  rubric?: string;            // Grading guidelines
}
```

---

## 📚 Useful Utilities & Libraries

### Date Formatting
```typescript
import { format } from 'date-fns';

// Format timestamp
const formatted = format(new Date(timestamp * 1000), 'PPp');
// Output: "Dec 2, 2025, 10:30 PM"
```

### Database Queries
```typescript
import { db } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

// Find one
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// Find many with conditions
const sessions = await db.query.examSessions.findMany({
  where: and(
    eq(examSessions.status, 'active'),
    eq(examSessions.createdBy, teacherId)
  ),
  orderBy: [desc(examSessions.startTime)],
});

// With relations
const sessionWithTemplate = await db.query.examSessions.findFirst({
  where: eq(examSessions.id, sessionId),
  with: {
    template: true,
  },
});
```

### Rich Text Handling
```typescript
// TipTap editor is used for rich text
// Content is stored as HTML string
// Remember to sanitize when displaying
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(content);
```

---

## 🚀 Performance Optimization Tips

### 1. Use Server Components by Default
```typescript
// ✅ Server Component (default in App Router)
async function ExamList() {
  const exams = await db.query.exams.findMany();
  return <div>{/* Render exams */}</div>;
}

// Only use client components when needed
'use client';
import { useState } from 'react';
```

### 2. Lazy Load Heavy Components
```typescript
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () => import('@/components/RichTextEditor'),
  { ssr: false, loading: () => <Skeleton /> }
);
```

### 3. Optimize Images
```typescript
import Image from 'next/image';

<Image
  src="/path/to/image.jpg"
  alt="Description"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:..." // Low-quality placeholder
/>
```

### 4. Database Indexing
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_exam_id ON submissions(exam_id);
CREATE INDEX idx_answers_submission_id ON answers(submission_id);
```

---

## 📖 Resources & References

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)
- [Zod Validation](https://zod.dev)

### Project-Specific Docs
- `docs/api_documentation.md` - API endpoint reference
- `docs/database_schema.md` - Complete database schema
- `docs/user_guide_teachers.md` - Feature descriptions
- `ROADMAP.md` - Development priorities and tasks

### Learning Resources
- [Next.js Learn Course](https://nextjs.org/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Patterns](https://reactpatterns.com)

---

## 🎓 Best Practices for AI Agents

### When Generating Code
1. **Read Context First**: Always check related files before generating
2. **Follow Patterns**: Match existing code style and patterns
3. **Type Safety**: Use TypeScript types, avoid `any`
4. **Error Handling**: Always include try-catch and error states
5. **Accessibility**: Include ARIA labels and keyboard support
6. **Responsive**: Test on multiple screen sizes
7. **Comments**: Add comments for complex logic only

### When Refactoring
1. **Test First**: Ensure tests exist or add them
2. **Small Steps**: Make incremental changes
3. **Preserve Behavior**: Don't change functionality inadvertently
4. **Update Types**: Keep TypeScript types in sync
5. **Check Dependencies**: Ensure no breaking changes

### When Debugging
1. **Reproduce**: Understand the issue completely
2. **Check Logs**: Look at console and server logs
3. **Use Debugger**: Set breakpoints for complex issues
4. **Git Blame**: Check when code was last changed
5. **Ask Questions**: If unsure, ask human developers

---

## ✅ Quick Reference Checklist

### Before Committing Code
- [ ] Code compiles without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console errors/warnings in browser
- [ ] Follows project coding standards
- [ ] Includes proper error handling
- [ ] Responsive on mobile/tablet/desktop
- [ ] Accessible (keyboard nav, screen readers)
- [ ] Updated relevant documentation

### Before Starting a Feature
- [ ] Read ROADMAP.md for context
- [ ] Check if similar feature exists
- [ ] Understand data flow and dependencies
- [ ] Plan database changes (if needed)
- [ ] Design API contracts

---

## 🆘 Getting Help

### For AI Agents
1. Check this `AGENTS.md` file first
2. Review relevant documentation in `docs/`
3. Search existing code for similar implementations
4. Check ROADMAP.md for feature specifications

### For Human Developers
1. GitHub Discussions for questions
2. Issues for bug reports
3. CONTRIBUTING.md for contribution process

---

**Remember**: This project serves real students and teachers. Prioritize security, reliability, and user experience in all implementations.

**Happy Coding! 🚀**

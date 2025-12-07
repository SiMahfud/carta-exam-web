# 🗺️ CartaExam Development Roadmap

> **Status Proyek**: 🟡 Beta - Feature-Complete Prototype → Production Ready
> 
> **Last Updated**: December 7, 2025

---

## 📊 Progress Overview

```
Core Features:        ████████████████████░░ 90%
Production Ready:     ████████░░░░░░░░░░░░░░ 40%
Advanced Features:    ███░░░░░░░░░░░░░░░░░░░ 15%
```

---

## 🎯 Milestone Status

| Milestone | Target | Status | Progress |
|-----------|--------|--------|----------|
| **Phase 1: Stabilization** | Jan 2026 | 🟡 In Progress | 60% |
| **Phase 2: UX Enhancement** | Mar 2026 | 🟡 In Progress | 25% |
| **Phase 3: Advanced Features** | Jun 2026 | 🔵 Planned | 0% |
| **Phase 4: AI & Scale** | Dec 2026 | 🔵 Planned | 0% |

---

## ✅ Completed Features

### Core Functionality
- [x] **User Management System**
  - Multi-role support (admin, teacher, student)
  - Basic authentication
  - User CRUD operations
  
- [x] **Question Bank System**
  - 6 question types (MC, Complex MC, Matching, Short Answer, Essay, True/False)
  - Rich text editor with image support
  - Tag and difficulty management
  - Question CRUD operations
  - **DOCX Import** (Dec 7, 2025):
    - [x] Import questions from Word documents
    - [x] Replace All mode (clear existing before import)
    - [x] Preview with KaTeX math rendering
    - [x] Base64 image extraction to file system
    - [x] Zod validation on import
  
- [x] **Exam Management**
  - Exam templates
  - Exam sessions with scheduling
  - **Advanced Question Randomization** (Dec 6, 2025):
    - [x] Mode: Shuffle all questions
    - [x] Mode: Shuffle by question type (only selected types)
    - [x] Mode: Shuffle except type (all except selected types)
    - [x] Mode: Shuffle specific numbers (only selected positions)
    - [x] Answer option shuffle (MC, Complex MC, True/False, Matching)
  - Duration and timing controls
  
- [x] **Exam Security (Lockdown)**
  - Tab switch detection
  - Copy-paste prevention
  - Fullscreen mode enforcement
  - Violation tracking
  - Auto-termination on max violations
  - Dynamic token system
  - **New Security Features**:
    - [x] Detailed violation settings (per-type toggle)
    - [x] Violation modes (Strict/Lenient)
    - [x] Cooldown configuration
    - [x] "Reset Violations" admin action
  
- [x] **Grading System**
  - Auto-grading for objective questions
  - Manual grading interface for essays
  - Grading dashboard with filters
  - Detailed answer visualization
  - Matching question result viewer
  
- [x] **Admin Dashboard**
  - Real-time statistics
  - Activity logs
  - Health monitoring
  
- [x] **Data Management**
  - Subject management
  - Class management
  - Student enrollment
  - Academic year tracking

---

## 🚧 Phase 1: Stabilization & Polish (Priority: 🔴 HIGH)

> **Target**: January 2026 | **Duration**: 1-2 months

### 1.1 UI/UX Polish [50%]

#### Dark Mode Support
- [x] Design system prepared (Tailwind classes)
- [ ] **Implement theme toggle** `Priority: HIGH`
  - **Tech**: Tailwind dark: variant, localStorage persistence
  - **Files**: `src/app/layout.tsx`, create `src/components/theme-provider.tsx`
  - **Effort**: 4 hours
  - **Dependencies**: None
  
- [ ] **Dark mode color palette**
  - Update `tailwind.config.ts` with dark mode colors
  - Test all pages for contrast
  - **Effort**: 6 hours
  
- [ ] **Dark mode for charts and visualizations**
  - Ensure all visual elements support dark mode
  - **Effort**: 3 hours

#### Visual Enhancements
- [ ] **Smooth transitions and animations** `Priority: HIGH`
  - Add CSS transitions to all interactive elements
  - Page transition animations
  - **Tech**: Tailwind animate, Framer Motion (optional)
  - **Effort**: 8 hours
  
- [ ] **Skeleton loaders** `Priority: MEDIUM`
  - Replace loading spinners with skeleton screens
  - **Files**: `src/components/ui/skeleton.tsx` (already in shadcn/ui)
  - Implement in: Admin dashboard, question banks, exam sessions
  - **Effort**: 6 hours
  
- [ ] **Empty states improvements**
  - Design empty state illustrations
  - Add helpful CTAs in empty states
  - **Files**: Each page component
  - **Effort**: 5 hours
  
- [ ] **Micro-interactions**
  - Button hover/press animations
  - Card hover effects
  - Icon animations
  - **Effort**: 4 hours

#### Responsive Design
- [ ] **Mobile optimization** `Priority: HIGH`
  - Audit all pages on mobile devices
  - Fix layout issues
  - Touch-friendly buttons (min 44x44px)
  - **Effort**: 12 hours
  
- [ ] **Tablet optimization**
  - Optimize layouts for tablet breakpoint
  - **Effort**: 6 hours

### 1.2 Performance Optimization [30%]

- [x] **Code splitting and lazy loading** `Priority: HIGH` ✅ **Completed: Dec 4, 2025**
  - [x] Split large components into smaller, manageable pieces
  - [x] `ExamTemplateWizard`: 7 step components
  - [x] `TakeExamPage`: 4 sub-components
  - [ ] Implement dynamic imports for heavy components (future enhancement)
  - **Tech**: Component composition pattern
  - **Files**: `src/components/exam-templates/wizard-steps/*`, `src/components/exam/take-exam/*`
  - **Actual Effort**: 12 hours
  
- [ ] **Image optimization**
  - Convert all `<img>` to Next.js `<Image>`
  - Add proper width/height
  - Implement blur placeholders
  - **Effort**: 6 hours
  
- [x] **Database query optimization** `Priority: MEDIUM` ✅ **Completed: Dec 4, 2025**
  - [x] Added indexes to frequently queried columns
  - [ ] Review and optimize N+1 queries (ongoing)
  - **Files**: `src/lib/schema.ts`, API routes
  - **Actual Effort**: 6 hours
  
- [ ] **API response caching**
  - Implement cache headers
  - Use Next.js revalidation
  - **Effort**: 6 hours

### 1.3 Security Hardening [20%]

- [ ] **Input validation** `Priority: HIGH`
  - Audit all API endpoints
  - Add Zod validation schemas
  - Sanitize user inputs
  - **Files**: All API routes
  - **Effort**: 12 hours
  
- [ ] **Password strength requirements**
  - Minimum length, complexity
  - Add password strength indicator
  - **Files**: `src/app/login/page.tsx`, user management
  - **Effort**: 4 hours
  
- [ ] **Rate limiting** `Priority: HIGH`
  - Implement rate limiting middleware
  - Protect login, API endpoints
  - **Tech**: Use middleware with in-memory store or Redis
  - **Files**: `src/middleware.ts`
  - **Effort**: 6 hours
  
- [ ] **HTTPS enforcement**
  - Configure SSL/TLS for production
  - Redirect HTTP to HTTPS
  - **Effort**: 2 hours (deployment config)
  
- [ ] **Security headers**
  - Add CSP, HSTS, X-Frame-Options
  - **Files**: `next.config.mjs`
  - **Effort**: 3 hours

### 1.4 Testing Infrastructure [0%]

- [ ] **Unit tests setup** `Priority: HIGH`
  - Setup Jest/Vitest
  - Write tests for utility functions
  - **Files**: Create `__tests__` directories
  - **Effort**: 16 hours
  
- [ ] **Integration tests**
  - Test API endpoints
  - Test database operations
  - **Effort**: 20 hours
  
- [ ] **E2E tests**
  - Setup Playwright
  - Write critical user flow tests
  - **Effort**: 24 hours

### 1.5 Error Handling & Logging [10%]

- [ ] **Global error boundary** `Priority: MEDIUM`
  - Catch and display errors gracefully
  - **Files**: `src/app/error.tsx`
  - **Effort**: 4 hours
  
- [ ] **Structured logging**
  - Implement logging with levels
  - **Tech**: Winston or Pino
  - **Effort**: 8 hours
  
- [ ] **Error tracking**
  - Integrate Sentry or similar
  - **Effort**: 4 hours

---

## 🎨 Phase 2: User Experience Enhancement (Priority: 🟡 MEDIUM)

> **Target**: March 2026 | **Duration**: 2-3 months

### 2.1 Onboarding & Help System [0%]

- [ ] **First-time user tutorial** `Priority: HIGH`
  - Interactive walkthrough for teachers
  - Product tour library integration
  - **Tech**: Driver.js or Intro.js
  - **Effort**: 16 hours
  
- [ ] **Contextual help**
  - Add tooltips throughout app
  - Help icons with explanations
  - **Tech**: shadcn/ui Tooltip
  - **Effort**: 12 hours
  
- [ ] **Help Center/FAQ**
  - Create FAQ page
  - Searchable help articles
  - **Files**: Create `src/app/help/page.tsx`
  - **Effort**: 20 hours
  
- [ ] **Video tutorials**
  - Record and embed tutorial videos
  - **Effort**: 40 hours (content creation)

### 2.2 Advanced Search & Filtering [33%]

- [x] **Global search (Cmd+K)** `Priority: HIGH` ✅ **Completed: Dec 4, 2025**
  - [x] Search across questions, exams, students, classes, subjects
  - [x] Keyboard shortcut (Ctrl+K / Cmd+K)
  - [x] Categorized results with keyboard navigation
  - [x] Recent searches (localStorage)
  - **Files**: `src/components/global-search/GlobalSearch.tsx`, `src/app/api/search/route.ts`
  - **Actual Effort**: 4 hours
  
- [ ] **Saved filters**
  - Save common filter combinations
  - Quick filter presets
  - **Tech**: Store in user preferences
  - **Effort**: 12 hours
  
- [ ] **Advanced filter UI**
  - Multi-criteria filter builder
  - Date range pickers
  - **Effort**: 16 hours

### 2.3 Bulk Operations [50%]

- [x] **Bulk user management** `Priority: HIGH` ✅ **Completed: Dec 4, 2025**
  - [x] Excel import with preview and validation
  - [x] Smart action detection (auto ADD/UPDATE based on ID)
  - [x] Export users with Petunjuk and Contoh sheets
  - [x] Auto-create classes during import
  - [x] Bulk update names, passwords, class assignments
  - [x] Bulk delete with confirmation
  - **Tech**: xlsx library
  - **Files**: `src/components/bulk-import/BulkUserManager.tsx`, `src/app/api/users/bulk-import/route.ts`, `src/app/api/users/bulk-export/route.ts`
  - **Actual Effort**: 8 hours
  
- [x] **Bulk question import** ✅ **Completed: Dec 7, 2025**
  - [x] Import questions from DOCX templates
  - [x] Replace All mode (clear existing before import)
  - [x] Preview with KaTeX math rendering
  - [x] Base64 image extraction and file system storage
  - [x] Zod validation for data integrity
  - **Files**: `src/components/question-editor/ImportQuestionsDialog.tsx`, `src/lib/image-processor.ts`
  - **Actual Effort**: 8 hours
  
- [x] **Bulk export features** ✅ **Completed: Dec 4, 2025**
  - [x] Export exam results to Excel (per session)
  - [x] 3 sheets: Rekap Nilai, Jawaban Essay, Statistik
  - **Files**: `src/app/api/exam-sessions/[id]/export/route.ts`
  - **Actual Effort**: 2 hours
  
- [ ] **Batch actions**
  - Multi-select interface
  - Bulk delete, archive, assign
  - **Effort**: 16 hours

### 2.4 Notification System [0%]

- [ ] **In-app notifications** `Priority: HIGH`
  - Notification center UI
  - Notification bell with badge
  - **Files**: Create `src/components/notifications/`
  - **Tech**: Real-time updates with polling or WebSockets
  - **Effort**: 20 hours
  
- [ ] **Email notifications** `Priority: HIGH`
  - Email service integration
  - **Tech**: Nodemailer or Resend
  - Email templates
  - **Files**: Create `src/lib/email.ts`
  - Notifications for:
    - Exam scheduled
    - Exam reminders
    - Results published
    - Violation alerts
  - **Effort**: 24 hours
  
- [ ] **Push notifications**
  - Browser push notifications
  - **Tech**: Web Push API
  - User preferences
  - **Effort**: 16 hours
  
- [ ] **Notification preferences**
  - User settings for notifications
  - Opt-in/opt-out controls
  - **Effort**: 8 hours

### 2.5 Communication Features [0%]

- [ ] **Announcement system** `Priority: MEDIUM`
  - Global announcements
  - Class-specific announcements
  - Exam instructions
  - **Files**: Create announcements table in schema
  - **Effort**: 16 hours
  
- [ ] **Messaging system** (Optional)
  - Teacher-student messaging
  - **Effort**: 40 hours

---

## 📊 Phase 3: Advanced Features (Priority: 🟡 MEDIUM)

> **Target**: June 2026 | **Duration**: 3-4 months

### 3.1 Analytics & Reporting [0%]

#### Student Performance Analytics
- [ ] **Individual student reports** `Priority: HIGH`
  - Performance over time
  - Strengths/weaknesses analysis
  - **Tech**: Chart.js or Recharts
  - **Files**: Create `src/app/admin/analytics/students/[id]/page.tsx`
  - **Effort**: 32 hours
  
- [ ] **Class analytics dashboard**
  - Class comparison charts
  - Question difficulty analysis
  - Time-on-task analytics
  - **Effort**: 40 hours
  
- [ ] **Subject analytics**
  - Subject-wise trends
  - Topic performance
  - **Effort**: 24 hours

#### Exam Quality Reports
- [ ] **Item analysis** `Priority: HIGH`
  - Discrimination index calculation
  - Difficulty index
  - Distractor analysis
  - **Files**: Create `src/lib/analytics/item-analysis.ts`
  - **Effort**: 40 hours
  
- [ ] **Reliability coefficients**
  - Cronbach's Alpha calculation
  - **Effort**: 16 hours

#### Export & Reporting
- [ ] **Custom report builder**
  - Drag-drop report designer
  - **Tech**: Consider React DnD
  - **Effort**: 60 hours
  
- [ ] **PDF report generation**
  - Print-friendly reports
  - **Tech**: PDFKit or Puppeteer
  - **Effort**: 24 hours
  
- [ ] **Scheduled reports**
  - Automated report emails
  - **Effort**: 16 hours

### 3.2 Question Bank Enhancements [0%]

- [ ] **Question versioning** `Priority: MEDIUM`
  - Track changes
  - Version history
  - Restore previous versions
  - **Tech**: Add version columns to schema
  - **Files**: Modify `src/lib/schema.ts`
  - **Effort**: 24 hours
  
- [ ] **Question collaboration**
  - Share questions with teachers
  - Comment system
  - Review workflow
  - **Effort**: 40 hours
  
- [ ] **Advanced media support**
  - Audio file upload for listening comprehension
  - Video embedding
  - **Tech**: File upload to cloud storage
  - **Effort**: 32 hours
  
- [ ] **Question templates**
  - Pre-built templates
  - Template library
  - **Effort**: 20 hours
  
- [ ] **Duplicate detection**
  - AI-powered similarity checking
  - **Tech**: Text similarity algorithms
  - **Effort**: 24 hours

### 3.3 Grading System Improvements [0%]

- [ ] **Rubric-based grading** `Priority: HIGH`
  - Create grading rubrics
  - Rubric templates
  - Points breakdown
  - **Files**: Add rubrics table to schema
  - **Effort**: 32 hours
  
- [ ] **Quick grading interface**
  - Keyboard shortcuts
  - Comment templates
  - **Effort**: 20 hours
  
- [ ] **Multimedia feedback**
  - Audio/video feedback
  - Annotated screenshots
  - **Tech**: File upload and playback
  - **Effort**: 24 hours

### 3.4 Enhanced Exam Experience [0%]

- [ ] **Question palette** `Priority: MEDIUM`
  - Visual navigation with status
  - Jump to any question
  - **Files**: Update `src/components/exam-session.tsx`
  - **Effort**: 16 hours
  
- [ ] **Built-in calculator**
  - Scientific calculator
  - **Tech**: Math.js
  - **Effort**: 12 hours
  
- [ ] **Note-taking feature**
  - Scratch pad for students
  - Auto-save notes
  - **Effort**: 16 hours
  
- [ ] **Better math input**
  - Equation editor for answers
  - Symbol palette
  - **Tech**: KaTeX editor
  - **Effort**: 20 hours

### 3.5 Advanced Proctoring [0%]

- [ ] **Webcam monitoring** `Priority: LOW`
  - Optional webcam capture
  - **Tech**: WebRTC, MediaRecorder API
  - Privacy and consent handling
  - **Effort**: 40 hours
  
- [ ] **Screenshot capture**
  - Periodic screenshots
  - **Effort**: 16 hours
  
- [ ] **Activity timeline**
  - Detailed student activity log
  - **Effort**: 20 hours
  
- [ ] **Session replay**
  - Playback exam session
  - **Tech**: Record user interactions
  - **Effort**: 48 hours

---

## 🚀 Phase 4: Intelligence & Scale (Priority: 🟢 LOW)

> **Target**: December 2026 | **Duration**: 4-6 months

### 4.1 AI-Powered Features [0%]

- [ ] **AI question generation** `Priority: MEDIUM`
  - Generate questions from text/topics
  - Multiple difficulty levels
  - **Tech**: OpenAI API or local LLM
  - **Files**: Create `src/lib/ai/question-generator.ts`
  - **Effort**: 60 hours
  
- [ ] **Auto-grading for essays** `Priority: LOW`
  - AI-assisted essay evaluation
  - **Tech**: LLM with prompt engineering
  - **Effort**: 80 hours
  
- [ ] **Plagiarism detection**
  - Compare submissions
  - **Tech**: Text similarity algorithms or API
  - **Effort**: 40 hours
  
- [ ] **Intelligent insights**
  - Predictive analytics
  - Personalized recommendations
  - **Tech**: ML models
  - **Effort**: 120 hours

### 4.2 Mobile Application [0%]

- [ ] **Progressive Web App (PWA)** `Priority: MEDIUM`
  - Service worker
  - Offline support
  - Install to home screen
  - **Files**: `src/app/manifest.json`, service worker
  - **Effort**: 40 hours
  
- [ ] **Native mobile app** `Priority: LOW`
  - React Native or Flutter
  - iOS and Android
  - **Effort**: 400+ hours

### 4.3 Integrations [0%]

- [ ] **Google Classroom integration** `Priority: MEDIUM`
  - Import students/classes
  - Sync grades
  - **Tech**: Google Classroom API
  - **Effort**: 60 hours
  
- [ ] **Microsoft Teams integration**
  - Similar to Google Classroom
  - **Effort**: 60 hours
  
- [ ] **LMS integration (Moodle)**
  - **Effort**: 80 hours
  
- [ ] **Cloud storage integration**
  - Google Drive backup
  - **Tech**: Google Drive API
  - **Effort**: 24 hours

### 4.4 Gamification [0%]

- [ ] **Badges and achievements** `Priority: LOW`
  - Student engagement features
  - **Files**: Add achievements to schema
  - **Effort**: 40 hours
  
- [ ] **Leaderboards**
  - Optional ranking
  - Privacy controls
  - **Effort**: 20 hours
  
- [ ] **Practice mode**
  - Non-graded practice exams
  - Flashcards
  - **Effort**: 32 hours

### 4.5 Database Migration [0%]

- [ ] **PostgreSQL migration** `Priority: HIGH` (for production scale)
  - [x] Migrate from SQLite to PostgreSQL (Support added, ready for deployment)
  - [x] Update Drizzle config
  - **Files**: `drizzle.config.ts`, migration scripts
  - **Effort**: 24 hours
  
- [ ] **Database replication**
  - Master-slave setup
  - **Effort**: 16 hours
  
- [ ] **Connection pooling**
  - Optimize database connections
  - **Tech**: PgBouncer or similar
  - **Effort**: 8 hours

---

## 🎯 Quick Wins (High Impact, Low Effort)

These can be implemented anytime for immediate value:

- [ ] **Export results to Excel** `Effort: 6h`
  - Use existing xlsx library
  - Add export button to grading page
  
- [ ] **Keyboard shortcuts** `Effort: 8h`
  - Add shortcuts for common actions
  - Help modal showing shortcuts
  
- [ ] **Print stylesheets** `Effort: 6h`
  - Print-friendly exam papers
  - Print-friendly results
  
- [ ] **Better error messages** `Effort: 4h`
  - User-friendly error states
  - Actionable error messages
  
- [ ] **Toast notifications** `Effort: 4h`
  - Success/error feedback
  - Already have shadcn/ui toast component
  
- [ ] **Breadcrumbs navigation** `Effort: 4h`
  - Improve navigation clarity
  
- [ ] **Recent items shortcuts** `Effort: 6h`
  - Quick access to recent exams/questions
  
- [ ] **Auto-save indicators** `Effort: 4h`
  - Show save status in forms

---

## 🛠️ Technical Debt & Refactoring

- [x] **Code splitting optimization** ✅ **Completed: Dec 4, 2025**
  - [x] Split `ExamTemplateWizard` into step components
  - [x] Split `TakeExamPage` into sub-components (Header, Sidebar, QuestionRenderer, etc.)
  - [x] Extracted shared types for better organization
  - **Actual Effort**: 12 hours
  
- [ ] **Type safety improvements**
  - [x] TypeScript strict mode enabled
  - [ ] Fix remaining `any` types
  - **Effort**: 8 hours remaining
  
- [x] **API standardization** ✅ **Completed: Dec 4, 2025**
  - [x] Created centralized `apiHandler` utility (`lib/api-handler.ts`)
  - [x] Standardized response format: `{ data, metadata?, error? }`
  - [x] Standardized error handling with `ApiError` class
  - [x] Refactored backend API routes to use new handler
  - [x] Updated frontend compatibility across 7 admin pages:
    - `admin/classes/page.tsx` (3 fetch functions)
    - `admin/subjects/page.tsx`
    - `admin/grading/page.tsx`
    - `admin/question-banks/page.tsx` (2 fetch functions)
    - `admin/exam-templates/page.tsx`
    - `admin/exam-sessions/create/page.tsx` (3 endpoints)
    - `admin/exam-sessions/[id]/edit/page.tsx` (3 endpoints)
  - **Actual Effort**: 12 hours (backend 4h + frontend 8h)
  
- [ ] **Component library refinement**
  - [ ] Document all components with JSDoc
  - [ ] Storybook (optional)
  - **Effort**: 40 hours
  
- [x] **Database schema optimization** ✅ **Completed: Dec 4, 2025**
  - [x] Added indexes to foreign keys and frequently queried columns
  - [x] Indexes added to 13 tables across all question types, sessions, submissions, etc.
  - [x] Multi-database support maintained (SQLite, MySQL, PostgreSQL)
  - **Actual Effort**: 6 hours

---

## 📝 Documentation Tasks

- [x] **README.md** - Basic project info
- [x] **Database schema documentation**
- [x] **API documentation**
- [x] **User guide for teachers**
- [x] **ROADMAP.md** - This file
- [ ] **CONTRIBUTING.md** - Contribution guidelines
- [ ] **AGENTS.md** - AI agent context
- [ ] **Development setup guide**
- [ ] **Deployment guide**
- [ ] **Architecture decision records (ADR)**

---

## 🎓 Learning Resources for Contributors

### Frontend Development
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

### Backend & Database
- [Drizzle ORM](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Testing
- [Vitest](https://vitest.dev)
- [Playwright](https://playwright.dev)

---

## 🤝 How to Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

**For AI Agents**: See [AGENTS.md](./AGENTS.md) for specialized context and guidelines.

---

## 📞 Getting Help

- 💬 **Discussions**: Use GitHub Discussions for questions
- 🐛 **Issues**: Report bugs using issue templates
- 📧 **Email**: [Contact - if applicable]

---

**Last Updated**: December 7, 2025 | **Version**: 1.0.2

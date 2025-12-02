# 🤝 Contributing to CartaExam

Thank you for your interest in contributing to CartaExam! This document provides guidelines and instructions for contributing to this project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. We pledge to:

- Be respectful and inclusive
- Welcome diverse perspectives
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or trolling
- Publishing others' private information
- Spam or promotional content
- Any other conduct that would be inappropriate in a professional setting

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18.x or higher
- **npm** or **pnpm**
- **Git** installed
- A code editor (VS Code recommended)
- Basic knowledge of:
  - TypeScript
  - React and Next.js
  - Tailwind CSS
  - SQL basics

### Understanding the Project

1. **Read the Documentation**
   - [README.md](./README.md) - Project overview
   - [ROADMAP.md](./ROADMAP.md) - Feature roadmap and priorities
   - [AGENTS.md](./AGENTS.md) - Technical guide for AI agents
   - [docs/](./docs/) - Detailed documentation

2. **Explore the Codebase**
   - Review the project structure
   - Understand the database schema
   - Check existing components and patterns

3. **Check the Issues**
   - Look for issues tagged with `good first issue` or `help wanted`
   - Read through open discussions

---

## 💻 Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/CartaExam.git
cd CartaExam/carta-exam-web

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/CartaExam.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Push schema to database
npm run db:push

# Or use Drizzle Kit directly
npx drizzle-kit push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create a Branch

```bash
# Create a new branch for your feature/fix
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

**Branch Naming Conventions:**
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/test-description` - Adding tests
- `chore/task-description` - Maintenance tasks

---

## 🔧 How to Contribute

### Types of Contributions

#### 🐛 Bug Reports

Found a bug? Help us fix it!

1. **Check existing issues** first to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, browser, Node version)

**Use the bug report template** when available.

#### ✨ Feature Requests

Have an idea for a new feature?

1. **Check ROADMAP.md** to see if it's already planned
2. **Open a discussion** first for major features
3. **Create an issue** with:
   - Clear description of the feature
   - Use cases and benefits
   - Proposed implementation (if you have ideas)
   - Design mockups (if applicable)

#### 📝 Documentation

Documentation improvements are always welcome!

- Fix typos or clarify existing docs
- Add examples or use cases
- Create tutorials or guides
- Improve code comments

#### 💡 Code Contributions

**Before coding:**
1. Discuss major changes in an issue first
2. Check if someone is already working on it
3. Ensure your idea aligns with the project roadmap

**Types of code contributions:**
- Implementing features from ROADMAP.md
- Fixing bugs
- Improving performance
- Adding tests
- Refactoring code

---

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] Self-review your code
- [ ] Comment complex code sections
- [ ] Update documentation if needed
- [ ] Test your changes thoroughly
- [ ] Ensure `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No console errors/warnings

### Submitting a Pull Request

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add dark mode toggle"
   ```
   
   **Commit Message Format:**
   ```
   <type>: <description>
   
   [optional body]
   
   [optional footer]
   ```
   
   **Types:**
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation changes
   - `style`: Code style changes (formatting)
   - `refactor`: Code refactoring
   - `test`: Adding tests
   - `chore`: Maintenance tasks
   
   **Examples:**
   ```
   feat: implement dark mode support
   fix: resolve exam timer accuracy issue
   docs: update API documentation for grading endpoints
   refactor: simplify question editor component logic
   ```

3. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Go to GitHub and create a PR from your fork
   - Fill out the PR template completely
   - Link related issues (e.g., "Closes #123")
   - Add screenshots for UI changes
   - Request review from maintainers

### PR Review Process

1. **Automated Checks**: CI/CD will run (when configured)
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged!

### After Your PR is Merged

- Delete your branch (optional)
- Update your local main branch
  ```bash
  git checkout main
  git pull upstream main
  ```
- Celebrate! 🎉

---

## 📐 Coding Guidelines

### TypeScript

- **Use TypeScript**: No JavaScript files
- **Strict typing**: Avoid `any`, use proper types
- **Interfaces over types** for object shapes
- **Use type inference** when possible

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
}

function getUser(id: string): Promise<User> {
  // Implementation
}

// ❌ Avoid
function getUser(id: any): any {
  // Implementation
}
```

### React Components

- **Functional components** with hooks
- **Named exports** for components
- **Props interface** for all components
- **Descriptive names** in PascalCase

```typescript
// ✅ Good
interface ExamCardProps {
  exam: Exam;
  onEdit: (id: string) => void;
}

export function ExamCard({ exam, onEdit }: ExamCardProps) {
  return (
    <Card>
      {/* Component content */}
    </Card>
  );
}
```

### File Organization

```typescript
// Order:
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Next.js imports
import { useRouter } from 'next/navigation';

// 3. Third-party imports
import { format } from 'date-fns';

// 4. UI components
import { Button } from '@/components/ui/button';

// 5. Local components
import { ExamCard } from '@/components/exam/ExamCard';

// 6. Utils and helpers
import { formatDate } from '@/lib/utils';

// 7. Types
import type { Exam } from '@/lib/schema';
```

### Styling

- **Tailwind CSS** for all styling
- **Responsive design** using Tailwind breakpoints
- **Consistent spacing** using Tailwind's scale
- **shadcn/ui components** for UI elements

```typescript
// ✅ Good - Responsive, consistent spacing
<div className="
  grid gap-4 
  grid-cols-1 md:grid-cols-2 lg:grid-cols-3
  p-4 md:p-6 lg:p-8
">
  {/* Content */}
</div>
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ExamSession.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `ExamTemplate` |
| Hooks | camelCase with 'use' | `useExamTimer` |
| API Routes | kebab-case | `exam-sessions/route.ts` |

### Error Handling

```typescript
// ✅ Always handle errors gracefully
try {
  const result = await saveExam(examData);
  toast.success('Exam saved successfully');
  router.push('/admin/exams');
} catch (error) {
  console.error('Failed to save exam:', error);
  toast.error('Failed to save exam. Please try again.');
}
```

### Accessibility

- **Semantic HTML**: Use appropriate elements
- **ARIA labels**: For interactive elements
- **Keyboard navigation**: Support tab, enter, escape
- **Color contrast**: Meet WCAG 2.1 AA standards
- **Focus indicators**: Visible focus states

```typescript
// ✅ Accessible button
<button
  aria-label="Delete exam"
  onClick={handleDelete}
  className="focus:ring-2 focus:ring-blue-500"
>
  <TrashIcon className="w-4 h-4" />
</button>
```

---

## 🧪 Testing Guidelines

### Writing Tests (When Infrastructure is Setup)

```typescript
// Unit test example
import { describe, it, expect } from 'vitest';
import { calculateExamScore } from '@/lib/grading';

describe('calculateExamScore', () => {
  it('calculates total score correctly', () => {
    const answers = [
      { score: 10 },
      { score: 15 },
      { score: 20 },
    ];
    
    expect(calculateExamScore(answers)).toBe(45);
  });
  
  it('handles empty answers array', () => {
    expect(calculateExamScore([])).toBe(0);
  });
});
```

### Manual Testing Checklist

Before submitting:

- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (responsive)
- [ ] Test all user interactions
- [ ] Test error states
- [ ] Test loading states
- [ ] Verify no console errors
- [ ] Check accessibility (keyboard nav)

---

## 📚 Documentation

### Code Comments

- **Comment complex logic**, not obvious code
- **Use JSDoc** for functions when helpful
- **Explain "why"**, not "what"

```typescript
// ✅ Good comment - explains why
// We use a debounced callback to prevent excessive API calls
// while the user is typing their search query
const debouncedSearch = useDebounce(searchQuery, 300);

// ❌ Bad comment - states the obvious
// Set the user name
setUserName(name);
```

### Documentation Files

When updating docs:

- Keep it clear and concise
- Use examples
- Update table of contents
- Check for broken links
- Follow existing formatting

---

## 🌟 Recognition

### Contributors

All contributors will be:
- Listed in our contributors page
- Credited in release notes for significant contributions
- Eligible for special recognition badges

### Types of Recognition

- **First-time contributors**: Welcome badge
- **Bug hunters**: Debug badge for significant bug fixes
- **Feature champions**: Feature badge for major features
- **Documentation heroes**: Docs badge for documentation improvements

---

## 💬 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Pull Requests**: Code review and collaboration

### Getting Help

- Check existing documentation first
- Search closed issues for similar problems
- Ask in GitHub Discussions
- Be patient and respectful

---

## 🎯 Priority Areas

Looking to contribute? These areas need help:

### High Priority
- Testing infrastructure setup
- Dark mode implementation
- Performance optimization
- Security hardening
- Mobile responsiveness

### Medium Priority
- Advanced analytics
- Bulk operations
- Notification system
- Documentation improvements

### Good First Issues
Look for issues tagged with:
- `good first issue` - Perfect for newcomers
- `help wanted` - We need help!
- `documentation` - Doc improvements

---

## 📜 License

By contributing to CartaExam, you agree that your contributions will be licensed under the same license as the project.

---

## ❓ Questions?

If you have questions about contributing:

1. Check the [AGENTS.md](./AGENTS.md) for technical details
2. Review the [ROADMAP.md](./ROADMAP.md) for project direction
3. Search existing discussions
4. Create a new discussion if needed

---

## 🙏 Thank You!

Your contributions make CartaExam better for students and teachers at SMAN 1 Campurdarat and beyond. Every contribution, no matter how small, is valued and appreciated!

**Happy Contributing! 🚀**

---

**Last Updated**: December 2, 2025

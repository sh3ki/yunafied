# Project Current Implemented

This file lists the features that are currently implemented in Yunafied and where to find their code.

## 1) Authentication and Session

What is implemented:
- Register (student default role), login, token-based auth, and current-user session restore.
- Inactive users are blocked from logging in.

Where to find it:
- Frontend: `src/app/components/Login.tsx`
- Frontend: `src/app/App.tsx`
- Frontend API calls: `src/app/services/apiClient.ts`
- Backend routes: `backend/src/index.ts` (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`)
- Backend auth middleware: `backend/src/middleware/auth.ts`

## 2) Role-Based Access

What is implemented:
- Roles: admin, teacher, student.
- Role-based route/view restrictions in UI and backend role guard middleware.

Where to find it:
- Frontend role view map and guards: `src/app/App.tsx`
- Frontend navigation by role: `src/app/components/Sidebar.tsx`, `src/app/components/BottomNav.tsx`
- Backend role middleware: `backend/src/middleware/auth.ts`
- Backend protected routes: `backend/src/index.ts`

## 3) Dashboard Bootstrap and Cached Data Load

What is implemented:
- Single bootstrap payload for users, schedules, assignments, submissions, announcements.
- Short-lived in-memory bootstrap cache on backend.

Where to find it:
- Frontend bootstrap load: `src/app/App.tsx`
- Frontend API client: `src/app/services/apiClient.ts` (`bootstrap()`)
- Backend route: `backend/src/index.ts` (`/api/bootstrap`)
- Backend aggregation logic: `backend/src/services/YunafiedService.ts` (`getBootstrapData`)

## 4) User Management (Admin)

What is implemented:
- Admin can create, edit, delete users.
- Role and status management (active/inactive).

Where to find it:
- Frontend: `src/app/components/Users.tsx`
- Frontend API calls: `src/app/services/apiClient.ts`
- Backend routes: `backend/src/index.ts` (`/api/users`)
- Backend user service methods: `backend/src/services/YunafiedService.ts`

## 5) Profile Settings and Profile Image Upload

What is implemented:
- User can edit profile information and change password.
- Profile image upload to Cloudinary.

Where to find it:
- Frontend: `src/app/components/ProfileSettings.tsx`
- Frontend API calls: `src/app/services/apiClient.ts` (`updateProfile`, `uploadProfileImage`)
- Backend routes: `backend/src/index.ts` (`/api/profile`, `/api/uploads/profile-image`)
- Backend service logic: `backend/src/services/YunafiedService.ts`

## 6) Scheduling Workflow

What is implemented:
- Student schedule request flow (pending -> accepted/declined).
- Teacher/admin managed schedule creation.
- Move/cancel/admin edit schedule actions.
- Conflict checks for teacher schedule overlaps.

Where to find it:
- Frontend: `src/app/components/Schedule.tsx`
- Frontend API calls: `src/app/services/apiClient.ts`
- Backend routes: `backend/src/index.ts` (`/api/schedules`, `/respond`, `/move`, `/cancel`)
- Backend workflow/service logic: `backend/src/services/YunafiedService.ts`
- DB migration: `backend/sql/005_schedule_workflow.sql`

## 7) Assignment Management

What is implemented:
- Teacher/admin create assignments.
- Users list assignments.

Where to find it:
- Frontend: `src/app/components/Assignments.tsx`
- Frontend API calls: `src/app/services/apiClient.ts`
- Backend routes: `backend/src/index.ts` (`/api/assignments`)
- Backend service logic: `backend/src/services/YunafiedService.ts`

## 8) Submissions and Grading

What is implemented:
- Student assignment submission via text and/or file upload.
- Upsert submission per assignment-student pair.
- Teacher/admin grading with feedback.

Where to find it:
- Frontend: `src/app/components/Assignments.tsx`
- Frontend API calls: `src/app/services/apiClient.ts`
- Backend routes: `backend/src/index.ts` (`/api/assignments/:assignmentId/submissions`, `/api/submissions/:id/grade`)
- Backend file upload and grading logic: `backend/src/index.ts`, `backend/src/services/YunafiedService.ts`

## 9) Announcements

What is implemented:
- Teacher/admin can post announcements.
- All authenticated users can read announcements.

Where to find it:
- Frontend: `src/app/components/Communication.tsx`
- Frontend API calls: `src/app/services/apiClient.ts`
- Backend routes: `backend/src/index.ts` (`/api/announcements`)
- Backend service logic: `backend/src/services/YunafiedService.ts`

## 10) AI Assistant Chat

What is implemented:
- Role-aware and page-aware AI chatbot endpoint.
- Multi-turn history support.

Where to find it:
- Frontend: `src/app/components/AIChatbot.tsx`
- Frontend API calls: `src/app/services/apiClient.ts` (`askYunaAi`)
- Backend route: `backend/src/index.ts` (`/api/ai/chat`)

## 11) AI Study Guide

What is implemented:
- Guided tutoring endpoint for student help.

Where to find it:
- Frontend: `src/app/components/AIGuide.tsx`
- Frontend API calls: `src/app/services/apiClient.ts` (`askStudyGuide`)
- Backend route: `backend/src/index.ts` (`/api/ai/study-guide`)

## 12) Word Translator and Translation History

What is implemented:
- AI translation endpoint.
- History storage, pagination, and search.

Where to find it:
- Frontend: `src/app/components/WordTranslator.tsx`
- Frontend API calls: `src/app/services/apiClient.ts` (`translateText`, `listTranslationHistory`)
- Backend routes: `backend/src/index.ts` (`/api/ai/translate`, `/api/translations/history`)
- Backend translation service methods: `backend/src/services/YunafiedService.ts`
- DB migration: `backend/sql/004_translation_history.sql`

## 13) Gamified Learning (Categories, Quizzes, Attempts, Leaderboard)

What is implemented:
- Category create/list/update (admin/teacher create/update, list for all).
- Quiz create/update/list/detail with questions and choices.
- Student attempts with score + speed bonus logic.
- Leaderboard per category.

Where to find it:
- Frontend overview: `src/app/components/GamifiedLearning.tsx`
- Frontend challenge/play UI: `src/app/components/GamifiedChallenge.tsx`
- Frontend API calls: `src/app/services/apiClient.ts`
- Backend routes: `backend/src/index.ts` (`/api/gamified/*`)
- Backend scoring and gamified service logic: `backend/src/services/YunafiedService.ts`
- DB migration: `backend/sql/006_gamified_learning.sql`
- Seeder: `backend/src/scripts/seedGamified.ts`

## 14) Performance and Milestones Views

What is implemented:
- Performance UI based on submissions data.
- Milestones view for student progress display.

Where to find it:
- Frontend: `src/app/components/Performance.tsx`
- Frontend: `src/app/components/MilestonesView.tsx`
- Supporting data source: `src/app/App.tsx` and `/api/bootstrap`

## 15) Video Summarizer UI

What is implemented:
- Student-facing video summarizer interface component is present in UI.

Where to find it:
- Frontend: `src/app/components/VideoSummarizer.tsx`
- Route/render wiring: `src/app/App.tsx`

## 16) Landing and Navigation Shell

What is implemented:
- Public landing page.
- Authenticated shell with sidebar/bottom nav and per-view routing.

Where to find it:
- Landing: `src/app/components/LandingPage.tsx`
- App shell and routes: `src/app/App.tsx`
- Navigation components: `src/app/components/Sidebar.tsx`, `src/app/components/BottomNav.tsx`

## 17) Mobile App (Expo) Integration Layer

What is implemented:
- Mobile project scaffold exists and consumes the same backend API set.
- Core navigation/context foundation is present.

Where to find it:
- Mobile entry: `mobile-app/App.tsx`
- Mobile API client: `mobile-app/src/api/client.ts`
- Mobile navigator/context: `mobile-app/src/navigation/AppNavigator.tsx`, `mobile-app/src/context/AppContext.tsx`

## 18) Database Migrations and Seed Scripts

What is implemented:
- SQL migrations 001 to 006.
- DB init/check scripts and seed scripts for demo users and gamified data.

Where to find it:
- Migrations: `backend/sql/001_init.sql` to `backend/sql/006_gamified_learning.sql`
- Scripts: `backend/src/scripts/initDb.ts`, `backend/src/scripts/checkDb.ts`, `backend/src/scripts/seedDemo.ts`, `backend/src/scripts/seedGamified.ts`
- NPM script mapping: `backend/package.json`

## Notes

- The implemented features listed above are based on currently present source code in this repository.
- Some modules may still be iterated in UI/UX details, but their core routes/service logic are already in place.



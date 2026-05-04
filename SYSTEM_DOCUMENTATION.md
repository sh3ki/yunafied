# Yunafied — Full System Documentation

> **Version**: As of latest build  
> **Stack**: React + TypeScript + Vite (web), React Native + Expo (mobile), Express.js (backend), PostgreSQL / Neon DB  
> **Roles**: `admin`, `teacher`, `student`

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Schema](#2-database-schema)
3. [Authentication & Security](#3-authentication--security)
4. [Backend API Reference](#4-backend-api-reference)
5. [Service Layer Reference](#5-service-layer-reference)
6. [Web Frontend — Component Reference](#6-web-frontend--component-reference)
7. [Mobile App — Screen Reference](#7-mobile-app--screen-reference)
8. [Role-Based Feature Matrix](#8-role-based-feature-matrix)
9. [Notifications System](#9-notifications-system)
10. [AI Features](#10-ai-features)
11. [WebRTC Video Call Flow](#11-webrtc-video-call-flow)
12. [File Upload Paths](#12-file-upload-paths)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Web Browser                     Mobile (React Native / Expo)   │
│  React + Vite (src/)             mobile-app/                    │
│  Port: 5173 (dev)                                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTP/REST (JWT Bearer Token)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express.js Backend  (backend/src/index.ts)                     │
│  Port: 3001 (dev)                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth MW      │  │ Multer       │  │ YunafiedService.ts   │  │
│  │ (JWT verify) │  │ (file upload)│  │ (all DB operations)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  External APIs: Groq AI, Cloudinary, ffmpeg                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │  SQL (pg pool)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL — Neon DB (cloud)                                   │
│  12 migration files in backend/sql/                             │
└─────────────────────────────────────────────────────────────────┘
```

**Key files at a glance:**

| Layer | File | Purpose |
|---|---|---|
| Web Entry | `src/main.tsx` | Vite root, mounts `<App>` |
| Web Shell | `src/app/App.tsx` | Auth state, data bootstrap, routing |
| Web Components | `src/app/components/*.tsx` | All page/view components |
| Web API Client | `src/app/services/apiClient.ts` | All backend HTTP calls (web) |
| Mobile Entry | `mobile-app/App.tsx` | Expo root |
| Mobile Navigation | `mobile-app/src/navigation/AppNavigator.tsx` | All screens (~2500+ lines) |
| Mobile State | `mobile-app/src/context/AppContext.tsx` | Global state + incoming call polling |
| Mobile API Client | `mobile-app/src/api/client.ts` | All backend HTTP calls (mobile) |
| Backend Server | `backend/src/index.ts` | Express server, all API routes (~2460+ lines) |
| Service Layer | `backend/src/services/YunafiedService.ts` | All DB operations |
| Auth Middleware | `backend/src/middleware/auth.ts` | JWT verify + role guard |
| DB Types | `backend/src/types/models.ts` | Shared TypeScript types |

---

## 2. Database Schema

All migrations are applied in order from `backend/sql/`.

### `001_init.sql`
- Enables `pgcrypto` extension  
- Creates `users` table: `id UUID PRIMARY KEY`, `email TEXT UNIQUE`, `full_name TEXT`, `role TEXT` (`admin|teacher|student`)

### `002_core_modules.sql`
- Adds `password_hash TEXT`, `updated_at TIMESTAMPTZ` to `users`  
- Creates `schedules` table: `id`, `title`, `status` (`pending|accepted|declined|cancelled`), `teacher_id`, `student_id`, `start_time`, `end_time`, `date`  
- Creates `assignments` table: `id`, `title`, `description`, `due_date`, `created_by`  
- Creates `submissions` table: `id`, `assignment_id`, `student_id`, `body`, `file_url`, `grade`, `feedback`  
- Creates `announcements` table: `id`, `title`, `body`, `posted_by`

### `003_user_profiles.sql`
- Adds to `users`: `status TEXT DEFAULT 'active'`, `profile_image_url TEXT`, `profile_image_public_id TEXT`

### `004_translation_history.sql`
- Creates `translation_history` table: `id`, `user_id`, `source_language`, `target_language`, `original_text`, `translated_text`, `created_at`

### `005_schedule_workflow.sql`
- Adds to `schedules`: `description TEXT`, `scheduled_date DATE`, `student_id UUID`, `notes TEXT`, `teacher_notes TEXT`

### `006_gamified_learning.sql`
- Creates `gamified_categories`: `id`, `name`, `description`, `is_published`  
- Creates `gamified_quizzes`: `id`, `category_id`, `title`, `description`, `time_limit_seconds`, `is_published`  
- Creates `quiz_questions`: `id`, `quiz_id`, `body`, `order_index`  
- Creates `quiz_choices`: `id`, `question_id`, `body`, `is_correct`  
- Creates `quiz_attempts`: `id`, `quiz_id`, `student_id`, `score`, `correct_answers`, `total_questions`, `time_taken_seconds`, `completed_at`

### `007_enrollment_and_learning_materials.sql`
- Creates `enrollment_status` ENUM: `active`, `completed`, `dropped`  
- Creates `enrollment_records`: `id`, `student_id`, `teacher_id`, `subject`, `grade_level`, `status enrollment_status`, `enrolled_at`  
- Creates `learning_materials`: `id`, `title`, `subject`, `description`, `material_type` (`link|file`), `resource_url`, `uploaded_by`

### `008_chats.sql`
- Creates `chats`: `id`, `name TEXT`, `type TEXT` (`direct|group`), `last_message TEXT`, `last_message_at`  
- Creates `chat_participants`: `chat_id`, `user_id`, `joined_at`  
- Creates `chat_messages`: `id`, `chat_id`, `sender_id`, `body TEXT`, `sent_at`

### `009_meeting_rooms.sql`
- Creates `meeting_rooms`: `id`, `room_token UUID UNIQUE`, `teacher_id`, `student_id`, `status TEXT` (`pending|active|ended|declined`), `created_at`, `updated_at`  
- Creates `meeting_signals`: `id`, `room_token`, `sender_id`, `signal_type` (`offer|answer|ice-candidate`), `payload JSONB`, `created_at`

### `010_chat_read_tracking.sql`
- Adds `last_read_at TIMESTAMPTZ` to `chat_participants`  
- Used to compute per-user unread message counts

### `011_meeting_rooms_description.sql`
- Adds `schedule_description TEXT` to `meeting_rooms`  
- Allows video call overlay to display what the meeting is about

### `012_assignment_enhancements.sql`
- Adds to `assignments`: `attachment_file_name TEXT`, `attachment_url TEXT`, `is_closed BOOLEAN NOT NULL DEFAULT FALSE`  
- Enables teacher file attachments on assignments and submission open/close toggle

---

## 3. Authentication & Security

**File**: `backend/src/middleware/auth.ts`

| Symbol | Line | Purpose |
|---|---|---|
| `jwtSecret` | L5 | `process.env.JWT_SECRET \|\| "yunafied-dev-secret"` |
| `signAccessToken()` | L18 | Signs JWT with 12h expiry |
| `requireAuth()` | L22 | Middleware — verifies Bearer token, attaches `req.auth` |
| `requireRole(...roles)` | L40 | Middleware factory — 403 if user role not in allowed list |

**Token format**: `Bearer <JWT>`  
**JWT payload**: `{ sub: userId, email, role }`  
**Token expiry**: 12 hours  
**All protected routes** use `requireAuth` middleware; admin-only routes also use `requireRole('admin')`

---

## 4. Backend API Reference

**File**: `backend/src/index.ts`  
**Base URL**: `http://localhost:3001` (dev) — configured via `VITE_BACKEND_URL`

> **Bootstrap Cache** (Lines 26–27): Each user's bootstrap response is cached for **8 seconds** using an in-memory `Map<userId, { data, expiresAt }>` to reduce DB load.

---

### 4.1 Health

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| GET | `/api/health` | L648 | None | Returns `{ status: "ok" }` |
| GET | `/api/health/db` | L652 | None | Tests DB connection, returns row count |

---

### 4.2 Authentication

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | L661 | None | Creates user account; body: `{ fullName, email, password, role }` |
| POST | `/api/auth/login` | L688 | None | Validates credentials, returns `{ token, user }`; uses bcrypt verify |
| GET | `/api/auth/me` | L717 | `requireAuth` | Returns current user object from JWT `sub` |

---

### 4.3 Profile

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| PATCH | `/api/profile` | L733 | `requireAuth` | Update own profile: `fullName`, `email`, `currentPassword`, `newPassword`, `profileImageUrl`, `profileImagePublicId` |
| POST | `/api/profile/image` | L1207 | `requireAuth` | Upload profile image to **Cloudinary**; returns `{ url, publicId }` |

---

### 4.4 Users (Admin only)

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| GET | `/api/users` | L1105 | `requireAuth` + admin | List all users |
| POST | `/api/users` | L1123 | `requireAuth` + admin | Create user; body: `{ fullName, email, password, role, status }` |
| PUT | `/api/users/:id` | L1160 | `requireAuth` + admin | Update user (any field including role/status/password) |
| DELETE | `/api/users/:id` | L1187 | `requireAuth` + admin | Hard-delete user |

---

### 4.5 Bootstrap

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| GET | `/api/bootstrap` | L1087 | `requireAuth` | Returns all app data in one call: users, schedules, assignments, submissions, announcements. Cached 8s per user. |

---

### 4.6 Schedules

| Method | Route | Line | Auth | Roles | Description |
|---|---|---|---|---|---|
| GET | `/api/schedules` | L1226 | `requireAuth` | All | Role-filtered list: student sees own, teacher sees own, admin sees all |
| POST | `/api/schedules` | L1357 | `requireAuth` | All | Create schedule. Student creates a **request** (status=pending). Teacher/admin creates directly. |
| PATCH | `/api/schedules/:id/respond` | L1410 | `requireAuth` | teacher, admin | Teacher accept or decline a student request |
| PATCH | `/api/schedules/:id/move` | L1437 | `requireAuth` | teacher, admin | Reschedule (change date/time) |
| PATCH | `/api/schedules/:id/cancel` | L1459 | `requireAuth` | teacher, admin | Cancel a schedule |
| PATCH | `/api/schedules/:id` | L1481 | `requireAuth` | admin | Admin full-edit any field |
| DELETE | `/api/schedules/:id` | L1502 | `requireAuth` | admin | Delete schedule |

---

### 4.7 Assignments & Submissions

| Method | Route | Line | Auth | Roles | Description |
|---|---|---|---|---|---|
| GET | `/api/assignments` | L1686 | `requireAuth` | All | List all assignments (with attachment fields) |
| POST | `/api/assignments` | L1700 | `requireAuth` | teacher, admin | Create assignment; optional file attachment (multer `assignmentUpload`); body: `{ title, description, dueDate }` |
| PATCH | `/api/assignments/:id/toggle-close` | L1724 | `requireAuth` | teacher, admin | Open/close student submissions for an assignment |
| GET | `/api/submissions` | L1735 | `requireAuth` | All | Role-filtered: student sees own, teacher/admin see all with student info |
| POST | `/api/assignments/:id/submissions` | L1744 | `requireAuth` | student | Submit assignment; optional file (PDF/doc/xls/ppt); body: `{ body }` |
| PATCH | `/api/submissions/:id/grade` | L1790 | `requireAuth` | teacher, admin | Grade submission; body: `{ grade, feedback }` |

---

### 4.8 Announcements

| Method | Route | Line | Auth | Roles | Description |
|---|---|---|---|---|---|
| GET | `/api/announcements` | L1811 | `requireAuth` | All | List all announcements with poster name |
| POST | `/api/announcements` | L1856 | `requireAuth` | teacher, admin | Create announcement; body: `{ title, body }` |

---

### 4.9 Chats

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| GET | `/api/chats/users` | L1879 | `requireAuth` | List all other users for starting a chat |
| GET | `/api/chats` | L1893 | `requireAuth` | List user's chats with unread message counts |
| POST | `/api/chats/direct` | L1907 | `requireAuth` | Open or retrieve existing direct chat with another user; body: `{ otherUserId }` |
| POST | `/api/chats/group` | L1929 | `requireAuth` | Create group chat; body: `{ name, participantIds[] }` |
| GET | `/api/chats/:chatId/messages` | L1950 | `requireAuth` | List messages in a chat (marks chat read) |
| POST | `/api/chats/:chatId/messages` | L1970 | `requireAuth` | Send message to chat; body: `{ body }` |
| PATCH | `/api/chats/:chatId/read` | L1997 | `requireAuth` | Mark chat as read (updates `last_read_at`) |

---

### 4.10 Enrollment Records

| Method | Route | Line | Auth | Roles | Description |
|---|---|---|---|---|---|
| GET | `/api/enrollments` | L2011 | `requireAuth` | All | Role-filtered: student sees own, teacher sees students enrolled with them, admin sees all |
| POST | `/api/enrollments` | L2028 | `requireAuth` | admin | Create enrollment; body: `{ studentId, teacherId, subject, gradeLevel, status }` |
| PATCH | `/api/enrollments/:id` | L2051 | `requireAuth` | admin | Update enrollment (any field); body: `{ status?, subject?, gradeLevel? }` |
| DELETE | `/api/enrollments/:id` | L2068 | `requireAuth` | admin | Delete enrollment record |

---

### 4.11 Learning Materials

| Method | Route | Line | Auth | Roles | Description |
|---|---|---|---|---|---|
| GET | `/api/materials` | L2083 | `requireAuth` | All | List all learning materials |
| POST | `/api/materials/link` | L2099 | `requireAuth` | teacher, admin | Create link material; body: `{ title, subject, description, url }` |
| POST | `/api/materials/file` | L2125 | `requireAuth` | teacher, admin | Upload file material (multer `materialsUpload`); multipart: `file`, `title`, `subject`, `description` |
| DELETE | `/api/materials/:id` | L2175 | `requireAuth` | teacher, admin | Delete material (author check) |

---

### 4.12 Video Meetings (WebRTC)

| Method | Route | Line | Auth | Roles | Description |
|---|---|---|---|---|---|
| POST | `/api/meetings` | L2307 | `requireAuth` | teacher | Teacher initiates call; body: `{ studentId, scheduleDescription? }`; returns `{ roomToken, ... }` |
| GET | `/api/meetings/incoming` | L2348 | `requireAuth` | student | Student polls for an incoming call; returns meeting room with `status: 'pending'` targeting them |
| GET | `/api/meetings/:roomToken` | L2363 | `requireAuth` | All | Get meeting room details by room token |
| POST | `/api/meetings/:roomToken/signal` | L2389 | `requireAuth` | All | WebRTC signal exchange (offer/answer/ice-candidate); body: `{ signalType, payload }` |
| PATCH | `/api/meetings/:roomToken/status` | L2429 | `requireAuth` | All | Update meeting status; body: `{ status: 'active'\|'ended'\|'declined' }` |

---

### 4.13 AI Features

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| POST | `/api/ai/chat` | L795 | `requireAuth` | YUNA AI chatbot; body: `{ message, history[] }`; uses **Groq** LLM |
| POST | `/api/ai/study-guide` | L822 | `requireAuth` | Generate study guide; body: `{ topic, context? }`; uses **Groq** LLM |
| POST | `/api/ai/translate` | L850 | `requireAuth` | Translate text; body: `{ text, sourceLang, targetLang }`; saves to `translation_history`; uses **Groq** LLM |
| POST | `/api/ai/video-summary` | L888 | `requireAuth` | Summarize YouTube/video URL; body: `{ url?, context? }`; uses **ffmpeg** + **Groq** |

---

### 4.14 Translations History

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| GET | `/api/translations/history` | L1058 | `requireAuth` | Paginated translation history; query: `page`, `limit`, `search` |

---

### 4.15 Gamified Learning

| Method | Route | Line | Auth | Roles | Description |
|---|---|---|---|---|---|
| GET | `/api/gamified/categories` | L1519 | `requireAuth` | All | List quiz categories (students see only published) |
| POST | `/api/gamified/categories` | L1528 | `requireAuth` | teacher, admin | Create quiz category; body: `{ name, description, isPublished }` |
| PATCH | `/api/gamified/categories/:id` | L1550 | `requireAuth` | teacher, admin | Update category |
| GET | `/api/gamified/quizzes` | L1572 | `requireAuth` | All | List quizzes; query: `categoryId` (students see only published) |
| GET | `/api/gamified/quizzes/:id` | L1586 | `requireAuth` | All | Quiz detail with all questions and choices |
| POST | `/api/gamified/quizzes` | L1607 | `requireAuth` | teacher, admin | Create quiz with questions/choices; body: `{ categoryId, title, description, timeLimitSeconds, isPublished, questions[{ body, choices[{ body, isCorrect }] }] }` |
| PUT | `/api/gamified/quizzes/:id` | L1629 | `requireAuth` | teacher, admin | Replace quiz content entirely |
| POST | `/api/gamified/quizzes/:id/attempts` | L1651 | `requireAuth` | student | Submit quiz attempt; body: `{ answers[{ questionId, choiceId }], timeTakenSeconds }`; calculates score + speed bonus |
| GET | `/api/gamified/leaderboard` | L1673 | `requireAuth` | All | Leaderboard; query: `categoryId`, `limit` |

---

### 4.16 Legacy Direct Messages

| Method | Route | Line | Auth | Description |
|---|---|---|---|---|
| GET | `/api/messages/users` | L2202 | `requireAuth` | List DM recipient users |
| GET | `/api/messages` | L2219 | `requireAuth` | List DMs between current user and another; query: `otherUserId` |
| POST | `/api/messages` | L2252 | `requireAuth` | Send DM; body: `{ receiverId, body }` |

---

## 5. Service Layer Reference

**File**: `backend/src/services/YunafiedService.ts`

All database logic is abstracted into this service class. The Express routes call service methods — no raw SQL in `index.ts`.

### 5.1 Auth / User Management

| Method | Line | Description |
|---|---|---|
| `getBootstrapData(requester)` | L175 | Fetches users, schedules, assignments, submissions, announcements in one call |
| `findUserWithPasswordByEmail(email)` | L201 | Lookup for login auth |
| `findUserWithPasswordById(userId)` | L210 | Lookup by ID for profile update auth |
| `listUsers()` | L232 | All users (admin only) |
| `listUsersByRoles(roles[])` | L240 | Filter users by role array |
| `createUser(input)` | L252 | Create user with `bcrypt.hash` password |
| `updateUser(id, input)` | L277 | Update user; if `newPassword` provided, re-hashes it |
| `deleteUser(userId)` | L328 | Hard-delete from DB |

### 5.2 Schedules

| Method | Line | Description |
|---|---|---|
| `listSchedulesForRole(requester)` | L434 | Student: own schedules; teacher: own; admin: all |
| `createScheduleRequest(input)` | L474 | Student creates with `status='pending'` |
| `createManagedSchedule(input)` | L542 | Teacher/admin creates directly with `status='accepted'` |
| `teacherRespondToSchedule(...)` | L601 | Accept (`status='accepted'`) or decline with notes |
| `moveSchedule(...)` | L678 | Reschedule — updates date/time |
| `cancelSchedule(...)` | L728 | Sets `status='cancelled'` |
| `adminEditSchedule(...)` | L760 | Admin full field update |
| `deleteSchedule(scheduleId, requester)` | L840 | Delete (admin only) |

### 5.3 Assignments & Submissions

| Method | Line | Description |
|---|---|---|
| `listAssignments()` | L850 | All assignments including `attachmentFileName`, `attachmentUrl`, `isClosed` |
| `createAssignment(input)` | L870 | Creates with optional file attachment fields |
| `toggleAssignmentClosed(assignmentId, isClosed)` | L902 | Flips `is_closed` flag |
| `listSubmissionsForRole(requester)` | L920 | Student: own; teacher/admin: all with student name |
| `upsertSubmission(input)` | L993 | Insert or update student submission (text + optional file) |
| `gradeSubmission(input)` | L1040 | Sets `grade` + `feedback` + `graded_at` |

### 5.4 Announcements

| Method | Line | Description |
|---|---|---|
| `listAnnouncements()` | L1081 | All announcements joined with poster name |
| `createAnnouncement(input)` | L1097 | Insert announcement with `posted_by = requester.id` |

### 5.5 Enrollments

| Method | Line | Description |
|---|---|---|
| `listEnrollmentRecords(requester)` | L1122 | Role-filtered; student: own; teacher: their students; admin: all |
| `createEnrollmentRecord(input)` | L1153 | Admin creates enrollment linking student + teacher |
| `updateEnrollmentRecord(...)` | L1202 | Admin updates status/subject/grade level |
| `deleteEnrollmentRecord(id)` | L1266 | Admin deletes |

### 5.6 Learning Materials

| Method | Line | Description |
|---|---|---|
| `listLearningMaterials(requester)` | L1271 | All materials (all roles can read) |
| `createLearningMaterial(input)` | L1340 | `materialType: 'link'` or `'file'` |
| `deleteLearningMaterial(input)` | L1382 | Checks requester is author or admin |

### 5.7 Chats

| Method | Line | Description |
|---|---|---|
| `listChatUsers(requesterId)` | L1389 | All users except self |
| `listChatsForUser(requesterId)` | L1402 | User's chats with unread count (uses `last_read_at`) |
| `openOrCreateDirectChat(requesterId, otherUserId)` | L1489 | Returns existing or creates new direct chat |
| `createGroupChat(input)` | L1526 | Creates group chat + inserts all participants |
| `listChatMessages(chatId, requesterId)` | L1559 | Messages, auto-marks chat as read |
| `sendChatMessage(input)` | L1582 | Insert message + update `last_message` on chat |
| `markChatRead(chatId, userId)` | L1613 | Updates `last_read_at` in `chat_participants` |

### 5.8 Legacy DMs

| Method | Line | Description |
|---|---|---|
| `listMessageRecipients(input)` | L1620 | List users for legacy DM selector |
| `listMessagesBetweenUsers(input)` | L1624 | Bidirectional DM history |
| `sendMessage(input)` | L1645 | Send DM between two users |

### 5.9 Translation History

| Method | Line | Description |
|---|---|---|
| `createTranslationHistory(input)` | L1674 | Save a completed translation |
| `listTranslationHistory(input)` | L1700 | Paginated history with optional search |

### 5.10 Gamified Learning

| Method | Line | Description |
|---|---|---|
| `listGamifiedCategories(requesterRole)` | L1830 | Students: published only; teachers/admin: all |
| `createGamifiedCategory(...)` | L1855 | Create category |
| `updateGamifiedCategory(...)` | L1874 | Update category |
| `listGamifiedQuizzes(...)` | L1909 | Filter by `categoryId`; students: published only |
| `getGamifiedQuizDetail(...)` | L1953 | Quiz with questions + choices |
| `createGamifiedQuiz(...)` | L2046 | Create quiz + bulk insert questions/choices |
| `updateGamifiedQuiz(...)` | L2124 | Replace quiz (delete old questions, insert new) |
| `submitGamifiedAttempt(...)` | L2216 | Score attempt; **speed bonus** calculated if completed under time limit |
| `listGamifiedLeaderboard(categoryId, limit)` | L2398 | Top scores per category |

### 5.11 Video Meetings

| Method | Line | Description |
|---|---|---|
| `createMeetingRoom(input)` | L2432 | Teacher creates room; generates UUID `room_token` |
| `getMeetingRoom(roomToken)` | L2481 | Get room details by token |
| `getIncomingCallForStudent(studentId)` | L2507 | Returns pending meeting targeted at student |
| `updateMeetingStatus(...)` | L2536 | Set `status`: `active`, `ended`, `declined` |
| `updateMeetingSignal(...)` | L2568 | Upsert WebRTC signal (offer/answer/ice-candidate) |

---

## 6. Web Frontend — Component Reference

**Location**: `src/app/components/`  
**Shell**: `src/app/App.tsx` — manages session state, data bootstrap, routing via React Router v6 (`/app/:view` pattern)

### 6.1 App.tsx — Shell & Routing

**File**: `src/app/App.tsx`

| Aspect | Lines | Details |
|---|---|---|
| Imports & interfaces | L1–90 | `AppData`, `SessionState`, `AuthenticatedShellProps` interfaces |
| Role-to-views config | ~L92 | `admin`: dashboard, announcements, chats, notifications, enrollments, materials, gamified-learning, performance, grades, users, profile; `teacher`: + schedule, meetings, assignments; `student`: + schedule, assignments, grades, gamified-learning, video-summarizer, word-translator, ai-guide, milestones |
| Bootstrap fetch | ~L120 | `GET /api/bootstrap` on login; refreshes every 30s |
| Dashboard stats | ~L200 | Computes: `upcoming` (schedules in next 7 days), `assignments` (open assignments count), `users` (admin: total users), `pending` (teacher: pending schedule requests) |
| Sidebar badge counts | ~L210 | `schedulePendingCount` (teacher pending), `assignmentPendingCount` (student incomplete assignments), `meetingsTodayCount` (today's accepted meetings) |
| Incoming call polling | ~L230 | 6-second `setInterval` calling `GET /api/meetings/incoming`; shows `<IncomingCall>` overlay for students |
| Route: `/` | — | Redirects to `/app/dashboard` |
| Route: `/app/:view` | — | Renders matching component based on `view` param |

---

### 6.2 Sidebar.tsx

**File**: `src/app/components/Sidebar.tsx` — **167 lines**

| Feature | Line | Description |
|---|---|---|
| Nav items definition | L42–59 | All nav items with role restrictions |
| Admin nav items | L42, L58 | `dashboard`, `users` (admin only) |
| Teacher nav items | L43, L44, L46 | `schedule`, `meetings`, `assignments` |
| Student nav items | L49–53 | `ai-guide`, `milestones`, `video-summarizer`, `word-translator` |
| Shared items | L45, L47–48, L50, L54–57, L59 | `materials`, `assignments`, `grades`, `gamified-learning`, `chats`, `announcements`, `notifications`, `performance`, `profile` |
| Badge rendering | ~L80 | Shows numeric badges for `schedulePendingCount`, `assignmentPendingCount`, `meetingsTodayCount` |

**Navigation items by role:**

| View | Admin | Teacher | Student |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Scheduling | — | ✅ | ✅ |
| Video Meetings | — | ✅ | — |
| Learning Materials | ✅ | ✅ | ✅ |
| Assignments | — | ✅ | ✅ |
| Grades & Feedback | ✅ | ✅ | ✅ |
| Enrollments | ✅ | ✅ | ✅ |
| AI Guide Bot | — | — | ✅ |
| Gamified Learning | ✅ | ✅ | ✅ |
| Milestones | — | — | ✅ |
| Video Summarizer | — | — | ✅ |
| Word Translator | — | — | ✅ |
| Chats | ✅ | ✅ | ✅ |
| Announcements | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ |
| Performance | ✅ | ✅ | — |
| Users | ✅ | — | — |
| Profile Settings | ✅ | ✅ | ✅ |

---

### 6.3 Users.tsx (Admin only)

**File**: `src/app/components/Users.tsx` — **547 lines**

| Feature | Line | Description |
|---|---|---|
| Component export | L41 | `UsersView` — receives `users[]`, CRUD callbacks |
| Search + filter state | L48–51 | `searchTerm`, `roleFilter` (all/admin/teacher/student), `statusFilter` (all/active/inactive) |
| Pagination | L97–104 | 8 users per page (`PAGE_SIZE = 8`) |
| `resetCreateForm()` | L105 | Clears new user form fields |
| `openEdit(user)` | L117 | Populates edit form with selected user data |
| `handleCreate()` | L131 | Calls `onAddUser` → `POST /api/users`; validates form |
| `handleEdit()` | L150 | Calls `onEditUser` → `PUT /api/users/:id`; optional password change |
| `handleDelete(id)` | L176 | Confirm + call `onDeleteUser` → `DELETE /api/users/:id` |
| `uploadImage(file, mode)` | L185 | Upload profile image → `POST /api/profile/image` (Cloudinary) for create or edit |
| Create user modal | ~L200 | Fields: full name, email, role, status, password, profile image |
| Edit user modal | ~L400 | Same fields; password optional |
| User table | ~L220 | Sortable by `fullName`, role badge, status badge, edit/delete actions |

---

### 6.4 Schedule.tsx

**File**: `src/app/components/Schedule.tsx` — **1105 lines**

| Feature | Line | Description |
|---|---|---|
| `submitStudentRequest()` | L262 | Student creates schedule request → `POST /api/schedules` with `status='pending'` |
| `submitManagedCreate()` | L301 | Teacher/admin creates schedule directly → `POST /api/schedules` with `status='accepted'` |
| `submitAccept()` | L353 | Teacher accepts request → `PATCH /api/schedules/:id/respond` with `accept=true` |
| `submitDecline()` | L382 | Teacher declines request → `PATCH /api/schedules/:id/respond` with `accept=false` |
| `moveSchedule(item)` | L397 | Opens reschedule form |
| `submitMove()` | L403 | Reschedule → `PATCH /api/schedules/:id/move` |
| `cancelSchedule(item)` | L417 | Opens cancel confirmation |
| `submitCancel()` | L423 | Cancel → `PATCH /api/schedules/:id/cancel` |
| `submitAdminEdit()` | L452 | Admin full-edit → `PATCH /api/schedules/:id` |
| `startMeeting(item)` | L477 | Teacher launches video call from accepted schedule → `POST /api/meetings` |
| Student view | ~L500 | Shows own schedules with status badges; request creation form |
| Teacher view | ~L650 | Shows pending requests, own schedules; accept/decline/move/cancel actions |
| Admin view | ~L800 | All schedules; full edit + delete controls |

---

### 6.5 Meetings.tsx (Teacher only)

**File**: `src/app/components/Meetings.tsx` — **341 lines**

| Feature | Line | Description |
|---|---|---|
| `toMinutes(time)` | L16 | Converts `HH:MM` to minutes for time comparison |
| `fmtTime(time)` | L22 | Formats time to 12-hour AM/PM |
| `fmtDate(date)` | L34 | Formats ISO date to human-readable |
| `todayIso()` | L45 | Returns today in `YYYY-MM-DD` |
| `nowMinutesPHT()` | L50 | Current time in minutes (Philippine Time via `Intl.DateTimeFormat`) |
| `isActiveNow(item, nowMin)` | L63 | Checks if schedule is currently active |
| `isLaterToday(item, nowMin)` | L68 | Checks if schedule is later today |
| `MeetingCard` | L81 | Card component for each meeting |
| `Meetings` export | L154 | Main component |
| Clock refresh | L160 | `setInterval` every 30s to update `now` state |
| Tab: Today Active | L177 | Meetings currently in session |
| Tab: Later Today | L178 | Today's upcoming meetings |
| Tab: Upcoming | L182 | Future accepted meetings |
| Tab: Past | L185 | Previous meetings |
| `startMeeting(item)` | L192 | Creates meeting room → `POST /api/meetings`; navigates to `/app/video-call` with room token |

---

### 6.6 Assignments.tsx

**File**: `src/app/components/Assignments.tsx` — **511 lines**

| Feature | Line | Description |
|---|---|---|
| Allowed file types | L39 | `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx` |
| `openGradeModal(submissionId)` | L69 | Teacher opens grading modal for a submission |
| `handleCreateAssignment()` | L76 | Teacher/admin creates assignment → `POST /api/assignments` (multipart with optional file) |
| `handleStudentSubmit()` | L97 | Student submits → `POST /api/assignments/:id/submissions` (text + optional file) |
| `handleGrade()` | L123 | Teacher grades → `PATCH /api/submissions/:id/grade` |
| Assignment list | L164 | Shows submission count per assignment |
| Teacher attachment download | L235 | `<a href>` to `${backendBaseUrl}${attachmentUrl}` for teacher's file |
| Student submission view | L270 | Shows submitted file link + grade/feedback if graded |
| Student file upload | L298–324 | File picker with extension validation; shows selected filename |
| Toggle close button | ~L380 | Teacher/admin: Close/Re-open toggle → `PATCH /api/assignments/:id/toggle-close` |
| Create assignment form | L430 | Teacher: title, description, due date, optional file attachment |

---

### 6.7 GradesFeedback.tsx

**File**: `src/app/components/GradesFeedback.tsx` — **333 lines**

| Feature | Line | Description |
|---|---|---|
| `gradeColor(grade)` | L22 | Color-codes grade letter (A=green, B=blue, C=yellow, D/F=red) |
| `GradesFeedback` export | L28 | Receives `assignments`, `submissions`, `role`, `userId` |
| Filter buttons | L34 | All / Graded / Pending filter |
| `mySubmissions` (student) | L37 | Filters submissions by `studentId === userId` |
| `filteredSubmissions` | L42 | Applies graded/pending filter |
| Graded/pending counts | L48–49 | Summary stats |
| `openGradeModal()` | L51 | Teacher opens grading dialog |
| `handleGrade()` | L58 | Teacher grades → `PATCH /api/submissions/:id/grade` |
| Student view | ~L100 | Shows own submissions with grade badge + feedback |
| Teacher/admin view | ~L200 | All submissions sorted by assignment; grade entry form |

---

### 6.8 LearningMaterials.tsx

**File**: `src/app/components/LearningMaterials.tsx` — **200 lines**

| Feature | Line | Description |
|---|---|---|
| `canManage` | L13 | `role === 'admin' \|\| role === 'teacher'` |
| `subjects` (computed) | L20 | Unique subject list from existing materials |
| `load()` | L25 | Fetches → `GET /api/materials` |
| `createLink()` | L41 | Creates link material → `POST /api/materials/link` |
| `createFile()` | L65 | Uploads file material → `POST /api/materials/file` (multipart) |
| `remove(id)` | L89 | Deletes → `DELETE /api/materials/:id` |
| Material list | L165 | Groups by subject; file: links to `${backendBaseUrl}${resourceUrl}`; link: opens external URL |
| Student view | ~L140 | Read-only; download/open buttons |
| Teacher/admin view | ~L100 | Add link or upload file; delete button per item |

---

### 6.9 EnrollmentRecords.tsx

**File**: `src/app/components/EnrollmentRecords.tsx` — **216 lines**

| Feature | Line | Description |
|---|---|---|
| `isAdmin` | L12 | `role === 'admin'` — controls write access |
| `load()` | L29 | `GET /api/enrollments` + (admin only) `GET /api/users` |
| `students` (computed) | L26 | Active students from user list |
| `teachers` (computed) | L27 | Active teachers from user list |
| `createEnrollment()` | L49 | Admin → `POST /api/enrollments`; fields: student, teacher, subject, grade level, status |
| `updateStatus(id, status)` | L75 | Admin → `PATCH /api/enrollments/:id`; status: active/completed/dropped |
| `remove(id)` | L84 | Admin → `DELETE /api/enrollments/:id` |
| Status badge colors | ~L100 | active=green, completed=blue, dropped=red |
| Student view | ~L130 | Read-only list of own enrollments |
| Teacher view | ~L150 | Read-only list of enrolled students |
| Admin view | ~L100 | Full CRUD table |

---

### 6.10 Chats.tsx

**File**: `src/app/components/Chats.tsx` — **396 lines**

| Feature | Line | Description |
|---|---|---|
| State | L15–26 | chats list, selected chat, messages, composer mode |
| Polling refs | L28–29 | `chatsPollingRef` (chat list), `messagesPollingRef` (messages) |
| `loadUsers()` | L40 | `GET /api/chats/users` |
| `loadChats()` | L50 | `GET /api/chats` — with unread counts |
| `loadMessages(chatId)` | L63 | `GET /api/chats/:chatId/messages` |
| Chat list polling | L79 | Every 5s `setInterval` for chat list refresh |
| Message polling | L92 | Every 3s `setInterval` for message refresh when chat open |
| `openDirectChat()` | L113 | `POST /api/chats/direct` with selected user |
| `createGroupChat()` | L131 | `POST /api/chats/group` with name + participant IDs |
| `sendMessage()` | L158 | `POST /api/chats/:chatId/messages` |
| `toggleGroupMember(userId)` | L182 | Toggle user in group member selection |
| `getChatTitle(chat)` | L186 | Computes display name from participants |
| Chat sidebar | ~L280 | Lists chats with unread badge, last message preview |
| Message thread | ~L340 | Bubbles with own/other alignment; auto-scroll to bottom |
| Composer | ~L360 | Textarea + send button; Direct vs Group mode toggle |

---

### 6.11 Notifications.tsx

**File**: `src/app/components/Notifications.tsx` — **125 lines**

| Feature | Line | Description |
|---|---|---|
| `loadNotifications()` | L30 | `GET /api/notifications?limit=30` |
| `priorityFilter` | L28 | Filter: all / high / medium / low |
| Priority color classes | L19 | high=red, medium=yellow, low=gray |
| Type icons | L11 | assignment / submission / announcement / schedule / grade icons |
| Clickable items | ~L95 | Navigate to `actionView` on click |

---

### 6.12 Performance.tsx (Admin + Teacher)

**File**: `src/app/components/Performance.tsx` — **297 lines**

| Feature | Line | Description |
|---|---|---|
| `students` (computed) | L42 | Users where `role === 'student'` |
| `selectedStudentId` | L40 | Filter: `'all'` or specific student ID (teacher view) |
| `myAssignments` | L45 | Teacher: own assignments; admin: all |
| `filteredSubs` | L59 | Submissions for selected scope |
| Grade distribution chart | L68 | Pie chart: A/B/C/D/F grade categories |
| Assignment stats | L78 | Per-assignment: title, submission count, graded count |
| Student summary table | L94 | Per-student: avg numeric grade, best letter grade, submission count |
| Schedule stats | L120 | Completed vs cancelled sessions; today's sessions count |
| Recharts | ~L130 | `BarChart` (assignment stats) + `PieChart` (grade distribution) |

---

### 6.13 GamifiedLearning.tsx

**File**: `src/app/components/GamifiedLearning.tsx` — **1124 lines**

| Feature | Line | Description |
|---|---|---|
| `loadBaseData()` | L155 | Fetches categories + leaderboard |
| `loadCategoryScopedData(categoryId)` | L170 | Fetches quizzes for selected category |
| `loadQuizDetail(quizId)` | L198 | Fetches full quiz with questions/choices |
| `handleAnswer(choiceId)` | L348 | Records answer; advances to next question; submits when done |
| Quiz attempt | ~L350 | Timer counts up; auto-submit on time limit |
| Score calculation | ~L380 | Backend calculates: correct answers + speed bonus |
| Leaderboard view | ~L700 | Top 10 per category with rank, name, score, speed bonus |
| Teacher/admin: Category management | ~L800 | Create/edit categories; publish toggle |
| Teacher/admin: Quiz management | ~L900 | Create quiz with questions; add/remove choices; mark correct answer |
| Student view | ~L300 | Category selector → quiz list → quiz attempt → results |

---

### 6.14 VideoSummarizer.tsx (Student only)

**File**: `src/app/components/VideoSummarizer.tsx` — **222 lines**

| Feature | Line | Description |
|---|---|---|
| `mode` state | L9 | `'url'` or `'upload'` |
| `handleSummarize()` | L16 | Calls `POST /api/ai/video-summary` with URL or file; optional `context` |
| Response | L13 | `{ summary, keyTakeaways[], title? }` |
| `copySummary()` | L41 | Copies summary + takeaways to clipboard |
| Export text | L47 | Formats summary + takeaways as plain text |

---

### 6.15 WordTranslator.tsx (Student only)

**File**: `src/app/components/WordTranslator.tsx` — **230 lines**

| Feature | Line | Description |
|---|---|---|
| Language options | ~L20 | Source/target language selectors (many world languages) |
| `loadHistory()` | L39 | `GET /api/translations/history` paginated |
| `handleTranslate()` | L63 | `POST /api/ai/translate` → saves to history |
| `handleSearchHistory()` | L85 | Refetch history with search query |
| History pagination | L34–35 | `historyPage`, `historyTotalPages` |

---

### 6.16 AIGuide.tsx (Student only)

**File**: `src/app/components/AIGuide.tsx` — **151 lines**

Dedicated study guide chat. Calls `POST /api/ai/study-guide` with topic + context. Returns structured markdown study guide content.

---

### 6.17 AIChatbot.tsx (Floating — All roles)

**File**: `src/app/components/AIChatbot.tsx` — **175 lines**

| Feature | Line | Description |
|---|---|---|
| `isOpen` | L24 | Toggle chatbot overlay |
| `shortHistory` | L33 | Last 6 messages passed to API as context |
| `handleSend()` | L52 | `POST /api/ai/chat` with message + history |
| YUNA persona | L20 | Welcome message as "YUNA — Your Unified Network Assistant" |
| Context-aware | L71 | Sends `currentView` to AI for context |

---

### 6.18 MilestonesView.tsx (Student only)

**File**: `src/app/components/MilestonesView.tsx` — **349 lines**

| Feature | Line | Description |
|---|---|---|
| Stats computed | L28–33 | `submitted`, `graded`, `highGrades` (A/A+), `quizAttempts`, `perfectScores` |
| `loadGamified()` | L130 | Fetches all category leaderboards |
| Badge definitions | L163 | 5 badges: First Submission, Quiz Taker, High Achiever, Perfect Score, All-In |
| `unlockedCount` | L168 | Count of earned badges |
| `progressPct` | L169 | `submittedCount / totalAssignments * 100` |
| Milestone path | L172 | Sequential assignment milestones: completed / current / locked |
| Leaderboard tab | ~L280 | Shows global quiz leaderboard with student rank |

**Badges:**
| Badge | Unlock Condition |
|---|---|
| First Submission | At least 1 submission |
| Quiz Taker | At least 1 quiz attempt |
| High Achiever | At least 1 grade starting with 'A' |
| Perfect Score | At least 1 quiz with all correct answers |
| All-In | Submitted all available assignments |

---

### 6.19 VideoCall.tsx

**File**: `src/app/components/VideoCall.tsx` — **725 lines**

| Feature | Line | Description |
|---|---|---|
| `createPeerConnection()` | L121 | Creates WebRTC `RTCPeerConnection` with STUN servers |
| WebRTC setup | L350 | Teacher: creates offer → signals via `POST /api/meetings/:token/signal`; Student: polls for offer, creates answer |
| Signal polling | L399 | `setInterval` every 2s to poll `GET /api/meetings/:token` for signals |
| `handleEndCall()` | L487 | Closes peer connection, stops media streams, navigates back |
| Video elements | ~L500 | Local video (muted) + remote video; self-view picture-in-picture |
| Mute / camera toggle | ~L520 | Toggle local audio/video tracks |

---

### 6.20 IncomingCall.tsx

**File**: `src/app/components/IncomingCall.tsx` — **140 lines**

Incoming call overlay triggered by student polling `GET /api/meetings/incoming`.

| Feature | Description |
|---|---|
| Web Audio API ringtone | Generates oscillator-based ringtone (440 Hz + 550 Hz) when call detected |
| Accept button | Updates status → `PATCH /api/meetings/:token/status` (`active`), navigates to `/app/video-call` |
| Decline button | Updates status → `PATCH /api/meetings/:token/status` (`declined`) |
| Teacher info display | Shows teacher name from meeting room data |

---

### 6.21 ProfileSettings.tsx

**File**: `src/app/components/ProfileSettings.tsx` — **222 lines**

| Feature | Line | Description |
|---|---|---|
| `onFileChange(file)` | L55 | Sets selected file; creates `URL.createObjectURL` preview |
| `handleSave()` | L70 | If image selected: upload to Cloudinary first → `POST /api/profile/image`; then `PATCH /api/profile` with all fields |
| Password change | L33–34 | Optional: `currentPassword` + `newPassword` |
| Image preview | L64 | Local preview before upload |

---

### 6.22 Login.tsx

**File**: `src/app/components/Login.tsx` — **216 lines**

Handles both login (`POST /api/auth/login`) and registration (`POST /api/auth/register`). On success, stores JWT token in local state.

---

### 6.23 LandingPage.tsx

**File**: `src/app/components/LandingPage.tsx` — **101 lines**

Public marketing/landing page shown before login. No auth required.

---

## 7. Mobile App — Screen Reference

**Location**: `mobile-app/src/navigation/AppNavigator.tsx` (~2500+ lines)  
**Navigation**: React Navigation with Drawer + Stack navigator  
**State**: `mobile-app/src/context/AppContext.tsx`  
**API**: `mobile-app/src/api/client.ts`

### 7.1 Global: IncomingCallModal

**Line**: ~2400 (rendered outside `NavigationContainer` in `AppNavigator`)

| Feature | Description |
|---|---|
| Trigger | `AppContext` polls `GET /api/meetings/incoming` every 6s for students |
| Display | Full-screen `Modal` overlay with teacher name + schedule description |
| Ringtone | `Vibration.vibrate([400, 200, 400, 200], true)` — repeating pattern |
| Accept | `acceptCall()` in context → `PATCH /api/meetings/:token/status` (`active`) → navigate to VideoCall screen |
| Decline | `declineCall()` in context → `PATCH /api/meetings/:token/status` (`declined`) → dismiss modal |
| State | `incomingCall: MeetingRoom \| null` in `AppContext` |
| Polling ref | `incomingCallPollRef` — cleared on logout or non-student login |

---

### 7.2 AppContext.tsx — Global State

**File**: `mobile-app/src/context/AppContext.tsx`

| State / Action | Description |
|---|---|
| `session` | `{ token, user }` — JWT session |
| `incomingCall` | `MeetingRoom \| null` — current incoming call for student |
| `incomingCallPollRef` | `setInterval` ref; starts when student logs in, stops on logout |
| `toggleAssignmentClosed(id, isClosed)` | Teacher: `PATCH /api/assignments/:id/toggle-close` |
| `dismissIncomingCall()` | Clears `incomingCall` state |
| `acceptCall()` | `PATCH status=active` + navigate |
| `declineCall()` | `PATCH status=declined` + dismiss |

---

### 7.3 Screen: LandingScreen

**Line**: L98 | Public landing page with "Get Started" → `LoginScreen`

---

### 7.4 Screen: LoginScreen

**Line**: L114 | Login form → `POST /api/auth/login`; on success, stores session in `AppContext`

---

### 7.5 Screen: DashboardScreen

**Line**: L204 | Summary stats: upcoming schedules, assignments count, recent announcements list

---

### 7.6 Screen: ScheduleScreen

**Line**: L240 | Full schedule management

| Feature | Description |
|---|---|
| Student view | Request form + list of own schedules with status badges |
| Teacher view | Pending requests with Accept/Decline; own schedules with move/cancel |
| Admin view | All schedules; full edit + delete |

---

### 7.7 Screen: GamifiedLearningScreen

**Line**: L701 | Full quiz system

| Feature | Description |
|---|---|
| Category list | `GET /api/gamified/categories` |
| Quiz list | `GET /api/gamified/quizzes?categoryId=X` |
| Quiz attempt | Multiple choice, timer, auto-submit |
| Score display | Correct answers + speed bonus |
| Leaderboard | Per-category top scores |
| Teacher/admin | Create categories, create/edit quizzes |

---

### 7.8 Screen: AnnouncementsScreen

**Line**: L1256 | Lists all announcements from `GET /api/announcements`; teacher/admin can create

---

### 7.9 Screen: AssignmentsScreen

**Line**: L1304

| Feature | Description |
|---|---|
| Assignment list | Shows title, due date, `isClosed` badge |
| Teacher attachment | Download link via `Linking.openURL` |
| Student submission | Text input + "Submissions Closed" notice if `isClosed` |
| Submitted badge | Shows grade + feedback if graded |
| Teacher: Close/Reopen | Toggle → `PATCH /api/assignments/:id/toggle-close` |
| Teacher: Grade | Grade + feedback input → `PATCH /api/submissions/:id/grade` |
| Teacher: Create | New assignment form |

---

### 7.10 Screen: GradesScreen

**Line**: L1498 | Student view of own grades and feedback from graded submissions

---

### 7.11 Screen: LearningMaterialsScreen

**Line**: L1520

| Feature | Description |
|---|---|
| Load | `GET /api/materials` |
| Grouping | Materials grouped by subject |
| Open | File/link opened via `Linking.openURL` |
| Teacher/admin | Create link or file material (file: `POST /api/materials/file`) |
| Delete | `DELETE /api/materials/:id` |

---

### 7.12 Screen: EnrollmentsScreen

**Line**: L1581

| Feature | Description |
|---|---|
| Load | `GET /api/enrollments` |
| Student view | Own enrollments with subject, teacher, grade level, status |
| Teacher view | Enrolled students |
| Admin view | Full CRUD: create, update status, delete |
| Status colors | active=green, completed=blue, dropped=red |

---

### 7.13 Screen: NotificationsScreen

**Line**: L1646

| Feature | Description |
|---|---|
| Load | `GET /api/notifications?limit=30` |
| Display | Priority color coding: high=red, medium=amber, low=gray |
| Types | assignment-due, grade received, submission needs grading, schedule pending, announcements |

---

### 7.14 Screen: ChatsScreen

**Line**: L1694

| Feature | Description |
|---|---|
| Load | `GET /api/chats` — list with unread counts |
| Unread badge | Shown on each chat with unread messages |
| Navigation | Tap chat → `ChatDetailScreen` |
| Start direct | Select user → `POST /api/chats/direct` |

---

### 7.15 Screen: ChatDetailScreen

**Line**: L1754

| Feature | Description |
|---|---|
| Load | `GET /api/chats/:chatId/messages` |
| Auto-refresh | Every 5s |
| Send | `POST /api/chats/:chatId/messages` |
| Message bubbles | Own messages right-aligned; others left-aligned |

---

### 7.16 Screen: MilestonesScreen

**Line**: L1822

| Feature | Description |
|---|---|
| Submission stats | Total submissions, graded count, high grades |
| Quiz stats | Total attempts, best score |
| 5 Badges | First Submission, Quiz Taker, High Achiever, Perfect Score, All-In |
| Progress bar | `submittedCount / totalAssignments * 100%` |
| Milestone path | Per-assignment sequential milestones (completed/current/locked) |

---

### 7.17 Screen: VideoSummarizerScreen

**Line**: L1891

| Feature | Description |
|---|---|
| Input | YouTube/video URL |
| Context | Optional study context |
| Submit | `POST /api/ai/video-summary` |
| Output | Summary text + key takeaways list |

---

### 7.18 Screen: WordTranslatorScreen

**Line**: L2005

| Feature | Description |
|---|---|
| Input | Text to translate + source/target language |
| Translate | `POST /api/ai/translate` |
| History | `GET /api/translations/history` |
| History search | Filter by text |

---

### 7.19 Screen: AIGuideScreen

**Line**: L2094 | Study guide chat → `POST /api/ai/study-guide` with topic; shows structured guide

---

### 7.20 Screen: PerformanceScreen

**Line**: L2158 | Teacher/admin performance analytics (assignment stats, grade distribution, schedule stats)

---

### 7.21 Screen: UsersScreen

**Line**: L2191 | Admin user management: list, create, edit, delete users

---

### 7.22 Screen: ProfileScreen

**Line**: L2259 | Edit own profile: name, email, optional password change, profile image upload

---

## 8. Role-Based Feature Matrix

| Feature | Admin | Teacher | Student |
|---|---|---|---|
| **Dashboard** | ✅ Stats: total users, upcoming sessions, open assignments | ✅ Stats: pending requests, upcoming sessions | ✅ Stats: upcoming sessions, open assignments |
| **User Management** (create/edit/delete) | ✅ Full CRUD | ❌ | ❌ |
| **Profile Settings** | ✅ Edit own profile + image | ✅ | ✅ |
| **Scheduling** — view | ✅ All schedules | ✅ Own schedules | ✅ Own schedules |
| **Scheduling** — create | ✅ Direct (accepted) | ✅ Direct (accepted) | ✅ Request (pending) |
| **Scheduling** — respond (accept/decline) | ✅ | ✅ | ❌ |
| **Scheduling** — move/cancel | ✅ | ✅ | ❌ |
| **Scheduling** — full edit | ✅ | ❌ | ❌ |
| **Scheduling** — delete | ✅ | ❌ | ❌ |
| **Video Meetings** — initiate | ❌ | ✅ From Meetings view | ❌ |
| **Video Meetings** — receive call | ❌ | ❌ | ✅ (polling + IncomingCall overlay) |
| **Assignments** — view | ✅ | ✅ | ✅ |
| **Assignments** — create | ✅ | ✅ With optional file attach | ❌ |
| **Assignments** — close/open | ✅ | ✅ | ❌ |
| **Assignments** — submit | ❌ | ❌ | ✅ Text + optional file |
| **Assignments** — grade | ✅ | ✅ | ❌ |
| **Grades & Feedback** — view own | ❌ | ❌ | ✅ |
| **Grades & Feedback** — view all/grade | ✅ | ✅ | ❌ |
| **Enrollments** — view | ✅ All | ✅ Their students | ✅ Own |
| **Enrollments** — CRUD | ✅ Full admin | ❌ | ❌ |
| **Learning Materials** — view | ✅ | ✅ | ✅ |
| **Learning Materials** — create | ✅ | ✅ Link or file | ❌ |
| **Learning Materials** — delete | ✅ | ✅ Own | ❌ |
| **Announcements** — view | ✅ | ✅ | ✅ |
| **Announcements** — create | ✅ | ✅ | ❌ |
| **Chats** — direct + group | ✅ | ✅ | ✅ |
| **Notifications** | ✅ Submissions needing grading + schedules | ✅ Submissions needing grading + schedules | ✅ Due soon + grade received + schedules |
| **Gamified Learning** — play | ✅ (view) | ✅ (view) | ✅ Attempt quizzes |
| **Gamified Learning** — manage | ✅ Full CRUD | ✅ Full CRUD | ❌ |
| **Leaderboard** | ✅ | ✅ | ✅ |
| **Performance Analytics** | ✅ All students | ✅ Own students | ❌ |
| **Milestones** | ❌ | ❌ | ✅ Badges + assignment path |
| **Video Summarizer** | ❌ | ❌ | ✅ |
| **Word Translator** | ❌ | ❌ | ✅ With history |
| **AI Guide** (study guide) | ❌ | ❌ | ✅ |
| **YUNA AI Chatbot** (floating) | ✅ | ✅ | ✅ |

---

## 9. Notifications System

**Endpoint**: `GET /api/notifications` — `backend/src/index.ts` L944  
**No dedicated DB table** — notifications are generated dynamically per request.

### Logic (L944–1057):

| Notification Type | Who Sees It | Condition |
|---|---|---|
| `announcement` | All | Last 8 announcements from `listAnnouncements()` |
| `assignment` (due soon) | Student | Assignment not submitted + due within 72h (high priority if <24h) |
| `grade` (received) | Student | Any submission with a grade set |
| `submission` (needs grading) | Teacher / Admin | Any ungraded submissions (up to 12) |
| `schedule` (pending) | Teacher / Admin | Pending schedule requests |

Response sorted by `createdAt` descending, sliced to `limit` (default max 30).

---

## 10. AI Features

All AI features use the **Groq API** (`backend/src/index.ts`).

| Feature | Route | Line | Model Used | Description |
|---|---|---|---|---|
| YUNA Chatbot | `POST /api/ai/chat` | L795 | Groq LLM | General assistant with conversation history context |
| Study Guide | `POST /api/ai/study-guide` | L822 | Groq LLM | Structured study guide from topic + optional context |
| Word Translator | `POST /api/ai/translate` | L850 | Groq LLM | Translate text between languages; saves to `translation_history` |
| Video Summarizer | `POST /api/ai/video-summary` | L888 | Groq + ffmpeg | Downloads video, extracts audio with ffmpeg, transcribes, summarizes; returns `{ summary, keyTakeaways[], title }` |

---

## 11. WebRTC Video Call Flow

**Files involved**:
- `backend/src/index.ts` — meetings routes (L2307–L2429)
- `backend/src/services/YunafiedService.ts` — meeting service methods (L2432–L2568)
- Web: `src/app/components/VideoCall.tsx` (L725), `Meetings.tsx` (L341), `IncomingCall.tsx` (L140)
- Mobile: `AppNavigator.tsx` (IncomingCallModal ~L2400), `AppContext.tsx` (incomingCall polling)

### Call Flow:

```
Teacher (Meetings.tsx/ScheduleScreen)
  ↓  clicks "Start Meeting"
  → POST /api/meetings { studentId, scheduleDescription }
  ← { roomToken, ... }
  ↓  navigates to VideoCall with roomToken
  → creates RTCPeerConnection (L121)
  → getUserMedia (camera + mic)
  → creates SDP offer
  → POST /api/meetings/:token/signal { type: 'offer', payload }
  ↓  polls GET /api/meetings/:token for answer/ICE

Student (polling every 6s in AppContext / IncomingCall component)
  → GET /api/meetings/incoming
  ← meeting room with status='pending'
  ↓  IncomingCall overlay shown + ringtone
  → clicks Accept
  → PATCH /api/meetings/:token/status { status: 'active' }
  ↓  navigates to VideoCall with roomToken
  → getUserMedia
  → polls for offer
  → creates SDP answer
  → POST /api/meetings/:token/signal { type: 'answer', payload }
  → ICE candidates exchanged via /signal

Both sides
  → WebRTC P2P connection established
  → Media streams rendered in <video> elements
  → End call: PATCH /api/meetings/:token/status { status: 'ended' }
```

---

## 12. File Upload Paths

**Backend upload middleware** (`backend/src/index.ts`):

| Upload Type | Middleware | Storage | Path/Service |
|---|---|---|---|
| Profile images | `profileImageUpload` (multer memoryStorage) | **Cloudinary** | Returns `{ url, publicId }` |
| Assignment attachments | `assignmentUpload` (multer diskStorage) | Local `/uploads/` | Served at `/uploads/:filename` |
| Assignment submissions (student) | `submissionUpload` (multer diskStorage) | Local `/uploads/` | Served at `/uploads/:filename` |
| Learning material files | `materialsUpload` (multer diskStorage) | Local `/uploads/` | Served at `/uploads/:filename` |

**Frontend access**:
- Local files: `${VITE_BACKEND_URL}/uploads/filename`
- Cloudinary images: Direct CDN URL stored in DB

**Allowed MIME types for assignments** (web validation, L39): `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`

---

*Generated from full codebase analysis. Line numbers reference the state of files at documentation time.*

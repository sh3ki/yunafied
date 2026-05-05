# YUNAfied — Full System Enhancement Documentation

> **Version**: Enhancement Analysis v1.0 (Render Free Tier Aligned)  
> **Scope**: UI, Backend, Database, Process Flows, Logic, New Features  
> **Purpose**: To elevate YUNAfied from its current 40% baseline to a complete, production-grade tutorial management system aligned with the project's stated goals.

---

## Render Free Tier Deployment Constraints

All enhancements in this document are designed to run within **Render Free Tier** limits. The following constraints apply to every decision:

| Constraint | Impact on Design |
|---|---|
| **Ephemeral filesystem** — disk is wiped on every restart/redeploy | All file uploads (rubrics, avatars, videos, CSV) MUST go to Cloudinary via `multer.memoryStorage()`. No `diskStorage()`. |
| **No persistent in-memory state** — process restarts after 15 min of inactivity | No in-memory job queues or trackers. All state is stored in PostgreSQL (Neon DB). |
| **~512 MB RAM limit** | Whisper must use `tiny` or `base` model only. No pdfkit/server-side PDF rendering. |
| **Single process** — no worker threads / background services | Rate limiting uses in-memory store (fine for single instance; resets on cold start, acceptable). No cron jobs. |
| **No WebSocket on free tier** (connections drop on cold start) | All real-time features (chat, video signaling, notifications) use **HTTP polling**. No socket.io. |
| **Cold start delay** (~30 s after 15 min idle) | Frontend shows a full-page loading state on first request. Bootstrap cache TTL = 30 s. |
| **PDF generation** | Client-side only using `jsPDF` on the frontend. No server-side PDF libraries. |
| **External services already in use** | Cloudinary (files), Neon DB (PostgreSQL), Resend (email), Groq (AI) — all compatible with free tier. |

---

## Table of Contents

1. [Admin Module Enhancements](#1-admin-module-enhancements)
2. [Teacher Module Enhancements](#2-teacher-module-enhancements)
3. [Student Module Enhancements](#3-student-module-enhancements)
4. [AI & Learning Support Enhancements](#4-ai--learning-support-enhancements)
5. [Communication & Notifications Enhancements](#5-communication--notifications-enhancements)
6. [Gamification Enhancements](#6-gamification-enhancements)
7. [Database Schema Enhancements](#7-database-schema-enhancements)
8. [Backend API Enhancements](#8-backend-api-enhancements)
9. [UI / UX Enhancements](#9-ui--ux-enhancements)
10. [Mobile App Enhancements](#10-mobile-app-enhancements)
11. [Security & Performance Enhancements](#11-security--performance-enhancements)

---

## 1. Admin Module Enhancements

### 1.1 Audit Log System

**Current State**: No audit log exists. There is no record of who created, edited, or deleted any data. Admin has no visibility into system activity.

**Enhancement**:
- Implement a full audit log that records every state-changing action in the system: user creation, deletion, edit, login, role changes, schedule creation/acceptance/cancellation, grade submissions, enrollment changes, and announcement posts.
- New DB table: `audit_logs` with fields: `id`, `actor_id` (user who took the action), `actor_name`, `actor_role`, `action` (e.g. `CREATE_USER`, `DELETE_SCHEDULE`, `GRADE_SUBMISSION`), `entity_type` (e.g. `user`, `schedule`, `submission`), `entity_id`, `payload JSONB` (before/after snapshot), `ip_address`, `created_at`.
- Admin dashboard shows a dedicated **Audit Logs** page with: date range filter, actor filter, action type filter, entity type filter, and paginated results.
- Audit log entries are **read-only** and cannot be deleted by any user including admin.

### 1.2 Advanced Analytics Dashboard

**Current State**: Admin dashboard shows 6 basic stat cards (total students, teachers, ongoing classes, bookings today, completed, cancelled) and one bar chart. The Analytics.tsx component is entirely disconnected from real data.

**Enhancement**:
- **User Registration Trend**: Line chart showing new user signups over time (weekly/monthly), broken down by role.
- **Session Activity**: Bar chart showing total sessions (accepted schedules) per week/month.
- **Assignment Completion Rate**: Percentage of assignments with at least one submission, system-wide.
- **Grade Distribution System-Wide**: Aggregated pie/bar chart across all submissions.
- **Top Performing Students**: Table listing top 5 students by average grade.
- **Least Engaged Students**: Table identifying students with zero submissions in the last 30 days.
- **Teacher Workload**: Chart showing each teacher's active enrollment count, pending schedules, and ungraded submissions.
- **AI Feature Usage**: Counters for video summaries generated, translations performed, AI guide sessions, chatbot conversations.
- **Enrollment Statistics**: Active vs. completed vs. dropped enrollment breakdown.
- Export buttons on each chart/table to download as **CSV or PDF**.

### 1.3 Report Generation

**Current State**: No report generation or export functionality exists.

**Enhancement**:
- **Student Progress Report**: Per-student report showing all submissions, grades, attendance (accepted schedules), and enrollment status. Downloadable as PDF.
- **Class Performance Report**: Per-teacher class summary showing assignment stats, average scores, and student engagement.
- **System Usage Report**: Monthly summary of platform activity — logins, AI tool usage, chats, submissions.
- **Enrollment Summary Report**: Full enrollment roster with status breakdown.
- Reports can be filtered by date range, teacher, class, or student.
- **PDF generation is client-side only** using `jsPDF` + `jspdf-autotable` on the frontend. No server-side PDF libraries (Render free tier 512 MB RAM limit).

### 1.4 Bulk User Management

**Current State**: Admin creates users one at a time only. There is no import or bulk operation.

**Enhancement**:
- **CSV Import**: Admin uploads a CSV file (columns: first_name, last_name, email, role, password) to create multiple users at once. Backend validates each row and returns a result with success/error per row.
- **Bulk Deactivate/Activate**: Select multiple users via checkboxes in the Users table and apply status change in one action.
- **Bulk Role Reassignment**: Apply a role change to multiple users.
- **Export Users**: Download all users as CSV with columns: full name, email, role, status, created date.

### 1.5 Admin View of All Meetings / Video Sessions

**Current State**: Admin has no visibility into meeting rooms or active/past video sessions.

**Enhancement**:
- Admin gets a **Meeting History** view showing all past, active, and declined meeting rooms with: teacher name, student name, date/time, duration, status.
- Admin can view but not join or interfere with active calls.

### 1.6 Enrollment Management Improvements

**Current State**: Enrollment Records allows creating individual records but has no filtering, reporting, or batch operations.

**Enhancement**:
- **Filter by subject, teacher, status, grade level**.
- **Enrollment Statistics Cards**: Total enrollments, active, completed, dropped counts.
- **Grade Level Field**: Add `grade_level TEXT` to enrollment records for better classification.
- **Edit Enrollment**: Admin can edit the subject, teacher assignment, and note on existing records.
- **Bulk Status Update**: Select multiple enrollment records and update status in bulk.

### 1.7 System Settings Panel

**Current State**: No settings panel exists. Configuration is only via environment variables.

**Enhancement**:
- **Announcement Settings**: Toggle whether students can see all announcements or only their enrolled teacher's announcements.
- **Registration Settings**: Toggle whether self-registration is open or invite-only.
- **AI Feature Toggle**: Admin can enable/disable AI features per role (e.g. disable video summarizer if API quota exceeded).
- **Maintenance Mode Toggle**: Admin puts the system in maintenance mode with a custom message shown on login page.

---

## 2. Teacher Module Enhancements

### 2.1 Schedule — Accept/Decline Flow Improvement

**Current State**: Teachers can accept or decline schedule requests but the UI doesn't clearly separate "pending requests" from the full calendar view. There's no quick-action inbox for pending requests.

**Enhancement**:
- **Pending Requests Inbox**: Dedicated section at the top of the Schedule page showing all pending requests with student name, proposed time, subject level, and request note. One-click Accept/Decline/Reschedule buttons.
- **Teacher Availability Blocks**: Teachers can define their weekly availability (e.g. Mon 9am–5pm, Tue 1pm–6pm). Students can only request times within available blocks. This prevents irrelevant requests.
- **Reschedule Proposal**: When declining, teacher can optionally propose an alternative date/time. Student receives the counter-proposal and can accept or re-negotiate.
- **Schedule Notes**: Teachers can add private notes to any accepted schedule (visible only to them).
- **Conflict Warning**: If a new request overlaps with an already accepted session, the UI shows a conflict warning before the teacher accepts.

### 2.2 Assignment Enhancements — Rubrics

**Current State**: Assignments have a title, description, due date, and optional file attachment. Grading uses a free-text grade field and free-text feedback only. No rubric system exists.

**Enhancement**:
- **Rubric Upload**: Teacher can attach a rubric file (PDF/DOCX) to an assignment. A separate `rubric_url` and `rubric_file_name` is stored on the assignment.
- **Rubric Criteria Table (Optional)**: For fully digital rubrics, teacher can build a rubric table in the UI: rows = criteria (e.g. Content, Grammar, Structure), columns = score levels (e.g. Excellent 4, Good 3, Fair 2, Poor 1). The system stores this as a JSONB field on the assignment.
- **Rubric-Based Scoring Modal**: When grading a submission, the modal shows the rubric table. Teacher scores each criterion, and the system auto-calculates the total score. The final grade is derived from the total.
- **Rubric Template Library**: Teachers can save rubric templates for reuse across multiple assignments.
- **Assignment Categories/Tags**: Teacher can tag assignments (e.g. Quiz, Essay, Project, Homework) for filtering and reporting.

### 2.3 Submission Review Improvements

**Current State**: Teachers see a list of submissions but viewing is basic. File links open externally. No inline preview.

**Enhancement**:
- **Submission Detail Panel**: Clicking a submission opens a full-page panel showing: submitted text (if any), file download button, original assignment rubric, existing grade/feedback, and the grading form.
- **PDF Inline Preview**: PDF submissions rendered inline in the panel using a PDF viewer.
- **Submission Status Filters**: Filter by assignment, graded/ungraded, student.
- **Batch Grade Export**: Export all grades for an assignment as a CSV (student name, grade, feedback).
- **Late Submission Flag**: System marks submissions received after the due date with a "Late" badge. Teacher can see this at a glance.
- **Re-grade Capability**: Teacher can update grade/feedback on an already-graded submission with a note explaining the change.

### 2.4 Learning Materials — Organization

**Current State**: Learning materials are a flat list with no categories, folders, or class-based organization.

**Enhancement**:
- **Subject/Category Filter**: Materials are displayed grouped by subject, with a sidebar filter.
- **Enrollment-Linked Materials**: Teacher can assign a material to a specific enrollment record or a group, making it visible only to enrolled students for that subject.
- **Material Edit**: Teacher can edit the title, description, and subject of existing materials.
- **Material Ordering**: Teacher can reorder materials within a subject using drag-and-drop.
- **Material Views Tracking**: Track how many students have opened/downloaded each material.

### 2.5 Teacher — Video Summarizer Access

**Current State**: Video Summarizer is only in the student role views. Teachers cannot use it.

**Enhancement**:
- Add Video Summarizer to teacher role views so teachers can summarize video submissions before reviewing.
- Teacher-specific context prompt for summarizer: "Summarize this student video submission for academic review."

### 2.6 Teacher Performance Dashboard Enhancements

**Current State**: Performance page shows basic grade distribution and submission stats. No comparison between students or over time.

**Enhancement**:
- **Per-Student Trend**: Line chart showing a specific student's grades over time (per assignment, in order).
- **Class Average Trend**: Line chart showing class-wide average grade over all assignments.
- **Submission Rate Per Assignment**: Bar chart showing what % of enrolled students submitted each assignment.
- **Student Engagement Score**: Composite metric per student: assignments submitted / total assignments × 0.5 + schedule sessions attended × 0.5.
- **Students Needing Attention**: Auto-flagging of students with below-average performance or zero submissions in last 2 weeks.
- **Export**: Export the performance table as CSV.

### 2.7 Announcement Delete / Edit

**Current State**: Announcements can be created but not deleted or edited.

**Enhancement**:
- Teachers and admins can **edit** an announcement (update title and content) — edited announcements show an "Edited" badge.
- Teachers and admins can **delete** their own announcements.
- Admin can delete any announcement regardless of poster.

---

## 3. Student Module Enhancements

### 3.1 Schedule — Student Request Improvements

**Current State**: Students select a teacher and fill in a date/time. There's no visibility into teacher availability. Students cannot see if their request is likely to conflict.

**Enhancement**:
- **Teacher Availability View**: Before submitting a request, student can see the teacher's available time blocks for the week.
- **Request Status Tracking**: Clear visual timeline on the student's schedule page showing each request's lifecycle: Submitted → Pending Teacher Response → Accepted/Declined/Reschedule Proposed.
- **Reschedule Counter-Accept**: If the teacher proposed a reschedule, student sees the counter-proposal and can one-click Accept.
- **Session History**: Student can see all past sessions with the teacher (accepted/completed), not just upcoming ones.

### 3.2 Word Translator — Expanded Language Support

**Current State**: Only 5 languages: English, Filipino, Japanese, Korean, Spanish.

**Enhancement**:
- **Expanded Language List** (minimum 20 languages):
  - English
  - Filipino / Tagalog
  - Japanese
  - Korean
  - Spanish
  - French
  - German
  - Italian
  - Portuguese
  - Chinese (Simplified)
  - Chinese (Traditional)
  - Arabic
  - Hindi
  - Malay / Bahasa Malaysia
  - Indonesian / Bahasa Indonesia
  - Vietnamese
  - Thai
  - Russian
  - Dutch
  - Turkish
- **Swap Languages Button**: One-click swap of source ↔ target language.
- **Text-to-Speech (TTS) Button**: Play pronunciation of the translated text using the Web Speech API (no external service needed).
- **Contextual Translation**: Include a "context" field so the user can specify the domain (medical, academic, casual) for more accurate AI translation.
- **Translation Save to Vocab List**: Students can save individual translations to a personal vocabulary list.
- **Vocabulary List Page**: Dedicated sub-section showing all saved vocabulary items, with search and delete.

### 3.3 Milestones — Connect to Real Data

**Current State**: Milestones.tsx is completely hardcoded with static dummy data (5 fixed milestone titles and dates). It is not connected to the database at all.

**Enhancement**:
- **Dynamic Milestones from DB**: New `student_milestones` table stores milestone records per student. Milestones are automatically created/updated based on: first submission, first quiz completion, quiz score above 80%, all assignments submitted for a subject, schedule session completed.
- **Milestone Types**: Academic (assignment related), Engagement (quiz/gamification), Social (first chat message, first video call).
- **Progress Bar**: Visual progress bar showing completion % of total milestones.
- **Celebration Animation**: When a milestone is reached (newly unlocked), show a confetti animation and toast notification.
- **Admin/Teacher View**: Teachers and admins can view a student's milestones from their profile.

### 3.4 Student Dashboard Enhancement

**Current State**: Student dashboard shows basic quick stats but lacks a personalized academic overview.

**Enhancement**:
- **Today's Schedule**: Card showing sessions scheduled for today with a "Join" button if the time window is active.
- **Pending Assignments**: List of unsubmitted assignments with due dates, sorted by urgency.
- **Recent Grades**: Last 3 graded submissions with grade badge.
- **Streak Counter**: Number of consecutive days the student has been active on the platform (submitted something or attended a session).
- **Learning Progress Summary**: Gamification points earned, quizzes completed, assignments submitted — in a horizontal stat row.
- **Upcoming Deadline Alert**: Red banner if any assignment is due within 24 hours.

### 3.5 Video Summarizer Enhancements — Student Perspective

**Current State**: No history of past summaries is saved. Student has to re-summarize every time.

**Enhancement**:
- **Summary History**: All generated summaries (video URL/filename, title, summary bullets, takeaways, timestamp) are saved to a new `video_summaries` table per user.
- **Summary Detail View**: Click a past summary to view full details.
- **Copy & Export**: Copy summary as text or export as PDF for study notes.
- **Note Field**: Before summarizing, student can add a note/context about what the video is (e.g. "Chapter 3 review").

### 3.6 Student Study Planner / To-Do List

**Current State**: No study planner or personal task list exists for students.

**Enhancement**:
- **Personal To-Do List**: Simple personal task list (not connected to assignments) where students can add their own study goals.
- **Auto-populate from Assignments**: Button to pull unsubmitted assignments into the to-do list.
- **Completion Toggle**: Check off tasks. Completed tasks move to a "Done" section.
- **Due Date on Tasks**: Assign personal deadlines.

---

## 4. AI & Learning Support Enhancements

### 4.1 AI Chatbot (AIChatbot.tsx) Enhancements

**Current State**: Floating chatbot available to all roles. Supports basic Q&A. Only stores last 8 messages as context. No conversation history persistence.

**Enhancement**:
- **Conversation History Persistence**: Save chatbot conversations to DB table `ai_chatbot_sessions` per user. Users can view past conversations.
- **Role-Specific Prompts**: 
  - Student: Help with study questions, explain concepts step-by-step (no direct answers), guide through assignments.
  - Teacher: Help with creating assignment instructions, grading criteria suggestions, announcement drafting.
  - Admin: Help with system navigation, report interpretation.
- **Context Awareness**: Bot knows the user's current page/view and can suggest related actions (e.g. "You're on Assignments — would you like help submitting?").
- **Quick Suggestion Chips**: Pre-built question chips shown at start of conversation (e.g. "How do I submit an assignment?", "Explain this grammar rule").
- **Markdown Rendering**: Bot responses render markdown (bold, lists, code blocks).
- **Typing Indicator**: Animated dots while AI is thinking.
- **Clear Conversation Button**: Reset conversation history.

### 4.2 AI Study Guide (AIGuide.tsx) Enhancements

**Current State**: English-only guide with 7 English sub-topics. Limited to English language tutoring.

**Enhancement**:
- **Expanded Subject List**:
  - English Grammar, Vocabulary, Writing, Speaking, Reading Comprehension, Business English
  - Mathematics (Basic, Algebra, Geometry)
  - Science (General, Biology, Chemistry, Physics)
  - Filipino / Filipino Literature
  - History / Social Studies
  - General Study Skills / Note-taking / Time Management
- **Socratic Teaching Mode**: Guide is configured to never give direct answers — instead it asks guiding questions, offers hints, and celebrates when the student reaches the answer themselves.
- **Example Generator**: On request, the guide generates 3 practice examples for the current topic.
- **Conversation Save**: Save a guide session as study notes (downloadable as PDF or text).

### 4.3 Video Summarizer Enhancements — Technical

**Current State**: Works with YouTube URLs and uploaded videos. No language selection. No context injection. Summary is not saved.

**Enhancement**:
- **Summary Persistence**: Save all generated summaries to the DB (see §3.5). After summary generation the backend automatically stores the result in the `video_summaries` table. Users can navigate to the History tab in the Video Summarizer page to access any past summary at any time.
- **Language Hint**: Add an optional "language hint" field — if the video is in Filipino or another language, Whisper is directed to transcribe in that language.
- **Context-Aware Summary Prompt**: Teacher/student can specify the academic context ("This is a physics lecture on Newton's laws"). The Groq prompt incorporates this for more relevant summaries.
- **Summary Quality Score**: After summary generation, show a short confidence note (e.g. "Transcription quality: Good — 1,200 words extracted").
- **Max File Size Enforcement**: Server-side file size validation with a clear error message (currently only client-side). Videos uploaded via multer use `memoryStorage` and are streamed directly to the Python pipeline — no disk write.
- **Client-Side Progress Steps**: Show a step-by-step progress indicator in the UI: `Uploading → Transcribing → Summarizing → Done`. Steps advance based on response timing (no in-memory server job tracker — Render free tier restarts wipe memory). The backend processes synchronously and returns the completed result; the frontend simulates step advancement during the wait.
- **File upload**: Multer must use `memoryStorage()`. Video files are piped directly to the Python subprocess stdin. No temp files written to disk.

### 4.4 Word Translation — Backend Enhancement

**Current State**: The translation endpoint uses Groq AI with a prompt that guides it to translate between languages. It only supports the 5 languages listed in the UI.

**Enhancement**:
- **Expand language support in the Groq prompt** to handle all 20 languages listed in §3.2.
- **Formal/Informal Register Option**: Include a register parameter (`formal` or `informal`) in the translation payload. The Groq prompt adjusts accordingly.
- **Translation Quality Disclaimer**: For less common language pairs (e.g. English → Thai), add a UI note that AI translation may be less accurate.
- **Vocabulary Save Endpoint**: New `POST /api/translation/save-vocab` endpoint to save a translation to a personal vocab list table `user_vocabulary`.

---

## 5. Communication & Notifications Enhancements

### 5.1 Chat Enhancements

**Current State**: Basic real-time-polling chat. Text messages only. No file sharing, no reactions, no image support. Uses 3-second polling which is efficient enough for Render free tier.

**Enhancement**:
- **File Attachment in Chat**: Users can attach and send image files or documents (PDF, DOCX) in chat messages. Backend uploads to **Cloudinary** (via `multer.memoryStorage()` — no disk write). UI shows image thumbnails inline.
- **Message Reactions**: Users can react to a message with an emoji (👍 ✅ 🔥 ❓). Reaction counts shown below each message.
- **Reply-to-Message**: Quote a previous message when replying for clearer thread context.
- **Message Search**: Search within a chat conversation.
- **Unread Message Jump**: "Jump to first unread" button when opening a chat with unread messages.
- **Polling Optimization**: Keep existing HTTP polling. Increase chat message polling to 4 seconds (from 3). Increase chat list polling to 8 seconds (from 5). No WebSocket — Render free tier cold-starts drop WebSocket connections, making socket.io unreliable.
- **Last Seen Tracking**: Store `last_seen_at` on user record. Show "Online" / "X min ago" without a persistent WebSocket — updated on every API call.
- **Message Timestamps**: Relative timestamps (e.g. "2 min ago") on individual messages, with full timestamp on hover.

### 5.2 Announcements Enhancements

**Current State**: All announcements are global (all roles see all announcements). No targeting, no delete, no edit, no pinning.

**Enhancement**:
- **Targeted Announcements**: Teacher can post to: "All my students" (filtered by enrollment), "Specific class", or "Everyone". Admin can post to any scope.
- **Pin Announcement**: Admin/teacher can pin an announcement to appear at the top of the list for all relevant users.
- **Delete Announcement**: Poster or admin can delete an announcement.
- **Edit Announcement**: Poster or admin can edit title and content. Edited announcements show an "Edited" label.
- **Announcement Read Receipt**: Track which users have viewed an announcement. Teacher can see view count.
- **Rich Text Body**: Replace plain textarea with a basic rich-text editor (bold, italic, lists, links) using a lightweight library like `tiptap` or `react-quill`.

### 5.3 Notifications System Overhaul

**Current State**: Notifications are generated dynamically on the frontend from existing data (assignments, schedules, announcements). They are not stored in the DB. There is no mark-as-read functionality, no persistence across sessions, and no real-time delivery.

**Enhancement**:
- **Persistent Notifications Table**: New `notifications` table in DB (see §7) storing all notifications with: `id`, `user_id`, `type`, `title`, `message`, `action_view`, `priority`, `is_read`, `created_at`.
- **Server-Side Generation**: Notifications are generated on the server when events occur: schedule accepted/declined, assignment posted, submission graded, announcement posted, meeting started.
- **Mark as Read**: Users can mark individual notifications as read. Unread count shown in sidebar badge.
- **Mark All as Read**: Bulk mark all notifications as read.
- **Delete Notification**: Users can dismiss/delete individual notifications.
- **Push Notification (Future)**: Foundation laid for browser push notifications via the Web Push API.

---

## 6. Gamification Enhancements

### 6.1 Badges & Achievement System

**Current State**: Quiz attempts track score and time. There are categories and leaderboards. But no badge/achievement system exists.

**Enhancement**:
- **Badge Types**:
  - Speed Badge: Complete a quiz in under 50% of the time limit.
  - Perfect Score: Get 100% on a quiz.
  - Streak Quizzer: Complete quizzes 3 days in a row.
  - First Attempt: First quiz ever completed.
  - Category Master: Complete all quizzes in a category.
- **Badge DB Tables**: `badges` (definition), `student_badges` (earned records with date).
- **Badge Display on Profile**: Student profile shows earned badges.
- **Badge Notification**: When a badge is earned, a toast + modal celebration is triggered.

### 6.2 XP (Experience Points) & Levels

**Current State**: Quiz scores exist but there's no cumulative XP or level system.

**Enhancement**:
- **XP System**: Students earn XP from: quiz completions (score-proportional XP), assignment submissions, attending tutorial sessions, login streaks.
- **Level Tiers**: Learner (0–500 XP), Scholar (501–1500 XP), Expert (1501–3000 XP), Master (3001+ XP).
- **XP Progress Bar**: Shown on student dashboard and profile.
- **Leaderboard Tabs**: Weekly, Monthly, All-Time leaderboard. Students can see their rank among all students.

### 6.3 Quiz Improvements

**Current State**: Teacher can create quizzes with timed questions. Students play in a Kahoot-style format. Basic result shown after completion.

**Enhancement**:
- **Question Images**: Teacher can attach an image to a question (stored in Cloudinary).
- **Question Types**: Add True/False type alongside existing multiple-choice.
- **Explanation on Answer**: Teacher can add an explanation for each correct answer, shown to the student after they answer.
- **Quiz Preview Mode**: Teacher can preview the quiz as a student before publishing.
- **Scheduled Release**: Teacher sets a publish date/time for the quiz instead of instant publish.
- **Attempt Limit**: Teacher can limit how many times a student can attempt a quiz.
- **Quiz Analytics for Teacher**: After students play, teacher sees: average score, question-by-question accuracy (which questions were hardest), and per-student attempt history.

---

## 7. Database Schema Enhancements

### 7.1 New Tables

```sql
-- Audit log: records all state changes across the system
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name   TEXT,
  actor_role   TEXT,
  action       TEXT NOT NULL,          -- e.g. CREATE_USER, GRADE_SUBMISSION
  entity_type  TEXT NOT NULL,          -- e.g. user, schedule, submission
  entity_id    TEXT,
  payload      JSONB,                  -- before/after snapshot
  ip_address   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Persistent notifications (server-generated)
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,          -- announcement | assignment | submission | schedule | grade | meeting | badge
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  action_view  TEXT,
  priority     TEXT DEFAULT 'medium', -- low | medium | high
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Student milestones (dynamic, replaced the hardcoded Milestones.tsx)
CREATE TABLE student_milestones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,          -- first_submission | quiz_pass | perfect_score | session_completed | etc.
  title        TEXT NOT NULL,
  description  TEXT,
  is_unlocked  BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Video summary history
CREATE TABLE video_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type      TEXT NOT NULL,      -- url | upload
  source_reference TEXT,               -- YouTube URL or original filename
  context_note     TEXT,
  generated_title  TEXT,
  summary          JSONB,              -- array of summary points
  takeaways        JSONB,              -- array of takeaway points
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Badges definition
CREATE TABLE badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,   -- SPEED_DEMON, PERFECT_SCORE, etc.
  name         TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Student earned badges
CREATE TABLE student_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id     UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, badge_id)
);

-- Student XP and levels
CREATE TABLE student_xp (
  student_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp     INTEGER NOT NULL DEFAULT 0,
  level        TEXT NOT NULL DEFAULT 'Learner',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Personal vocabulary list (from translator saves)
CREATE TABLE user_vocabulary (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_text      TEXT NOT NULL,
  translated_text  TEXT NOT NULL,
  source_language  TEXT NOT NULL,
  target_language  TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher availability blocks
CREATE TABLE teacher_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL,       -- 0=Sun, 1=Mon, ..., 6=Sat
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- AI chatbot session history
CREATE TABLE ai_chatbot_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages     JSONB NOT NULL DEFAULT '[]',   -- [{role, content}, ...]
  summary      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Call/meeting history log
CREATE TABLE call_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_token      UUID NOT NULL,
  teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  schedule_id     UUID REFERENCES schedules(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INTEGER,
  ended_by        TEXT,                  -- teacher | student | timeout
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Student to-do list (personal study planner)
CREATE TABLE student_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  due_date     DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  source       TEXT DEFAULT 'manual',   -- manual | assignment
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Existing Table Alterations

```sql
-- assignments: add rubric and category support
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS rubric_url       TEXT,
  ADD COLUMN IF NOT EXISTS rubric_file_name TEXT,
  ADD COLUMN IF NOT EXISTS rubric_criteria  JSONB,   -- [{criterion, levels: [{label, score}]}]
  ADD COLUMN IF NOT EXISTS max_score        NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS category         TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS tags             TEXT[];

-- submissions: add late flag and re-grade metadata
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS is_late          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS regraded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS regrade_note     TEXT;

-- enrollment_records: add grade_level
ALTER TABLE enrollment_records
  ADD COLUMN IF NOT EXISTS grade_level TEXT;

-- announcements: add targeting, pin, edit metadata
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS target_scope     TEXT DEFAULT 'all',  -- all | enrolled_students | specific_enrollment
  ADD COLUMN IF NOT EXISTS target_id        UUID,
  ADD COLUMN IF NOT EXISTS is_pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edited_at        TIMESTAMPTZ;

-- users: add soft delete, last_login, xp cache
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at    TIMESTAMPTZ;

-- schedules: add teacher notes and reschedule proposal
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS reschedule_proposed_date  DATE,
  ADD COLUMN IF NOT EXISTS reschedule_proposed_start TIME,
  ADD COLUMN IF NOT EXISTS reschedule_proposed_end   TIME;

-- chat_messages: add reply-to support and reactions
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id  UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reactions    JSONB DEFAULT '{}';  -- {"emoji": [userId, ...]}

-- gamified_quizzes: add scheduling and attempt limit
ALTER TABLE gamified_quizzes
  ADD COLUMN IF NOT EXISTS publish_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_attempts   INTEGER;
```

---

## 8. Backend API Enhancements

### 8.1 New Endpoints Needed

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/audit-logs` | `requireRole('admin')` | Paginated audit log with filters |
| GET | `/api/admin/reports/students` | `requireRole('admin')` | Per-student report data |
| GET | `/api/admin/reports/system` | `requireRole('admin')` | System usage stats |
| POST | `/api/admin/users/import-csv` | `requireRole('admin')` | Bulk user import via CSV |
| GET | `/api/admin/meeting-history` | `requireRole('admin')` | All meeting rooms history |
| GET | `/api/notifications` | `requireAuth` | List notifications for current user |
| PATCH | `/api/notifications/:id/read` | `requireAuth` | Mark notification as read |
| PATCH | `/api/notifications/read-all` | `requireAuth` | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | `requireAuth` | Delete a notification |
| GET | `/api/teacher/availability` | `requireAuth` | Get teacher's availability blocks |
| POST | `/api/teacher/availability` | `requireRole('teacher')` | Create availability block |
| DELETE | `/api/teacher/availability/:id` | `requireRole('teacher')` | Delete availability block |
| POST | `/api/translation/save-vocab` | `requireAuth` | Save translation to vocab list |
| GET | `/api/translation/vocab` | `requireAuth` | List user vocabulary |
| DELETE | `/api/translation/vocab/:id` | `requireAuth` | Remove vocab item |
| GET | `/api/video-summaries` | `requireAuth` | List past video summaries |
| GET | `/api/milestones` | `requireAuth` | Get student milestones |
| GET | `/api/student/tasks` | `requireRole('student')` | Get student to-do list |
| POST | `/api/student/tasks` | `requireRole('student')` | Create to-do task |
| PATCH | `/api/student/tasks/:id` | `requireRole('student')` | Update task (complete, edit) |
| DELETE | `/api/student/tasks/:id` | `requireRole('student')` | Delete task |
| GET | `/api/badges` | `requireAuth` | List all available badges |
| GET | `/api/student/badges` | `requireAuth` | Get student's earned badges |
| GET | `/api/student/xp` | `requireAuth` | Get student's XP and level |
| PUT | `/api/announcements/:id` | `requireAuth` | Edit announcement |
| DELETE | `/api/announcements/:id` | `requireAuth` | Delete announcement |
| GET | `/api/call-history` | `requireAuth` | Get call/meeting history |
| POST | `/api/chat/:id/react` | `requireAuth` | React to a chat message |
| GET | `/api/chatbot/sessions` | `requireAuth` | List chatbot conversation sessions |

### 8.2 Existing Endpoint Improvements

- **`GET /api/bootstrap`**: Include student milestones, XP, unread notification count, and pending schedule requests count in the bootstrap payload. Increase cache TTL to 30 seconds for stable data.
- **`POST /api/translate`**: Accept and pass through register (formal/informal), language hint, and save-to-vocab flag.
- **`POST /api/assignments`**: Accept `rubricFile` (multipart), `maxScore`, `category`, `tags`.
- **`POST /api/submissions/:id/grade`**: Accept `rubricScores JSONB`, compute final grade from rubric if provided.
- **`GET /api/schedules`**: Accept `availabilityOnly=true` query param to return teacher availability blocks alongside schedules.
- **`POST /api/announcements`**: Accept `targetScope`, `targetId`, `isPinned`.
- **All list endpoints**: Add `page`, `pageSize`, `search` query params for proper server-side pagination.

### 8.3 Audit Log Middleware

- Create a reusable `auditLog(action, entityType)` middleware factory.
- Wrap all state-changing route handlers with this middleware.
- Log captures actor info from `req.auth`, entity ID from route params/body, and a before/after snapshot.
- Runs asynchronously (does not block response).

### 8.4 Rate Limiting

**Current State**: No rate limiting on any endpoint. AI endpoints (translate, chatbot, guide, video summarizer) could be heavily abused.

**Enhancement**:
- Apply `express-rate-limit` with separate limiters:
  - AI endpoints: 20 requests per user per minute.
  - Auth endpoints (login, register): 10 requests per IP per 15 minutes.
  - General API: 200 requests per user per minute.
- On rate limit hit, return `429 Too Many Requests` with a `Retry-After` header.

### 8.5 Polling Optimization (WebSocket Not Used — Render Free Tier)

**Current State**: All real-time features (chat, meeting signals, notifications) use HTTP polling. Chat polls every 3 seconds, chat list polls every 5 seconds.

**Decision**: WebSocket / socket.io is **NOT used** on Render free tier. The free tier service sleeps after 15 minutes of inactivity; any WebSocket connection is dropped on cold start. Polling is the correct and stable approach for this deployment.

**Enhancement** (polling only):
- Chat messages: poll every 4 seconds.
- Chat list: poll every 8 seconds.
- Unread notifications count: poll every 30 seconds (after bootstrap).
- Video call signaling: keep existing polling (~2 seconds) — correct for WebRTC on free tier.
- All polling uses `AbortController` to cancel in-flight requests on component unmount, preventing memory leaks.
- Add an `ETag`/`If-None-Match` header to the chat polling endpoint so the server returns `304 Not Modified` when there are no new messages, reducing response payload.

---

## 9. UI / UX Enhancements

### 9.1 Design System Consistency

**Current State**: Most components use Tailwind classes but icon choices, button styles, heading hierarchy, and spacing are inconsistent across pages. The `Analytics.tsx` component uses mock data while `Performance.tsx` uses real data — they should be merged or clearly differentiated.

**Enhancement**:
- Define a unified component design system using the existing `ui/` folder: consistent Button variants, Card styles, Badge components, Table component.
- Remove the redundant `Analytics.tsx` component (merge its visuals into `Performance.tsx`).
- Standardize heading hierarchy: all page titles use `text-3xl font-bold`, section headers use `text-xl font-semibold`.
- Standardize icon library usage — only Lucide icons (already in use). Remove any inline SVGs.

### 9.2 Loading States

**Current State**: Some components show a loading spinner but many use no loading indicator at all. No skeleton screens exist.

**Enhancement**:
- Add skeleton loading cards for: Dashboard stats, Assignment list, Schedule calendar, Chat list.
- Consistent full-page loading overlay when bootstrap data is being fetched.
- Button loading state (spinner inside button) for all async actions (already partially done in some components — standardize it).

### 9.3 Empty States

**Current State**: Empty states are plain text like "No announcements posted yet." with no visual design.

**Enhancement**:
- Design illustrated empty state components: an icon + heading + optional CTA button.
- Example: Assignments empty state → BookOpen icon + "No assignments yet" + "Create Assignment" button (for teacher).
- Apply to: Assignments, Notifications, Chats, Learning Materials, Grades, Schedule.

### 9.4 Sidebar Improvements

**Current State**: Sidebar has good structure but uses the same `Sparkles` icon for 3 different menu items (AI Guide Bot, Gamified Learning, Video Summarizer). Items with no badge logic appear identical.

**Enhancement**:
- Use **unique icons** for every menu item. Suggested: `Bot` for AI Guide, `Gamepad2` for Gamified Learning, `Video` for Video Summarizer, `Globe` for Word Translator, `Flag` for Milestones.
- **Badge notifications**: Show badge counts on more items — Notifications (unread count), Assignments (pending submission count for students), Schedule (pending requests for teachers).
- **Collapsible Groups**: Group menu items under collapsible headers: "Academic", "Communication", "AI Tools", "Account".
- **Mobile Sidebar Drawer**: On mobile, sidebar should slide in as a drawer overlay rather than being replaced by bottom nav alone.

### 9.5 Dashboard Layout Improvements

**Current State**: Admin dashboard has a functional but plain grid of stat cards. Teacher and student dashboards are informative but not visually differentiated.

**Enhancement**:
- **Admin Dashboard**: Full analytics layout with charts (see §1.2). Add a quick-action row: "Add User", "Create Announcement", "View Audit Log".
- **Teacher Dashboard**: Add "Students Needing Attention" panel and a "Today's Schedule" timeline.
- **Student Dashboard**: Add the personalized overview from §3.4 — streak, today's sessions, upcoming deadlines.

### 9.6 Responsive / Mobile Web Experience

**Current State**: The web app has a sidebar for desktop and BottomNav for mobile. Some pages (Schedule calendar, Performance charts) overflow on small screens.

**Enhancement**:
- Schedule calendar: Switch to a vertical list view on screens below 768px.
- Performance charts: Make all Recharts `ResponsiveContainer` instances respect mobile viewport properly.
- Assignments and Grades tables: Switch to card layout (stacked) on mobile.
- All modals/dialogs: Ensure full-screen behavior on mobile.

### 9.7 Dark Mode

**Current State**: No dark mode support.

**Enhancement**:
- Implement dark mode using Tailwind's `dark:` class variants.
- Toggle in Profile Settings: Light / Dark / System.
- Store preference in `localStorage`.
- Apply `dark` class to `<html>` element.
- Audit all components for dark mode color variables.

### 9.8 Announcement Rich Text

**Current State**: Announcement body is a plain `<textarea>`. No formatting.

**Enhancement**:
- Replace textarea with a lightweight rich text editor (e.g. TipTap or a simple bold/italic toolbar).
- Render announcement content as HTML/markdown in the read view.

### 9.9 Video Call UI Enhancements

**Current State**: Video call works with mic/camera controls, settings panel, and elapsed timer. Screen is split into remote video (large) and local video (small overlay).

**Enhancement**:
- **Screen Share Button**: Allow teacher/student to share their screen during a call using `getDisplayMedia()`.
- **Chat Sidebar in Call**: A collapsible side panel during the call for text chat without interrupting the video.
- **Call Quality Indicator**: Show connection quality (based on `RTCPeerConnection.connectionState` and ICE candidate types).
- **End Call Confirmation Dialog**: Prompt "Are you sure you want to end the call?" before ending.
- **Call Notes**: After a call ends, teacher can add brief notes about the session (saved to the meeting room record).

---

## 10. Mobile App Enhancements

**Current State**: Mobile app (React Native + Expo) has navigation in `AppNavigator.tsx` (~2500 lines). It mirrors the web app's features but may be behind in some areas.

**Enhancement**:
- **Push Notifications**: Implement Expo Push Notifications for real-time alerts on: new assignment, grade received, schedule accepted/declined, new chat message, meeting starting.
- **Offline Mode**: Cache the last-loaded bootstrap data in AsyncStorage. Show cached data with a "Offline — viewing cached data" banner when backend is unreachable.
- **Biometric Authentication**: Expo `LocalAuthentication` for quick login on subsequent sessions.
- **Deep Linking**: Configure deep links so push notification taps navigate directly to the relevant screen.
- **Video Call (Mobile)**: Integrate WebRTC on the mobile side using `react-native-webrtc` so students can join/start calls from the mobile app.

---

## 11. Security & Performance Enhancements

### 11.1 Rate Limiting (see §8.4)

### 11.2 Soft Delete for Users

**Current State**: `deleteUser()` executes a hard DELETE query. Deleting a user cascades in unexpected ways (orphaned submissions, schedules, etc.).

**Enhancement**:
- Add `deleted_at TIMESTAMPTZ` to users table.
- `deleteUser()` sets `deleted_at = NOW()` instead of hard deleting.
- All queries filter `WHERE deleted_at IS NULL`.
- A separate admin action "Permanently Delete" can hard-delete after confirmation.

### 11.3 Input Validation Hardening

**Current State**: Some routes use Zod validation but others do not consistently validate input.

**Enhancement**:
- Apply Zod schema validation to every POST/PUT/PATCH endpoint.
- Sanitize all text inputs against XSS using `DOMPurify` on the frontend and strip HTML server-side.
- Validate file types and sizes on the server before processing (currently only client-side in some cases).

### 11.4 JWT Token Refresh

**Current State**: JWT tokens expire after 12 hours. There is no refresh token mechanism. Users are logged out after 12 hours.

**Enhancement**:
- Implement a refresh token flow: short-lived access token (15 minutes) + long-lived refresh token (7 days) stored in an HTTP-only cookie.
- Frontend automatically calls `/api/auth/refresh` when it receives a 401.
- Refresh tokens stored in a `refresh_tokens` table (token hash, user_id, expires_at, revoked_at).

### 11.5 File Upload Security

**Current State**: Files are validated by extension on the client side. Server processes anything multer accepts.

**Enhancement**:
- Server-side MIME type checking using the `file-type` npm package to validate actual file content matches extension.
- Virus scanning integration for production: consider ClamAV or a cloud-based scanner for submitted files.
- Max file size enforced consistently: 50MB for video, 10MB for documents.

### 11.6 Database Connection Pool Tuning

**Current State**: Default pg pool settings are used.

**Enhancement**:
- Configure pool: `max: 20`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`.
- Add a health check that reconnects the pool if the DB goes stale.
- Add DB query time logging in development mode to identify slow queries.

### 11.7 API Response Caching

**Current State**: Bootstrap cache is 8 seconds. No other caching.

**Enhancement**:
- Increase bootstrap cache to 30 seconds for admin/teacher (data changes less frequently).
- Cache learning materials list for 60 seconds (changes infrequently).
- Cache gamified categories/quizzes list for 60 seconds.
- Invalidate relevant caches when data changes (on POST/PUT/DELETE for those entities).

---

## Summary Priority Matrix

| Enhancement | Priority | Effort | Impact |
|---|---|---|---|
| Persistent notifications (DB-backed) | HIGH | Medium | High |
| Rubric upload + grading | HIGH | Medium | High |
| Word translator — expanded languages | HIGH | Low | High |
| Audit log system | HIGH | Medium | High |
| Milestones — connect to real DB | HIGH | Medium | High |
| Teacher availability blocks | HIGH | Medium | High |
| Admin analytics dashboard | MEDIUM | High | High |
| Announcement delete/edit/target | MEDIUM | Low | Medium |
| Video summary history | MEDIUM | Low | Medium |
| XP/Level system | MEDIUM | Medium | Medium |
| Badges | MEDIUM | Medium | Medium |
| AI chatbot — conversation persistence | MEDIUM | Medium | Medium |
| Chat file attachments | MEDIUM | Medium | Medium |
| Soft delete for users | HIGH | Low | Medium |
| Rate limiting | HIGH | Low | High |
| Schedule reschedule proposal | MEDIUM | Medium | Medium |
| Student dashboard enhancements | MEDIUM | Low | High |
| WebSocket for chat | NOT APPLICABLE | — | Render free tier constraint: polling is used instead |
| Dark mode | LOW | High | Low |
| Report generation (PDF/CSV) | MEDIUM | High | High |
| Rubric criteria builder | LOW | High | Medium |
| Mobile push notifications | LOW | High | Medium |

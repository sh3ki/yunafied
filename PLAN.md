# YUNAfied — Enhancement Execution Plan

> **Based on**: ENHANCEMENTS.md  
> **Deployment Target**: Render Free Tier  
> **Goal**: Full execution roadmap to implement all enhancements in structured phases with specific files, endpoints, DB migrations, and component changes.  
> **Convention**: Each task identifies the exact file(s) to create or modify.

---

## Render Free Tier Rules (Must Read Before Implementing)

Every implementation decision in this plan follows these hard constraints:

| Rule | What This Means in Code |
|---|---|
| **No disk writes** — ephemeral filesystem | Use `multer.memoryStorage()` everywhere. Upload directly from buffer to Cloudinary. |
| **No in-memory state that must survive restarts** | No in-memory job queues, trackers, or session maps (except short-lived bootstrap cache which is intentionally ephemeral). |
| **No WebSocket / socket.io** | Render free tier kills idle connections on cold start. All real-time features use HTTP polling. |
| **No backend PDF generation** | `pdfkit`, `@react-pdf/renderer`, and `puppeteer` are all banned. Use `jsPDF` on the **frontend** only. |
| **Whisper model = `tiny` or `base` only** | The free tier has ~512 MB RAM. Larger models will crash the process. |
| **Rate limiter uses in-memory store** | `express-rate-limit` default MemoryStore is acceptable — single instance, resets on cold start (fine for free tier). |
| **Cold start awareness** | Frontend must handle ~30 s initial response delay gracefully with a loading state. |

---

## Execution Phases

| Phase | Focus | Estimated Items |
|-------|-------|----------------|
| Phase 1 | Database Foundation — New migrations | 3 SQL migration files |
| Phase 2 | Backend Core — New services, endpoints, middleware | ~30 endpoint additions |
| Phase 3 | Admin Enhancements | 5 major features |
| Phase 4 | Teacher Enhancements | 7 major features |
| Phase 5 | Student Enhancements | 6 major features |
| Phase 6 | AI & Translation Enhancements | 4 features |
| Phase 7 | Communication & Notification Overhaul | 3 features |
| Phase 8 | Gamification Expansion | 3 features |
| Phase 9 | UI/UX Polish | 6 items |
| Phase 10 | Security & Performance | 4 items |

---

## Phase 1 — Database Foundation

All database changes must be applied before any backend or frontend work.

### Task 1.1 — Migration 015: Core New Tables

**File to create**: `backend/sql/015_core_enhancements.sql`

**What it does**:
- Create `audit_logs` table
- Create `notifications` table
- Create `student_milestones` table
- Create `video_summaries` table
- Create `call_history` table
- Create `student_tasks` table (study planner)
- Create `teacher_availability` table
- Create `ai_chatbot_sessions` table

**SQL outline**:
```sql
-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT,
  actor_role  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  payload     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  action_view TEXT,
  priority    TEXT DEFAULT 'medium',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- student_milestones
CREATE TABLE IF NOT EXISTS student_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- video_summaries
CREATE TABLE IF NOT EXISTS video_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type      TEXT NOT NULL,
  source_reference TEXT,
  context_note     TEXT,
  generated_title  TEXT,
  summary          JSONB,
  takeaways        JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- call_history
CREATE TABLE IF NOT EXISTS call_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_token       UUID NOT NULL,
  teacher_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  schedule_id      UUID REFERENCES schedules(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  ended_by         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- student_tasks (study planner)
CREATE TABLE IF NOT EXISTS student_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  due_date      DATE,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  source        TEXT DEFAULT 'manual',
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- teacher_availability
CREATE TABLE IF NOT EXISTS teacher_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ai_chatbot_sessions
CREATE TABLE IF NOT EXISTS ai_chatbot_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages   JSONB NOT NULL DEFAULT '[]',
  summary    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**How to apply**: Add to `backend/src/scripts/initDb.ts` migration execution list and run `npm run db:init --prefix backend`.

---

### Task 1.2 — Migration 016: Gamification Tables

**File to create**: `backend/sql/016_gamification_expansion.sql`

**What it does**:
- Create `badges` table
- Create `student_badges` table
- Create `student_xp` table
- Create `user_vocabulary` table (from translator saves)

**SQL outline**:
```sql
-- badges
CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default badges
INSERT INTO badges (code, name, description, icon) VALUES
  ('FIRST_QUIZ',      'First Step',       'Completed your first quiz',                     'star'),
  ('PERFECT_SCORE',   'Perfect Score',    'Got 100% on a quiz',                            'trophy'),
  ('SPEED_DEMON',     'Speed Demon',      'Finished a quiz in under half the time limit',  'zap'),
  ('QUIZ_STREAK_3',   'On a Roll',        'Completed quizzes 3 days in a row',             'flame'),
  ('CATEGORY_MASTER', 'Category Master',  'Completed all quizzes in a category',           'award')
ON CONFLICT (code) DO NOTHING;

-- student_badges
CREATE TABLE IF NOT EXISTS student_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, badge_id)
);

-- student_xp
CREATE TABLE IF NOT EXISTS student_xp (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp   INTEGER NOT NULL DEFAULT 0,
  level      TEXT NOT NULL DEFAULT 'Learner',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_vocabulary
CREATE TABLE IF NOT EXISTS user_vocabulary (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_text     TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Task 1.3 — Migration 017: Existing Table Alterations

**File to create**: `backend/sql/017_table_alterations.sql`

**What it does**:
- Alter `assignments` — add `rubric_url`, `rubric_file_name`, `rubric_criteria`, `max_score`, `category`, `tags`
- Alter `submissions` — add `is_late`, `regraded_at`, `regrade_note`
- Alter `enrollment_records` — add `grade_level`
- Alter `announcements` — add `target_scope`, `target_id`, `is_pinned`, `is_deleted`, `edited_at`
- Alter `users` — add `deleted_at`, `last_login_at`
- Alter `schedules` — add `reschedule_proposed_date/start/end`
- Alter `chat_messages` — add `reply_to_id`, `reactions`
- Alter `gamified_quizzes` — add `publish_at`, `max_attempts`

---

## Phase 2 — Backend Core

### Task 2.1 — New Service Methods in YunafiedService.ts

**File to modify**: `backend/src/services/YunafiedService.ts`

Add the following method groups:

**Audit Log Methods**:
- `createAuditLog(input: { actorId, actorName, actorRole, action, entityType, entityId, payload, ipAddress })`: Inserts into `audit_logs`. Fire-and-forget (non-blocking).
- `listAuditLogs(filters: { actorId?, action?, entityType?, dateFrom?, dateTo?, page, pageSize })`: Paginated query with filters.

**Notification Methods**:
- `createNotification(input: { userId, type, title, message, actionView?, priority? })`: Insert into `notifications`.
- `createNotificationsBulk(inputs: array)`: Insert multiple notifications at once (for assignment posts notifying all enrolled students).
- `listNotifications(userId, limit)`: List notifications for user ordered by `created_at DESC`.
- `markNotificationRead(notificationId, userId)`: Set `is_read = TRUE`.
- `markAllNotificationsRead(userId)`: Set all `is_read = TRUE` for user.
- `deleteNotification(notificationId, userId)`: Hard-delete notification.
- `countUnreadNotifications(userId)`: Return count of unread.

**Teacher Availability Methods**:
- `createAvailabilityBlock(teacherId, input: { dayOfWeek, startTime, endTime })`: Insert into `teacher_availability`.
- `listAvailabilityByTeacher(teacherId)`: List active availability blocks.
- `deleteAvailabilityBlock(id, teacherId)`: Delete a block (validates ownership).

**Video Summary Methods**:
- `saveVideoSummary(userId, input: { sourceType, sourceReference?, contextNote?, title?, summary, takeaways })`: Insert into `video_summaries`.
- `listVideoSummaries(userId)`: List summaries for user.

**Milestone Methods**:
- `initStudentMilestones(studentId)`: Create the default milestone set for a new student (called after registration).
- `listMilestones(studentId)`: Return all milestones for a student.
- `unlockMilestone(studentId, type)`: Set `is_unlocked = TRUE`, `unlocked_at = NOW()` for matching type.

**Student Tasks Methods**:
- `listStudentTasks(studentId)`: List tasks.
- `createStudentTask(studentId, input: { title, dueDate?, source?, assignmentId? })`: Insert.
- `updateStudentTask(id, studentId, input: { title?, dueDate?, isCompleted? })`: Update with ownership check.
- `deleteStudentTask(id, studentId)`: Delete with ownership check.

**XP & Badges Methods**:
- `getStudentXp(studentId)`: Get or initialize XP record.
- `addXp(studentId, xpAmount)`: Add XP and recompute level (`Learner` < 500 < `Scholar` < 1500 < `Expert` < 3000 < `Master`).
- `listAllBadges()`: Return all badge definitions.
- `getStudentBadges(studentId)`: Return earned badges.
- `awardBadge(studentId, badgeCode)`: Insert into `student_badges` if not already earned. Return the badge if newly awarded.

**Vocabulary Methods**:
- `saveVocabItem(userId, input)`: Insert into `user_vocabulary`.
- `listVocabItems(userId)`: List vocabulary for user.
- `deleteVocabItem(id, userId)`: Delete with ownership check.

**Call History Methods**:
- `createCallHistoryEntry(input)`: Insert into `call_history` when a meeting room becomes active.
- `closeCallHistoryEntry(roomToken, endedBy)`: Set `ended_at`, compute `duration_seconds`.
- `listCallHistory(userId, role)`: List call history for teacher or student.

**Announcement Improvements**:
- Update `deleteAnnouncement(id, userId, role)`: Set `is_deleted = TRUE` (soft delete) if actor is poster or admin.
- Add `updateAnnouncement(id, userId, role, input: { title, content })`: Update with `edited_at = NOW()`.

**Admin Bulk Operations**:
- `importUsersFromCsv(rows: array, createdBy)`: Validate each row, hash passwords, create users, return result summary.
- `listAllMeetingRooms()`: Admin-only query joining `meeting_rooms` with user info.

---

### Task 2.2 — Audit Log Middleware

**File to create**: `backend/src/middleware/auditLog.ts`

```typescript
// Middleware factory — wraps a route handler and logs after success
export function withAudit(action: string, entityType: string) {
  return (handler) => async (req, res, next) => {
    // Run handler, if success (2xx) insert audit log entry non-blocking
  };
}
```

Wire into routes in `backend/src/index.ts` for all mutating endpoints.

---

### Task 2.3 — Rate Limiting

**File to modify**: `backend/src/index.ts`

Install `express-rate-limit`:
```bash
npm install express-rate-limit --prefix backend
```

Add three rate limiters:
1. `aiLimiter` — 20 req/min per IP for `/api/ai/*`, `/api/translate`, `/api/video-summarize`
2. `authLimiter` — 10 req/15min per IP for `/api/auth/login`, `/api/auth/register`
3. `generalLimiter` — 200 req/min per IP applied globally

> **Render Free Tier Note**: `express-rate-limit` uses an in-memory `MemoryStore` by default. This is correct for Render free tier (single instance). The counter resets on cold start, which is acceptable. Do NOT add Redis or any external store — that would require a paid add-on.

---

### Task 2.4 — New API Route Handlers

**File to modify**: `backend/src/index.ts`

Add the following route groups. Each group follows the existing Express pattern in the file:

**Notifications Routes** (Lines after existing notification routes):
```
GET  /api/notifications
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
DELETE /api/notifications/:id
```

**Teacher Availability Routes**:
```
GET    /api/teacher/availability
POST   /api/teacher/availability
DELETE /api/teacher/availability/:id
```

**Video Summaries Routes**:
```
GET /api/video-summaries
```
Modify existing `POST /api/video-summarize` to call `service.saveVideoSummary()` after generating.

**Milestones Routes**:
```
GET /api/milestones
```
Called by student to list their milestones.

**Student Tasks Routes**:
```
GET    /api/student/tasks
POST   /api/student/tasks
PATCH  /api/student/tasks/:id
DELETE /api/student/tasks/:id
```

**Badges & XP Routes**:
```
GET /api/badges
GET /api/student/badges
GET /api/student/xp
```

**Vocabulary Routes**:
```
POST   /api/translation/save-vocab
GET    /api/translation/vocab
DELETE /api/translation/vocab/:id
```

**Announcement Edit/Delete**:
```
PUT    /api/announcements/:id
DELETE /api/announcements/:id
```

**Admin Routes**:
```
GET  /api/admin/audit-logs
POST /api/admin/users/import-csv
GET  /api/admin/meeting-history
```

**Call History Routes**:
```
GET /api/call-history
```
Modify VideoCall flow to record call start/end in `call_history`.

---

### Task 2.5 — Bootstrap Payload Extension

**File to modify**: `backend/src/services/YunafiedService.ts` → `getBootstrapData()`

Add to the bootstrap response:
- `unreadNotificationsCount`: From `countUnreadNotifications(userId)`.
- `milestones`: From `listMilestones(userId)` (students only).
- `xp`: From `getStudentXp(userId)` (students only).
- `earnedBadges`: From `getStudentBadges(userId)` (students only).

Increase cache TTL in `index.ts` from `8000` to `30000` ms.

---

### Task 2.6 — Notification Triggers

After each state-changing service call, trigger notification creation:

| Event | Trigger Location | Notification Recipients |
|-------|-----------------|------------------------|
| Assignment created | `POST /api/assignments` | All enrolled students of the teacher |
| Submission graded | `POST /api/submissions/:id/grade` | Student who submitted |
| Schedule accepted | `POST /api/schedules/:id/respond` | Student who requested |
| Schedule declined | `POST /api/schedules/:id/respond` | Student who requested |
| Schedule requested | `POST /api/schedules` | Teacher who was selected |
| Announcement posted | `POST /api/announcements` | All relevant users (by target scope) |
| Meeting started | `POST /api/meetings` | Student invited to meeting |
| Badge earned | Badge award logic | Student who earned it |

Each trigger is `async` and non-blocking (fire-and-forget `service.createNotification(...)` wrapped in `.catch(() => {})`).

---

### Task 2.7 — XP Award Triggers

Add XP award calls at the following events:

| Event | XP Awarded |
|-------|-----------|
| First login (ever) | 50 XP |
| Submit an assignment | 100 XP |
| Get a grade of A or 90+ | 150 XP bonus |
| Complete a quiz | Score-proportional (max 200 XP) |
| Complete a tutorial session (schedule accepted + date passed) | 100 XP |
| Unlock a milestone | 50 XP |

Implement `service.addXp(studentId, amount)` which updates `student_xp` table and checks if level threshold crossed, then awards level-up notification.

---

## Phase 3 — Admin Module

### Task 3.1 — Audit Logs Page

**File to create**: `src/app/components/AuditLogs.tsx`

**UI Layout**:
- Page header: "Audit Logs" with a `ShieldCheck` icon
- Filter bar: Date range picker (from/to), Actor name search, Action type dropdown, Entity type dropdown
- Table: `created_at`, `actor_name`, `actor_role`, `action` (badge), `entity_type`, `entity_id`, `ip_address`, "View Details" button
- Details modal: Shows JSON diff (before/after payload)
- Pagination: 20 rows per page

**Route**: Add `audit-logs` to admin's `roleViews` in `App.tsx`

**Sidebar**: Add Audit Logs menu item (`ShieldCheck` icon) for admin only in `Sidebar.tsx`

---

### Task 3.2 — Advanced Admin Analytics Dashboard

**File to modify**: `src/app/App.tsx` (admin dashboard section, approximately line 300+)

Replace/expand the admin dashboard inline code:
- Add API calls to new `/api/admin/analytics` endpoint (or compute from bootstrap data)
- Charts: User registration trend (LineChart), Session activity per month (BarChart), Grade distribution system-wide (PieChart)
- Tables: Top 5 students, Students needing attention
- Export buttons using `Papa.unparse()` (CSV) or `jsPDF` (PDF) — **client-side only, no server PDF generation**

**New endpoint needed**: `GET /api/admin/analytics` in `backend/src/index.ts` returning aggregated stats.

---

### Task 3.3 — Bulk User Import

**File to modify**: `src/app/components/Users.tsx`

- Add "Import CSV" button in the users page header
- On click, open a file picker for CSV upload
- Parse CSV on frontend (use `papaparse` library)
- Preview table showing rows to be imported
- Confirm button calls `POST /api/admin/users/import-csv`
- Result modal shows success/failed rows

**Backend**: Use `multer.memoryStorage()` — the CSV is received as a buffer, parsed in-process with `csv-parse` or `papaparse` on the backend, then each row is inserted. **Do NOT use `diskStorage()`** — the Render free tier filesystem is ephemeral.

---

### Task 3.4 — Admin Meeting History View

**File to create**: `src/app/components/MeetingHistory.tsx`

- Table showing all meeting rooms: teacher, student, date, duration, status
- Filter by teacher, student, date range, status
- Link out to view schedule details

**Route**: Add `meeting-history` to admin `roleViews`

---

### Task 3.5 — Enrollment Record Improvements

**File to modify**: `src/app/components/EnrollmentRecords.tsx`

- Add `grade_level` field to create/edit form
- Add filter bar: by subject, by teacher, by status, by grade level
- Add stat cards at top: Total, Active, Completed, Dropped counts
- Add Edit button per row (modal with same fields as create)
- Add Export CSV button

**Backend**: Update `POST /api/enrollments` and `PATCH /api/enrollments/:id` to accept `gradeLevel`.

---

## Phase 4 — Teacher Module

### Task 4.1 — Schedule: Pending Requests Inbox + Teacher Availability

**File to modify**: `src/app/components/Schedule.tsx`

**Changes**:
1. At top of Schedule page (for teacher role), add a "Pending Requests" panel showing cards for each pending schedule. Each card shows: student name, proposed date/time, english level, request note. Buttons: Accept, Decline, Propose Reschedule.
2. "Propose Reschedule" opens a sub-form where teacher enters counter-proposal date/time + message.
3. Add "My Availability" tab/section where teacher can see and manage their availability blocks.

**New component**: `src/app/components/TeacherAvailability.tsx` (sub-component used inside Schedule).

**Backend additions**:
- `POST /api/teacher/availability` — create block
- `GET /api/teacher/availability` — list blocks
- `DELETE /api/teacher/availability/:id` — remove block
- Update `POST /api/schedules/:id/respond` to accept `proposedDate/Time` for reschedule proposal.
- Student side: show `reschedule_proposed_*` fields with Accept/Re-negotiate.

---

### Task 4.2 — Assignment Rubric System

**File to modify**: `src/app/components/Assignments.tsx`

**Changes**:
1. In "Create Assignment" modal: add optional rubric file upload input (`rubricFile`). Show `rubric_file_name` badge once uploaded.
2. When grading a submission: if the assignment has `rubric_url`, show a "View Rubric" link. If it has `rubric_criteria`, show the rubric scoring table in the grade modal. Auto-sum scores into a final percentage.
3. Add `category` dropdown and `tags` multi-select to the create assignment form.

**Backend changes**:
- `POST /api/assignments` — accept multipart form with `rubricFile` field. Upload rubric to Cloudinary/storage. Store `rubric_url`, `rubric_file_name`.
- `POST /api/submissions/:id/grade` — accept `rubricScores JSONB`, compute total if provided.

**Type changes**:
- `AssignmentItem` in `src/app/types/models.ts` — add `rubricUrl`, `rubricFileName`, `rubricCriteria`, `maxScore`, `category`, `tags`.
- `SubmissionItem` — add `isLate`, `regradedAt`, `regradeNote`.

---

### Task 4.3 — Late Submission Flag

**File to modify**: `backend/src/services/YunafiedService.ts` (submit assignment logic)

- When a submission is created, compare `submitted_at` with `assignment.due_date`.
- If `submitted_at > due_date`, set `is_late = TRUE`.

**File to modify**: `src/app/components/Assignments.tsx`
- Show "Late" badge on submissions where `isLate === true`.

---

### Task 4.4 — Learning Materials: Organization & Edit

**File to modify**: `src/app/components/LearningMaterials.tsx`

**Changes**:
1. Add sidebar subject filter (buttons for each unique subject).
2. Add "Edit" button per material row (only for teacher/admin who created it).
3. Edit modal: update title, subject, description.
4. Add `uploaded_for_enrollment_id` field: dropdown to optionally scope a material to a specific enrollment.

**Backend**:
- Add `PUT /api/materials/:id` — update material metadata.
- `POST /api/materials/link` and `POST /api/materials/file` — already exist, no change.

**Type changes**: `LearningMaterialItem` — add `enrollmentId?: string`.

---

### Task 4.5 — Teacher Performance Dashboard: Enhanced Charts

**File to modify**: `src/app/components/Performance.tsx`

**Additions**:
- Per-student grade trend: Add a student selector and show a `LineChart` of that student's grades over time (by assignment `created_at`).
- Submission rate per assignment: `BarChart` showing submitted/not-submitted per assignment.
- "Students Needing Attention" table: students with avg grade < 75 or zero recent submissions.
- Export CSV button at bottom of page.

---

### Task 4.6 — Announcement Delete & Edit

**File to modify**: `src/app/components/Communication.tsx`

**Changes**:
1. Add "Edit" icon button per announcement (visible only to poster or admin).
2. "Edit" opens a modal pre-filled with title/content. On save calls `PUT /api/announcements/:id`.
3. Add "Delete" icon button per announcement with a confirmation prompt. On confirm calls `DELETE /api/announcements/:id`.
4. Announcements with `editedAt` show an "(Edited)" label.
5. Add `isPinned` badge on pinned announcements, show pinned items first.

---

### Task 4.7 — Teacher Access to Video Summarizer

**File to modify**: `src/app/App.tsx`

- Add `video-summarizer` to teacher's `roleViews` array.
- Add Video Summarizer menu item to teacher nav in `Sidebar.tsx`.

---

## Phase 5 — Student Module

### Task 5.1 — Milestones: Connect to Real DB

**File to replace**: `src/app/components/Milestones.tsx`

Rewrite this component:
- Fetch milestones from `GET /api/milestones` on mount.
- Display milestones in a dynamic list (using real `is_unlocked`, `unlocked_at`, `title`, `description` from DB).
- Progress bar: `unlockedCount / totalCount * 100`.
- Badge icons per milestone type.
- Celebration overlay (confetti via `canvas-confetti`) triggered when a newly unlocked milestone is detected on first load (compare previous list from localStorage vs current).

**Migration script to seed milestones**: When a student is registered (in `POST /api/auth/register`), call `service.initStudentMilestones(userId)` to pre-populate their milestone set.

---

### Task 5.2 — Word Translator: Expanded Languages + Enhancements

**File to modify**: `src/app/components/WordTranslator.tsx`

**Changes**:
1. Replace both language dropdowns with a full list of 20+ languages (see ENHANCEMENTS.md §3.2).
2. Add a "Swap Languages" button between the two language dropdowns (swap source ↔ target).
3. Add a "Speak" button next to translated text that calls `window.speechSynthesis.speak()` using the Web Speech API.
4. Add a "Save to Vocabulary" button that appears after a translation. On click calls `POST /api/translation/save-vocab`.
5. Add a "My Vocabulary" sub-tab at the bottom of the page showing saved vocab items with search and delete.

**File to modify**: `backend/src/index.ts`
- Expand the Groq translation prompt to support all 20 languages.
- Add `formal`/`informal` register to prompt when provided.
- Add `POST /api/translation/save-vocab`, `GET /api/translation/vocab`, `DELETE /api/translation/vocab/:id`.

**Type changes**: Add `VocabItem` to `src/app/types/models.ts`.

---

### Task 5.3 — Student Dashboard Enhancements

**File to modify**: `src/app/App.tsx` (student dashboard section)

**Add panels**:
1. "Today's Sessions" card — list of today's accepted schedules with "Join" button if within active window.
2. "Pending Assignments" card — list of unsubmitted assignments sorted by due date, with a red indicator if due within 24h.
3. "Recent Grades" card — last 3 graded submissions.
4. Stats row: `total_xp`, `level`, `badges_count`, `quizzes_completed`.
5. "Streak" counter — days consecutive with activity (compute from `last_login_at` and submission timestamps).

---

### Task 5.4 — Video Summary History

**File to modify**: `src/app/components/VideoSummarizer.tsx`

**Changes**:
1. Add a "History" tab alongside the main summarizer.
2. History tab calls `GET /api/video-summaries` and shows a list of past summaries.
3. Click a past summary to expand it (accordion or modal).
4. Export button: Copy as text or download as `.txt`.
5. Before summarizing, add optional "Context Note" text input.

---

### Task 5.5 — Student Study Planner / Tasks

**File to create**: `src/app/components/StudyPlanner.tsx`

**UI**:
- Page header: "Study Planner" with a `CheckSquare` icon
- Input field + date picker to add a new task
- Task list: checkbox, title, due date badge, delete button
- Completed tasks section (collapsible) showing finished items
- "Import from Assignments" button: pulls all unsubmitted assignments as tasks

**Route**: Add `study-planner` to student `roleViews` and sidebar.

**Backend**: Tasks routes from Task 2.4.

---

### Task 5.6 — Schedule: Student Request Flow Improvement

**File to modify**: `src/app/components/Schedule.tsx` (student role view)

**Changes**:
1. When student selects a teacher in the request form, show that teacher's `teacher_availability` blocks as a visual "Available Times" guide below the date/time selectors.
2. If selected time is outside availability, show a soft warning (not hard block).
3. If teacher has proposed a reschedule on a pending request, show the counter-proposal in a prominent banner with "Accept" / "Decline" buttons.
4. "Session History" section below the calendar: show all past sessions with that teacher (status accepted + date in past).

---

## Phase 6 — AI & Translation Enhancements

### Task 6.1 — AI Chatbot: Persistence & Improvements

**File to modify**: `src/app/components/AIChatbot.tsx`

**Changes**:
1. On open, load last 20 messages from `GET /api/chatbot/sessions/latest`.
2. On each send, save updated messages to DB via `PATCH /api/chatbot/sessions/latest`.
3. Show "Clear Conversation" button.
4. Add quick-suggestion chips at conversation start (role-specific suggestions).
5. Render bot responses with basic markdown using `react-markdown`.
6. Show animated typing indicator while waiting for response.

**Backend**:
- `GET /api/chatbot/sessions/latest` — return most recent session messages.
- `PATCH /api/chatbot/sessions/latest` — upsert latest session.
- System prompt improvements: inject role and current page context.

---

### Task 6.2 — AI Study Guide: Expanded Subjects

**File to modify**: `src/app/components/AIGuide.tsx`

**Changes**:
1. Expand subject selector to include: English (all sub-topics), Mathematics (Basic/Algebra/Geometry), Science (General/Biology/Chemistry/Physics), Filipino / Filipino Literature, History / Social Studies, General Study Skills.
2. Update backend Groq system prompt for each subject (Socratic mode — guide, don't answer directly).
3. Add "Save Session as Notes" button that opens a download modal.

---

### Task 6.3 — Video Summarizer: Progress Indicator & Persistence

**File to modify**: `src/app/components/VideoSummarizer.tsx`

**Changes**:
1. Replace the single loading spinner with a **client-side multi-step progress indicator**: `Uploading (1/3) → Transcribing (2/3) → Summarizing (3/3) → Done`. The frontend advances steps based on time elapsed (e.g. after upload completes, immediately advance to step 2; after 5 s advance to step 3; on response arrive show Done). There is **no server-side job tracker** — the Render free tier has an ephemeral process that restarts and would lose any in-memory state.
2. Add "Language Hint" select in the summarizer form.
3. After summary is generated, the backend automatically calls `service.saveVideoSummary()` and returns the saved summary ID. The History tab refreshes automatically.
4. All video file uploads use `multer.memoryStorage()` on the backend and are piped directly to the Python subprocess stdin — no temp files written to disk.

---

### Task 6.4 — Translation Backend: Language + Register

**File to modify**: `backend/src/index.ts` (translate endpoint)

**Changes**:
1. Expand the Groq translation system prompt to handle all 20 languages.
2. Accept optional `register: 'formal' | 'informal'` in request body.
3. Inject register preference into prompt.
4. Accept optional `saveToVocab: boolean` flag — if true, call `service.saveVocabItem()` after translation.

---

## Phase 7 — Communication & Notifications

### Task 7.1 — Notifications Page: Persistent + Mark as Read

**File to modify**: `src/app/components/Notifications.tsx`

**Changes**:
1. Remove frontend-computed notification generation. Load notifications from `GET /api/notifications`.
2. Each notification has a "Mark as Read" button (unread ones highlighted).
3. "Mark All as Read" button in page header.
4. Delete (dismiss) button per notification.
5. Unread count badge in sidebar now sourced from DB count.
6. In `App.tsx`, after bootstrap, start a polling interval (every 30s) to refresh unread count.

**Sidebar unread badge**: `src/app/components/Sidebar.tsx` — show unread notifications count on the Bell icon.

---

### Task 7.2 — Announcements: Delete / Edit / Pin

See Phase 4 Task 4.6 for frontend changes.

**Additional for announcements**:
- Filter announcements by `is_deleted = FALSE` in backend query.
- Sort: pinned first, then by `created_at DESC`.

---

### Task 7.3 — Chat Enhancements

**File to modify**: `src/app/components/Chats.tsx`

> **Render Free Tier Note**: Polling is the correct and stable approach. WebSocket / socket.io is **not used** — Render free tier cold-starts drop persistent connections. The existing polling approach stays. Chat message polling is optimized to 4 seconds (from 3) and chat list to 8 seconds (from 5). `AbortController` is used in each polling `useEffect` to cancel in-flight requests on unmount.

**Phase 7.3a — Reply-to-Message**:
1. Each message has a "Reply" icon button on hover.
2. Clicking reply sets a `replyingTo` state.
3. Composer shows a quoted preview of the message being replied to (dismiss with X).
4. On send, include `replyToId` in the message payload.
5. In the chat display, messages with `reply_to_id` show a quoted context card above the message body.

**Phase 7.3b — Message Reactions**:
1. Long-press or hover on a message shows an emoji picker (5 options: 👍 ✅ 🔥 ❓ 😊).
2. Clicking an emoji calls `POST /api/chat/:messageId/react`.
3. Reaction counts shown below messages (grouped by emoji).

**Backend**:
- Update `chat_messages` query to return `reactions` JSONB field.
- `POST /api/chat/:messageId/react` — toggle reaction (add if not present, remove if already reacted).

---

## Phase 8 — Gamification Expansion

### Task 8.1 — Badges UI

**File to modify**: `src/app/components/GamifiedLearning.tsx` and create `src/app/components/BadgeDisplay.tsx`

**Changes**:
1. In GamifiedLearning, for student role, add a "My Badges" section showing earned badges as icons with labels.
2. Locked badges shown as greyed-out with a "?" until earned.
3. After each quiz completion, check if any badges were just earned — if so, show a celebration modal.
4. `BadgeDisplay` component used both in GamifiedLearning and in the student dashboard.

---

### Task 8.2 — XP Bar on Student Dashboard & Profile

**File to modify**: `src/app/App.tsx` (student dashboard), `src/app/components/ProfileSettings.tsx`

**Changes**:
1. Student dashboard: Add XP progress bar widget showing current XP, level label, and how many XP to next level.
2. ProfileSettings: Show current level and earned badges in the profile page.

---

### Task 8.3 — Quiz Analytics for Teacher

**File to modify**: `src/app/components/GamifiedLearning.tsx`

**Changes (teacher role)**:
After a quiz is published, teacher can click a quiz and see a "Results" tab:
- Average score across all attempts
- Per-question accuracy bar chart (which questions students got wrong most)
- Per-student attempt history table

**Backend**:
- Add `GET /api/gamified/quiz/:id/analytics` endpoint returning aggregated attempt data.

---

## Phase 9 — UI/UX Polish

### Task 9.1 — Unique Sidebar Icons

**File to modify**: `src/app/components/Sidebar.tsx`

Replace duplicate icons:
- AI Guide Bot: `Bot` (from lucide-react)
- Gamified Learning: `Gamepad2`
- Video Summarizer: `FileVideo`
- Word Translator: `Globe`
- Milestones: `Flag` (already correct)
- Study Planner: `CheckSquare`
- Audit Logs (admin): `ShieldCheck`

---

### Task 9.2 — Skeleton Loading States

**File to create**: `src/app/components/ui/Skeleton.tsx`

Build a generic `<Skeleton>` component (animated shimmer block with configurable width/height).

Apply skeleton loading to:
- Dashboard stat cards (while bootstrap is loading)
- Assignment list (while loading)
- Chat list sidebar (while loading)
- Leaderboard table (while loading)

---

### Task 9.3 — Empty State Components

**File to create**: `src/app/components/ui/EmptyState.tsx`

Props: `icon`, `heading`, `description`, `action` (optional button label + callback).

Apply to:
- `Assignments.tsx` — "No assignments yet"
- `Notifications.tsx` — "You're all caught up"
- `Chats.tsx` — "No conversations yet"
- `LearningMaterials.tsx` — "No materials uploaded"
- `GradesFeedback.tsx` — "No submissions yet"

---

### Task 9.4 — Video Call Enhancements

**File to modify**: `src/app/components/VideoCall.tsx`

1. **Screen Share**: Add a "Share Screen" button. Use `navigator.mediaDevices.getDisplayMedia()` to get screen stream. Replace local video track in peer connection.
2. **End Call Confirmation**: Wrap the "End Call" button action with a `window.confirm()` or a small inline confirmation banner.
3. **Call Quality Indicator**: Read `peerConnection.getStats()` periodically and display a simple signal strength icon (good/medium/poor).
4. **Post-call Notes**: After call ends (phase changes to `'ended'`), show a text input for teacher to leave session notes, saved via `PATCH /api/meetings/:roomToken/notes`.

---

### Task 9.5 — Dark Mode Foundation

**File to modify**: `vite.config.ts`, `src/styles/index.css`, `src/app/App.tsx`

1. In `tailwind.config` (create if needed from existing Tailwind setup), set `darkMode: 'class'`.
2. In `ProfileSettings.tsx`, add theme selector: Light / Dark / System.
3. In `App.tsx` root, read theme from `localStorage` and apply `document.documentElement.classList.toggle('dark', isDark)`.
4. Audit and add `dark:` variants to the most visible components: Sidebar, Dashboard cards, Chat bubbles.

---

### Task 9.6 — Responsive Fixes

**File to modify**: `src/app/components/Schedule.tsx`, `src/app/components/Performance.tsx`

1. Schedule: On mobile (<768px), switch from calendar grid to a scrollable date list.
2. Performance: Ensure all `ResponsiveContainer` instances have `height` as a number (not percentage string) to fix mobile height collapse.
3. All modals: Ensure `max-h-screen overflow-y-auto` and `p-4` on small screens.

---

## Phase 10 — Security & Performance

### Task 10.1 — Soft Delete Users

**File to modify**: `backend/src/services/YunafiedService.ts`

- Update `deleteUser()` to set `deleted_at = NOW()` instead of `DELETE FROM`.
- Update all `listUsers()` queries to add `WHERE deleted_at IS NULL`.
- Add a new `hardDeleteUser()` method (admin-only, requires confirmation).

---

### Task 10.2 — Rate Limiting

See Task 2.3.

---

### Task 10.3 — Input Validation Hardening

**File to modify**: `backend/src/index.ts`

- Audit all POST/PUT/PATCH endpoints without Zod validation and add Zod schemas.
- Add `DOMPurify.sanitize()` call on all user-submitted text content before storage.

Install on frontend:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

---

### Task 10.4 — DB Pool Configuration

**File to modify**: `backend/src/lib/db.ts`

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false,
});
```

---

## New File / Route Summary

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `backend/sql/015_core_enhancements.sql` | New tables migration |
| `backend/sql/016_gamification_expansion.sql` | Badges, XP, vocab tables |
| `backend/sql/017_table_alterations.sql` | Alter existing tables |
| `backend/src/middleware/auditLog.ts` | Audit log middleware factory |
| `src/app/components/AuditLogs.tsx` | Admin audit log page |
| `src/app/components/MeetingHistory.tsx` | Admin meeting history page |
| `src/app/components/StudyPlanner.tsx` | Student to-do/study planner |
| `src/app/components/TeacherAvailability.tsx` | Teacher availability blocks sub-component |
| `src/app/components/BadgeDisplay.tsx` | Badge display component |
| `src/app/components/ui/Skeleton.tsx` | Skeleton loading component |
| `src/app/components/ui/EmptyState.tsx` | Empty state component |

### Existing Files to Modify

| File Path | Changes |
|-----------|---------|
| `backend/src/index.ts` | ~30 new routes, rate limiter, audit hooks, notification triggers |
| `backend/src/services/YunafiedService.ts` | ~25 new service methods |
| `backend/src/types/models.ts` | ~15 type additions |
| `backend/src/lib/db.ts` | Pool configuration tuning |
| `src/app/App.tsx` | Role views, dashboard sections, bootstrap usage |
| `src/app/types/models.ts` | New interfaces for all new entities |
| `src/app/components/Sidebar.tsx` | New icons, new menu items, badge counts |
| `src/app/components/Schedule.tsx` | Pending inbox, availability, reschedule flow |
| `src/app/components/Assignments.tsx` | Rubric upload, late flag, categories |
| `src/app/components/GradesFeedback.tsx` | Rubric scoring, re-grade support |
| `src/app/components/Performance.tsx` | More charts, export, attention list |
| `src/app/components/Communication.tsx` | Edit, delete, pin announcements |
| `src/app/components/Notifications.tsx` | DB-backed, mark read, delete |
| `src/app/components/Chats.tsx` | Reply, reactions |
| `src/app/components/WordTranslator.tsx` | 20 languages, swap, TTS, save vocab |
| `src/app/components/Milestones.tsx` | Full rewrite from hardcoded to DB-backed |
| `src/app/components/VideoSummarizer.tsx` | History tab, context note, progress steps |
| `src/app/components/AIChatbot.tsx` | Persistence, markdown, typing indicator |
| `src/app/components/AIGuide.tsx` | Expanded subjects, save session |
| `src/app/components/GamifiedLearning.tsx` | Badges, quiz analytics |
| `src/app/components/VideoCall.tsx` | Screen share, call notes, quality indicator |
| `src/app/components/ProfileSettings.tsx` | Dark mode toggle, XP/badges display |
| `src/app/components/EnrollmentRecords.tsx` | Grade level, edit, filters, stats |
| `src/app/components/LearningMaterials.tsx` | Subject filter, edit materials |

---

## Execution Order Dependency Graph

```
Phase 1 (DB migrations)
    ↓
Phase 2 (Backend — services + routes)
    ↓                     ↓
Phase 3 (Admin)       Phase 5 (Student)
    ↓                     ↓
Phase 4 (Teacher) ←——— Phase 6 (AI)
    ↓
Phase 7 (Comms + Notifs)
    ↓
Phase 8 (Gamification)
    ↓
Phase 9 (UI/UX Polish)
    ↓
Phase 10 (Security + Performance)
```

> Phases 3, 4, 5, 6 can be partially parallelized once Phase 2 is complete.  
> Phase 9 and 10 can be done alongside any phase for incremental polish.  
> All DB migrations (Phase 1) must fully complete before any Phase 2 work begins.

---

## NPM Packages to Install

### Frontend (root)
```bash
npm install react-markdown dompurify canvas-confetti papaparse jspdf jspdf-autotable
npm install --save-dev @types/dompurify @types/papaparse @types/canvas-confetti
```

### Backend
```bash
npm install express-rate-limit --prefix backend
npm install file-type --prefix backend
npm install papaparse --prefix backend
npm install --save-dev @types/papaparse --prefix backend
```

> **Explicitly NOT installing** (incompatible with Render free tier or unnecessary):
> - `socket.io` — WebSocket not used
> - `pdfkit` — server-side PDF not used
> - `@react-pdf/renderer` — server-side PDF not used
> - `puppeteer` — too heavy for 512 MB RAM
> - `multer` `diskStorage` — ephemeral filesystem, use `memoryStorage` instead

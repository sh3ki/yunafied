/**
 * seedFull.ts — Comprehensive realistic seed for Yunafied
 *
 * Populates: users, enrollment_records, assignments, submissions,
 * schedules, learning_materials, announcements, chats, chat_messages,
 * notifications, student_tasks, teacher_availability, call_history,
 * gamified data, student_xp, student_badges, student_milestones,
 * user_vocabulary, audit_logs
 *
 * Run: tsx src/scripts/seedFull.ts
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../lib/db.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffled<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── data declarations ───────────────────────────────────────────────────────

const SUBJECTS = [
  "English Grammar",
  "Business English",
  "Academic Writing",
  "IELTS Preparation",
  "Conversational English",
  "Reading Comprehension",
];

const GRADE_LEVELS = ["Grade 10", "Grade 11", "Grade 12", "College Freshman", "College Sophomore"];

const TUTORIAL_GROUPS = ["TG-A", "TG-B", "TG-C", "TG-D"];

// ─── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🌱 Starting full seed…");

  const passwordHash = await bcrypt.hash("password", 10);

  // Detect which tables are present so we can skip sections gracefully
  const { rows: tableRows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'`,
  );
  const existingTables = new Set(tableRows.map((r) => r.tablename));
  const has = (table: string) => existingTables.has(table);

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log("  → users");

  type UserSeed = {
    email: string;
    full_name: string;
    role: "admin" | "teacher" | "student";
    status: "active" | "inactive";
    last_login_at?: Date;
  };

  const userSeeds: UserSeed[] = [
    // admin
    {
      email: "admin@yuna.edu",
      full_name: "Alexandra Cruz",
      role: "admin",
      status: "active",
      last_login_at: daysAgo(0),
    },
    // teachers
    {
      email: "maria.reyes@yuna.edu",
      full_name: "Maria Reyes",
      role: "teacher",
      status: "active",
      last_login_at: daysAgo(1),
    },
    {
      email: "james.santos@yuna.edu",
      full_name: "James Santos",
      role: "teacher",
      status: "active",
      last_login_at: daysAgo(2),
    },
    {
      email: "anna.dela.cruz@yuna.edu",
      full_name: "Anna Dela Cruz",
      role: "teacher",
      status: "active",
      last_login_at: daysAgo(3),
    },
    // students
    {
      email: "lucas.tan@yuna.edu",
      full_name: "Lucas Tan",
      role: "student",
      status: "active",
      last_login_at: daysAgo(1),
    },
    {
      email: "sophia.garcia@yuna.edu",
      full_name: "Sophia Garcia",
      role: "student",
      status: "active",
      last_login_at: daysAgo(0),
    },
    {
      email: "ethan.lim@yuna.edu",
      full_name: "Ethan Lim",
      role: "student",
      status: "active",
      last_login_at: daysAgo(4),
    },
    {
      email: "isabella.ramos@yuna.edu",
      full_name: "Isabella Ramos",
      role: "student",
      status: "active",
      last_login_at: daysAgo(2),
    },
    {
      email: "noah.flores@yuna.edu",
      full_name: "Noah Flores",
      role: "student",
      status: "active",
      last_login_at: daysAgo(5),
    },
    {
      email: "mia.villanueva@yuna.edu",
      full_name: "Mia Villanueva",
      role: "student",
      status: "active",
      last_login_at: daysAgo(1),
    },
  ];

  const userIds: Record<string, string> = {};

  for (const u of userSeeds) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users (email, full_name, role, status, password_hash, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (email) DO UPDATE
         SET full_name     = EXCLUDED.full_name,
             role          = EXCLUDED.role,
             status        = EXCLUDED.status,
             password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash),
             updated_at    = NOW()
       RETURNING id`,
      [u.email, u.full_name, u.role, u.status, passwordHash],
    );
    userIds[u.email] = rows[0].id;
  }

  const adminId = userIds["admin@yuna.edu"];
  const teacherIds = [
    userIds["maria.reyes@yuna.edu"],
    userIds["james.santos@yuna.edu"],
    userIds["anna.dela.cruz@yuna.edu"],
  ];
  const studentIds = [
    userIds["lucas.tan@yuna.edu"],
    userIds["sophia.garcia@yuna.edu"],
    userIds["ethan.lim@yuna.edu"],
    userIds["isabella.ramos@yuna.edu"],
    userIds["noah.flores@yuna.edu"],
    userIds["mia.villanueva@yuna.edu"],
  ];

  // ── 2. TEACHER AVAILABILITY ───────────────────────────────────────────────
  if (has("teacher_availability")) {
  console.log("  → teacher_availability");

  const availabilitySlots = [
    { dow: 1, start: "09:00", end: "12:00" },
    { dow: 1, start: "14:00", end: "17:00" },
    { dow: 2, start: "09:00", end: "12:00" },
    { dow: 3, start: "10:00", end: "13:00" },
    { dow: 3, start: "15:00", end: "18:00" },
    { dow: 4, start: "09:00", end: "12:00" },
    { dow: 5, start: "10:00", end: "14:00" },
  ];

  for (const tid of teacherIds) {
    for (const slot of availabilitySlots) {
      await pool.query(
        `INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT DO NOTHING`,
        [tid, slot.dow, slot.start, slot.end],
      );
    }
  }
  } // end teacher_availability guard

  // ── 3. ENROLLMENT RECORDS ─────────────────────────────────────────────────
  console.log("  → enrollment_records");

  type EnrollmentRow = {
    student_email: string;
    teacher_email: string;
    subject: string;
    status: "active" | "completed" | "dropped";
    grade_level: string;
    tutorial_group: string;
    note?: string;
  };

  const enrollments: EnrollmentRow[] = [
    // Lucas Tan
    { student_email: "lucas.tan@yuna.edu", teacher_email: "maria.reyes@yuna.edu", subject: "English Grammar", status: "active", grade_level: "Grade 11", tutorial_group: "TG-A", note: "Strong foundation; working on complex sentences." },
    { student_email: "lucas.tan@yuna.edu", teacher_email: "james.santos@yuna.edu", subject: "IELTS Preparation", status: "active", grade_level: "Grade 11", tutorial_group: "TG-B" },
    // Sophia Garcia
    { student_email: "sophia.garcia@yuna.edu", teacher_email: "maria.reyes@yuna.edu", subject: "Business English", status: "active", grade_level: "College Freshman", tutorial_group: "TG-A", note: "Preparing for internship presentations." },
    { student_email: "sophia.garcia@yuna.edu", teacher_email: "anna.dela.cruz@yuna.edu", subject: "Academic Writing", status: "active", grade_level: "College Freshman", tutorial_group: "TG-C" },
    // Ethan Lim
    { student_email: "ethan.lim@yuna.edu", teacher_email: "james.santos@yuna.edu", subject: "Conversational English", status: "active", grade_level: "Grade 12", tutorial_group: "TG-B", note: "Shy speaker; needs confidence-building activities." },
    { student_email: "ethan.lim@yuna.edu", teacher_email: "anna.dela.cruz@yuna.edu", subject: "Reading Comprehension", status: "completed", grade_level: "Grade 12", tutorial_group: "TG-D", note: "Completed Level 1 module — excellent progress." },
    // Isabella Ramos
    { student_email: "isabella.ramos@yuna.edu", teacher_email: "anna.dela.cruz@yuna.edu", subject: "Academic Writing", status: "active", grade_level: "College Sophomore", tutorial_group: "TG-C" },
    { student_email: "isabella.ramos@yuna.edu", teacher_email: "maria.reyes@yuna.edu", subject: "English Grammar", status: "active", grade_level: "College Sophomore", tutorial_group: "TG-A" },
    // Noah Flores
    { student_email: "noah.flores@yuna.edu", teacher_email: "james.santos@yuna.edu", subject: "IELTS Preparation", status: "active", grade_level: "Grade 12", tutorial_group: "TG-B", note: "Target Band 7 by August." },
    // Mia Villanueva
    { student_email: "mia.villanueva@yuna.edu", teacher_email: "anna.dela.cruz@yuna.edu", subject: "Conversational English", status: "active", grade_level: "Grade 10", tutorial_group: "TG-C" },
    { student_email: "mia.villanueva@yuna.edu", teacher_email: "maria.reyes@yuna.edu", subject: "Business English", status: "dropped", grade_level: "Grade 10", tutorial_group: "TG-A", note: "Dropped due to schedule conflict." },
  ];

  for (const e of enrollments) {
    await pool.query(
      `INSERT INTO enrollment_records
         (student_id, teacher_id, subject, status, grade_level, tutorial_group, note, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, teacher_id, subject) DO UPDATE
         SET status        = EXCLUDED.status,
             grade_level   = EXCLUDED.grade_level,
             tutorial_group = EXCLUDED.tutorial_group,
             note          = EXCLUDED.note,
             updated_at    = NOW()`,
      [
        userIds[e.student_email],
        userIds[e.teacher_email],
        e.subject,
        e.status,
        e.grade_level,
        e.tutorial_group,
        e.note ?? null,
        adminId,
      ],
    );
  }

  // ── 4. ASSIGNMENTS ────────────────────────────────────────────────────────
  console.log("  → assignments");

  type AssignmentSeed = {
    teacher_email: string;
    title: string;
    description: string;
    due_at: Date;
    is_closed: boolean;
    category: string;
    max_score: number;
    tags: string[];
  };

  const assignmentSeeds: AssignmentSeed[] = [
    {
      teacher_email: "maria.reyes@yuna.edu",
      title: "Sentence Structure Drill — Week 3",
      description: "Complete exercises 1–20 on compound-complex sentences. Write five original example sentences for each structure type.",
      due_at: daysFromNow(7),
      is_closed: false,
      category: "Grammar",
      max_score: 100,
      tags: ["grammar", "sentences", "week-3"],
    },
    {
      teacher_email: "maria.reyes@yuna.edu",
      title: "Business Email Writing Task",
      description: "Draft a formal business email requesting a meeting with a potential client. Minimum 200 words. Focus on tone and structure.",
      due_at: daysFromNow(14),
      is_closed: false,
      category: "Business English",
      max_score: 100,
      tags: ["email", "business", "writing"],
    },
    {
      teacher_email: "maria.reyes@yuna.edu",
      title: "Grammar Diagnostic Test — Module 1",
      description: "Initial grammar diagnostic. Covers tenses, articles, prepositions, and subject-verb agreement.",
      due_at: daysAgo(10),
      is_closed: true,
      category: "Grammar",
      max_score: 50,
      tags: ["diagnostic", "grammar"],
    },
    {
      teacher_email: "james.santos@yuna.edu",
      title: "IELTS Writing Task 2 — Practice Essay",
      description: "Write a 250-word argumentative essay on: 'Online learning is more effective than classroom learning. To what extent do you agree?'",
      due_at: daysFromNow(5),
      is_closed: false,
      category: "IELTS",
      max_score: 100,
      tags: ["ielts", "writing", "essay"],
    },
    {
      teacher_email: "james.santos@yuna.edu",
      title: "Conversational Role-Play — Daily Situations",
      description: "Record a 3-minute video of yourself performing one of the provided role-play scripts (ordering food, asking for directions, or booking an appointment).",
      due_at: daysFromNow(10),
      is_closed: false,
      category: "Speaking",
      max_score: 100,
      tags: ["speaking", "video", "roleplay"],
    },
    {
      teacher_email: "james.santos@yuna.edu",
      title: "IELTS Listening Test — Section 1 & 2",
      description: "Complete the IELTS listening practice provided in the materials folder. Submit your answer sheet as a PDF.",
      due_at: daysAgo(5),
      is_closed: true,
      category: "IELTS",
      max_score: 40,
      tags: ["ielts", "listening"],
    },
    {
      teacher_email: "anna.dela.cruz@yuna.edu",
      title: "Research Paper Outline — Topic of Choice",
      description: "Submit a structured outline for your 1,500-word research paper. Include thesis statement, three main arguments, and a conclusion sketch.",
      due_at: daysFromNow(21),
      is_closed: false,
      category: "Academic Writing",
      max_score: 100,
      tags: ["research", "outline", "academic"],
    },
    {
      teacher_email: "anna.dela.cruz@yuna.edu",
      title: "Reading Comprehension — Passages A & B",
      description: "Answer all comprehension questions for both passages. Short-answer format. Focus on inference and vocabulary-in-context questions.",
      due_at: daysAgo(15),
      is_closed: true,
      category: "Reading",
      max_score: 60,
      tags: ["reading", "comprehension"],
    },
  ];

  const assignmentIds: string[] = [];

  for (const a of assignmentSeeds) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO assignments
         (teacher_id, title, description, due_at, is_closed, category, max_score, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        userIds[a.teacher_email],
        a.title,
        a.description,
        a.due_at,
        a.is_closed,
        a.category,
        a.max_score,
        a.tags,
      ],
    );
    if (rows.length) assignmentIds.push(rows[0].id);
  }

  // ── 5. SUBMISSIONS ────────────────────────────────────────────────────────
  console.log("  → submissions");

  // Map teacher → students via enrollments for assignment submissions
  const teacherStudentMap: Record<string, string[]> = {
    "maria.reyes@yuna.edu": [
      userIds["lucas.tan@yuna.edu"],
      userIds["sophia.garcia@yuna.edu"],
      userIds["isabella.ramos@yuna.edu"],
    ],
    "james.santos@yuna.edu": [
      userIds["lucas.tan@yuna.edu"],
      userIds["ethan.lim@yuna.edu"],
      userIds["noah.flores@yuna.edu"],
    ],
    "anna.dela.cruz@yuna.edu": [
      userIds["sophia.garcia@yuna.edu"],
      userIds["ethan.lim@yuna.edu"],
      userIds["isabella.ramos@yuna.edu"],
      userIds["mia.villanueva@yuna.edu"],
    ],
  };

  const submissionTexts = [
    "I have completed the exercises and made sure to double-check my answers. Please review and let me know if there are areas I need to revisit.",
    "Attached is my completed work for this assignment. I focused on the structure and clarity of each sentence.",
    "I found this assignment challenging but rewarding. I tried my best to apply the feedback from our last session.",
    "Here is my submission. I spent extra time on the vocabulary section and cross-referenced with the learning materials.",
    "I'm submitting a bit early because I want feedback before the deadline. Looking forward to your comments.",
    "Please find my work below. I wasn't 100% sure about question 5, so I included an explanation of my reasoning.",
  ];

  const feedbackTexts = [
    "Good effort! Your structure is improving. Work on consistent use of articles.",
    "Excellent work. Your ideas are well-organized. Minor grammatical errors — see highlighted sections.",
    "Very good. One area to improve: vary your sentence starters more. Overall score reflects strong understanding.",
    "Well done! Your vocabulary choice is impressive. Keep up the practice.",
    "Satisfactory. Some sentences are too long — try breaking them up for clarity.",
    "Great improvement from last time! Your argumentation is becoming more persuasive.",
  ];

  // Only submit to closed assignments (past due) to keep it realistic
  // Also add some pending submissions to open ones
  const closedAssignmentSeeds = assignmentSeeds.filter((a) => a.is_closed);

  for (let i = 0; i < assignmentIds.length; i++) {
    const seed = assignmentSeeds[i];
    if (!seed) continue;
    const assignmentId = assignmentIds[i];
    if (!assignmentId) continue;
    const students = teacherStudentMap[seed.teacher_email] ?? [];

    for (const sid of students) {
      const shouldSubmit = seed.is_closed ? Math.random() > 0.15 : Math.random() > 0.5;
      if (!shouldSubmit) continue;

      const score = seed.is_closed
        ? Math.round((Math.random() * 0.4 + 0.6) * seed.max_score * 100) / 100
        : null;
      const isLate = seed.is_closed && Math.random() > 0.8;
      const gradedAt = score !== null ? daysAgo(Math.floor(Math.random() * 7)) : null;

      await pool.query(
        `INSERT INTO submissions
           (assignment_id, student_id, submission_type, content_text, score, feedback,
            submitted_at, is_late, grade_value, graded_at)
         VALUES ($1, $2, 'text', $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (assignment_id, student_id) DO NOTHING`,
        [
          assignmentId,
          sid,
          randomItem(submissionTexts),
          score,
          score !== null ? randomItem(feedbackTexts) : null,
          daysAgo(Math.floor(Math.random() * 5)),
          isLate,
          score !== null ? (score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "D") : null,
          gradedAt,
        ],
      );
    }
  }

  // ── 6. SCHEDULES ──────────────────────────────────────────────────────────
  console.log("  → schedules");

  type ScheduleSeed = {
    teacher_email: string;
    student_email: string;
    title: string;
    description: string;
    scheduled_date: Date;
    start_time: string;
    end_time: string;
    status: "accepted" | "pending" | "declined" | "cancelled";
  };

  const scheduleSeeds: ScheduleSeed[] = [
    // Past accepted sessions
    { teacher_email: "maria.reyes@yuna.edu", student_email: "lucas.tan@yuna.edu", title: "Grammar Review — Tenses", description: "Review present perfect and past perfect tenses.", scheduled_date: daysAgo(14), start_time: "10:00", end_time: "11:00", status: "accepted" },
    { teacher_email: "maria.reyes@yuna.edu", student_email: "sophia.garcia@yuna.edu", title: "Business Email Feedback Session", description: "Go over feedback on the business email draft.", scheduled_date: daysAgo(7), start_time: "14:00", end_time: "15:00", status: "accepted" },
    { teacher_email: "james.santos@yuna.edu", student_email: "lucas.tan@yuna.edu", title: "IELTS Writing Strategy", description: "Strategies for Writing Task 2 — argument structure.", scheduled_date: daysAgo(10), start_time: "09:00", end_time: "10:30", status: "accepted" },
    { teacher_email: "james.santos@yuna.edu", student_email: "ethan.lim@yuna.edu", title: "Conversation Practice — Greetings & Introductions", description: "Practice natural introductions and small talk.", scheduled_date: daysAgo(5), start_time: "11:00", end_time: "12:00", status: "accepted" },
    { teacher_email: "anna.dela.cruz@yuna.edu", student_email: "sophia.garcia@yuna.edu", title: "Thesis Statement Workshop", description: "Craft a strong thesis for the research paper.", scheduled_date: daysAgo(8), start_time: "15:00", end_time: "16:00", status: "accepted" },
    { teacher_email: "anna.dela.cruz@yuna.edu", student_email: "ethan.lim@yuna.edu", title: "Reading Strategies — Inference", description: "Techniques for answering inference questions.", scheduled_date: daysAgo(20), start_time: "10:00", end_time: "11:00", status: "accepted" },
    // Upcoming accepted sessions
    { teacher_email: "maria.reyes@yuna.edu", student_email: "isabella.ramos@yuna.edu", title: "Grammar — Articles & Determiners", description: "Deep dive into article usage.", scheduled_date: daysFromNow(3), start_time: "09:00", end_time: "10:00", status: "accepted" },
    { teacher_email: "james.santos@yuna.edu", student_email: "noah.flores@yuna.edu", title: "IELTS Mock Speaking Test", description: "Full 15-minute mock speaking interview.", scheduled_date: daysFromNow(5), start_time: "14:00", end_time: "15:00", status: "accepted" },
    { teacher_email: "anna.dela.cruz@yuna.edu", student_email: "mia.villanueva@yuna.edu", title: "Conversation Practice — Daily Routines", description: "Talk about daily life and build vocabulary naturally.", scheduled_date: daysFromNow(7), start_time: "10:00", end_time: "11:00", status: "accepted" },
    // Pending requests
    { teacher_email: "maria.reyes@yuna.edu", student_email: "lucas.tan@yuna.edu", title: "Complex Sentences Follow-Up", description: "Follow-up session to check progress on complex sentence exercises.", scheduled_date: daysFromNow(10), start_time: "10:00", end_time: "11:00", status: "pending" },
    { teacher_email: "james.santos@yuna.edu", student_email: "ethan.lim@yuna.edu", title: "Vocabulary Expansion Session", description: "Explore advanced vocabulary for professional contexts.", scheduled_date: daysFromNow(12), start_time: "11:00", end_time: "12:00", status: "pending" },
    // Cancelled
    { teacher_email: "anna.dela.cruz@yuna.edu", student_email: "isabella.ramos@yuna.edu", title: "Outline Review Session", description: "Review the research paper outline draft.", scheduled_date: daysAgo(2), start_time: "15:00", end_time: "16:00", status: "cancelled" },
  ];

  const scheduleIds: string[] = [];

  for (const s of scheduleSeeds) {
    const dateObj = s.scheduled_date;
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      dateObj.getDay()
    ];
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO schedules
         (teacher_id, student_id, title, description, day_of_week, scheduled_date,
          start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        userIds[s.teacher_email],
        userIds[s.student_email],
        s.title,
        s.description,
        dayOfWeek,
        dateObj.toISOString().split("T")[0],
        s.start_time,
        s.end_time,
        s.status,
      ],
    );
    if (rows.length) scheduleIds.push(rows[0].id);
  }

  // ── 7. CALL HISTORY ───────────────────────────────────────────────────────
  if (has("call_history")) {
  console.log("  → call_history");

  const acceptedSchedules = scheduleSeeds
    .map((s, i) => ({ ...s, id: scheduleIds[i] }))
    .filter((s) => s.status === "accepted" && s.scheduled_date < new Date());

  for (const s of acceptedSchedules) {
    const duration = Math.floor(Math.random() * 30 + 45) * 60; // 45–75 min
    const startedAt = new Date(s.scheduled_date);
    const [sh, sm] = s.start_time.split(":").map(Number);
    startedAt.setHours(sh, sm, 0, 0);
    const endedAt = new Date(startedAt.getTime() + duration * 1000);

    await pool.query(
      `INSERT INTO call_history
         (room_token, teacher_id, student_id, schedule_id, started_at, ended_at,
          duration_seconds, ended_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
      [
        userIds[s.teacher_email],
        userIds[s.student_email],
        s.id ?? null,
        startedAt,
        endedAt,
        duration,
        "teacher",
      ],
    );
  }
  } // end call_history guard

  // ── 8. LEARNING MATERIALS ─────────────────────────────────────────────────
  console.log("  → learning_materials");

  type MaterialSeed = {
    title: string;
    description: string;
    subject: string;
    material_type: "link" | "file";
    resource_url: string;
    file_name?: string;
    creator_email: string;
  };

  const materialSeeds: MaterialSeed[] = [
    { title: "British Council — Grammar Reference", description: "Comprehensive grammar reference covering all tenses and structures.", subject: "English Grammar", material_type: "link", resource_url: "https://learnenglish.britishcouncil.org/grammar", creator_email: "maria.reyes@yuna.edu" },
    { title: "Common Linking Words & Connectives", description: "PDF guide to transition words for essays and formal writing.", subject: "Academic Writing", material_type: "link", resource_url: "https://www.uefap.com/writing/feature/linkers.htm", creator_email: "anna.dela.cruz@yuna.edu" },
    { title: "IELTS Writing Task 2 — Sample Essays Band 7+", description: "Curated collection of Band 7 and above sample essays for reference.", subject: "IELTS Preparation", material_type: "link", resource_url: "https://ieltsliz.com/ielts-writing-task-2-lessons-and-tips/", creator_email: "james.santos@yuna.edu" },
    { title: "Business English Phrases — Emails & Meetings", description: "Essential phrases for professional business communication.", subject: "Business English", material_type: "link", resource_url: "https://www.businessenglishresources.com/", creator_email: "maria.reyes@yuna.edu" },
    { title: "Conversational English — Everyday Situations Audio Pack", description: "Audio dialogues for 10 common everyday situations. Listen and repeat.", subject: "Conversational English", material_type: "link", resource_url: "https://www.eslpod.com/", creator_email: "james.santos@yuna.edu" },
    { title: "Academic Word List (AWL) — Coxhead 2000", description: "570 academic word families critical for academic writing and reading.", subject: "Academic Writing", material_type: "link", resource_url: "https://www.victoria.ac.nz/lals/resources/academicwordlist/", creator_email: "anna.dela.cruz@yuna.edu" },
    { title: "Grammar Worksheet — Articles (A, An, The)", description: "Practice worksheet on correct usage of English articles.", subject: "English Grammar", material_type: "link", resource_url: "https://www.english-grammar.at/worksheets/articles/articles-printable.htm", creator_email: "maria.reyes@yuna.edu" },
    { title: "IELTS Listening Practice — BBC 6-Minute English", description: "Short listening clips ideal for IELTS listening skill development.", subject: "IELTS Preparation", material_type: "link", resource_url: "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english", creator_email: "james.santos@yuna.edu" },
    { title: "Reading Skills — Skimming & Scanning", description: "Techniques guide for speed reading and targeted information retrieval.", subject: "Reading Comprehension", material_type: "link", resource_url: "https://www.mindtools.com/pages/article/read-more-efficiently.htm", creator_email: "anna.dela.cruz@yuna.edu" },
  ];

  for (const m of materialSeeds) {
    await pool.query(
      `INSERT INTO learning_materials
         (title, description, subject, material_type, resource_url, file_name, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [m.title, m.description, m.subject, m.material_type, m.resource_url, m.file_name ?? null, userIds[m.creator_email]],
    );
  }

  // ── 9. ANNOUNCEMENTS ──────────────────────────────────────────────────────
  console.log("  → announcements");

  type AnnouncementSeed = {
    title: string;
    content: string;
    posted_by_email: string;
    is_pinned: boolean;
    target_scope: string;
  };

  const announcementSeeds: AnnouncementSeed[] = [
    { title: "Welcome to Yunafied — School Year 2025–2026!", content: "Dear students and teachers, welcome to Yunafied! We're excited to have you on board. Please complete your profile setup and review your enrollment. Don't hesitate to reach out to your assigned teacher to introduce yourself.", posted_by_email: "admin@yuna.edu", is_pinned: true, target_scope: "all" },
    { title: "Platform Maintenance — May 10, 2026 (2:00 AM – 4:00 AM)", content: "The system will be unavailable for scheduled maintenance on May 10 from 2:00 AM to 4:00 AM. Please save your work in advance. We apologize for any inconvenience.", posted_by_email: "admin@yuna.edu", is_pinned: false, target_scope: "all" },
    { title: "Reminder: IELTS Mock Test Schedule Posted", content: "Students enrolled in IELTS Preparation — your mock test schedule has been posted under Schedules. Please confirm your attendance at least 24 hours before your session.", posted_by_email: "james.santos@yuna.edu", is_pinned: false, target_scope: "all" },
    { title: "New Learning Materials Added — Academic Writing", content: "New materials on thesis writing and academic vocabulary have been uploaded. Please review them before our next session. You can find them in the Learning Materials section.", posted_by_email: "anna.dela.cruz@yuna.edu", is_pinned: false, target_scope: "all" },
    { title: "Grammar Assignment Due Next Week", content: "Don't forget — the Sentence Structure Drill is due in 7 days. If you have questions, please message me directly or bring them to our next session.", posted_by_email: "maria.reyes@yuna.edu", is_pinned: false, target_scope: "all" },
  ];

  for (const ann of announcementSeeds) {
    await pool.query(
      `INSERT INTO announcements (title, content, posted_by_id, is_pinned, target_scope)
       VALUES ($1, $2, $3, $4, $5)`,
      [ann.title, ann.content, userIds[ann.posted_by_email], ann.is_pinned, ann.target_scope],
    );
  }

  // ── 10. CHATS & MESSAGES ──────────────────────────────────────────────────
  console.log("  → chats & messages");

  type ChatConversation = {
    user1: string;
    user2: string;
    messages: Array<{ from: string; body: string; sent_at: Date }>;
  };

  const chatConversations: ChatConversation[] = [
    {
      user1: "maria.reyes@yuna.edu",
      user2: "lucas.tan@yuna.edu",
      messages: [
        { from: "maria.reyes@yuna.edu", body: "Hi Lucas! Just checking in — how are the sentence structure exercises going?", sent_at: daysAgo(3) },
        { from: "lucas.tan@yuna.edu", body: "Hi Ma'am Maria! It's going well. I'm finding the compound-complex sentences a bit tricky though.", sent_at: daysAgo(3) },
        { from: "maria.reyes@yuna.edu", body: "That's completely normal at this stage. Let's go over some examples in our next session. Keep practicing!", sent_at: daysAgo(3) },
        { from: "lucas.tan@yuna.edu", body: "Thank you! I'll submit my assignment by Thursday.", sent_at: daysAgo(2) },
        { from: "maria.reyes@yuna.edu", body: "Perfect. I'll have feedback ready within 2 days after submission.", sent_at: daysAgo(2) },
      ],
    },
    {
      user1: "james.santos@yuna.edu",
      user2: "noah.flores@yuna.edu",
      messages: [
        { from: "james.santos@yuna.edu", body: "Noah, your Writing Task 2 essay was quite good! You have a clear argument. One thing — watch out for grammar consistency in the second paragraph.", sent_at: daysAgo(6) },
        { from: "noah.flores@yuna.edu", body: "Thank you Sir James! I noticed that too when I re-read it. I'll correct it before the final submission.", sent_at: daysAgo(6) },
        { from: "james.santos@yuna.edu", body: "Great. Also, please prepare for your speaking mock test next week. I'll be sending you the topic prompts soon.", sent_at: daysAgo(5) },
        { from: "noah.flores@yuna.edu", body: "Noted! Should I practice the Part 2 long turn format?", sent_at: daysAgo(5) },
        { from: "james.santos@yuna.edu", body: "Yes, exactly. 2 minutes on a familiar topic. Practice speaking without stopping.", sent_at: daysAgo(4) },
        { from: "noah.flores@yuna.edu", body: "Understood! I'll record myself and review it before the session.", sent_at: daysAgo(4) },
      ],
    },
    {
      user1: "anna.dela.cruz@yuna.edu",
      user2: "sophia.garcia@yuna.edu",
      messages: [
        { from: "sophia.garcia@yuna.edu", body: "Good morning Ma'am Anna! I sent my research paper outline. Please let me know if the thesis statement is strong enough.", sent_at: daysAgo(8) },
        { from: "anna.dela.cruz@yuna.edu", body: "Good morning Sophia! I've reviewed it. Your thesis is clear, but it needs to be more specific — narrow down your argument to one clear claim.", sent_at: daysAgo(8) },
        { from: "sophia.garcia@yuna.edu", body: "I see. Should I focus it on a specific industry or context?", sent_at: daysAgo(7) },
        { from: "anna.dela.cruz@yuna.edu", body: "Exactly. For example, instead of 'social media affects communication,' try 'Social media has diminished the quality of professional written communication among young adults.'", sent_at: daysAgo(7) },
        { from: "sophia.garcia@yuna.edu", body: "Oh, that's so much better! Thank you! I'll revise it and send again.", sent_at: daysAgo(7) },
      ],
    },
    {
      user1: "maria.reyes@yuna.edu",
      user2: "admin@yuna.edu",
      messages: [
        { from: "maria.reyes@yuna.edu", body: "Hi Alexandra, I need to update Mia Villanueva's enrollment — she wants to resume the Business English class in June.", sent_at: daysAgo(1) },
        { from: "admin@yuna.edu", body: "Hi Maria! I'll update her record from 'dropped' to 'active' and set the start date to June 1. I'll notify her via the system.", sent_at: daysAgo(1) },
        { from: "maria.reyes@yuna.edu", body: "Perfect, thank you! Also, could you add a note that she prefers morning sessions only?", sent_at: daysAgo(1) },
        { from: "admin@yuna.edu", body: "Done! I'll add that note to her profile.", sent_at: daysAgo(0) },
      ],
    },
  ];

  for (const conv of chatConversations) {
    const u1 = userIds[conv.user1];
    const u2 = userIds[conv.user2];
    const directKey = [u1, u2].sort().join(":");

    const { rows: chatRows } = await pool.query<{ id: string }>(
      `INSERT INTO chats (name, chat_type, direct_key, created_by_id)
       VALUES (NULL, 'direct', $1, $2)
       ON CONFLICT (direct_key) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [directKey, u1],
    );
    const chatId = chatRows[0].id;

    // Ensure participants
    for (const uid of [u1, u2]) {
      await pool.query(
        `INSERT INTO chat_participants (chat_id, user_id, is_owner)
         VALUES ($1, $2, $3)
         ON CONFLICT (chat_id, user_id) DO NOTHING`,
        [chatId, uid, uid === u1],
      );
    }

    for (const msg of conv.messages) {
      await pool.query(
        `INSERT INTO chat_messages (chat_id, sender_id, body, sent_at)
         VALUES ($1, $2, $3, $4)`,
        [chatId, userIds[msg.from], msg.body, msg.sent_at],
      );
    }
  }

  // ── 11. NOTIFICATIONS ─────────────────────────────────────────────────────
  console.log("  → notifications");

  type NotifSeed = {
    user_email: string;
    type: string;
    title: string;
    message: string;
    priority: string;
    is_read: boolean;
  };

  const notifSeeds: NotifSeed[] = [
    { user_email: "lucas.tan@yuna.edu", type: "assignment", title: "New Assignment Posted", message: "Maria Reyes posted: Sentence Structure Drill — Week 3. Due in 7 days.", priority: "high", is_read: false },
    { user_email: "lucas.tan@yuna.edu", type: "schedule", title: "Session Confirmed", message: "Your session with Ma'am Maria on Grammar Review is confirmed for May 3.", priority: "medium", is_read: true },
    { user_email: "sophia.garcia@yuna.edu", type: "assignment", title: "Assignment Graded", message: "Your Grammar Diagnostic Test has been graded. Score: 44/50.", priority: "medium", is_read: false },
    { user_email: "sophia.garcia@yuna.edu", type: "message", title: "New Message from Anna Dela Cruz", message: "Ma'am Anna has replied to your research outline inquiry.", priority: "low", is_read: false },
    { user_email: "noah.flores@yuna.edu", type: "schedule", title: "Upcoming Session Reminder", message: "You have a IELTS Mock Speaking Test with Sir James in 5 days.", priority: "high", is_read: false },
    { user_email: "ethan.lim@yuna.edu", type: "assignment", title: "Feedback Available", message: "Your submission for IELTS Listening Test has been reviewed. Check grades.", priority: "medium", is_read: true },
    { user_email: "isabella.ramos@yuna.edu", type: "announcement", title: "New Announcement", message: "Ma'am Anna posted: New Learning Materials Added — Academic Writing.", priority: "low", is_read: false },
    { user_email: "mia.villanueva@yuna.edu", type: "schedule", title: "Upcoming Session Confirmed", message: "Your session with Ma'am Anna on Conversation Practice is on May 13.", priority: "medium", is_read: false },
    { user_email: "maria.reyes@yuna.edu", type: "schedule", title: "New Session Request", message: "Lucas Tan has requested a session on Complex Sentences Follow-Up.", priority: "high", is_read: false },
    { user_email: "james.santos@yuna.edu", type: "submission", title: "Assignment Submitted", message: "Noah Flores submitted the IELTS Writing Task 2 Practice Essay.", priority: "medium", is_read: false },
    { user_email: "anna.dela.cruz@yuna.edu", type: "submission", title: "Assignment Submitted", message: "Sophia Garcia submitted her Research Paper Outline.", priority: "medium", is_read: true },
    { user_email: "admin@yuna.edu", type: "system", title: "New Enrollment Added", message: "Isabella Ramos has been enrolled in Academic Writing under Anna Dela Cruz.", priority: "low", is_read: true },
  ];

  for (const n of notifSeeds) {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, priority, is_read)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userIds[n.user_email], n.type, n.title, n.message, n.priority, n.is_read],
    );
  }

  // ── 12. STUDENT TASKS ─────────────────────────────────────────────────────
  if (has("student_tasks")) {
  console.log("  → student_tasks");

  type TaskSeed = { student_email: string; title: string; due_date: Date; is_completed: boolean; source: string };

  const taskSeeds: TaskSeed[] = [
    { student_email: "lucas.tan@yuna.edu", title: "Complete Sentence Structure Drill exercises 1–10", due_date: daysFromNow(3), is_completed: false, source: "manual" },
    { student_email: "lucas.tan@yuna.edu", title: "Review IELTS Writing Task 2 samples", due_date: daysFromNow(5), is_completed: false, source: "manual" },
    { student_email: "lucas.tan@yuna.edu", title: "Watch grammar video on present perfect", due_date: daysAgo(1), is_completed: true, source: "manual" },
    { student_email: "sophia.garcia@yuna.edu", title: "Revise thesis statement for research paper", due_date: daysFromNow(2), is_completed: false, source: "manual" },
    { student_email: "sophia.garcia@yuna.edu", title: "Draft business email for assignment", due_date: daysFromNow(7), is_completed: false, source: "manual" },
    { student_email: "ethan.lim@yuna.edu", title: "Practice IELTS listening Section 1", due_date: daysFromNow(4), is_completed: false, source: "manual" },
    { student_email: "ethan.lim@yuna.edu", title: "Re-read comprehension passage B", due_date: daysAgo(3), is_completed: true, source: "manual" },
    { student_email: "noah.flores@yuna.edu", title: "Record practice speaking for mock test", due_date: daysFromNow(4), is_completed: false, source: "manual" },
    { student_email: "noah.flores@yuna.edu", title: "Review IELTS writing feedback from Sir James", due_date: daysAgo(1), is_completed: true, source: "manual" },
    { student_email: "isabella.ramos@yuna.edu", title: "Submit Research Paper Outline draft", due_date: daysFromNow(14), is_completed: false, source: "manual" },
    { student_email: "mia.villanueva@yuna.edu", title: "Practice daily routine vocabulary", due_date: daysFromNow(5), is_completed: false, source: "manual" },
    { student_email: "mia.villanueva@yuna.edu", title: "Complete vocabulary flashcards", due_date: daysAgo(2), is_completed: true, source: "manual" },
  ];

  for (const t of taskSeeds) {
    await pool.query(
      `INSERT INTO student_tasks (student_id, title, due_date, is_completed, source)
       VALUES ($1, $2, $3, $4, $5)`,
      [userIds[t.student_email], t.title, t.due_date.toISOString().split("T")[0], t.is_completed, t.source],
    );
  }
  } // end student_tasks guard

  // ── 13. STUDENT MILESTONES ────────────────────────────────────────────────
  if (has("student_milestones")) {
  console.log("  → student_milestones");

  type MilestoneSeed = { student_email: string; type: string; title: string; description: string; is_unlocked: boolean; unlocked_at?: Date };

  const milestoneDefs: Omit<MilestoneSeed, "student_email">[] = [
    { type: "first_session", title: "First Session", description: "Completed your first tutoring session.", is_unlocked: true, unlocked_at: daysAgo(20) },
    { type: "first_assignment", title: "First Submission", description: "Submitted your first assignment.", is_unlocked: true, unlocked_at: daysAgo(15) },
    { type: "perfect_score", title: "Perfect Score", description: "Achieved a perfect score on an assignment.", is_unlocked: false },
    { type: "five_sessions", title: "Dedicated Learner", description: "Completed 5 tutoring sessions.", is_unlocked: false },
    { type: "quiz_master", title: "Quiz Master", description: "Completed 10 gamified quizzes.", is_unlocked: false },
    { type: "streak_7", title: "7-Day Streak", description: "Active on the platform 7 days in a row.", is_unlocked: false },
  ];

  for (const sid of studentIds) {
    for (const m of milestoneDefs) {
      await pool.query(
        `INSERT INTO student_milestones
           (student_id, type, title, description, is_unlocked, unlocked_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, type) DO NOTHING`,
        [sid, m.type, m.title, m.description, m.is_unlocked, m.unlocked_at ?? null],
      );
    }
  }
  } // end student_milestones guard

  // ── 14. STUDENT XP & BADGES ───────────────────────────────────────────────
  if (has("student_xp") && has("student_badges") && has("badges")) {
  console.log("  → student_xp & student_badges");

  const xpData: Record<string, { xp: number; level: string }> = {
    "lucas.tan@yuna.edu": { xp: 4200, level: "Intermediate" },
    "sophia.garcia@yuna.edu": { xp: 5800, level: "Advanced" },
    "ethan.lim@yuna.edu": { xp: 1500, level: "Learner" },
    "isabella.ramos@yuna.edu": { xp: 3100, level: "Intermediate" },
    "noah.flores@yuna.edu": { xp: 2400, level: "Learner" },
    "mia.villanueva@yuna.edu": { xp: 900, level: "Beginner" },
  };

  for (const [email, data] of Object.entries(xpData)) {
    await pool.query(
      `INSERT INTO student_xp (student_id, total_xp, level)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id) DO UPDATE
         SET total_xp = EXCLUDED.total_xp, level = EXCLUDED.level, updated_at = NOW()`,
      [userIds[email], data.xp, data.level],
    );
  }

  // Assign badges to high-performing students
  const badgeRows = await pool.query<{ id: string; code: string }>(
    `SELECT id, code FROM badges`,
  );
  const badgeMap: Record<string, string> = {};
  for (const b of badgeRows.rows) badgeMap[b.code] = b.id;

  const badgeAssignments: Record<string, string[]> = {
    "sophia.garcia@yuna.edu": ["FIRST_QUIZ", "PERFECT_SCORE", "SCORE_1000", "SCORE_5000", "QUIZ_STREAK_3"],
    "lucas.tan@yuna.edu": ["FIRST_QUIZ", "SCORE_1000", "CATEGORY_MASTER"],
    "isabella.ramos@yuna.edu": ["FIRST_QUIZ", "SCORE_1000"],
    "noah.flores@yuna.edu": ["FIRST_QUIZ", "SPEED_DEMON"],
    "ethan.lim@yuna.edu": ["FIRST_QUIZ"],
    "mia.villanueva@yuna.edu": ["FIRST_QUIZ"],
  };

  for (const [email, codes] of Object.entries(badgeAssignments)) {
    for (const code of codes) {
      const badgeId = badgeMap[code];
      if (!badgeId) continue;
      await pool.query(
        `INSERT INTO student_badges (student_id, badge_id)
         VALUES ($1, $2)
         ON CONFLICT (student_id, badge_id) DO NOTHING`,
        [userIds[email], badgeId],
      );
    }
  }
  } // end xp/badges guard

  // ── 15. USER VOCABULARY ───────────────────────────────────────────────────
  if (has("user_vocabulary")) {
  console.log("  → user_vocabulary");

  type VocabSeed = { user_email: string; source_text: string; translated_text: string; source_language: string; target_language: string };

  const vocabSeeds: VocabSeed[] = [
    { user_email: "lucas.tan@yuna.edu", source_text: "ubiquitous", translated_text: "lahat ng dako / kalat na kalat", source_language: "en", target_language: "tl" },
    { user_email: "lucas.tan@yuna.edu", source_text: "meticulous", translated_text: "maingat / maselang", source_language: "en", target_language: "tl" },
    { user_email: "lucas.tan@yuna.edu", source_text: "coherent", translated_text: "magkakaugnay / malinaw", source_language: "en", target_language: "tl" },
    { user_email: "sophia.garcia@yuna.edu", source_text: "paradigm", translated_text: "模式 / 典範", source_language: "en", target_language: "zh" },
    { user_email: "sophia.garcia@yuna.edu", source_text: "articulate", translated_text: "表达清晰的", source_language: "en", target_language: "zh" },
    { user_email: "noah.flores@yuna.edu", source_text: "ambiguous", translated_text: "malabo / hindi malinaw", source_language: "en", target_language: "tl" },
    { user_email: "noah.flores@yuna.edu", source_text: "perseverance", translated_text: "tiyaga / pagtitiyaga", source_language: "en", target_language: "tl" },
    { user_email: "ethan.lim@yuna.edu", source_text: "eloquent", translated_text: "fasih / pandai berkata-kata", source_language: "en", target_language: "ms" },
    { user_email: "mia.villanueva@yuna.edu", source_text: "collaborate", translated_text: "makipagtulungan", source_language: "en", target_language: "tl" },
  ];

  for (const v of vocabSeeds) {
    await pool.query(
      `INSERT INTO user_vocabulary
         (user_id, source_text, translated_text, source_language, target_language)
       VALUES ($1, $2, $3, $4, $5)`,
      [userIds[v.user_email], v.source_text, v.translated_text, v.source_language, v.target_language],
    );
  }
  } // end user_vocabulary guard

  // ── 16. AUDIT LOGS ────────────────────────────────────────────────────────
  if (has("audit_logs")) {
  console.log("  → audit_logs");

  type AuditSeed = { actor_email: string; action: string; entity_type: string; entity_id?: string; payload?: object };

  const auditSeeds: AuditSeed[] = [
    { actor_email: "admin@yuna.edu", action: "CREATE", entity_type: "user", payload: { email: "lucas.tan@yuna.edu", role: "student" } },
    { actor_email: "admin@yuna.edu", action: "CREATE", entity_type: "enrollment", payload: { subject: "English Grammar", student: "Lucas Tan", teacher: "Maria Reyes" } },
    { actor_email: "admin@yuna.edu", action: "UPDATE", entity_type: "enrollment", payload: { subject: "Business English", student: "Mia Villanueva", status_from: "active", status_to: "dropped" } },
    { actor_email: "maria.reyes@yuna.edu", action: "CREATE", entity_type: "assignment", payload: { title: "Sentence Structure Drill — Week 3" } },
    { actor_email: "maria.reyes@yuna.edu", action: "GRADE", entity_type: "submission", payload: { student: "Lucas Tan", assignment: "Grammar Diagnostic Test", score: 44 } },
    { actor_email: "james.santos@yuna.edu", action: "CREATE", entity_type: "schedule", payload: { student: "Noah Flores", title: "IELTS Mock Speaking Test" } },
    { actor_email: "anna.dela.cruz@yuna.edu", action: "CREATE", entity_type: "learning_material", payload: { title: "Common Linking Words & Connectives", subject: "Academic Writing" } },
    { actor_email: "lucas.tan@yuna.edu", action: "SUBMIT", entity_type: "assignment", payload: { title: "Grammar Diagnostic Test — Module 1" } },
    { actor_email: "sophia.garcia@yuna.edu", action: "SUBMIT", entity_type: "assignment", payload: { title: "Reading Comprehension — Passages A & B" } },
    { actor_email: "admin@yuna.edu", action: "LOGIN", entity_type: "session", payload: { ip: "192.168.1.1" } },
  ];

  for (const a of auditSeeds) {
    const user = userSeeds.find((u) => u.email === a.actor_email);
    await pool.query(
      `INSERT INTO audit_logs
         (actor_id, actor_name, actor_role, action, entity_type, entity_id, payload, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userIds[a.actor_email],
        user?.full_name ?? a.actor_email,
        user?.role ?? "unknown",
        a.action,
        a.entity_type,
        a.entity_id ?? null,
        JSON.stringify(a.payload ?? {}),
        "192.168.1." + Math.floor(Math.random() * 254 + 1),
      ],
    );
  }
  } // end audit_logs guard

  console.log("\n✅ Full seed complete!");
  console.log("   Credentials for all accounts: password = password");
  console.log("   Users created:");
  for (const u of userSeeds) {
    console.log(`     [${u.role.toUpperCase().padEnd(7)}] ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

import { pool } from "../lib/db.js";
import { AnnouncementItem, AssignmentItem, AuthUser, ScheduleItem, SubmissionItem, TranslationHistoryItem, UserRole, UserStatus } from "../types/models.js";

interface DbUserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  password_hash: string;
  created_at: string;
}

interface DbTranslationRow {
  id: string;
  user_id: string;
  source_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  created_at: string;
}

export class YunafiedService {
  async getBootstrapData(requester: { id: string; role: UserRole }): Promise<{
    users: AuthUser[];
    schedules: ScheduleItem[];
    assignments: AssignmentItem[];
    submissions: SubmissionItem[];
    announcements: AnnouncementItem[];
  }> {
    const usersPromise = requester.role === "admin" ? this.listUsers() : Promise.resolve([] as AuthUser[]);

    const [users, schedules, assignments, submissions, announcements] = await Promise.all([
      usersPromise,
      this.listSchedules(),
      this.listAssignments(),
      this.listSubmissionsForRole(requester),
      this.listAnnouncements(),
    ]);

    return {
      users,
      schedules,
      assignments,
      submissions,
      announcements,
    };
  }

  async findUserWithPasswordByEmail(email: string): Promise<DbUserRow | null> {
    const result = await pool.query<DbUserRow>(
      "SELECT id, email, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at FROM users WHERE email = $1",
      [email],
    );

    return result.rows[0] || null;
  }

  async findUserWithPasswordById(userId: string): Promise<DbUserRow | null> {
    const result = await pool.query<DbUserRow>(
      "SELECT id, email, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at FROM users WHERE id = $1",
      [userId],
    );

    return result.rows[0] || null;
  }

  toAuthUser(row: DbUserRow): AuthUser {
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
      profileImageUrl: row.profile_image_url,
      profileImagePublicId: row.profile_image_public_id,
      createdAt: row.created_at,
    };
  }

  async listUsers(): Promise<AuthUser[]> {
    const result = await pool.query<DbUserRow>(
      "SELECT id, email, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at FROM users ORDER BY created_at DESC",
    );

    return result.rows.map((row) => this.toAuthUser(row));
  }

  async createUser(input: {
    email: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    passwordHash: string;
  }): Promise<AuthUser> {
    const result = await pool.query<DbUserRow>(
      "INSERT INTO users (email, full_name, role, status, profile_image_url, profile_image_public_id, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at",
      [
        input.email,
        input.fullName,
        input.role,
        input.status,
        input.profileImageUrl || null,
        input.profileImagePublicId || null,
        input.passwordHash,
      ],
    );

    return this.toAuthUser(result.rows[0]);
  }

  async updateUser(
    userId: string,
    input: {
      fullName: string;
      role: UserRole;
      status: UserStatus;
      email: string;
      profileImageUrl?: string | null;
      profileImagePublicId?: string | null;
      passwordHash?: string;
    },
  ): Promise<AuthUser | null> {
    const values: Array<string | null> = [
      input.email,
      input.fullName,
      input.role,
      input.status,
      input.profileImageUrl || null,
      input.profileImagePublicId || null,
    ];
    let passwordSetSql = "";

    if (input.passwordHash) {
      values.push(input.passwordHash);
      passwordSetSql = ",\n              password_hash = $7";
    }

    values.push(userId);
    const userIdParam = values.length;

    const result = await pool.query<DbUserRow>(
      `UPDATE users
          SET email = $1,
              full_name = $2,
              role = $3,
              status = $4,
              profile_image_url = $5,
              profile_image_public_id = $6${passwordSetSql},
              updated_at = NOW()
        WHERE id = $${userIdParam}
      RETURNING id, email, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at`,
      values,
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.toAuthUser(result.rows[0]);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    return (result.rowCount || 0) > 0;
  }

  async listSchedules(): Promise<ScheduleItem[]> {
    const result = await pool.query(
      `SELECT s.id,
              s.title,
              s.day_of_week AS day,
              to_char(s.start_time, 'HH24:MI') AS "startTime",
              to_char(s.end_time, 'HH24:MI') AS "endTime",
              s.teacher_id AS "teacherId",
              t.full_name AS "teacherName",
              s.created_at AS "createdAt"
         FROM schedules s
         JOIN users t ON t.id = s.teacher_id
         ORDER BY s.day_of_week, s.start_time`,
    );

    return result.rows as ScheduleItem[];
  }

  async createSchedule(input: {
    title: string;
    day: string;
    startTime: string;
    endTime: string;
    teacherId: string;
  }): Promise<ScheduleItem> {
    const result = await pool.query(
      `INSERT INTO schedules (title, day_of_week, start_time, end_time, teacher_id)
       VALUES ($1, $2, $3::time, $4::time, $5)
       RETURNING id,
                 title,
                 day_of_week AS day,
                 to_char(start_time, 'HH24:MI') AS "startTime",
                 to_char(end_time, 'HH24:MI') AS "endTime",
                 teacher_id AS "teacherId",
                 created_at AS "createdAt"`,
      [input.title, input.day, input.startTime, input.endTime, input.teacherId],
    );

    const schedule = result.rows[0] as Omit<ScheduleItem, "teacherName">;
    const teacherResult = await pool.query("SELECT full_name FROM users WHERE id = $1", [input.teacherId]);

    return {
      ...schedule,
      teacherName: teacherResult.rows[0]?.full_name || "Teacher",
    };
  }

  async deleteSchedule(scheduleId: string, requester: { id: string; role: UserRole }): Promise<boolean> {
    if (requester.role === "teacher") {
      const result = await pool.query(
        "DELETE FROM schedules WHERE id = $1 AND teacher_id = $2",
        [scheduleId, requester.id],
      );
      return (result.rowCount || 0) > 0;
    }

    const result = await pool.query("DELETE FROM schedules WHERE id = $1", [scheduleId]);
    return (result.rowCount || 0) > 0;
  }

  async listAssignments(): Promise<AssignmentItem[]> {
    const result = await pool.query(
      `SELECT a.id,
              a.title,
              a.description,
              to_char(a.due_at, 'YYYY-MM-DD') AS "dueDate",
              a.teacher_id AS "teacherId",
              t.full_name AS "teacherName",
              a.created_at AS "createdAt"
         FROM assignments a
         JOIN users t ON t.id = a.teacher_id
         ORDER BY a.created_at DESC`,
    );

    return result.rows as AssignmentItem[];
  }

  async createAssignment(input: {
    title: string;
    description: string;
    dueDate: string;
    teacherId: string;
  }): Promise<AssignmentItem> {
    const result = await pool.query(
      `INSERT INTO assignments (title, description, due_at, teacher_id)
       VALUES ($1, $2, $3::date, $4)
       RETURNING id,
                 title,
                 description,
                 to_char(due_at, 'YYYY-MM-DD') AS "dueDate",
                 teacher_id AS "teacherId",
                 created_at AS "createdAt"`,
      [input.title, input.description, input.dueDate, input.teacherId],
    );

    const assignment = result.rows[0] as Omit<AssignmentItem, "teacherName">;
    const teacherResult = await pool.query("SELECT full_name FROM users WHERE id = $1", [input.teacherId]);

    return {
      ...assignment,
      teacherName: teacherResult.rows[0]?.full_name || "Teacher",
    };
  }

  async listSubmissionsForRole(requester: { id: string; role: UserRole }): Promise<SubmissionItem[]> {
    if (requester.role === "student") {
      const result = await pool.query(
        `SELECT s.id,
                s.assignment_id AS "assignmentId",
                a.title AS "assignmentTitle",
                s.student_id AS "studentId",
                u.full_name AS "studentName",
                s.file_name AS "fileName",
                s.content_url AS "fileUrl",
                s.content_text AS "contentText",
                s.grade_value AS grade,
                s.feedback,
                s.submitted_at AS "submittedAt",
                s.graded_at AS "gradedAt"
           FROM submissions s
           JOIN assignments a ON a.id = s.assignment_id
           JOIN users u ON u.id = s.student_id
          WHERE s.student_id = $1
          ORDER BY s.submitted_at DESC`,
        [requester.id],
      );

      return result.rows as SubmissionItem[];
    }

    if (requester.role === "teacher") {
      const result = await pool.query(
        `SELECT s.id,
                s.assignment_id AS "assignmentId",
                a.title AS "assignmentTitle",
                s.student_id AS "studentId",
                u.full_name AS "studentName",
                s.file_name AS "fileName",
                s.content_url AS "fileUrl",
                s.content_text AS "contentText",
                s.grade_value AS grade,
                s.feedback,
                s.submitted_at AS "submittedAt",
                s.graded_at AS "gradedAt"
           FROM submissions s
           JOIN assignments a ON a.id = s.assignment_id
           JOIN users u ON u.id = s.student_id
          WHERE a.teacher_id = $1
          ORDER BY s.submitted_at DESC`,
        [requester.id],
      );

      return result.rows as SubmissionItem[];
    }

    const result = await pool.query(
      `SELECT s.id,
              s.assignment_id AS "assignmentId",
              a.title AS "assignmentTitle",
              s.student_id AS "studentId",
              u.full_name AS "studentName",
              s.file_name AS "fileName",
              s.content_url AS "fileUrl",
              s.content_text AS "contentText",
              s.grade_value AS grade,
              s.feedback,
              s.submitted_at AS "submittedAt",
              s.graded_at AS "gradedAt"
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
         ORDER BY s.submitted_at DESC`,
    );

    return result.rows as SubmissionItem[];
  }

  async upsertSubmission(input: {
    assignmentId: string;
    studentId: string;
    contentText: string | null;
    fileName: string | null;
    fileUrl: string | null;
  }): Promise<SubmissionItem> {
    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, student_id, submission_type, content_text, file_name, content_url)
       VALUES ($1, $2, CASE WHEN $5 IS NOT NULL THEN 'file' ELSE 'text' END, $3, $4, $5)
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET content_text = EXCLUDED.content_text,
                     file_name = EXCLUDED.file_name,
                     content_url = EXCLUDED.content_url,
                     submitted_at = NOW(),
                     grade_value = NULL,
                     feedback = NULL,
                     graded_at = NULL
       RETURNING id,
                 assignment_id AS "assignmentId",
                 student_id AS "studentId",
                 file_name AS "fileName",
                 content_url AS "fileUrl",
                 content_text AS "contentText",
                 grade_value AS grade,
                 feedback,
                 submitted_at AS "submittedAt",
                 graded_at AS "gradedAt"`,
      [input.assignmentId, input.studentId, input.contentText, input.fileName, input.fileUrl],
    );

    const base = result.rows[0];
    const enrich = await pool.query(
      `SELECT a.title AS "assignmentTitle", u.full_name AS "studentName"
         FROM assignments a
         JOIN users u ON u.id = $2
        WHERE a.id = $1`,
      [input.assignmentId, input.studentId],
    );

    return {
      ...base,
      assignmentTitle: enrich.rows[0]?.assignmentTitle || "Assignment",
      studentName: enrich.rows[0]?.studentName || "Student",
    } as SubmissionItem;
  }

  async gradeSubmission(input: { submissionId: string; grade: string; feedback: string }): Promise<SubmissionItem | null> {
    const result = await pool.query(
      `UPDATE submissions
          SET grade_value = $1,
              feedback = $2,
              graded_at = NOW()
        WHERE id = $3
        RETURNING id,
                  assignment_id AS "assignmentId",
                  student_id AS "studentId",
                  file_name AS "fileName",
                  content_url AS "fileUrl",
                  content_text AS "contentText",
                  grade_value AS grade,
                  feedback,
                  submitted_at AS "submittedAt",
                  graded_at AS "gradedAt"`,
      [input.grade, input.feedback, input.submissionId],
    );

    if (!result.rows[0]) {
      return null;
    }

    const submission = result.rows[0];
    const enrich = await pool.query(
      `SELECT a.title AS "assignmentTitle", u.full_name AS "studentName"
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
        WHERE s.id = $1`,
      [input.submissionId],
    );

    return {
      ...submission,
      assignmentTitle: enrich.rows[0]?.assignmentTitle || "Assignment",
      studentName: enrich.rows[0]?.studentName || "Student",
    } as SubmissionItem;
  }

  async listAnnouncements(): Promise<AnnouncementItem[]> {
    const result = await pool.query(
      `SELECT a.id,
              a.title,
              a.content,
              a.posted_by_id AS "postedById",
              u.full_name AS "postedByName",
              a.created_at AS "createdAt"
         FROM announcements a
         JOIN users u ON u.id = a.posted_by_id
         ORDER BY a.created_at DESC`,
    );

    return result.rows as AnnouncementItem[];
  }

  async createAnnouncement(input: {
    title: string;
    content: string;
    postedById: string;
  }): Promise<AnnouncementItem> {
    const result = await pool.query(
      `INSERT INTO announcements (title, content, posted_by_id)
       VALUES ($1, $2, $3)
       RETURNING id,
                 title,
                 content,
                 posted_by_id AS "postedById",
                 created_at AS "createdAt"`,
      [input.title, input.content, input.postedById],
    );

    const announcement = result.rows[0] as Omit<AnnouncementItem, "postedByName">;
    const userResult = await pool.query("SELECT full_name FROM users WHERE id = $1", [input.postedById]);

    return {
      ...announcement,
      postedByName: userResult.rows[0]?.full_name || "Teacher",
    };
  }

  async createTranslationHistory(input: {
    userId: string;
    sourceText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<TranslationHistoryItem> {
    const result = await pool.query<DbTranslationRow>(
      `INSERT INTO translation_history (user_id, source_text, translated_text, source_language, target_language)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, source_text, translated_text, source_language, target_language, created_at`,
      [input.userId, input.sourceText, input.translatedText, input.sourceLanguage, input.targetLanguage],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      sourceText: row.source_text,
      translatedText: row.translated_text,
      sourceLanguage: row.source_language,
      targetLanguage: row.target_language,
      createdAt: row.created_at,
    };
  }

  async listTranslationHistory(input: {
    userId: string;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<{ rows: TranslationHistoryItem[]; total: number }> {
    const offset = (input.page - 1) * input.pageSize;
    const keyword = (input.search || "").trim();

    if (keyword.length > 0) {
      const like = `%${keyword}%`;
      const totalResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM translation_history
          WHERE user_id = $1
            AND (source_text ILIKE $2 OR translated_text ILIKE $2)`,
        [input.userId, like],
      );

      const rowsResult = await pool.query<DbTranslationRow>(
        `SELECT id, user_id, source_text, translated_text, source_language, target_language, created_at
           FROM translation_history
          WHERE user_id = $1
            AND (source_text ILIKE $2 OR translated_text ILIKE $2)
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4`,
        [input.userId, like, input.pageSize, offset],
      );

      return {
        rows: rowsResult.rows.map((row) => ({
          id: row.id,
          userId: row.user_id,
          sourceText: row.source_text,
          translatedText: row.translated_text,
          sourceLanguage: row.source_language,
          targetLanguage: row.target_language,
          createdAt: row.created_at,
        })),
        total: Number(totalResult.rows[0]?.count || "0"),
      };
    }

    const totalResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM translation_history
        WHERE user_id = $1`,
      [input.userId],
    );

    const rowsResult = await pool.query<DbTranslationRow>(
      `SELECT id, user_id, source_text, translated_text, source_language, target_language, created_at
         FROM translation_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [input.userId, input.pageSize, offset],
    );

    return {
      rows: rowsResult.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        sourceText: row.source_text,
        translatedText: row.translated_text,
        sourceLanguage: row.source_language,
        targetLanguage: row.target_language,
        createdAt: row.created_at,
      })),
      total: Number(totalResult.rows[0]?.count || "0"),
    };
  }
}

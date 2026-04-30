import { pool } from "../lib/db.js";
import {
  AnnouncementItem,
  AssignmentItem,
  AuthUser,
  ChatMessageItem,
  ChatSummaryItem,
  EnrollmentRecordItem,
  EnrollmentStatus,
  GamifiedAttemptResultItem,
  GamifiedCategoryItem,
  GamifiedLeaderboardItem,
  GamifiedQuestionItem,
  GamifiedQuizDetailItem,
  GamifiedQuizItem,
  LearningMaterialItem,
  MessageItem,
  MessageUserItem,
  ScheduleItem,
  ScheduleStatus,
  SubmissionItem,
  TranslationHistoryItem,
  UserRole,
  UserStatus,
} from "../types/models.js";

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

interface DbScheduleRecord {
  id: string;
  teacher_id: string;
  student_id: string | null;
  title: string;
  description: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  request_note: string | null;
  response_note: string | null;
}

interface DbGamifiedCategoryRow {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdByName: string;
  quizCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DbChatSummaryRow {
  id: string;
  name: string | null;
  chatType: "direct" | "group";
  directKey: string | null;
  createdById: string;
  createdByName: string;
  lastMessageId: string | null;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DbChatParticipantRow {
  chatId: string;
  id: string;
  fullName: string;
  role: UserRole;
  profileImageUrl: string | null;
}

interface DbChatMessageRow {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  body: string;
  sentAt: string;
}

interface DbGamifiedQuizRow {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  timePerQuestionSeconds: number;
  isPublished: boolean;
  createdById: string;
  createdByName: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DbGamifiedQuestionRow {
  id: string;
  prompt: string;
  order: number;
  points: number;
}

interface DbGamifiedChoiceRow {
  id: string;
  questionId: string;
  text: string;
  order: number;
  isCorrect: boolean;
}

interface DbGamifiedQuizOwnerRow {
  id: string;
  created_by: string;
}

interface DbGamifiedAttemptInsertRow {
  id: string;
  quizId: string;
  categoryId: string;
  studentId: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  completedAt: string;
}

interface DbGamifiedLeaderboardRow {
  studentId: string;
  studentName: string;
  bestScore: number;
  attemptCount: number;
  bestCorrectAnswers: number;
  totalQuestions: number;
  completedAt: string;
}

interface GamifiedChoiceInput {
  text: string;
  isCorrect: boolean;
}

interface GamifiedQuestionInput {
  prompt: string;
  points: number;
  choices: GamifiedChoiceInput[];
}

export class YunafiedService {
  async getBootstrapData(requester: { id: string; role: UserRole }): Promise<{
    users: AuthUser[];
    schedules: ScheduleItem[];
    assignments: AssignmentItem[];
    submissions: SubmissionItem[];
    announcements: AnnouncementItem[];
  }> {
    const usersPromise = requester.role === "admin" ? this.listUsers() : this.listUsersByRoles(["teacher"]);

    const [users, schedules, assignments, submissions, announcements] = await Promise.all([
      usersPromise,
      this.listSchedulesForRole(requester),
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

  async listUsersByRoles(roles: UserRole[]): Promise<AuthUser[]> {
    const result = await pool.query<DbUserRow>(
      `SELECT id, email, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at
         FROM users
        WHERE role = ANY($1::user_role[])
        ORDER BY full_name ASC`,
      [roles],
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

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new Error("End time must be later than start time.");
    }
  }

  private async assertUserRole(userId: string, role: UserRole): Promise<void> {
    const result = await pool.query<{ role: UserRole }>("SELECT role FROM users WHERE id = $1", [userId]);
    const found = result.rows[0];

    if (!found) {
      throw new Error("Referenced user not found.");
    }

    if (found.role !== role) {
      throw new Error(`Selected user must be a ${role}.`);
    }
  }

  private async ensureTeacherAvailability(input: {
    teacherId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeScheduleId?: string;
  }): Promise<void> {
    const params: string[] = [input.teacherId, input.date, input.startTime, input.endTime];
    let excludeSql = "";

    if (input.excludeScheduleId) {
      params.push(input.excludeScheduleId);
      excludeSql = `AND s.id <> $${params.length}`;
    }

    const conflict = await pool.query(
      `SELECT s.id
         FROM schedules s
        WHERE s.teacher_id = $1
          AND s.scheduled_date = $2::date
          AND s.status IN ('pending', 'accepted')
          AND s.start_time < $4::time
          AND s.end_time > $3::time
          ${excludeSql}
        LIMIT 1`,
      params,
    );

    if (conflict.rows[0]) {
      throw new Error("The selected teacher already has a schedule conflict for that date and time.");
    }
  }

  private async getScheduleById(scheduleId: string): Promise<ScheduleItem | null> {
    const result = await pool.query(
      `SELECT s.id,
              s.title,
              s.description,
              to_char(s.scheduled_date, 'YYYY-MM-DD') AS date,
              trim(to_char(s.scheduled_date, 'FMDay')) AS day,
              to_char(s.start_time, 'HH24:MI') AS "startTime",
              to_char(s.end_time, 'HH24:MI') AS "endTime",
              s.teacher_id AS "teacherId",
              t.full_name AS "teacherName",
              s.student_id AS "studentId",
              st.full_name AS "studentName",
              s.status,
              s.request_note AS "requestNote",
              s.response_note AS "responseNote",
              s.updated_at AS "updatedAt",
              s.created_at AS "createdAt"
         FROM schedules s
         JOIN users t ON t.id = s.teacher_id
    LEFT JOIN users st ON st.id = s.student_id
        WHERE s.id = $1`,
      [scheduleId],
    );

    return (result.rows[0] as ScheduleItem) || null;
  }

  private async getScheduleRecord(scheduleId: string): Promise<DbScheduleRecord | null> {
    const result = await pool.query<DbScheduleRecord>(
      `SELECT id,
              teacher_id,
              student_id,
              title,
              description,
              to_char(scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
              to_char(start_time, 'HH24:MI') AS start_time,
              to_char(end_time, 'HH24:MI') AS end_time,
              status,
              request_note,
              response_note
         FROM schedules
        WHERE id = $1`,
      [scheduleId],
    );

    return result.rows[0] || null;
  }

  async listSchedulesForRole(requester: { id: string; role: UserRole }): Promise<ScheduleItem[]> {
    const params: string[] = [];
    let whereSql = "";

    if (requester.role === "teacher") {
      params.push(requester.id);
      whereSql = `WHERE s.teacher_id = $${params.length}`;
    } else if (requester.role === "student") {
      params.push(requester.id);
      whereSql = `WHERE s.status = 'accepted' OR s.student_id = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT s.id,
              s.title,
              s.description,
              to_char(s.scheduled_date, 'YYYY-MM-DD') AS date,
              trim(to_char(s.scheduled_date, 'FMDay')) AS day,
              to_char(s.start_time, 'HH24:MI') AS "startTime",
              to_char(s.end_time, 'HH24:MI') AS "endTime",
              s.teacher_id AS "teacherId",
              t.full_name AS "teacherName",
              s.student_id AS "studentId",
              st.full_name AS "studentName",
              s.status,
              s.request_note AS "requestNote",
              s.response_note AS "responseNote",
              s.updated_at AS "updatedAt",
              s.created_at AS "createdAt"
         FROM schedules s
         JOIN users t ON t.id = s.teacher_id
    LEFT JOIN users st ON st.id = s.student_id
         ${whereSql}
        ORDER BY s.scheduled_date ASC, s.start_time ASC`,
      params,
    );

    return result.rows as ScheduleItem[];
  }

  async createScheduleRequest(input: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId: string;
    studentId: string;
    requestNote?: string;
  }): Promise<ScheduleItem> {
    this.validateTimeRange(input.startTime, input.endTime);
    await this.assertUserRole(input.teacherId, "teacher");
    await this.assertUserRole(input.studentId, "student");
    await this.ensureTeacherAvailability({
      teacherId: input.teacherId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    const insert = await pool.query<{ id: string }>(
      `INSERT INTO schedules (
          teacher_id,
          student_id,
          title,
          description,
          scheduled_date,
          day_of_week,
          start_time,
          end_time,
          status,
          request_note,
          updated_at
       )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::date,
          trim(to_char($5::date, 'FMDay')),
          $6::time,
          $7::time,
          'pending',
          $8,
          NOW()
       )
       RETURNING id`,
      [
        input.teacherId,
        input.studentId,
        input.title,
        input.description,
        input.date,
        input.startTime,
        input.endTime,
        input.requestNote?.trim() || null,
      ],
    );

    const created = await this.getScheduleById(insert.rows[0].id);
    if (!created) {
      throw new Error("Failed to create schedule request.");
    }

    return created;
  }

  async createManagedSchedule(input: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId: string;
    studentId?: string | null;
  }): Promise<ScheduleItem> {
    this.validateTimeRange(input.startTime, input.endTime);
    await this.assertUserRole(input.teacherId, "teacher");
    if (input.studentId) {
      await this.assertUserRole(input.studentId, "student");
    }

    await this.ensureTeacherAvailability({
      teacherId: input.teacherId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
    });

    const insert = await pool.query<{ id: string }>(
      `INSERT INTO schedules (
          teacher_id,
          student_id,
          title,
          description,
          scheduled_date,
          day_of_week,
          start_time,
          end_time,
          status,
          updated_at
       )
       VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::date,
          trim(to_char($5::date, 'FMDay')),
          $6::time,
          $7::time,
          'accepted',
          NOW()
       )
       RETURNING id`,
      [input.teacherId, input.studentId || null, input.title, input.description, input.date, input.startTime, input.endTime],
    );

    const created = await this.getScheduleById(insert.rows[0].id);
    if (!created) {
      throw new Error("Failed to create schedule.");
    }

    return created;
  }

  async teacherRespondToSchedule(
    scheduleId: string,
    teacherId: string,
    input: {
      decision: "accepted" | "declined";
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      responseNote?: string;
    },
  ): Promise<ScheduleItem | null> {
    const existing = await this.getScheduleRecord(scheduleId);
    if (!existing) {
      return null;
    }

    if (existing.teacher_id !== teacherId) {
      throw new Error("You can only respond to your own schedule requests.");
    }

    if (existing.status !== "pending") {
      throw new Error("Only pending schedule requests can be responded to.");
    }

    if (input.decision === "declined") {
      const note = input.responseNote?.trim();
      if (!note) {
        throw new Error("A decline note is required.");
      }

      await pool.query(
        `UPDATE schedules
            SET status = 'declined',
                response_note = $1,
                updated_at = NOW()
          WHERE id = $2`,
        [note, scheduleId],
      );

      return this.getScheduleById(scheduleId);
    }

    const nextTitle = input.title?.trim() || existing.title;
    const nextDescription = input.description === undefined ? existing.description : input.description.trim();
    const nextDate = input.date || existing.scheduled_date;
    const nextStartTime = input.startTime || existing.start_time;
    const nextEndTime = input.endTime || existing.end_time;

    this.validateTimeRange(nextStartTime, nextEndTime);
    await this.ensureTeacherAvailability({
      teacherId,
      date: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
      excludeScheduleId: scheduleId,
    });

    await pool.query(
      `UPDATE schedules
          SET title = $1,
              description = $2,
              scheduled_date = $3::date,
              day_of_week = trim(to_char($3::date, 'FMDay')),
              start_time = $4::time,
              end_time = $5::time,
              status = 'accepted',
              response_note = $6,
              updated_at = NOW()
        WHERE id = $7`,
      [nextTitle, nextDescription, nextDate, nextStartTime, nextEndTime, input.responseNote?.trim() || null, scheduleId],
    );

    return this.getScheduleById(scheduleId);
  }

  async moveSchedule(
    scheduleId: string,
    requester: { id: string; role: UserRole },
    input: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ): Promise<ScheduleItem | null> {
    const existing = await this.getScheduleRecord(scheduleId);
    if (!existing) {
      return null;
    }

    const canMove = requester.role === "admin" || (requester.role === "teacher" && existing.teacher_id === requester.id);
    if (!canMove) {
      throw new Error("Only admins or the assigned teacher can move this schedule.");
    }

    this.validateTimeRange(input.startTime, input.endTime);
    await this.ensureTeacherAvailability({
      teacherId: existing.teacher_id,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      excludeScheduleId: scheduleId,
    });

    const nextTitle = input.title?.trim() || existing.title;
    const nextDescription = input.description === undefined ? existing.description : input.description.trim();

    await pool.query(
      `UPDATE schedules
          SET title = $1,
              description = $2,
              scheduled_date = $3::date,
              day_of_week = trim(to_char($3::date, 'FMDay')),
              start_time = $4::time,
              end_time = $5::time,
              status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END,
              updated_at = NOW()
        WHERE id = $6`,
      [nextTitle, nextDescription, input.date, input.startTime, input.endTime, scheduleId],
    );

    return this.getScheduleById(scheduleId);
  }

  async cancelSchedule(
    scheduleId: string,
    requester: { id: string; role: UserRole },
    note: string,
  ): Promise<ScheduleItem | null> {
    const existing = await this.getScheduleRecord(scheduleId);
    if (!existing) {
      return null;
    }

    const canCancel = requester.role === "admin" || (requester.role === "teacher" && existing.teacher_id === requester.id);
    if (!canCancel) {
      throw new Error("Only admins or the assigned teacher can cancel this schedule.");
    }

    const cleanedNote = note.trim();
    if (!cleanedNote) {
      throw new Error("A cancellation note is required.");
    }

    await pool.query(
      `UPDATE schedules
          SET status = 'cancelled',
              response_note = $1,
              updated_at = NOW()
        WHERE id = $2`,
      [cleanedNote, scheduleId],
    );

    return this.getScheduleById(scheduleId);
  }

  async adminEditSchedule(
    scheduleId: string,
    input: {
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      teacherId?: string;
      studentId?: string | null;
      status?: ScheduleStatus;
      requestNote?: string | null;
      responseNote?: string | null;
    },
  ): Promise<ScheduleItem | null> {
    const existing = await this.getScheduleRecord(scheduleId);
    if (!existing) {
      return null;
    }

    const nextTeacherId = input.teacherId || existing.teacher_id;
    const nextStudentId = input.studentId === undefined ? existing.student_id : input.studentId;
    const nextTitle = input.title?.trim() || existing.title;
    const nextDescription = input.description === undefined ? existing.description : input.description.trim();
    const nextDate = input.date || existing.scheduled_date;
    const nextStartTime = input.startTime || existing.start_time;
    const nextEndTime = input.endTime || existing.end_time;
    const nextStatus = input.status || existing.status;
    const nextRequestNote = input.requestNote === undefined ? existing.request_note : input.requestNote;
    const nextResponseNote = input.responseNote === undefined ? existing.response_note : input.responseNote;

    this.validateTimeRange(nextStartTime, nextEndTime);
    await this.assertUserRole(nextTeacherId, "teacher");
    if (nextStudentId) {
      await this.assertUserRole(nextStudentId, "student");
    }

    if (nextStatus === "pending" || nextStatus === "accepted") {
      await this.ensureTeacherAvailability({
        teacherId: nextTeacherId,
        date: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime,
        excludeScheduleId: scheduleId,
      });
    }

    await pool.query(
      `UPDATE schedules
          SET teacher_id = $1,
              student_id = $2,
              title = $3,
              description = $4,
              scheduled_date = $5::date,
              day_of_week = trim(to_char($5::date, 'FMDay')),
              start_time = $6::time,
              end_time = $7::time,
              status = $8,
              request_note = $9,
              response_note = $10,
              updated_at = NOW()
        WHERE id = $11`,
      [
        nextTeacherId,
        nextStudentId,
        nextTitle,
        nextDescription,
        nextDate,
        nextStartTime,
        nextEndTime,
        nextStatus,
        nextRequestNote,
        nextResponseNote,
        scheduleId,
      ],
    );

    return this.getScheduleById(scheduleId);
  }

  async deleteSchedule(scheduleId: string, requester: { id: string; role: UserRole }): Promise<boolean> {
    if (requester.role === "teacher") {
      const result = await pool.query("DELETE FROM schedules WHERE id = $1 AND teacher_id = $2", [scheduleId, requester.id]);
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
       VALUES ($1, $2, CASE WHEN $5::text IS NOT NULL THEN 'file' ELSE 'text' END, $3, $4, $5)
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

  async listEnrollmentRecords(requester: { id: string; role: UserRole }): Promise<EnrollmentRecordItem[]> {
    const baseSql = `SELECT e.id,
                            e.student_id AS "studentId",
                            student.full_name AS "studentName",
                            e.teacher_id AS "teacherId",
                            teacher.full_name AS "teacherName",
                            e.subject,
                            e.tutorial_group AS "tutorialGroup",
                            e.status,
                            e.note,
                            e.created_by_id AS "createdById",
                            e.created_at AS "createdAt",
                            e.updated_at AS "updatedAt"
                       FROM enrollment_records e
                       JOIN users student ON student.id = e.student_id
                       JOIN users teacher ON teacher.id = e.teacher_id`;

    if (requester.role === "admin") {
      const result = await pool.query(`${baseSql} ORDER BY e.updated_at DESC`);
      return result.rows as EnrollmentRecordItem[];
    }

    if (requester.role === "teacher") {
      const result = await pool.query(`${baseSql} WHERE e.teacher_id = $1 ORDER BY e.updated_at DESC`, [requester.id]);
      return result.rows as EnrollmentRecordItem[];
    }

    const result = await pool.query(`${baseSql} WHERE e.student_id = $1 ORDER BY e.updated_at DESC`, [requester.id]);
    return result.rows as EnrollmentRecordItem[];
  }

  async createEnrollmentRecord(input: {
    studentId: string;
    teacherId: string;
    subject: string;
    tutorialGroup?: string | null;
    status?: EnrollmentStatus;
    note?: string | null;
    createdById: string;
  }): Promise<EnrollmentRecordItem> {
    const result = await pool.query(
      `INSERT INTO enrollment_records (student_id, teacher_id, subject, tutorial_group, status, note, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id,
                 student_id AS "studentId",
                 teacher_id AS "teacherId",
                 subject,
                 tutorial_group AS "tutorialGroup",
                 status,
                 note,
                 created_by_id AS "createdById",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [
        input.studentId,
        input.teacherId,
        input.subject,
        input.tutorialGroup || null,
        input.status || "active",
        input.note || null,
        input.createdById,
      ],
    );

    const row = result.rows[0] as Omit<EnrollmentRecordItem, "studentName" | "teacherName">;
    const names = await pool.query(
      `SELECT id, full_name
         FROM users
        WHERE id IN ($1, $2)`,
      [input.studentId, input.teacherId],
    );
    const nameById = new Map<string, string>(names.rows.map((entry: { id: string; full_name: string }) => [entry.id, entry.full_name]));

    return {
      ...row,
      studentName: nameById.get(input.studentId) || "Student",
      teacherName: nameById.get(input.teacherId) || "Teacher",
    };
  }

  async updateEnrollmentRecord(
    id: string,
    input: {
      subject?: string;
      tutorialGroup?: string | null;
      status?: EnrollmentStatus;
      note?: string | null;
    },
  ): Promise<EnrollmentRecordItem | null> {
    const existing = await pool.query(
      `SELECT id, student_id, teacher_id, subject, tutorial_group, status, note, created_by_id, created_at, updated_at
         FROM enrollment_records
        WHERE id = $1`,
      [id],
    );

    if (!existing.rows[0]) {
      return null;
    }

    const row = existing.rows[0];
    const result = await pool.query(
      `UPDATE enrollment_records
          SET subject = $1,
              tutorial_group = $2,
              status = $3,
              note = $4,
              updated_at = NOW()
        WHERE id = $5
        RETURNING id,
                  student_id AS "studentId",
                  teacher_id AS "teacherId",
                  subject,
                  tutorial_group AS "tutorialGroup",
                  status,
                  note,
                  created_by_id AS "createdById",
                  created_at AS "createdAt",
                  updated_at AS "updatedAt"`,
      [
        input.subject ?? row.subject,
        input.tutorialGroup === undefined ? row.tutorial_group : input.tutorialGroup,
        input.status ?? row.status,
        input.note === undefined ? row.note : input.note,
        id,
      ],
    );

    const updated = result.rows[0] as Omit<EnrollmentRecordItem, "studentName" | "teacherName">;
    const names = await pool.query(
      `SELECT id, full_name
         FROM users
        WHERE id IN ($1, $2)`,
      [updated.studentId, updated.teacherId],
    );
    const nameById = new Map<string, string>(names.rows.map((entry: { id: string; full_name: string }) => [entry.id, entry.full_name]));

    return {
      ...updated,
      studentName: nameById.get(updated.studentId) || "Student",
      teacherName: nameById.get(updated.teacherId) || "Teacher",
    };
  }

  async deleteEnrollmentRecord(id: string): Promise<boolean> {
    const result = await pool.query("DELETE FROM enrollment_records WHERE id = $1", [id]);
    return (result.rowCount || 0) > 0;
  }

  async listLearningMaterials(requester: { id: string; role: UserRole }): Promise<LearningMaterialItem[]> {
    if (requester.role === "student") {
      const result = await pool.query(
        `SELECT m.id,
                m.title,
                m.description,
                m.subject,
                m.material_type AS "materialType",
                m.resource_url AS "resourceUrl",
                m.file_name AS "fileName",
                m.created_by_id AS "createdById",
                u.full_name AS "createdByName",
                m.created_at AS "createdAt",
                m.updated_at AS "updatedAt"
           FROM learning_materials m
           JOIN users u ON u.id = m.created_by_id
           JOIN enrollment_records e ON e.teacher_id = m.created_by_id
          WHERE e.student_id = $1
            AND e.status = 'active'
          ORDER BY m.created_at DESC`,
        [requester.id],
      );

      return result.rows as LearningMaterialItem[];
    }

    if (requester.role === "teacher") {
      const result = await pool.query(
        `SELECT m.id,
                m.title,
                m.description,
                m.subject,
                m.material_type AS "materialType",
                m.resource_url AS "resourceUrl",
                m.file_name AS "fileName",
                m.created_by_id AS "createdById",
                u.full_name AS "createdByName",
                m.created_at AS "createdAt",
                m.updated_at AS "updatedAt"
           FROM learning_materials m
           JOIN users u ON u.id = m.created_by_id
          WHERE m.created_by_id = $1
          ORDER BY m.created_at DESC`,
        [requester.id],
      );

      return result.rows as LearningMaterialItem[];
    }

    const result = await pool.query(
      `SELECT m.id,
              m.title,
              m.description,
              m.subject,
              m.material_type AS "materialType",
              m.resource_url AS "resourceUrl",
              m.file_name AS "fileName",
              m.created_by_id AS "createdById",
              u.full_name AS "createdByName",
              m.created_at AS "createdAt",
              m.updated_at AS "updatedAt"
         FROM learning_materials m
         JOIN users u ON u.id = m.created_by_id
        ORDER BY m.created_at DESC`,
    );

    return result.rows as LearningMaterialItem[];
  }

  async createLearningMaterial(input: {
    title: string;
    description?: string | null;
    subject: string;
    materialType: "link" | "file";
    resourceUrl: string;
    fileName?: string | null;
    createdById: string;
  }): Promise<LearningMaterialItem> {
    const result = await pool.query(
      `INSERT INTO learning_materials (title, description, subject, material_type, resource_url, file_name, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id,
                 title,
                 description,
                 subject,
                 material_type AS "materialType",
                 resource_url AS "resourceUrl",
                 file_name AS "fileName",
                 created_by_id AS "createdById",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [
        input.title,
        input.description || null,
        input.subject,
        input.materialType,
        input.resourceUrl,
        input.fileName || null,
        input.createdById,
      ],
    );

    const row = result.rows[0] as Omit<LearningMaterialItem, "createdByName">;
    const createdBy = await pool.query("SELECT full_name FROM users WHERE id = $1", [input.createdById]);

    return {
      ...row,
      createdByName: createdBy.rows[0]?.full_name || "Teacher",
    };
  }

  async deleteLearningMaterial(input: { id: string; requesterId: string; requesterRole: UserRole }): Promise<boolean> {
    const whereSql = input.requesterRole === "admin" ? "WHERE id = $1" : "WHERE id = $1 AND created_by_id = $2";
    const params = input.requesterRole === "admin" ? [input.id] : [input.id, input.requesterId];
    const result = await pool.query(`DELETE FROM learning_materials ${whereSql}`, params);
    return (result.rowCount || 0) > 0;
  }

  async listChatUsers(requesterId: string): Promise<MessageUserItem[]> {
    const result = await pool.query(
      `SELECT id, full_name AS "fullName", role, profile_image_url AS "profileImageUrl"
         FROM users
        WHERE id <> $1
          AND status = 'active'
        ORDER BY full_name ASC`,
      [requesterId],
    );

    return result.rows as MessageUserItem[];
  }

  async listChatsForUser(requesterId: string): Promise<ChatSummaryItem[]> {
    const chats = await pool.query<DbChatSummaryRow>(
      `SELECT c.id,
              c.name,
              c.chat_type AS "chatType",
              c.direct_key AS "directKey",
              c.created_by_id AS "createdById",
              creator.full_name AS "createdByName",
              last_message.id AS "lastMessageId",
              last_message.body AS "lastMessageBody",
              last_message.sent_at AS "lastMessageAt",
              (
                SELECT COUNT(*)::int
                  FROM chat_participants cp
                 WHERE cp.chat_id = c.id
              ) AS "participantCount",
              c.created_at AS "createdAt",
              c.updated_at AS "updatedAt"
         FROM chats c
         JOIN chat_participants me ON me.chat_id = c.id AND me.user_id = $1
         JOIN users creator ON creator.id = c.created_by_id
    LEFT JOIN LATERAL (
              SELECT m.id, m.body, m.sent_at
                FROM chat_messages m
               WHERE m.chat_id = c.id
            ORDER BY m.sent_at DESC
               LIMIT 1
         ) last_message ON TRUE
        ORDER BY COALESCE(last_message.sent_at, c.updated_at) DESC, c.updated_at DESC`,
      [requesterId],
    );

    if (chats.rows.length === 0) {
      return [];
    }

    const chatIds = chats.rows.map((chat) => chat.id);
    const participantRows = await pool.query<DbChatParticipantRow>(
      `SELECT cp.chat_id AS "chatId",
              u.id,
              u.full_name AS "fullName",
              u.role,
              u.profile_image_url AS "profileImageUrl"
         FROM chat_participants cp
         JOIN users u ON u.id = cp.user_id
        WHERE cp.chat_id = ANY($1::uuid[])
        ORDER BY u.full_name ASC`,
      [chatIds],
    );

    const participantsByChatId = new Map<string, MessageUserItem[]>();
    for (const row of participantRows.rows) {
      const existing = participantsByChatId.get(row.chatId) || [];
      existing.push({
        id: row.id,
        fullName: row.fullName,
        role: row.role,
        profileImageUrl: row.profileImageUrl,
      });
      participantsByChatId.set(row.chatId, existing);
    }

    return chats.rows.map((chat) => ({
      id: chat.id,
      name: chat.name,
      chatType: chat.chatType,
      directKey: chat.directKey,
      createdById: chat.createdById,
      createdByName: chat.createdByName,
      lastMessageId: chat.lastMessageId,
      lastMessageBody: chat.lastMessageBody,
      lastMessageAt: chat.lastMessageAt,
      participantCount: chat.participantCount,
      participants: participantsByChatId.get(chat.id) || [],
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));
  }

  async openOrCreateDirectChat(requesterId: string, otherUserId: string): Promise<ChatSummaryItem> {
    const [firstId, secondId] = [requesterId, otherUserId].sort();
    const directKey = `${firstId}:${secondId}`;

    const existing = await pool.query<{ id: string }>("SELECT id FROM chats WHERE direct_key = $1", [directKey]);
    if (existing.rows[0]) {
      const chats = await this.listChatsForUser(requesterId);
      const found = chats.find((chat) => chat.id === existing.rows[0].id);
      if (found) {
        return found;
      }
    }

    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO chats (name, chat_type, direct_key, created_by_id)
       VALUES ($1, 'direct', $2, $3)
       RETURNING id`,
      [null, directKey, requesterId],
    );

    const chatId = inserted.rows[0].id;
    await pool.query(
      `INSERT INTO chat_participants (chat_id, user_id, is_owner)
       VALUES ($1, $2, TRUE), ($1, $3, FALSE)
       ON CONFLICT (chat_id, user_id) DO NOTHING`,
      [chatId, requesterId, otherUserId],
    );

    const chats = await this.listChatsForUser(requesterId);
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) {
      throw new Error("Unable to open direct chat.");
    }

    return chat;
  }

  async createGroupChat(input: { requesterId: string; name: string; participantIds: string[] }): Promise<ChatSummaryItem> {
    const uniqueParticipants = Array.from(new Set([input.requesterId, ...input.participantIds])).filter(Boolean);
    if (uniqueParticipants.length < 2) {
      throw new Error("Group chats require at least two participants.");
    }

    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO chats (name, chat_type, created_by_id)
       VALUES ($1, 'group', $2)
       RETURNING id`,
      [input.name, input.requesterId],
    );

    const chatId = inserted.rows[0].id;
    const participantValues = uniqueParticipants.map((participantId) => [chatId, participantId, participantId === input.requesterId]);
    for (const [chatIdValue, participantId, isOwner] of participantValues) {
      await pool.query(
        `INSERT INTO chat_participants (chat_id, user_id, is_owner)
         VALUES ($1, $2, $3)
         ON CONFLICT (chat_id, user_id) DO NOTHING`,
        [chatIdValue, participantId, isOwner],
      );
    }

    const chats = await this.listChatsForUser(input.requesterId);
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) {
      throw new Error("Unable to create group chat.");
    }

    return chat;
  }

  async listChatMessages(chatId: string, requesterId: string): Promise<ChatMessageItem[] | null> {
    const access = await pool.query("SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2", [chatId, requesterId]);
    if (!access.rows[0]) {
      return null;
    }

    const result = await pool.query<DbChatMessageRow>(
      `SELECT m.id,
              m.chat_id AS "chatId",
              m.sender_id AS "senderId",
              sender.full_name AS "senderName",
              m.body,
              m.sent_at AS "sentAt"
         FROM chat_messages m
         JOIN users sender ON sender.id = m.sender_id
        WHERE m.chat_id = $1
        ORDER BY m.sent_at ASC`,
      [chatId],
    );

    return result.rows as ChatMessageItem[];
  }

  async sendChatMessage(input: { chatId: string; senderId: string; body: string }): Promise<ChatMessageItem | null> {
    const access = await pool.query("SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2", [input.chatId, input.senderId]);
    if (!access.rows[0]) {
      return null;
    }

    const result = await pool.query<DbChatMessageRow>(
      `INSERT INTO chat_messages (chat_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id,
                 chat_id AS "chatId",
                 sender_id AS "senderId",
                 body,
                 sent_at AS "sentAt"`,
      [input.chatId, input.senderId, input.body],
    );

    await pool.query("UPDATE chats SET updated_at = NOW() WHERE id = $1", [input.chatId]);

    const sender = await pool.query("SELECT full_name FROM users WHERE id = $1", [input.senderId]);
    const row = result.rows[0];
    return {
      id: row.id,
      chatId: row.chatId,
      senderId: row.senderId,
      senderName: sender.rows[0]?.full_name || "User",
      body: row.body,
      sentAt: row.sentAt,
    };
  }

  async listMessageRecipients(input: { requesterId: string; requesterRole: UserRole }): Promise<MessageUserItem[]> {
    return this.listChatUsers(input.requesterId);
  }

  async listMessagesBetweenUsers(input: { requesterId: string; otherUserId: string }): Promise<MessageItem[]> {
    const result = await pool.query(
      `SELECT m.id,
              m.sender_id AS "senderId",
              sender.full_name AS "senderName",
              m.receiver_id AS "receiverId",
              receiver.full_name AS "receiverName",
              m.body,
              m.sent_at AS "sentAt"
         FROM messages m
         JOIN users sender ON sender.id = m.sender_id
         JOIN users receiver ON receiver.id = m.receiver_id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2)
           OR (m.sender_id = $2 AND m.receiver_id = $1)
        ORDER BY m.sent_at ASC`,
      [input.requesterId, input.otherUserId],
    );

    return result.rows as MessageItem[];
  }

  async sendMessage(input: { senderId: string; receiverId: string; body: string }): Promise<MessageItem> {
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, body)
       VALUES ($1, $2, $3)
       RETURNING id,
                 sender_id AS "senderId",
                 receiver_id AS "receiverId",
                 body,
                 sent_at AS "sentAt"`,
      [input.senderId, input.receiverId, input.body],
    );

    const row = result.rows[0] as Omit<MessageItem, "senderName" | "receiverName">;
    const names = await pool.query(
      `SELECT id, full_name
         FROM users
        WHERE id IN ($1, $2)`,
      [input.senderId, input.receiverId],
    );

    const nameById = new Map<string, string>(names.rows.map((entry: { id: string; full_name: string }) => [entry.id, entry.full_name]));

    return {
      ...row,
      senderName: nameById.get(input.senderId) || "User",
      receiverName: nameById.get(input.receiverId) || "User",
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

  private validateGamifiedQuestions(questions: GamifiedQuestionInput[]): void {
    if (!questions.length) {
      throw new Error("At least one question is required.");
    }

    questions.forEach((question, index) => {
      if (!question.prompt.trim()) {
        throw new Error(`Question ${index + 1} prompt is required.`);
      }

      if (!Number.isFinite(question.points) || question.points <= 0) {
        throw new Error(`Question ${index + 1} points must be a positive number.`);
      }

      if (question.choices.length < 2) {
        throw new Error(`Question ${index + 1} requires at least two choices.`);
      }

      const correctCount = question.choices.filter((choice) => choice.isCorrect).length;
      if (correctCount !== 1) {
        throw new Error(`Question ${index + 1} must have exactly one correct choice.`);
      }

      question.choices.forEach((choice, choiceIndex) => {
        if (!choice.text.trim()) {
          throw new Error(`Question ${index + 1}, choice ${choiceIndex + 1} must not be empty.`);
        }
      });
    });
  }

  private async getGamifiedCategoryById(categoryId: string, requesterRole: UserRole): Promise<GamifiedCategoryItem | null> {
    const quizCountSql =
      requesterRole === "student"
        ? "COUNT(q.id) FILTER (WHERE q.is_published = TRUE)::int"
        : "COUNT(q.id)::int";

    const result = await pool.query<DbGamifiedCategoryRow>(
      `SELECT c.id,
              c.name,
              c.description,
              c.created_by AS "createdById",
              u.full_name AS "createdByName",
              ${quizCountSql} AS "quizCount",
              c.created_at AS "createdAt",
              c.updated_at AS "updatedAt"
         FROM gamified_categories c
         JOIN users u ON u.id = c.created_by
    LEFT JOIN gamified_quizzes q ON q.category_id = c.id
        WHERE c.id = $1
        GROUP BY c.id, u.full_name`,
      [categoryId],
    );

    return result.rows[0] || null;
  }

  async listGamifiedCategories(requesterRole: UserRole): Promise<GamifiedCategoryItem[]> {
    const quizCountSql =
      requesterRole === "student"
        ? "COUNT(q.id) FILTER (WHERE q.is_published = TRUE)::int"
        : "COUNT(q.id)::int";

    const result = await pool.query<DbGamifiedCategoryRow>(
      `SELECT c.id,
              c.name,
              c.description,
              c.created_by AS "createdById",
              u.full_name AS "createdByName",
              ${quizCountSql} AS "quizCount",
              c.created_at AS "createdAt",
              c.updated_at AS "updatedAt"
         FROM gamified_categories c
         JOIN users u ON u.id = c.created_by
    LEFT JOIN gamified_quizzes q ON q.category_id = c.id
        GROUP BY c.id, u.full_name
        ORDER BY c.name ASC`,
    );

    return result.rows;
  }

  async createGamifiedCategory(
    input: { name: string; description?: string | null },
    requester: { id: string; role: UserRole },
  ): Promise<GamifiedCategoryItem> {
    const created = await pool.query<{ id: string }>(
      `INSERT INTO gamified_categories (name, description, created_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [input.name.trim(), input.description?.trim() || null, requester.id],
    );

    const row = await this.getGamifiedCategoryById(created.rows[0].id, requester.role);
    if (!row) {
      throw new Error("Failed to create category.");
    }

    return row;
  }

  async updateGamifiedCategory(
    categoryId: string,
    input: { name?: string; description?: string | null },
    requester: { id: string; role: UserRole },
  ): Promise<GamifiedCategoryItem | null> {
    const existing = await pool.query<{ created_by: string }>(
      `SELECT created_by
         FROM gamified_categories
        WHERE id = $1`,
      [categoryId],
    );

    const owner = existing.rows[0];
    if (!owner) {
      return null;
    }

    if (requester.role === "teacher" && owner.created_by !== requester.id) {
      throw new Error("Teachers can only edit categories they created.");
    }

    const nextDescription = input.description === undefined ? undefined : input.description?.trim() || null;

    await pool.query(
      `UPDATE gamified_categories
          SET name = COALESCE($1, name),
              description = COALESCE($2, description),
              updated_at = NOW()
        WHERE id = $3`,
      [input.name?.trim() || null, nextDescription, categoryId],
    );

    return this.getGamifiedCategoryById(categoryId, requester.role);
  }

  async listGamifiedQuizzes(
    requester: { id: string; role: UserRole },
    input: { categoryId?: string },
  ): Promise<GamifiedQuizItem[]> {
    const params: string[] = [];
    const where: string[] = [];

    if (input.categoryId) {
      params.push(input.categoryId);
      where.push(`q.category_id = $${params.length}`);
    }

    if (requester.role === "student") {
      where.push("q.is_published = TRUE");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query<DbGamifiedQuizRow>(
      `SELECT q.id,
              q.category_id AS "categoryId",
              c.name AS "categoryName",
              q.title,
              q.description,
              q.time_per_question_seconds AS "timePerQuestionSeconds",
              q.is_published AS "isPublished",
              q.created_by AS "createdById",
              u.full_name AS "createdByName",
              COUNT(qq.id)::int AS "questionCount",
              q.created_at AS "createdAt",
              q.updated_at AS "updatedAt"
         FROM gamified_quizzes q
         JOIN gamified_categories c ON c.id = q.category_id
         JOIN users u ON u.id = q.created_by
    LEFT JOIN gamified_questions qq ON qq.quiz_id = q.id
         ${whereSql}
        GROUP BY q.id, c.name, u.full_name
        ORDER BY q.created_at DESC`,
      params,
    );

    return result.rows;
  }

  async getGamifiedQuizDetail(
    quizId: string,
    requester: { id: string; role: UserRole },
    includeAnswerKeys: boolean,
  ): Promise<GamifiedQuizDetailItem | null> {
    const params: string[] = [quizId];
    let whereSql = "WHERE q.id = $1";

    if (requester.role === "student") {
      whereSql += " AND q.is_published = TRUE";
    }

    const quizResult = await pool.query<DbGamifiedQuizRow>(
      `SELECT q.id,
              q.category_id AS "categoryId",
              c.name AS "categoryName",
              q.title,
              q.description,
              q.time_per_question_seconds AS "timePerQuestionSeconds",
              q.is_published AS "isPublished",
              q.created_by AS "createdById",
              u.full_name AS "createdByName",
              COUNT(qq.id)::int AS "questionCount",
              q.created_at AS "createdAt",
              q.updated_at AS "updatedAt"
         FROM gamified_quizzes q
         JOIN gamified_categories c ON c.id = q.category_id
         JOIN users u ON u.id = q.created_by
    LEFT JOIN gamified_questions qq ON qq.quiz_id = q.id
         ${whereSql}
        GROUP BY q.id, c.name, u.full_name`,
      params,
    );

    const quiz = quizResult.rows[0];
    if (!quiz) {
      return null;
    }

    const questionRows = await pool.query<DbGamifiedQuestionRow>(
      `SELECT id,
              prompt,
              question_order AS "order",
              points
         FROM gamified_questions
        WHERE quiz_id = $1
        ORDER BY question_order ASC`,
      [quizId],
    );

    const questionIds = questionRows.rows.map((question) => question.id);
    let choiceRows: DbGamifiedChoiceRow[] = [];
    if (questionIds.length) {
      const choicesResult = await pool.query<DbGamifiedChoiceRow>(
        `SELECT id,
                question_id AS "questionId",
                choice_text AS text,
                choice_order AS "order",
                is_correct AS "isCorrect"
           FROM gamified_choices
          WHERE question_id = ANY($1::uuid[])
          ORDER BY question_id ASC, choice_order ASC`,
        [questionIds],
      );
      choiceRows = choicesResult.rows;
    }

    const choicesByQuestion = new Map<string, DbGamifiedChoiceRow[]>();
    choiceRows.forEach((choice) => {
      const list = choicesByQuestion.get(choice.questionId) || [];
      list.push(choice);
      choicesByQuestion.set(choice.questionId, list);
    });

    const questions: GamifiedQuestionItem[] = questionRows.rows.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      order: question.order,
      points: question.points,
      choices: (choicesByQuestion.get(question.id) || []).map((choice) => ({
        id: choice.id,
        text: choice.text,
        order: choice.order,
        ...(includeAnswerKeys ? { isCorrect: choice.isCorrect } : {}),
      })),
    }));

    return {
      ...quiz,
      questions,
    };
  }

  async createGamifiedQuiz(
    input: {
      categoryId: string;
      title: string;
      description?: string;
      timePerQuestionSeconds: number;
      isPublished?: boolean;
      questions: GamifiedQuestionInput[];
    },
    requester: { id: string; role: UserRole },
  ): Promise<GamifiedQuizDetailItem> {
    this.validateGamifiedQuestions(input.questions);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const created = await client.query<{ id: string }>(
        `INSERT INTO gamified_quizzes (
            category_id,
            title,
            description,
            time_per_question_seconds,
            is_published,
            created_by,
            updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [
          input.categoryId,
          input.title.trim(),
          input.description?.trim() || "",
          input.timePerQuestionSeconds,
          input.isPublished ?? true,
          requester.id,
        ],
      );

      const quizId = created.rows[0].id;

      for (let questionIndex = 0; questionIndex < input.questions.length; questionIndex += 1) {
        const question = input.questions[questionIndex];
        const insertedQuestion = await client.query<{ id: string }>(
          `INSERT INTO gamified_questions (quiz_id, prompt, question_order, points, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id`,
          [quizId, question.prompt.trim(), questionIndex + 1, Math.floor(question.points)],
        );

        const questionId = insertedQuestion.rows[0].id;

        for (let choiceIndex = 0; choiceIndex < question.choices.length; choiceIndex += 1) {
          const choice = question.choices[choiceIndex];
          await client.query(
            `INSERT INTO gamified_choices (question_id, choice_text, choice_order, is_correct, updated_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [questionId, choice.text.trim(), choiceIndex + 1, choice.isCorrect],
          );
        }
      }

      await client.query("COMMIT");

      const detail = await this.getGamifiedQuizDetail(quizId, requester, true);
      if (!detail) {
        throw new Error("Failed to load created quiz.");
      }

      return detail;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateGamifiedQuiz(
    quizId: string,
    input: {
      categoryId: string;
      title: string;
      description?: string;
      timePerQuestionSeconds: number;
      isPublished?: boolean;
      questions: GamifiedQuestionInput[];
    },
    requester: { id: string; role: UserRole },
  ): Promise<GamifiedQuizDetailItem | null> {
    this.validateGamifiedQuestions(input.questions);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const ownerResult = await client.query<DbGamifiedQuizOwnerRow>(
        `SELECT id, created_by
           FROM gamified_quizzes
          WHERE id = $1`,
        [quizId],
      );

      const owner = ownerResult.rows[0];
      if (!owner) {
        await client.query("ROLLBACK");
        return null;
      }

      if (requester.role === "teacher" && owner.created_by !== requester.id) {
        throw new Error("Teachers can only edit quizzes they created.");
      }

      await client.query(
        `UPDATE gamified_quizzes
            SET category_id = $1,
                title = $2,
                description = $3,
                time_per_question_seconds = $4,
                is_published = $5,
                updated_at = NOW()
          WHERE id = $6`,
        [
          input.categoryId,
          input.title.trim(),
          input.description?.trim() || "",
          input.timePerQuestionSeconds,
          input.isPublished ?? true,
          quizId,
        ],
      );

      await client.query(
        `DELETE FROM gamified_questions
          WHERE quiz_id = $1`,
        [quizId],
      );

      for (let questionIndex = 0; questionIndex < input.questions.length; questionIndex += 1) {
        const question = input.questions[questionIndex];
        const insertedQuestion = await client.query<{ id: string }>(
          `INSERT INTO gamified_questions (quiz_id, prompt, question_order, points, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id`,
          [quizId, question.prompt.trim(), questionIndex + 1, Math.floor(question.points)],
        );

        const questionId = insertedQuestion.rows[0].id;

        for (let choiceIndex = 0; choiceIndex < question.choices.length; choiceIndex += 1) {
          const choice = question.choices[choiceIndex];
          await client.query(
            `INSERT INTO gamified_choices (question_id, choice_text, choice_order, is_correct, updated_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [questionId, choice.text.trim(), choiceIndex + 1, choice.isCorrect],
          );
        }
      }

      await client.query("COMMIT");

      return this.getGamifiedQuizDetail(quizId, requester, true);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async submitGamifiedAttempt(
    quizId: string,
    studentId: string,
    input: { answers: Array<{ questionId: string; selectedChoiceId?: string | null; timeRemainingSeconds?: number }> },
  ): Promise<GamifiedAttemptResultItem> {
    const quizResult = await pool.query<{ category_id: string; time_per_question_seconds: number }>(
      `SELECT category_id,
              time_per_question_seconds
         FROM gamified_quizzes
        WHERE id = $1
          AND is_published = TRUE`,
      [quizId],
    );

    const quiz = quizResult.rows[0];
    if (!quiz) {
      throw new Error("Quiz is not available.");
    }

    const questionRows = await pool.query<{
      question_id: string;
      prompt: string;
      points: number;
      choice_id: string;
      choice_text: string;
      is_correct: boolean;
    }>(
      `SELECT q.id AS question_id,
              q.prompt,
              q.points,
              c.id AS choice_id,
              c.choice_text,
              c.is_correct
         FROM gamified_questions q
         JOIN gamified_choices c ON c.question_id = q.id
        WHERE q.quiz_id = $1
        ORDER BY q.question_order ASC, c.choice_order ASC`,
      [quizId],
    );

    if (!questionRows.rows.length) {
      throw new Error("Quiz has no questions.");
    }

    const questionMeta = new Map<
      string,
      {
        prompt: string;
        points: number;
        correctChoiceId: string;
        correctChoiceText: string;
        validChoiceIds: Set<string>;
        choiceTextById: Map<string, string>;
      }
    >();

    questionRows.rows.forEach((row) => {
      const existing = questionMeta.get(row.question_id) || {
        prompt: row.prompt,
        points: row.points,
        correctChoiceId: "",
        correctChoiceText: "",
        validChoiceIds: new Set<string>(),
        choiceTextById: new Map<string, string>(),
      };
      existing.prompt = row.prompt;
      existing.points = row.points;
      existing.validChoiceIds.add(row.choice_id);
      existing.choiceTextById.set(row.choice_id, row.choice_text);
      if (row.is_correct) {
        existing.correctChoiceId = row.choice_id;
        existing.correctChoiceText = row.choice_text;
      }
      questionMeta.set(row.question_id, existing);
    });

    const answersByQuestion = new Map(
      input.answers.map((answer) => [answer.questionId, answer]),
    );

    let totalScore = 0;
    let correctAnswers = 0;

    const evaluatedAnswers = Array.from(questionMeta.entries()).map(([questionId, meta]) => {
      const answer = answersByQuestion.get(questionId);
      const selectedChoiceId = answer?.selectedChoiceId || null;
      const normalizedChoiceId = selectedChoiceId && meta.validChoiceIds.has(selectedChoiceId) ? selectedChoiceId : null;
      const timeRemainingSeconds = Math.max(
        0,
        Math.min(quiz.time_per_question_seconds, Math.floor(answer?.timeRemainingSeconds || 0)),
      );
      const isCorrect = normalizedChoiceId !== null && normalizedChoiceId === meta.correctChoiceId;
      const speedRatio = quiz.time_per_question_seconds > 0 ? timeRemainingSeconds / quiz.time_per_question_seconds : 0;
      const speedBonus = isCorrect ? Math.round(meta.points * 0.5 * speedRatio) : 0;
      const pointsEarned = isCorrect ? meta.points + speedBonus : 0;

      if (isCorrect) {
        correctAnswers += 1;
      }
      totalScore += pointsEarned;

      return {
        questionId,
        questionPrompt: meta.prompt,
        selectedChoiceId: normalizedChoiceId,
        selectedChoiceText: normalizedChoiceId ? meta.choiceTextById.get(normalizedChoiceId) || null : null,
        correctChoiceId: meta.correctChoiceId,
        correctChoiceText: meta.correctChoiceText,
        isCorrect,
        maxPoints: meta.points,
        speedBonus,
        pointsEarned,
        timeRemainingSeconds,
      };
    });

    const totalQuestions = evaluatedAnswers.length;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertedAttempt = await client.query<DbGamifiedAttemptInsertRow>(
        `INSERT INTO gamified_attempts (
            quiz_id,
            category_id,
            student_id,
            total_questions,
            correct_answers,
            total_score
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id,
                   quiz_id AS "quizId",
                   category_id AS "categoryId",
                   student_id AS "studentId",
                   total_questions AS "totalQuestions",
                   correct_answers AS "correctAnswers",
                   total_score AS "totalScore",
                   completed_at AS "completedAt"`,
        [quizId, quiz.category_id, studentId, totalQuestions, correctAnswers, totalScore],
      );

      const attempt = insertedAttempt.rows[0];

      for (const answer of evaluatedAnswers) {
        await client.query(
          `INSERT INTO gamified_attempt_answers (
              attempt_id,
              question_id,
              selected_choice_id,
              is_correct,
              points_earned,
              time_remaining_seconds
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            attempt.id,
            answer.questionId,
            answer.selectedChoiceId,
            answer.isCorrect,
            answer.pointsEarned,
            answer.timeRemainingSeconds,
          ],
        );
      }

      await client.query("COMMIT");

      return {
        ...attempt,
        attemptId: attempt.id,
        answers: evaluatedAnswers,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listGamifiedLeaderboard(categoryId: string, limit = 10): Promise<GamifiedLeaderboardItem[]> {
    const result = await pool.query<DbGamifiedLeaderboardRow>(
      `WITH ranked AS (
         SELECT a.student_id AS "studentId",
                u.full_name AS "studentName",
                a.total_score AS "bestScore",
                a.correct_answers AS "bestCorrectAnswers",
                a.total_questions AS "totalQuestions",
                a.completed_at AS "completedAt",
                COUNT(*) OVER (PARTITION BY a.student_id)::int AS "attemptCount",
                ROW_NUMBER() OVER (PARTITION BY a.student_id ORDER BY a.total_score DESC, a.completed_at ASC) AS rn
           FROM gamified_attempts a
           JOIN users u ON u.id = a.student_id
          WHERE a.category_id = $1
       )
       SELECT "studentId",
              "studentName",
              "bestScore",
              "attemptCount",
              "bestCorrectAnswers",
              "totalQuestions",
              "completedAt"
         FROM ranked
        WHERE rn = 1
        ORDER BY "bestScore" DESC, "completedAt" ASC
        LIMIT $2`,
      [categoryId, limit],
    );

    return result.rows;
  }
}

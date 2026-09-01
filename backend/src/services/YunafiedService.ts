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
  StudentQuestItem,
  StoreItem,
  StudentStorePurchaseItem,
  LearningMaterialItem,
  MessageItem,
  MessageUserItem,
  ScheduleItem,
  ScheduleStatus,
  StatusChangeHistoryItem,
  SubmissionItem,
  StudentRecordItem,
  StudentRecordAssignment,
  StudentRecordGamifiedAttempt,
  TranslationHistoryItem,
  UserRole,
  UserStatus,
} from "../types/models.js";

interface DbUserRow {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  profile_image_url: string | null;
  profile_image_public_id: string | null;
  password_hash: string;
  created_at: string;
  is_verified: boolean;
  otp_code: string | null;
  otp_expires_at: string | null;
  verification_token_hash: string | null;
  verification_token_expires_at: string | null;
  mobile_number?: string | null;
  specializations?: string[];
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
  unreadCount: number;
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
    const usersPromise = requester.role === "admin" ? this.listUsers() : this.listUsersByRoles(["teacher", "student"]);

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
      "SELECT id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, mobile_number, password_hash, created_at, is_verified, otp_code, otp_expires_at, verification_token_hash, verification_token_expires_at FROM users WHERE email = $1",
      [email],
    );

    return result.rows[0] || null;
  }

  async findUserWithPasswordById(userId: string): Promise<DbUserRow | null> {
    const result = await pool.query<DbUserRow>(
      "SELECT id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, mobile_number, password_hash, created_at, is_verified, otp_code, otp_expires_at, verification_token_hash, verification_token_expires_at FROM users WHERE id = $1",
      [userId],
    );

    return result.rows[0] || null;
  }

  async saveOtp(userId: string, otpCode: string, expiresAt: Date): Promise<void> {
    await pool.query(
      "UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3",
      [otpCode, expiresAt.toISOString(), userId],
    );
  }

  async verifyOtp(email: string, otpCode: string): Promise<DbUserRow | null> {
    const row = await this.findUserWithPasswordByEmail(email);
    if (!row) return null;
    if (!row.otp_code || row.otp_code !== otpCode) return null;
    if (!row.otp_expires_at || new Date(row.otp_expires_at) < new Date()) return null;

    await pool.query(
      "UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1",
      [row.id],
    );

    row.is_verified = true;
    row.otp_code = null;
    row.otp_expires_at = null;
    return row;
  }

  async clearOtp(userId: string): Promise<void> {
    await pool.query(
      "UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1",
      [userId],
    );
  }

  toAuthUser(row: DbUserRow): AuthUser {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
      profileImageUrl: row.profile_image_url,
      profileImagePublicId: row.profile_image_public_id,
      createdAt: row.created_at,
      mobileNumber: row.mobile_number || null,
      specializations: row.specializations || [],
    };
  }

  async listUsers(): Promise<AuthUser[]> {
    const result = await pool.query<DbUserRow>(
      "SELECT u.id, u.email, u.first_name, u.middle_name, u.last_name, u.full_name, u.role, u.status, u.profile_image_url, u.profile_image_public_id, u.password_hash, u.created_at, u.is_verified, u.otp_code, u.otp_expires_at, u.verification_token_hash, u.verification_token_expires_at, COALESCE(tr.specializations, '{}') AS specializations FROM users u LEFT JOIN teacher_records tr ON tr.teacher_id = u.id ORDER BY u.created_at DESC",
    );

    return result.rows.map((row) => this.toAuthUser(row));
  }

  async listUsersByRoles(roles: UserRole[]): Promise<AuthUser[]> {
    const result = await pool.query<DbUserRow>(
      `SELECT u.id, u.email, u.first_name, u.middle_name, u.last_name, u.full_name, u.role, u.status, u.profile_image_url, u.profile_image_public_id, u.password_hash, u.created_at, u.is_verified, u.otp_code, u.otp_expires_at, u.verification_token_hash, u.verification_token_expires_at, COALESCE(tr.specializations, '{}') AS specializations
         FROM users u LEFT JOIN teacher_records tr ON tr.teacher_id = u.id
        WHERE u.role = ANY($1::user_role[])
        ORDER BY u.last_name ASC, u.first_name ASC`,
      [roles],
    );

    return result.rows.map((row) => this.toAuthUser(row));
  }

  async createUser(input: {
    email: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    passwordHash: string;
    isVerified?: boolean;
  }): Promise<AuthUser> {
    const isVerified = input.isVerified ?? true;
    const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(' ');
    const result = await pool.query<DbUserRow>(
      "INSERT INTO users (email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at, is_verified, otp_code, otp_expires_at",
      [
        input.email,
        input.firstName,
        input.middleName || null,
        input.lastName,
        fullName,
        input.role,
        input.status,
        input.profileImageUrl || null,
        input.profileImagePublicId || null,
        input.passwordHash,
        isVerified,
      ],
    );

    return this.toAuthUser(result.rows[0]);
  }

  async listTeacherRecords(): Promise<unknown[]> {
    const result = await pool.query<DbUserRow & Record<string, unknown>>(
      `SELECT u.id, u.email, u.first_name, u.middle_name, u.last_name, u.full_name, u.role, u.status,
              u.profile_image_url, u.profile_image_public_id, u.password_hash, u.created_at, u.is_verified,
              u.otp_code, u.otp_expires_at, u.verification_token_hash, u.verification_token_expires_at,
              tr.mobile_number AS "mobileNumber", tr.professional_title AS "professionalTitle",
              tr.employment_status AS "employmentStatus", tr.education, tr.certifications,
              tr.years_experience AS "yearsExperience", tr.specializations, tr.notes,
              tr.updated_at AS "updatedAt"
         FROM users u LEFT JOIN teacher_records tr ON tr.teacher_id = u.id
        WHERE u.role = 'teacher' ORDER BY u.last_name, u.first_name`,
    );
    const availability = await pool.query(`SELECT id, teacher_id AS "teacherId", day_of_week AS "dayOfWeek", start_time AS "startTime", end_time AS "endTime", is_active AS "isActive", created_at AS "createdAt" FROM teacher_availability WHERE is_active = TRUE ORDER BY day_of_week, start_time`);
    return result.rows.map((row) => ({ teacherId: row.id, teacher: this.toAuthUser(row), mobileNumber: row.mobileNumber || null, professionalTitle: row.professionalTitle || null, employmentStatus: row.employmentStatus || null, education: row.education || null, certifications: row.certifications || null, yearsExperience: row.yearsExperience == null ? null : Number(row.yearsExperience), specializations: Array.isArray(row.specializations) ? row.specializations : [], notes: row.notes || null, availability: availability.rows.filter((item) => item.teacherId === row.id), updatedAt: row.updatedAt || row.created_at }));
  }

  async upsertTeacherRecord(teacherId: string, input: { mobileNumber?: string | null; professionalTitle?: string | null; employmentStatus?: string | null; education?: string | null; certifications?: string | null; yearsExperience?: number | null; specializations?: string[]; notes?: string | null }): Promise<void> {
    await pool.query(`INSERT INTO teacher_records (teacher_id, mobile_number, professional_title, employment_status, education, certifications, years_experience, specializations, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (teacher_id) DO UPDATE SET mobile_number=EXCLUDED.mobile_number, professional_title=EXCLUDED.professional_title, employment_status=EXCLUDED.employment_status, education=EXCLUDED.education, certifications=EXCLUDED.certifications, years_experience=EXCLUDED.years_experience, specializations=EXCLUDED.specializations, notes=EXCLUDED.notes, updated_at=NOW()`, [teacherId, input.mobileNumber || null, input.professionalTitle || null, input.employmentStatus || null, input.education || null, input.certifications || null, input.yearsExperience ?? null, input.specializations || [], input.notes || null]);
  }

  async getProfileDetails(userId: string): Promise<AuthUser> {
    const user = await this.findUserWithPasswordById(userId);
    if (!user) throw new Error("User not found.");
    const profile = this.toAuthUser(user);
    if (user.role !== "teacher") return profile;
    const records = await this.listTeacherRecords();
    const record = records.find((item: any) => item.teacherId === userId) as any;
    if (!record) return profile;
    return { ...profile, ...record, teacher: undefined };
  }

  async createPendingUser(input: {
    email: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    role: "teacher" | "student";
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    tokenHash: string;
    tokenExpiresAt: Date;
  }): Promise<AuthUser> {
    const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ");
    const result = await pool.query<DbUserRow>(
      `INSERT INTO users (email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, is_verified, verification_token_hash, verification_token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, '', FALSE, $9, $10)
       RETURNING id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at, is_verified, otp_code, otp_expires_at, verification_token_hash, verification_token_expires_at`,
      [input.email.trim().toLowerCase(), input.firstName, input.middleName || null, input.lastName, fullName, input.role, input.profileImageUrl || null, input.profileImagePublicId || null, input.tokenHash, input.tokenExpiresAt.toISOString()],
    );
    return this.toAuthUser(result.rows[0]);
  }

  async findUserByVerificationToken(tokenHash: string): Promise<DbUserRow | null> {
    const result = await pool.query<DbUserRow>(
      `SELECT id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at, is_verified, otp_code, otp_expires_at, verification_token_hash, verification_token_expires_at
         FROM users WHERE verification_token_hash = $1`, [tokenHash],
    );
    return result.rows[0] || null;
  }

  async completeAccountSetup(userId: string, input: { firstName: string; middleName?: string | null; lastName: string; passwordHash: string }): Promise<AuthUser | null> {
    const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(' ');
    const result = await pool.query<DbUserRow>(
      `UPDATE users SET first_name = $1, middle_name = $2, last_name = $3, full_name = $4,
              password_hash = $5, status = 'active', is_verified = TRUE,
              verification_token_hash = NULL, verification_token_expires_at = NULL, updated_at = NOW()
        WHERE id = $6 AND status = 'pending'
        RETURNING id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at, is_verified, otp_code, otp_expires_at, verification_token_hash, verification_token_expires_at`,
      [input.firstName, input.middleName || null, input.lastName, fullName, input.passwordHash, userId],
    );
    return result.rows[0] ? this.toAuthUser(result.rows[0]) : null;
  }

  async saveVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await pool.query("UPDATE users SET verification_token_hash = $1, verification_token_expires_at = $2 WHERE id = $3", [tokenHash, expiresAt.toISOString(), userId]);
  }

  async updateUser(
    userId: string,
    input: {
      studentId?: string;
      teacherId?: string;
      firstName: string;
      middleName?: string | null;
      lastName: string;
      role: UserRole;
      status: UserStatus;
      email: string;
      profileImageUrl?: string | null;
      profileImagePublicId?: string | null;
      mobileNumber?: string | null;
      passwordHash?: string;
    },
  ): Promise<AuthUser | null> {
    const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(' ');
    const values: Array<string | null> = [
      input.email,
      input.firstName,
      input.middleName || null,
      input.lastName,
      fullName,
      input.role,
      input.status,
      input.profileImageUrl || null,
      input.profileImagePublicId || null,
      input.mobileNumber || null,
    ];
    let passwordSetSql = "";

    if (input.passwordHash) {
      values.push(input.passwordHash);
      passwordSetSql = ",\n              password_hash = $11";
    }

    values.push(userId);
    const userIdParam = values.length;

    const result = await pool.query<DbUserRow>(
      `UPDATE users
          SET email = $1,
              first_name = $2,
              middle_name = $3,
              last_name = $4,
              full_name = $5,
              role = $6,
              status = $7,
              profile_image_url = $8,
              profile_image_public_id = $9,
              mobile_number = $10${passwordSetSql},
              updated_at = NOW()
        WHERE id = $${userIdParam}
      RETURNING id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, mobile_number, password_hash, created_at, is_verified, otp_code, otp_expires_at`,
      values,
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.toAuthUser(result.rows[0]);
  }

  async changeUserStatus(userId: string, changedById: string, input: { status: UserStatus; reason?: string | null; dropDate?: string | null; actionTaken?: string | null; pullOutReason?: string | null; notes?: string | null }): Promise<AuthUser | null> {
    if (input.status === "dropped" && !input.reason?.trim()) throw new Error("A reason is required when marking a student as dropped.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<DbUserRow>("SELECT id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at, is_verified, otp_code, otp_expires_at, verification_token_hash, verification_token_expires_at FROM users WHERE id = $1 FOR UPDATE", [userId]);
      if (!existing.rows[0]) { await client.query("ROLLBACK"); return null; }
      const updated = await client.query<DbUserRow>("UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, first_name, middle_name, last_name, full_name, role, status, profile_image_url, profile_image_public_id, password_hash, created_at, is_verified, otp_code, otp_expires_at, verification_token_hash, verification_token_expires_at", [input.status, userId]);
      await client.query(`INSERT INTO status_change_history (entity_type, entity_id, previous_status, new_status, reason, drop_date, action_taken, pull_out_reason, notes, changed_by_id) VALUES ('user', $1, $2, $3, $4, $5, $6, $7, $8, $9)`, [userId, existing.rows[0].status, input.status, input.reason?.trim() || null, input.dropDate || null, input.actionTaken?.trim() || null, input.pullOutReason?.trim() || null, input.notes?.trim() || null, changedById]);
      await client.query("COMMIT");
      return this.toAuthUser(updated.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async deleteUser(userId: string): Promise<boolean> {
    // Soft delete — preserves referential integrity, required for Render Free Tier safety
    const result = await pool.query(
      "UPDATE users SET deleted_at = NOW(), status = 'archived' WHERE id = $1 AND deleted_at IS NULL",
      [userId],
    );
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
          AND s.status IN ('scheduled', 'pending', 'accepted')
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
              s.enrollment_id AS "enrollmentId",
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
      whereSql = `WHERE s.status = 'scheduled' AND s.student_id = $${params.length}`;
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
              s.enrollment_id AS "enrollmentId",
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
    enrollmentId: string;
  }): Promise<ScheduleItem> {
    this.validateTimeRange(input.startTime, input.endTime);
    await this.assertUserRole(input.teacherId, "teacher");
    if (input.studentId) {
      await this.assertUserRole(input.studentId, "student");
    }

    const enrollment = await pool.query<{ student_id: string; teacher_id: string }>(
      `SELECT student_id, teacher_id FROM enrollment_records WHERE id = $1 AND status = 'active'`,
      [input.enrollmentId],
    );
    if (!enrollment.rows[0]) throw new Error("The selected class assignment is not active.");
    if (enrollment.rows[0].teacher_id !== input.teacherId || enrollment.rows[0].student_id !== input.studentId) {
      throw new Error("The selected teacher and student must match the class assignment.");
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
          enrollment_id,
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
          $5,
          $6::date,
          trim(to_char($6::date, 'FMDay')),
          $7::time,
          $8::time,
          'scheduled',
          NOW()
       )
       RETURNING id`,
      [input.teacherId, input.studentId || null, input.enrollmentId, input.title, input.description, input.date, input.startTime, input.endTime],
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
              a.created_at AS "createdAt",
              a.attachment_file_name AS "attachmentFileName",
              a.attachment_url AS "attachmentUrl",
              a.rubric_file_name AS "rubricFileName",
              a.rubric_url AS "rubricUrl",
              COALESCE(a.is_closed, false) AS "isClosed"
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
    attachmentFileName?: string | null;
    attachmentUrl?: string | null;
    rubricFileName?: string | null;
    rubricUrl?: string | null;
  }): Promise<AssignmentItem> {
    const result = await pool.query(
      `INSERT INTO assignments (title, description, due_at, teacher_id, attachment_file_name, attachment_url, rubric_file_name, rubric_url)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8)
       RETURNING id,
                 title,
                 description,
                 to_char(due_at, 'YYYY-MM-DD') AS "dueDate",
                 teacher_id AS "teacherId",
                 created_at AS "createdAt",
                 attachment_file_name AS "attachmentFileName",
                 attachment_url AS "attachmentUrl",
                 rubric_file_name AS "rubricFileName",
                 rubric_url AS "rubricUrl",
                 COALESCE(is_closed, false) AS "isClosed"`,
      [input.title, input.description, input.dueDate, input.teacherId, input.attachmentFileName || null, input.attachmentUrl || null, input.rubricFileName || null, input.rubricUrl || null],
    );

    const assignment = result.rows[0] as Omit<AssignmentItem, "teacherName">;
    const teacherResult = await pool.query("SELECT full_name FROM users WHERE id = $1", [input.teacherId]);

    return {
      ...assignment,
      teacherName: teacherResult.rows[0]?.full_name || "Teacher",
    };
  }

  async toggleAssignmentClosed(assignmentId: string, isClosed: boolean): Promise<AssignmentItem> {
    const result = await pool.query(
      `UPDATE assignments SET is_closed = $1
       WHERE id = $2
       RETURNING id, title, description,
                 to_char(due_at, 'YYYY-MM-DD') AS "dueDate",
                 teacher_id AS "teacherId",
                 created_at AS "createdAt",
                 attachment_file_name AS "attachmentFileName",
                 attachment_url AS "attachmentUrl",
                 rubric_file_name AS "rubricFileName",
                 rubric_url AS "rubricUrl",
                 COALESCE(is_closed, false) AS "isClosed"`,
      [isClosed, assignmentId],
    );
    const assignment = result.rows[0] as Omit<AssignmentItem, "teacherName">;
    const teacherResult = await pool.query("SELECT full_name FROM users WHERE id = $1", [assignment.teacherId]);
    return { ...assignment, teacherName: teacherResult.rows[0]?.full_name || "Teacher" };
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

  private async attachEnrollmentClassSchedules(rows: EnrollmentRecordItem[]): Promise<EnrollmentRecordItem[]> {
    if (!rows.length) return rows.map((row) => ({ ...row, classSchedule: [] }));
    const schedules = await pool.query(
      `SELECT id, enrollment_id AS "enrollmentId", day_of_week AS "dayOfWeek",
              to_char(start_time, 'HH24:MI') AS "startTime",
              to_char(end_time, 'HH24:MI') AS "endTime"
         FROM enrollment_class_schedules
        WHERE enrollment_id = ANY($1::uuid[])
        ORDER BY day_of_week, start_time`,
      [rows.map((row) => row.id)],
    );
    return rows.map((row) => ({ ...row, classSchedule: schedules.rows.filter((item) => item.enrollmentId === row.id) }));
  }

  private async replaceEnrollmentClassSchedules(enrollmentId: string, schedules: { dayOfWeek: number; startTime: string; endTime: string }[]): Promise<void> {
    await pool.query("DELETE FROM enrollment_class_schedules WHERE enrollment_id = $1", [enrollmentId]);
    if (!schedules.length) return;
    const values = schedules.map((_, index) => `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4})`).join(", ");
    const params: unknown[] = [enrollmentId];
    schedules.forEach((schedule) => params.push(schedule.dayOfWeek, schedule.startTime, schedule.endTime));
    await pool.query(`INSERT INTO enrollment_class_schedules (enrollment_id, day_of_week, start_time, end_time) VALUES ${values}`, params);
  }

  async listEnrollmentRecords(requester: { id: string; role: UserRole }): Promise<EnrollmentRecordItem[]> {
    const baseSql = `SELECT e.id,
                            e.student_id AS "studentId",
                            student.full_name AS "studentName",
                            e.teacher_id AS "teacherId",
                            teacher.full_name AS "teacherName",
                            e.subject,
                            e.tutorial_group AS "tutorialGroup",
                            e.grade_level AS "gradeLevel",
                            e.status,
                            e.note,
                            e.drop_reason AS "dropReason",
                            e.drop_date AS "dropDate",
                            e.action_taken AS "actionTaken",
                            e.pull_out_reason AS "pullOutReason",
                            e.status_notes AS "statusNotes",
                            e.created_by_id AS "createdById",
                            e.created_at AS "createdAt",
                            e.updated_at AS "updatedAt"
                       FROM enrollment_records e
                       JOIN users student ON student.id = e.student_id
                       JOIN users teacher ON teacher.id = e.teacher_id`;

    if (requester.role === "admin") {
      const result = await pool.query(`${baseSql} ORDER BY e.updated_at DESC`);
      return this.attachEnrollmentClassSchedules(result.rows as EnrollmentRecordItem[]);
    }

    if (requester.role === "teacher") {
      const result = await pool.query(`${baseSql} WHERE e.teacher_id = $1 ORDER BY e.updated_at DESC`, [requester.id]);
      return this.attachEnrollmentClassSchedules(result.rows as EnrollmentRecordItem[]);
    }

    const result = await pool.query(`${baseSql} WHERE e.student_id = $1 ORDER BY e.updated_at DESC`, [requester.id]);
    return this.attachEnrollmentClassSchedules(result.rows as EnrollmentRecordItem[]);
  }

  async listStudentRecords(requester: { id: string; role: UserRole }): Promise<StudentRecordItem[]> {
    const studentFilter = requester.role === "admin"
      ? "u.role = 'student'"
      : "u.role = 'student' AND EXISTS (SELECT 1 FROM enrollment_records er_scope WHERE er_scope.student_id = u.id AND er_scope.teacher_id = $1)";
    const studentParams = requester.role === "admin" ? [] : [requester.id];
    const studentsResult = await pool.query(
      `SELECT u.id,
              u.first_name AS "firstName",
              u.middle_name AS "middleName",
              u.last_name AS "lastName",
              u.full_name AS "fullName",
              u.role,
              u.status,
              u.profile_image_url AS "profileImageUrl",
              u.created_at AS "createdAt"
         FROM users u
        WHERE ${studentFilter}
        ORDER BY u.full_name ASC`,
      studentParams,
    );
    const students = studentsResult.rows as StudentRecordItem["student"][];
    if (students.length === 0) return [];

    const studentIds = students.map((student) => student.id);
    const [enrollments, schedulesResult, assignmentsResult, submissionsResult, attemptsResult, meetingsResult] = await Promise.all([
      this.listEnrollmentRecords(requester),
      pool.query(
        `SELECT s.id, s.title, s.description,
                to_char(s.scheduled_date, 'YYYY-MM-DD') AS date,
                trim(to_char(s.scheduled_date, 'FMDay')) AS day,
                to_char(s.start_time, 'HH24:MI') AS "startTime",
                to_char(s.end_time, 'HH24:MI') AS "endTime",
                s.teacher_id AS "teacherId", t.full_name AS "teacherName",
                s.student_id AS "studentId", st.full_name AS "studentName",
                s.status, s.request_note AS "requestNote", s.response_note AS "responseNote",
                s.updated_at AS "updatedAt", s.created_at AS "createdAt"
           FROM schedules s
           JOIN users t ON t.id = s.teacher_id
      LEFT JOIN users st ON st.id = s.student_id
          WHERE s.student_id = ANY($1::uuid[])
          ORDER BY s.scheduled_date DESC, s.start_time DESC`,
        [studentIds],
      ),
      pool.query(
        `SELECT a.id, a.title, a.description,
                to_char(a.due_at, 'YYYY-MM-DD') AS "dueDate",
                a.teacher_id AS "teacherId", t.full_name AS "teacherName",
                a.created_at AS "createdAt",
                a.attachment_file_name AS "attachmentFileName", a.attachment_url AS "attachmentUrl",
                a.rubric_file_name AS "rubricFileName", a.rubric_url AS "rubricUrl",
                COALESCE(a.is_closed, false) AS "isClosed"
           FROM assignments a
           JOIN users t ON t.id = a.teacher_id
          WHERE a.teacher_id IN (SELECT DISTINCT er.teacher_id FROM enrollment_records er WHERE er.student_id = ANY($1::uuid[]))
             OR EXISTS (SELECT 1 FROM submissions sx WHERE sx.assignment_id = a.id AND sx.student_id = ANY($1::uuid[]))
          ORDER BY a.created_at DESC`,
        [studentIds],
      ),
      pool.query(
        `SELECT s.id, s.assignment_id AS "assignmentId", a.title AS "assignmentTitle",
                s.student_id AS "studentId", u.full_name AS "studentName",
                s.file_name AS "fileName", s.content_url AS "fileUrl", s.content_text AS "contentText",
                s.grade_value AS grade, s.feedback, s.submitted_at AS "submittedAt", s.graded_at AS "gradedAt"
           FROM submissions s
           JOIN assignments a ON a.id = s.assignment_id
           JOIN users u ON u.id = s.student_id
          WHERE s.student_id = ANY($1::uuid[])
          ORDER BY s.submitted_at DESC`,
        [studentIds],
      ),
      pool.query(
        `SELECT a.id, a.quiz_id AS "quizId", a.student_id AS "studentId", q.title AS "quizTitle", c.name AS "categoryName",
                a.total_questions AS "totalQuestions", a.correct_answers AS "correctAnswers",
                a.total_score AS "totalScore", a.completed_at AS "completedAt"
           FROM gamified_attempts a
           JOIN gamified_quizzes q ON q.id = a.quiz_id
           JOIN gamified_categories c ON c.id = a.category_id
          WHERE a.student_id = ANY($1::uuid[])
          ORDER BY a.completed_at DESC`,
        [studentIds],
      ),
      pool.query(
        `SELECT * FROM (
           SELECT ch.id, ch.room_token::text AS "roomToken", ch.teacher_id AS "teacherId",
                  t.full_name AS "teacherName", ch.student_id AS "studentId", st.full_name AS "studentName",
                  COALESCE(ch.started_at, ch.created_at) AS "startedAt", ch.ended_at AS "endedAt",
                  ch.duration_seconds AS "durationSeconds", ch.ended_by AS "endedBy"
             FROM call_history ch
             JOIN users t ON t.id = ch.teacher_id
        LEFT JOIN users st ON st.id = ch.student_id
            WHERE ch.student_id = ANY($1::uuid[])
           UNION ALL
           SELECT mr.id, mr.room_token::text AS "roomToken", mr.teacher_id AS "teacherId",
                  mr.teacher_name AS "teacherName", mr.student_id AS "studentId", mr.student_name AS "studentName",
                  mr.created_at AS "startedAt",
                  CASE WHEN mr.status = 'ended' THEN mr.updated_at ELSE NULL END AS "endedAt",
                  NULL::int AS "durationSeconds", mr.status AS "endedBy"
             FROM meeting_rooms mr
            WHERE mr.student_id = ANY($1::uuid[])
         ) history
         ORDER BY "startedAt" DESC`,
        [studentIds],
      ),
    ]);

    const enrollmentRows = enrollments;
    const schedules = schedulesResult.rows as import("../types/models.js").ScheduleItem[];
    const assignments = assignmentsResult.rows as AssignmentItem[];
    const submissions = submissionsResult.rows as SubmissionItem[];
    const attempts = attemptsResult.rows as StudentRecordGamifiedAttempt[];
    const meetings = meetingsResult.rows as import("../types/models.js").CallHistoryItem[];
    const enrollmentIds = enrollmentRows.map((row) => row.id);
    const historyResult = await pool.query<StatusChangeHistoryItem>(
      `SELECT id, entity_type AS "entityType", entity_id AS "entityId", previous_status AS "previousStatus", new_status AS "newStatus", reason, drop_date AS "dropDate", action_taken AS "actionTaken", pull_out_reason AS "pullOutReason", notes, changed_by_id AS "changedById", created_at AS "createdAt"
         FROM status_change_history
        WHERE (entity_type = 'user' AND entity_id = ANY($1::uuid[]))
           OR (entity_type = 'enrollment' AND entity_id = ANY($2::uuid[]))
        ORDER BY created_at DESC`,
      [studentIds, enrollmentIds],
    );
    const history = historyResult.rows;
    const submissionByAssignmentStudent = new Map(submissions.map((submission) => [`${submission.studentId}:${submission.assignmentId}`, submission]));

    return students.map((student) => {
      const studentEnrollments = enrollmentRows.filter((row) => row.studentId === student.id);
      const teacherIds = new Set(studentEnrollments.map((row) => row.teacherId));
      const studentAssignments: StudentRecordAssignment[] = assignments
        .filter((assignment) => teacherIds.has(assignment.teacherId) || submissions.some((submission) => submission.studentId === student.id && submission.assignmentId === assignment.id))
        .map((assignment) => ({ assignment, submission: submissionByAssignmentStudent.get(`${student.id}:${assignment.id}`) || null }));
      return {
        student,
        enrollments: studentEnrollments,
        schedules: schedules.filter((schedule) => schedule.studentId === student.id),
        assignments: studentAssignments,
        gamifiedAttempts: attempts.filter((attempt) => attempt.studentId === student.id),
        meetingHistory: meetings.filter((meeting) => meeting.studentId === student.id),
        statusHistory: history.filter((item) => item.entityId === student.id || studentEnrollments.some((enrollment) => enrollment.id === item.entityId)),
      };
    });
  }

  async createEnrollmentRecord(input: {
    studentId: string;
    teacherId: string;
    subject: string;
    tutorialGroup?: string | null;
    gradeLevel?: string | null;
    status?: EnrollmentStatus;
    note?: string | null;
    classSchedule?: { dayOfWeek: number; startTime: string; endTime: string }[];
    createdById: string;
  }): Promise<EnrollmentRecordItem> {
    const result = await pool.query(
      `INSERT INTO enrollment_records (student_id, teacher_id, subject, tutorial_group, grade_level, status, note, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id,
                 student_id AS "studentId",
                 teacher_id AS "teacherId",
                 subject,
                 tutorial_group AS "tutorialGroup",
                 grade_level AS "gradeLevel",
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
        input.gradeLevel || null,
        input.status || "active",
        input.note || null,
        input.createdById,
      ],
    );

    const row = result.rows[0] as Omit<EnrollmentRecordItem, "studentName" | "teacherName">;
    await this.replaceEnrollmentClassSchedules(result.rows[0].id, input.classSchedule || []);
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
      classSchedule: input.classSchedule || [],
    };
  }

  async updateEnrollmentRecord(
    id: string,
    input: {
      studentId?: string;
      teacherId?: string;
      subject?: string;
      tutorialGroup?: string | null;
      gradeLevel?: string | null;
      status?: EnrollmentStatus;
      note?: string | null;
      dropReason?: string | null;
      dropDate?: string | null;
      actionTaken?: string | null;
      pullOutReason?: string | null;
      statusNotes?: string | null;
      classSchedule?: { dayOfWeek: number; startTime: string; endTime: string }[];
      changedById?: string | null;
    },
  ): Promise<EnrollmentRecordItem | null> {
    const existing = await pool.query(
      `SELECT id, student_id, teacher_id, subject, tutorial_group, grade_level, status, note, drop_reason, drop_date, action_taken, pull_out_reason, status_notes, created_by_id, created_at, updated_at
         FROM enrollment_records
        WHERE id = $1`,
      [id],
    );

    if (!existing.rows[0]) {
      return null;
    }

    const row = existing.rows[0];
    if (input.status === "dropped" && !(input.dropReason ?? row.drop_reason)?.trim()) throw new Error("A reason is required when marking an enrollment as dropped.");
    const result = await pool.query(
      `UPDATE enrollment_records
          SET student_id = $1,
              teacher_id = $2,
              subject = $3,
              tutorial_group = $4,
              grade_level = $5,
              status = $6,
              note = $7,
              drop_reason = $8,
              drop_date = $9,
              action_taken = $10,
              pull_out_reason = $11,
              status_notes = $12,
              updated_at = NOW()
        WHERE id = $13
        RETURNING id,
                  student_id AS "studentId",
                  teacher_id AS "teacherId",
                  subject,
                  tutorial_group AS "tutorialGroup",
                  grade_level AS "gradeLevel",
                  status,
                  note,
                  drop_reason AS "dropReason",
                  drop_date AS "dropDate",
                  action_taken AS "actionTaken",
                  pull_out_reason AS "pullOutReason",
                  status_notes AS "statusNotes",
                  created_by_id AS "createdById",
                  created_at AS "createdAt",
                  updated_at AS "updatedAt"`,
      [
        input.studentId ?? row.student_id,
        input.teacherId ?? row.teacher_id,
        input.subject ?? row.subject,
        input.tutorialGroup === undefined ? row.tutorial_group : input.tutorialGroup,
        input.gradeLevel === undefined ? row.grade_level : input.gradeLevel,
        input.status ?? row.status,
        input.note === undefined ? row.note : input.note,
        input.status === "dropped" ? (input.dropReason ?? row.drop_reason ?? null) : null,
        input.status === "dropped" ? (input.dropDate ?? row.drop_date ?? null) : null,
        input.status === "dropped" ? (input.actionTaken ?? row.action_taken ?? null) : null,
        input.status === "dropped" ? (input.pullOutReason ?? row.pull_out_reason ?? null) : null,
        input.status === "dropped" ? (input.statusNotes ?? row.status_notes ?? null) : null,
        id,
      ],
    );

    if (input.status && input.status !== row.status) {
      await pool.query(`INSERT INTO status_change_history (entity_type, entity_id, previous_status, new_status, reason, drop_date, action_taken, pull_out_reason, notes, changed_by_id) VALUES ('enrollment', $1, $2, $3, $4, $5, $6, $7, $8, $9)`, [id, row.status, input.status, input.dropReason?.trim() || null, input.dropDate || null, input.actionTaken?.trim() || null, input.pullOutReason?.trim() || null, input.statusNotes?.trim() || null, input.changedById || null]);
    }

    if (input.classSchedule !== undefined) await this.replaceEnrollmentClassSchedules(id, input.classSchedule);

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
      classSchedule: input.classSchedule !== undefined ? input.classSchedule : (await this.attachEnrollmentClassSchedules([updated as EnrollmentRecordItem]))[0].classSchedule,
    };
  }

  async deleteEnrollmentRecord(id: string): Promise<boolean> {
    const result = await pool.query("UPDATE enrollment_records SET status = 'archived', updated_at = NOW() WHERE id = $1 AND status <> 'archived'", [id]);
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
              (
                SELECT COUNT(*)::int
                  FROM chat_messages cm
                 WHERE cm.chat_id = c.id
                   AND cm.sender_id != $1
                   AND cm.sent_at > COALESCE(me.last_read_at, '-infinity'::timestamptz)
              ) AS "unreadCount",
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
      unreadCount: chat.unreadCount ?? 0,
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

  async markChatRead(chatId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE chat_participants SET last_read_at = NOW() WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId],
    );
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

    // (No student context needed when creating a quiz)

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

    // capture previous attempt count and XP so we can award badges based on transitions
    const prevAttemptCountResult = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM gamified_attempts WHERE student_id = $1`,
      [studentId],
    );
    const prevAttemptCount = Number(prevAttemptCountResult.rows[0]?.cnt || 0);
    const prevXpItem = await this.getStudentXp(studentId).catch(() => ({ studentId, totalXp: 0, level: 'Learner', updatedAt: new Date().toISOString() }));

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

      // Award XP equal to the quiz total score (rounded)
      const xpGained = Math.max(0, Math.round(totalScore));
      const newXp = await this.addXp(studentId, xpGained).catch(() => null);

      const awardedBadges: import("../types/models.js").BadgeItem[] = [];

      // FIRST_QUIZ
      if (prevAttemptCount === 0) {
        const badge = await this.awardBadge(studentId, 'FIRST_QUIZ').catch(() => null);
        if (badge) awardedBadges.push(badge);
      }

      // PERFECT_SCORE
      if (correctAnswers === totalQuestions) {
        const badge = await this.awardBadge(studentId, 'PERFECT_SCORE').catch(() => null);
        if (badge) awardedBadges.push(badge);
      }

      // SPEED_DEMON: if student left >= 50% of total allowed time
      const sumTimeRemaining = evaluatedAnswers.reduce((s, a) => s + (a.timeRemainingSeconds || 0), 0);
      const maxTotalTime = (quiz.time_per_question_seconds || 0) * totalQuestions;
      if (maxTotalTime > 0 && sumTimeRemaining >= Math.ceil(maxTotalTime * 0.5)) {
        const badge = await this.awardBadge(studentId, 'SPEED_DEMON').catch(() => null);
        if (badge) awardedBadges.push(badge);
      }

      // XP milestones
      const prevTotalXp = prevXpItem?.totalXp || 0;
      const newTotalXp = newXp?.totalXp || prevTotalXp;
      if (prevTotalXp < 1000 && newTotalXp >= 1000) {
        const badge = await this.awardBadge(studentId, 'SCORE_1000').catch(() => null);
        if (badge) awardedBadges.push(badge);
      }
      if (prevTotalXp < 5000 && newTotalXp >= 5000) {
        const badge = await this.awardBadge(studentId, 'SCORE_5000').catch(() => null);
        if (badge) awardedBadges.push(badge);
      }

      // Update quest progress: increment COMPLETE_ONE_QUIZ and PLAY_3, and mark SCORE_80 if applicable
      try {
        // COMPLETE_ONE_QUIZ & PLAY_3
        await pool.query(
          `UPDATE student_quests SET progress = LEAST(target, progress + 1), is_completed = (progress + 1) >= target
             WHERE student_id = $1 AND quest_type IN ('COMPLETE_ONE_QUIZ', 'PLAY_3')`,
          [studentId],
        );

        // SCORE_80: if accuracy >= 80%, mark completed
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        if (accuracy >= 80) {
          const completedRes = await pool.query(
            `UPDATE student_quests SET progress = target, is_completed = TRUE WHERE student_id = $1 AND quest_type = 'SCORE_80' RETURNING id, reward_xp`,
            [studentId],
          );
          if (completedRes.rows[0]) {
            const rewardXp = Number(completedRes.rows[0].reward_xp || 0);
            if (rewardXp > 0) {
              await this.addXp(studentId, rewardXp).catch(() => null);
            }
          }
        }
      } catch (_e) {
        // ignore quests update errors
      }

      return {
        ...attempt,
        attemptId: attempt.id,
        answers: evaluatedAnswers,
        xpGained,
        newXp: newXp || undefined,
        awardedBadges: awardedBadges.length ? awardedBadges : undefined,
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

  // ─── Quests & Store ─────────────────────────────────────────────────────────

  async listStudentQuests(studentId: string): Promise<StudentQuestItem[]> {
    const result = await pool.query(
      `SELECT id, student_id AS "studentId", quest_type AS "questType", title, description, target, progress, reward_xp AS "rewardXp", reward_badge_code AS "rewardBadgeCode", is_completed AS "isCompleted", created_at AS "createdAt", expires_at AS "expiresAt"
         FROM student_quests
        WHERE student_id = $1
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC`,
      [studentId],
    );
    return result.rows as StudentQuestItem[];
  }

  async generateDailyQuests(studentId: string): Promise<StudentQuestItem[]> {
    // Create a few simple quests for the student for the next 24 hours
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const quests = [
        { quest_type: 'COMPLETE_ONE_QUIZ', title: 'Complete 1 quiz today', description: 'Finish any one quiz today', target: 1, reward_xp: 50 },
        { quest_type: 'SCORE_80', title: 'Get 80%+ accuracy', description: 'Score >= 80% on a quiz', target: 1, reward_xp: 100 },
        { quest_type: 'PLAY_3', title: 'Play 3 quizzes', description: 'Complete three quizzes this week', target: 3, reward_xp: 150 },
      ];

      const created: StudentQuestItem[] = [];
      for (const q of quests) {
        const res = await client.query(
          `INSERT INTO student_quests (student_id, quest_type, title, description, target, reward_xp, expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id, student_id AS "studentId", quest_type AS "questType", title, description, target, progress, reward_xp AS "rewardXp", reward_badge_code AS "rewardBadgeCode", is_completed AS "isCompleted", created_at AS "createdAt", expires_at AS "expiresAt"`,
          [studentId, q.quest_type, q.title, q.description, q.target, q.reward_xp, expiresAt],
        );
        created.push(res.rows[0]);
      }
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async claimStudentQuest(studentId: string, questId: string): Promise<StudentQuestItem | null> {
    const questRes = await pool.query(
      `SELECT id, student_id AS "studentId", quest_type AS "questType", title, description, target, progress, reward_xp AS "rewardXp", reward_badge_code AS "rewardBadgeCode", is_completed AS "isCompleted", created_at AS "createdAt", expires_at AS "expiresAt"
         FROM student_quests WHERE id = $1 AND student_id = $2`,
      [questId, studentId],
    );
    const quest = questRes.rows[0] as StudentQuestItem | undefined;
    if (!quest) return null;
    if (quest.isCompleted) return quest;

    // For simplicity mark completed and award XP and badge
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE student_quests SET is_completed = TRUE, progress = target WHERE id = $1', [questId]);
      const xp = Number(quest.rewardXp || 0);
      let newXp = null;
      if (xp > 0) newXp = await this.addXp(studentId, xp);
      if (quest.rewardBadgeCode) {
        await this.awardBadge(studentId, quest.rewardBadgeCode).catch(() => null);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const updated = await pool.query(
      `SELECT id, student_id AS "studentId", quest_type AS "questType", title, description, target, progress, reward_xp AS "rewardXp", reward_badge_code AS "rewardBadgeCode", is_completed AS "isCompleted", created_at AS "createdAt", expires_at AS "expiresAt"
         FROM student_quests WHERE id = $1`,
      [questId],
    );
    return updated.rows[0] as StudentQuestItem;
  }

  async listStoreItems(): Promise<StoreItem[]> {
    const result = await pool.query(
      `SELECT id, code, name, description, xp_cost AS "xpCost", is_consumable AS "isConsumable", created_at AS "createdAt" FROM store_items ORDER BY created_at ASC`,
    );
    return result.rows as StoreItem[];
  }

  async purchaseStoreItem(studentId: string, code: string): Promise<StudentStorePurchaseItem | null> {
    const itemRes = await pool.query<{ id: string; xp_cost: number }>('SELECT id, xp_cost FROM store_items WHERE code = $1', [code]);
    const item = itemRes.rows[0];
    if (!item) throw new Error('Store item not found');

    // verify XP
    const xp = await this.getStudentXp(studentId);
    if (xp.totalXp < item.xp_cost) throw new Error('Insufficient XP');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // deduct XP
      await client.query('UPDATE student_xp SET total_xp = GREATEST(total_xp - $1, 0), updated_at = NOW() WHERE student_id = $2', [item.xp_cost, studentId]);
      const inserted = await client.query(
        `INSERT INTO student_store_purchases (student_id, store_item_id) VALUES ($1, $2) RETURNING id, student_id AS "studentId", store_item_id AS "storeItemId", purchased_at AS "purchasedAt"`,
        [studentId, item.id],
      );
      await client.query('COMMIT');
      return inserted.rows[0] as StudentStorePurchaseItem;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listStudentStorePurchases(studentId: string): Promise<StudentStorePurchaseItem[]> {
    const result = await pool.query(
      `SELECT id, student_id AS "studentId", store_item_id AS "storeItemId", purchased_at AS "purchasedAt"
         FROM student_store_purchases WHERE student_id = $1 ORDER BY purchased_at DESC`,
      [studentId],
    );
    return result.rows as StudentStorePurchaseItem[];
  }

  async useStoreItem(studentId: string, code: string): Promise<StudentStorePurchaseItem | null> {
    // Consume one purchased item with matching code; return the purchase record
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const itemRes = await client.query('SELECT id FROM store_items WHERE code = $1', [code]);
      const item = itemRes.rows[0];
      if (!item) {
        await client.query('ROLLBACK');
        throw new Error('Store item not found');
      }

      const purchaseRes = await client.query(
        `SELECT id FROM student_store_purchases WHERE student_id = $1 AND store_item_id = $2 ORDER BY purchased_at ASC LIMIT 1`,
        [studentId, item.id],
      );
      const purchase = purchaseRes.rows[0];
      if (!purchase) {
        await client.query('ROLLBACK');
        throw new Error('No purchased item available');
      }

      await client.query('DELETE FROM student_store_purchases WHERE id = $1', [purchase.id]);
      const inserted = await client.query(
        `SELECT id, student_id AS "studentId", store_item_id AS "storeItemId", purchased_at AS "purchasedAt" FROM student_store_purchases WHERE id = $1`,
        [purchase.id],
      ).catch(() => ({ rows: [] }));

      await client.query('COMMIT');
      // Return a simple object representing the consumed purchase
      return { id: purchase.id, studentId, storeItemId: item.id, purchasedAt: new Date().toISOString() } as StudentStorePurchaseItem;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ─── Meeting Rooms (WebRTC Video Calls) ─────────────────────────────────────

  async createMeetingRoom(input: {
    roomToken: string;
    scheduleId: string | null;
    teacherId: string;
    studentId: string | null;
    teacherName: string;
    studentName: string | null;
    scheduleTitle: string | null;
    scheduleDescription: string | null;
  }): Promise<import("../types/models.js").MeetingRoom> {
    const result = await pool.query(
      `INSERT INTO meeting_rooms (
          room_token, schedule_id, teacher_id, student_id,
          teacher_name, student_name, schedule_title, schedule_description, status,
          offer, answer, teacher_ice_candidates, student_ice_candidates
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'calling', NULL, NULL, '[]', '[]')
       RETURNING
          id,
          room_token AS "roomToken",
          schedule_id AS "scheduleId",
          teacher_id AS "teacherId",
          student_id AS "studentId",
          teacher_name AS "teacherName",
          student_name AS "studentName",
          schedule_title AS "scheduleTitle",
          schedule_description AS "scheduleDescription",
          status,
          offer,
          answer,
          teacher_ice_candidates AS "teacherIceCandidates",
          student_ice_candidates AS "studentIceCandidates",
          created_at AS "createdAt",
          updated_at AS "updatedAt"`,
      [
        input.roomToken,
        input.scheduleId,
        input.teacherId,
        input.studentId,
        input.teacherName,
        input.studentName,
        input.scheduleTitle,
        input.scheduleDescription,
      ],
    );

    return result.rows[0] as import("../types/models.js").MeetingRoom;
  }

  async getMeetingRoom(roomToken: string): Promise<import("../types/models.js").MeetingRoom | null> {
    const result = await pool.query(
      `SELECT id,
              room_token AS "roomToken",
              schedule_id AS "scheduleId",
              teacher_id AS "teacherId",
              student_id AS "studentId",
              teacher_name AS "teacherName",
              student_name AS "studentName",
              schedule_title AS "scheduleTitle",
              schedule_description AS "scheduleDescription",
              status,
              offer,
              answer,
              teacher_ice_candidates AS "teacherIceCandidates",
              student_ice_candidates AS "studentIceCandidates",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM meeting_rooms
        WHERE room_token = $1`,
      [roomToken],
    );

    return (result.rows[0] as import("../types/models.js").MeetingRoom) || null;
  }

  async getIncomingCallForStudent(studentId: string): Promise<import("../types/models.js").MeetingRoom | null> {
    const result = await pool.query(
      `SELECT id,
              room_token AS "roomToken",
              schedule_id AS "scheduleId",
              teacher_id AS "teacherId",
              student_id AS "studentId",
              teacher_name AS "teacherName",
              student_name AS "studentName",
              schedule_title AS "scheduleTitle",
              schedule_description AS "scheduleDescription",
              status,
              offer,
              answer,
              teacher_ice_candidates AS "teacherIceCandidates",
              student_ice_candidates AS "studentIceCandidates",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM meeting_rooms
        WHERE student_id = $1
          AND status = 'calling'
        ORDER BY created_at DESC
        LIMIT 1`,
      [studentId],
    );

    return (result.rows[0] as import("../types/models.js").MeetingRoom) || null;
  }

  async updateMeetingStatus(
    roomToken: string,
    status: import("../types/models.js").MeetingRoomStatus,
  ): Promise<import("../types/models.js").MeetingRoom | null> {
    const result = await pool.query(
      `UPDATE meeting_rooms
          SET status = $1,
              updated_at = NOW()
        WHERE room_token = $2
       RETURNING
          id,
          room_token AS "roomToken",
          schedule_id AS "scheduleId",
          teacher_id AS "teacherId",
          student_id AS "studentId",
          teacher_name AS "teacherName",
          student_name AS "studentName",
          schedule_title AS "scheduleTitle",
          schedule_description AS "scheduleDescription",
          status,
          offer,
          answer,
          teacher_ice_candidates AS "teacherIceCandidates",
          student_ice_candidates AS "studentIceCandidates",
          created_at AS "createdAt",
          updated_at AS "updatedAt"`,
      [status, roomToken],
    );

    return (result.rows[0] as import("../types/models.js").MeetingRoom) || null;
  }

  async updateMeetingSignal(
    roomToken: string,
    role: "teacher" | "student",
    input: {
      offer?: Record<string, unknown> | null;
      answer?: Record<string, unknown> | null;
      addIceCandidate?: Record<string, unknown>;
    },
  ): Promise<import("../types/models.js").MeetingRoom | null> {
    const setParts: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [roomToken];

    if (input.offer !== undefined) {
      params.push(input.offer);
      setParts.push(`offer = $${params.length}`);
    }

    if (input.answer !== undefined) {
      params.push(input.answer);
      setParts.push(`answer = $${params.length}`);
    }

    if (input.addIceCandidate) {
      const column = role === "teacher" ? "teacher_ice_candidates" : "student_ice_candidates";
      params.push(JSON.stringify(input.addIceCandidate));
      setParts.push(`${column} = ${column} || $${params.length}::jsonb`);
    }

    const result = await pool.query(
      `UPDATE meeting_rooms
          SET ${setParts.join(", ")}
        WHERE room_token = $1
       RETURNING
          id,
          room_token AS "roomToken",
          schedule_id AS "scheduleId",
          teacher_id AS "teacherId",
          student_id AS "studentId",
          teacher_name AS "teacherName",
          student_name AS "studentName",
          schedule_title AS "scheduleTitle",
          schedule_description AS "scheduleDescription",
          status,
          offer,
          answer,
          teacher_ice_candidates AS "teacherIceCandidates",
          student_ice_candidates AS "studentIceCandidates",
          created_at AS "createdAt",
          updated_at AS "updatedAt"`,
      params,
    );

    return (result.rows[0] as import("../types/models.js").MeetingRoom) || null;
  }

  async getLatestMeetingsForSchedules(scheduleIds: string[]): Promise<import("../types/models.js").MeetingRoom[]> {
    if (!scheduleIds || scheduleIds.length === 0) return [];
    const result = await pool.query(
      `SELECT DISTINCT ON (schedule_id)
              id,
              room_token AS "roomToken",
              schedule_id AS "scheduleId",
              teacher_id AS "teacherId",
              student_id AS "studentId",
              teacher_name AS "teacherName",
              student_name AS "studentName",
              schedule_title AS "scheduleTitle",
              schedule_description AS "scheduleDescription",
              status,
              offer,
              answer,
              teacher_ice_candidates AS "teacherIceCandidates",
              student_ice_candidates AS "studentIceCandidates",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM meeting_rooms
        WHERE schedule_id = ANY($1)
     ORDER BY schedule_id, created_at DESC`,
      [scheduleIds],
    );

    return result.rows as import("../types/models.js").MeetingRoom[];
  }

  // ─── Video Summaries ────────────────────────────────────────────────────────

  async createVideoSummary(input: {
    userId: string;
    sourceType: "youtube" | "upload";
    sourceReference: string | null;
    contextNote: string | null;
    generatedTitle: string | null;
    summary: string[];
    takeaways: string[];
  }): Promise<import("../types/models.js").VideoSummaryItem> {
    const result = await pool.query(
      `INSERT INTO video_summaries (user_id, source_type, source_reference, context_note, generated_title, summary, takeaways)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id,
                 user_id AS "userId",
                 source_type AS "sourceType",
                 source_reference AS "sourceReference",
                 context_note AS "contextNote",
                 generated_title AS "generatedTitle",
                 summary,
                 takeaways,
                 created_at AS "createdAt"`,
      [
        input.userId,
        input.sourceType,
        input.sourceReference,
        input.contextNote,
        input.generatedTitle,
        JSON.stringify(input.summary),
        JSON.stringify(input.takeaways),
      ],
    );

    return result.rows[0] as import("../types/models.js").VideoSummaryItem;
  }

  async listVideoSummaries(input: {
    userId: string;
    page: number;
    pageSize: number;
  }): Promise<{ rows: import("../types/models.js").VideoSummaryItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const offset = (input.page - 1) * input.pageSize;

    const [totalResult, rowsResult] = await Promise.all([
      pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM video_summaries WHERE user_id = $1",
        [input.userId],
      ),
      pool.query(
        `SELECT id,
                user_id AS "userId",
                source_type AS "sourceType",
                source_reference AS "sourceReference",
                context_note AS "contextNote",
                generated_title AS "generatedTitle",
                summary,
                takeaways,
                created_at AS "createdAt"
           FROM video_summaries
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3`,
        [input.userId, input.pageSize, offset],
      ),
    ]);

    const total = Number(totalResult.rows[0]?.count || "0");
    return {
      rows: rowsResult.rows as import("../types/models.js").VideoSummaryItem[],
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    };
  }

  async deleteVideoSummary(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM video_summaries WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Audit Logs ─────────────────────────────────────────────────────────────

  createAuditLog(input: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }): void {
    pool
      .query(
        `INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, payload, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.actorId,
          input.actorName,
          input.actorRole,
          input.action,
          input.entityType,
          input.entityId ?? null,
          input.payload ? JSON.stringify(input.payload) : null,
          input.ipAddress ?? null,
        ],
      )
      .catch((err) => console.error("[audit_log] insert failed:", err));
  }

  async listAuditLogs(filters: {
    actorId?: string;
    action?: string;
    entityType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    pageSize: number;
  }): Promise<{ rows: import("../types/models.js").AuditLogItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.actorId) { params.push(filters.actorId); conditions.push(`actor_id = $${params.length}`); }
    if (filters.action) { params.push(filters.action); conditions.push(`action = $${params.length}`); }
    if (filters.entityType) { params.push(filters.entityType); conditions.push(`entity_type = $${params.length}`); }
    if (filters.dateFrom) { params.push(filters.dateFrom); conditions.push(`created_at >= $${params.length}`); }
    if (filters.dateTo) { params.push(`${filters.dateTo}T23:59:59.999Z`); conditions.push(`created_at <= $${params.length}`); }
    if (filters.search?.trim()) { params.push(`%${filters.search.trim()}%`); conditions.push(`(actor_name ILIKE $${params.length} OR action ILIKE $${params.length} OR entity_type ILIKE $${params.length} OR COALESCE(entity_id, '') ILIKE $${params.length} OR COALESCE(ip_address, '') ILIKE $${params.length})`); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (filters.page - 1) * filters.pageSize;

    const [totalRes, rowsRes] = await Promise.all([
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM audit_logs ${where}`, params),
      pool.query(
        `SELECT id, actor_id AS "actorId", actor_name AS "actorName", actor_role AS "actorRole",
                action, entity_type AS "entityType", entity_id AS "entityId",
                payload, ip_address AS "ipAddress", created_at AS "createdAt"
           FROM audit_logs ${where}
           ORDER BY created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, filters.pageSize, offset],
      ),
    ]);

    const total = Number(totalRes.rows[0]?.count || "0");
    return {
      rows: rowsRes.rows as import("../types/models.js").AuditLogItem[],
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    };
  }

  // ─── Notifications ──────────────────────────────────────────────────────────

  async createNotification(input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    actionView?: string | null;
    priority?: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, action_view, priority)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.userId, input.type, input.title, input.message, input.actionView ?? null, input.priority ?? "low"],
    );
  }

  async createNotificationsBulk(
    inputs: { userId: string; type: string; title: string; message: string; actionView?: string | null; priority?: string }[],
  ): Promise<void> {
    if (inputs.length === 0) return;
    const values = inputs
      .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
      .join(", ");
    const params = inputs.flatMap((n) => [
      n.userId, n.type, n.title, n.message, n.actionView ?? null, n.priority ?? "low",
    ]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, action_view, priority) VALUES ${values}`,
      params,
    );
  }

  async listNotificationsForUser(userId: string, limit = 30): Promise<import("../types/models.js").NotificationDbItem[]> {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", type, title, message,
              action_view AS "actionView", priority, is_read AS "isRead", created_at AS "createdAt"
         FROM notifications
        WHERE user_id = $1
          AND id NOT IN (SELECT ref FROM notification_delete_refs WHERE user_id = $1)
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, limit],
    );
    return result.rows as import("../types/models.js").NotificationDbItem[];
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    await pool.query(
      "INSERT INTO notification_read_refs (user_id, ref) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, notificationId],
    );
    return true;
  }

  async addNotificationDeleteRef(notificationId: string, userId: string): Promise<boolean> {
    await pool.query(
      "INSERT INTO notification_delete_refs (user_id, ref) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, notificationId],
    );
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await pool.query(
      "UPDATE users SET notifications_all_read_at = NOW() WHERE id = $1",
      [userId],
    );
  }

  async getNotificationReadState(userId: string): Promise<{ allReadAt: Date | null; readRefs: Set<string> }> {
    const [allReadResult, refsResult] = await Promise.all([
      pool.query<{ notifications_all_read_at: Date | null }>(
        "SELECT notifications_all_read_at FROM users WHERE id = $1",
        [userId],
      ),
      pool.query<{ ref: string }>(
        "SELECT ref FROM notification_read_refs WHERE user_id = $1",
        [userId],
      ),
    ]);
    return {
      allReadAt: allReadResult.rows[0]?.notifications_all_read_at ?? null,
      readRefs: new Set(refsResult.rows.map((r) => r.ref)),
    };
  }

  async getNotificationDeleteRefs(userId: string): Promise<Set<string>> {
    const result = await pool.query<{ ref: string }>(
      "SELECT ref FROM notification_delete_refs WHERE user_id = $1",
      [userId],
    );
    return new Set(result.rows.map((r) => r.ref));
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
      [notificationId, userId],
    );
    return (result.rowCount || 0) > 0;
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [userId],
    );
    return Number(result.rows[0]?.count || "0");
  }

  // ─── Teacher Availability ───────────────────────────────────────────────────

  async createAvailabilityBlock(
    teacherId: string,
    input: { dayOfWeek: number; startTime: string; endTime: string },
  ): Promise<import("../types/models.js").TeacherAvailabilityItem> {
    const result = await pool.query(
      `INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, teacher_id AS "teacherId", day_of_week AS "dayOfWeek",
                 start_time AS "startTime", end_time AS "endTime",
                 is_active AS "isActive", created_at AS "createdAt"`,
      [teacherId, input.dayOfWeek, input.startTime, input.endTime],
    );
    return result.rows[0] as import("../types/models.js").TeacherAvailabilityItem;
  }

  async listAvailabilityByTeacher(teacherId: string): Promise<import("../types/models.js").TeacherAvailabilityItem[]> {
    const result = await pool.query(
      `SELECT id, teacher_id AS "teacherId", day_of_week AS "dayOfWeek",
              start_time AS "startTime", end_time AS "endTime",
              is_active AS "isActive", created_at AS "createdAt"
         FROM teacher_availability
        WHERE teacher_id = $1 AND is_active = TRUE
        ORDER BY day_of_week, start_time`,
      [teacherId],
    );
    return result.rows as import("../types/models.js").TeacherAvailabilityItem[];
  }

  async deleteAvailabilityBlock(id: string, teacherId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM teacher_availability WHERE id = $1 AND teacher_id = $2",
      [id, teacherId],
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Milestones ─────────────────────────────────────────────────────────────

  async initStudentMilestones(studentId: string): Promise<void> {
    const defaults = [
      { type: "FIRST_SUBMISSION", title: "First Submission", description: "Submit your first assignment" },
      { type: "FIRST_QUIZ", title: "Quiz Starter", description: "Complete your first quiz" },
      { type: "QUIZ_SCORE_80", title: "High Achiever", description: "Score 80% or above on a quiz" },
      { type: "ALL_ASSIGNMENTS", title: "Complete Course", description: "Submit all assignments for a subject" },
      { type: "FIRST_SESSION", title: "First Session", description: "Attend your first tutorial session" },
      { type: "FIRST_CHAT", title: "Social Learner", description: "Send your first chat message" },
    ];
    const values = defaults
      .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
      .join(", ");
    const params = defaults.flatMap((d) => [studentId, d.type, d.title, d.description]);
    await pool.query(
      `INSERT INTO student_milestones (student_id, type, title, description)
       VALUES ${values}
       ON CONFLICT (student_id, type) DO NOTHING`,
      params,
    );
  }

  async listMilestones(studentId: string): Promise<import("../types/models.js").MilestoneItem[]> {
    const result = await pool.query(
      `SELECT id, student_id AS "studentId", type, title, description,
              is_unlocked AS "isUnlocked", unlocked_at AS "unlockedAt", created_at AS "createdAt"
         FROM student_milestones
        WHERE student_id = $1
        ORDER BY created_at`,
      [studentId],
    );
    return result.rows as import("../types/models.js").MilestoneItem[];
  }

  async unlockMilestone(studentId: string, type: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE student_milestones
          SET is_unlocked = TRUE, unlocked_at = NOW()
        WHERE student_id = $1 AND type = $2 AND is_unlocked = FALSE`,
      [studentId, type],
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Student Tasks ──────────────────────────────────────────────────────────

  async listStudentTasks(studentId: string): Promise<import("../types/models.js").StudentTaskItem[]> {
    const result = await pool.query(
      `SELECT id, student_id AS "studentId", title, due_date AS "dueDate",
              is_completed AS "isCompleted", source, assignment_id AS "assignmentId",
              created_at AS "createdAt"
         FROM student_tasks
        WHERE student_id = $1
        ORDER BY is_completed, due_date NULLS LAST, created_at DESC`,
      [studentId],
    );
    return result.rows as import("../types/models.js").StudentTaskItem[];
  }

  async createStudentTask(
    studentId: string,
    input: { title: string; dueDate?: string | null; source?: string; assignmentId?: string | null },
  ): Promise<import("../types/models.js").StudentTaskItem> {
    const result = await pool.query(
      `INSERT INTO student_tasks (student_id, title, due_date, source, assignment_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, student_id AS "studentId", title, due_date AS "dueDate",
                 is_completed AS "isCompleted", source, assignment_id AS "assignmentId",
                 created_at AS "createdAt"`,
      [studentId, input.title, input.dueDate ?? null, input.source ?? "manual", input.assignmentId ?? null],
    );
    return result.rows[0] as import("../types/models.js").StudentTaskItem;
  }

  async updateStudentTask(
    id: string,
    studentId: string,
    input: { title?: string; dueDate?: string | null; isCompleted?: boolean },
  ): Promise<import("../types/models.js").StudentTaskItem | null> {
    const setParts: string[] = [];
    const params: unknown[] = [id, studentId];

    if (input.title !== undefined) { params.push(input.title); setParts.push(`title = $${params.length}`); }
    if (input.dueDate !== undefined) { params.push(input.dueDate); setParts.push(`due_date = $${params.length}`); }
    if (input.isCompleted !== undefined) { params.push(input.isCompleted); setParts.push(`is_completed = $${params.length}`); }

    if (setParts.length === 0) return null;

    const result = await pool.query(
      `UPDATE student_tasks SET ${setParts.join(", ")}
        WHERE id = $1 AND student_id = $2
       RETURNING id, student_id AS "studentId", title, due_date AS "dueDate",
                 is_completed AS "isCompleted", source, assignment_id AS "assignmentId",
                 created_at AS "createdAt"`,
      params,
    );
    return (result.rows[0] as import("../types/models.js").StudentTaskItem) || null;
  }

  async deleteStudentTask(id: string, studentId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM student_tasks WHERE id = $1 AND student_id = $2",
      [id, studentId],
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── XP & Badges ────────────────────────────────────────────────────────────

  async getStudentXp(studentId: string): Promise<import("../types/models.js").StudentXpItem> {
    const existing = await pool.query(
      `SELECT student_id AS "studentId", total_xp AS "totalXp", level, updated_at AS "updatedAt"
         FROM student_xp WHERE student_id = $1`,
      [studentId],
    );
    if (existing.rows[0]) return existing.rows[0] as import("../types/models.js").StudentXpItem;
    const created = await pool.query(
      `INSERT INTO student_xp (student_id, total_xp, level) VALUES ($1, 0, 'Learner')
       ON CONFLICT (student_id) DO NOTHING
       RETURNING student_id AS "studentId", total_xp AS "totalXp", level, updated_at AS "updatedAt"`,
      [studentId],
    );
    return (created.rows[0] as import("../types/models.js").StudentXpItem) ?? { studentId, totalXp: 0, level: "Learner", updatedAt: new Date().toISOString() };
  }

  async addXp(studentId: string, amount: number): Promise<import("../types/models.js").StudentXpItem> {
    const computeLevel = (xp: number): string => {
      if (xp >= 3000) return "Master";
      if (xp >= 1500) return "Expert";
      if (xp >= 500) return "Scholar";
      return "Learner";
    };

    const result = await pool.query(
      `INSERT INTO student_xp (student_id, total_xp, level) VALUES ($1, $2, $3)
       ON CONFLICT (student_id) DO UPDATE
         SET total_xp = student_xp.total_xp + $2,
             level = $3,
             updated_at = NOW()
       RETURNING student_id AS "studentId", total_xp AS "totalXp", level, updated_at AS "updatedAt"`,
      [studentId, amount, "Learner"],
    );
    const row = result.rows[0] as { studentId: string; totalXp: number; level: string; updatedAt: string };
    const newLevel = computeLevel(row.totalXp);
    if (newLevel !== row.level) {
      await pool.query("UPDATE student_xp SET level = $1, updated_at = NOW() WHERE student_id = $2", [newLevel, studentId]);
      row.level = newLevel;
    }
    return row as import("../types/models.js").StudentXpItem;
  }

  async listAllBadges(): Promise<import("../types/models.js").BadgeItem[]> {
    const result = await pool.query(
      `SELECT id, code, name, description, icon, created_at AS "createdAt" FROM badges ORDER BY name`,
    );
    return result.rows as import("../types/models.js").BadgeItem[];
  }

  async getStudentBadges(studentId: string): Promise<import("../types/models.js").BadgeItem[]> {
    const result = await pool.query(
      `SELECT b.id, b.code, b.name, b.description, b.icon, sb.earned_at AS "earnedAt"
         FROM student_badges sb
         JOIN badges b ON b.id = sb.badge_id
        WHERE sb.student_id = $1
        ORDER BY sb.earned_at DESC`,
      [studentId],
    );
    return result.rows as import("../types/models.js").BadgeItem[];
  }

  async awardBadge(studentId: string, badgeCode: string): Promise<import("../types/models.js").BadgeItem | null> {
    const badge = await pool.query<{ id: string }>("SELECT id FROM badges WHERE code = $1", [badgeCode]);
    if (!badge.rows[0]) return null;
    const badgeId = badge.rows[0].id;

    const insert = await pool.query(
      `INSERT INTO student_badges (student_id, badge_id)
       VALUES ($1, $2)
       ON CONFLICT (student_id, badge_id) DO NOTHING
       RETURNING id`,
      [studentId, badgeId],
    );
    if (!insert.rows[0]) return null;

    const result = await pool.query(
      `SELECT b.id, b.code, b.name, b.description, b.icon, sb.earned_at AS "earnedAt"
         FROM student_badges sb JOIN badges b ON b.id = sb.badge_id
        WHERE sb.student_id = $1 AND sb.badge_id = $2`,
      [studentId, badgeId],
    );
    return (result.rows[0] as import("../types/models.js").BadgeItem) || null;
  }

  // ─── Vocabulary ─────────────────────────────────────────────────────────────

  async saveVocabItem(
    userId: string,
    input: { sourceText: string; translatedText: string; sourceLanguage: string; targetLanguage: string },
  ): Promise<import("../types/models.js").VocabItem> {
    const result = await pool.query(
      `INSERT INTO user_vocabulary (user_id, source_text, translated_text, source_language, target_language)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, source_text, target_language) DO UPDATE
         SET translated_text = EXCLUDED.translated_text, created_at = NOW()
       RETURNING id, user_id AS "userId", source_text AS "sourceText",
                 translated_text AS "translatedText", source_language AS "sourceLanguage",
                 target_language AS "targetLanguage", created_at AS "createdAt"`,
      [userId, input.sourceText, input.translatedText, input.sourceLanguage, input.targetLanguage],
    );
    return result.rows[0] as import("../types/models.js").VocabItem;
  }

  async listVocabItems(userId: string): Promise<import("../types/models.js").VocabItem[]> {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", source_text AS "sourceText",
              translated_text AS "translatedText", source_language AS "sourceLanguage",
              target_language AS "targetLanguage", created_at AS "createdAt"
         FROM user_vocabulary
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows as import("../types/models.js").VocabItem[];
  }

  async deleteVocabItem(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      "DELETE FROM user_vocabulary WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Announcements Edit / Soft Delete ──────────────────────────────────────

  async updateAnnouncement(
    id: string,
    actorId: string,
    actorRole: UserRole,
    input: { title: string; content: string },
  ): Promise<import("../types/models.js").AnnouncementItem | null> {
    const where = actorRole === "admin" ? "WHERE id = $1" : "WHERE id = $1 AND posted_by_id = $2";
    const params = actorRole === "admin" ? [id] : [id, actorId];

    const existing = await pool.query(`SELECT id FROM announcements ${where}`, params);
    if (!existing.rows[0]) return null;

    const result = await pool.query(
      `UPDATE announcements
          SET title = $${params.length + 1}, content = $${params.length + 2}, edited_at = NOW()
        WHERE id = $1
       RETURNING id, title, content,
                 posted_by_id AS "postedById",
                 posted_by_name AS "postedByName",
                 created_at AS "createdAt"`,
      [...params, input.title, input.content],
    );
    return (result.rows[0] as import("../types/models.js").AnnouncementItem) || null;
  }

  async softDeleteAnnouncement(id: string, actorId: string, actorRole: UserRole): Promise<boolean> {
    const where = actorRole === "admin" ? "WHERE id = $1" : "WHERE id = $1 AND posted_by_id = $2";
    const params = actorRole === "admin" ? [id] : [id, actorId];
    const result = await pool.query(
      `UPDATE announcements SET is_deleted = TRUE, edited_at = NOW() ${where}`,
      params,
    );
    return (result.rowCount || 0) > 0;
  }

  // ─── Admin Operations ───────────────────────────────────────────────────────

  async listAllMeetingRoomsAdmin(): Promise<import("../types/models.js").CallHistoryItem[]> {
    const result = await pool.query(
      `SELECT id, room_token AS "roomToken",
              teacher_id AS "teacherId", teacher_name AS "teacherName",
              student_id AS "studentId", student_name AS "studentName",
              created_at AS "startedAt", updated_at AS "endedAt",
              NULL::int AS "durationSeconds", NULL AS "endedBy"
         FROM meeting_rooms
         ORDER BY created_at DESC
         LIMIT 200`,
    );
    return result.rows as import("../types/models.js").CallHistoryItem[];
  }

  async getAdminAnalytics(): Promise<import("../types/models.js").AdminAnalyticsItem> {
    const [
      studentsRes,
      teachersRes,
      sessionsRes,
      submissionsRes,
      announcementsRes,
      enrollmentsRes,
      gradesRes,
      monthlyRes,
      topStudentsRes,
    ] = await Promise.all([
      pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users WHERE role = 'student'"),
      pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM users WHERE role = 'teacher'"),
      pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM schedules WHERE status = 'scheduled'"),
      pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM submissions"),
      pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM announcements"),
      pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM enrollment_records"),
      pool.query<{ grade: string; count: string }>(
        `SELECT grade_value AS grade, COUNT(*)::text AS count FROM submissions WHERE grade_value IS NOT NULL GROUP BY grade_value ORDER BY grade_value`,
      ),
      pool.query<{ month: string; count: string }>(
        `SELECT TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') AS month,
                COUNT(*)::text AS count
           FROM schedules
          WHERE status = 'accepted'
            AND created_at >= NOW() - INTERVAL '6 months'
          GROUP BY 1 ORDER BY MIN(created_at)`,
      ),
      pool.query<{ studentId: string; studentName: string; avgGrade: string; submissionCount: string }>(
        `SELECT s.student_id AS "studentId", u.full_name AS "studentName",
                ROUND(AVG(CASE WHEN s.grade_value ~ '^[0-9]+(\.[0-9]+)?$' THEN s.grade_value::numeric ELSE NULL END), 1)::text AS "avgGrade",
                COUNT(*)::text AS "submissionCount"
           FROM submissions s JOIN users u ON u.id = s.student_id
          WHERE s.grade_value IS NOT NULL
          GROUP BY s.student_id, u.full_name
          ORDER BY "avgGrade" DESC NULLS LAST
          LIMIT 5`,
      ),
    ]);

    return {
      totalStudents: Number(studentsRes.rows[0]?.count || 0),
      totalTeachers: Number(teachersRes.rows[0]?.count || 0),
      totalSessions: Number(sessionsRes.rows[0]?.count || 0),
      totalSubmissions: Number(submissionsRes.rows[0]?.count || 0),
      totalAnnouncements: Number(announcementsRes.rows[0]?.count || 0),
      totalEnrollments: Number(enrollmentsRes.rows[0]?.count || 0),
      gradeDistribution: gradesRes.rows.map((r) => ({ grade: r.grade, count: Number(r.count) })),
      monthlySessionCounts: monthlyRes.rows.map((r) => ({ month: r.month, count: Number(r.count) })),
      topStudents: topStudentsRes.rows.map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName,
        avgGrade: Number(r.avgGrade) || 0,
        submissionCount: Number(r.submissionCount),
      })),
    };
  }

  async replaceTeacherAvailability(teacherId: string, blocks: { dayOfWeek: number; startTime: string; endTime: string }[]): Promise<void> {
    await pool.query("DELETE FROM teacher_availability WHERE teacher_id = $1", [teacherId]);
    for (const block of blocks) await this.createAvailabilityBlock(teacherId, block);
  }

  async getFilteredAdminAnalytics(filters: { dateFrom?: string; dateTo?: string; academicYear?: string; classFilter?: string; status?: string }): Promise<import("../types/models.js").AdminAnalyticsItem> {
    const base = await this.getAdminAnalytics();
    if (!Object.values(filters).some(Boolean)) return base;
    const params = [filters.dateFrom || null, filters.dateTo || null, filters.academicYear || null, filters.classFilter || null, filters.status || null];
    const userDate = `($1::date IS NULL OR u.created_at >= $1::date) AND ($2::date IS NULL OR u.created_at < ($2::date + INTERVAL '1 day')) AND ($3::int IS NULL OR EXTRACT(YEAR FROM u.created_at) = $3::int)`;
    const enrollmentFilter = `($1::date IS NULL OR er.created_at >= $1::date) AND ($2::date IS NULL OR er.created_at < ($2::date + INTERVAL '1 day')) AND ($3::int IS NULL OR EXTRACT(YEAR FROM er.created_at) = $3::int) AND ($4::text IS NULL OR er.grade_level = $4::text) AND ($5::text IS NULL OR er.status::text = $5::text)`;
    const scheduleFilter = `($1::date IS NULL OR s.scheduled_date >= $1::date) AND ($2::date IS NULL OR s.scheduled_date <= $2::date) AND ($3::int IS NULL OR EXTRACT(YEAR FROM s.scheduled_date) = $3::int) AND ($5::text IS NULL OR s.status = $5::text)`;
    const submissionFilter = `($1::date IS NULL OR sub.submitted_at >= $1::date) AND ($2::date IS NULL OR sub.submitted_at < ($2::date + INTERVAL '1 day')) AND ($3::int IS NULL OR EXTRACT(YEAR FROM sub.submitted_at) = $3::int) AND ($4::text IS NULL OR er.grade_level = $4::text) AND ($5::text IS NULL OR er.status::text = $5::text)`;
    const [students, teachers, sessions, submissions, enrollments, grades, trends] = await Promise.all([
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users u WHERE u.role = 'student' AND ${userDate} AND ($4::text IS NULL OR EXISTS (SELECT 1 FROM enrollment_records er WHERE er.student_id = u.id AND er.grade_level = $4::text AND ($5::text IS NULL OR er.status::text = $5::text)))`, params),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users u WHERE u.role = 'teacher' AND ${userDate}`, params),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM schedules s WHERE ${scheduleFilter}`, params),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM submissions sub LEFT JOIN enrollment_records er ON er.student_id = sub.student_id WHERE ${submissionFilter}`, params),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM enrollment_records er WHERE ${enrollmentFilter}`, params),
      pool.query<{ grade: string; count: string }>(`SELECT sub.grade_value AS grade, COUNT(*)::text AS count FROM submissions sub LEFT JOIN enrollment_records er ON er.student_id = sub.student_id WHERE sub.grade_value IS NOT NULL AND ${submissionFilter} GROUP BY sub.grade_value ORDER BY sub.grade_value`, params),
      pool.query<{ month: string; count: string }>(`SELECT TO_CHAR(date_trunc('month', er.created_at), 'Mon YYYY') AS month, COUNT(*)::text AS count FROM enrollment_records er WHERE ${enrollmentFilter} GROUP BY 1 ORDER BY MIN(er.created_at)`, params),
    ]);
    return { ...base, totalStudents: Number(students.rows[0]?.count || 0), totalTeachers: Number(teachers.rows[0]?.count || 0), totalSessions: Number(sessions.rows[0]?.count || 0), totalSubmissions: Number(submissions.rows[0]?.count || 0), totalEnrollments: Number(enrollments.rows[0]?.count || 0), gradeDistribution: grades.rows.map(r => ({ grade: r.grade, count: Number(r.count) })), monthlySessionCounts: trends.rows.map(r => ({ month: r.month, count: Number(r.count) })) };
  }

  async getAdminDashboardInterpretation(fingerprint: string): Promise<{ interpretation: string; createdAt: string } | null> {
    const result = await pool.query<{ interpretation: string; createdAt: string }>(
      `SELECT interpretation, created_at AS "createdAt"
         FROM admin_dashboard_interpretations
        WHERE fingerprint = $1`,
      [fingerprint],
    );
    return result.rows[0] || null;
  }

  async getAdminPerformanceGraphs(): Promise<Record<string, unknown[]>> {
    const [submissionStatus, assignmentStats, sessionStatus] = await Promise.all([
      pool.query<{ name: string; value: string }>(`SELECT CASE WHEN grade_value IS NULL OR grade_value = '' THEN 'Pending' ELSE 'Graded' END AS name, COUNT(*)::text AS value FROM submissions GROUP BY 1 ORDER BY 1`),
      pool.query<{ name: string; submitted: string; graded: string; pending: string }>(`SELECT a.title AS name, COUNT(s.id)::text AS submitted, COUNT(s.id) FILTER (WHERE s.grade_value IS NOT NULL AND s.grade_value <> '')::text AS graded, COUNT(s.id) FILTER (WHERE s.grade_value IS NULL OR s.grade_value = '')::text AS pending FROM assignments a LEFT JOIN submissions s ON s.assignment_id = a.id GROUP BY a.id, a.title ORDER BY a.created_at DESC LIMIT 20`),
      pool.query<{ name: string; value: string }>(`SELECT status AS name, COUNT(*)::text AS value FROM schedules GROUP BY status ORDER BY status`),
    ]);
    return {
      performanceGradeDistribution: [],
      performanceSubmissionStatus: submissionStatus.rows.map(r => ({ name: r.name, value: Number(r.value) })),
      performanceAssignmentStats: assignmentStats.rows.map(r => ({ name: r.name, submitted: Number(r.submitted), graded: Number(r.graded), pending: Number(r.pending) })),
      performanceSessionOverview: sessionStatus.rows.map(r => ({ name: r.name, value: Number(r.value) })),
    };
  }

  async getLatestAdminDashboardInterpretation(graphKey: string): Promise<{ interpretation: string; createdAt: string; snapshot: unknown } | null> {
    const result = await pool.query<{ interpretation: string; createdAt: string; snapshot: unknown }>(
      `SELECT interpretation, created_at AS "createdAt", snapshot
         FROM admin_dashboard_interpretations
        WHERE snapshot->>'graphKey' = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [graphKey],
    );
    return result.rows[0] || null;
  }

  async saveAdminDashboardInterpretation(input: { fingerprint: string; filters: unknown; snapshot: unknown; interpretation: string }): Promise<{ interpretation: string; createdAt: string }> {
    const result = await pool.query<{ interpretation: string; createdAt: string }>(
      `INSERT INTO admin_dashboard_interpretations (fingerprint, filters, snapshot, interpretation)
       VALUES ($1, $2::jsonb, $3::jsonb, $4)
       ON CONFLICT (fingerprint) DO UPDATE
         SET interpretation = EXCLUDED.interpretation, updated_at = NOW()
       RETURNING interpretation, created_at AS "createdAt"`,
      [input.fingerprint, JSON.stringify(input.filters), JSON.stringify(input.snapshot), input.interpretation],
    );
    return result.rows[0];
  }

  async importUsersFromCsv(
    rows: { firstName: string; lastName: string; email: string; role: string; password: string }[],
    createdById: string,
  ): Promise<{ success: number; failed: number; errors: { row: number; reason: string }[] }> {
    let success = 0;
    const errors: { row: number; reason: string }[] = [];
    const bcrypt = await import("bcryptjs");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.email || !row.firstName || !row.lastName || !row.password || !row.role) {
          errors.push({ row: i + 1, reason: "Missing required fields" });
          continue;
        }
        if (!["admin", "teacher", "student"].includes(row.role)) {
          errors.push({ row: i + 1, reason: `Invalid role: ${row.role}` });
          continue;
        }
        const hash = await bcrypt.hash(row.password, 10);
        await pool.query(
          `INSERT INTO users (email, first_name, last_name, full_name, role, status, password_hash, is_verified)
           VALUES ($1, $2, $3, $4, $5, 'active', $6, TRUE)`,
          [row.email.trim().toLowerCase(), row.firstName.trim(), row.lastName.trim(),
           `${row.firstName.trim()} ${row.lastName.trim()}`, row.role, hash],
        );
        success++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ row: i + 1, reason: msg.includes("unique") ? "Email already exists" : msg });
      }
    }
    return { success, failed: errors.length, errors };
  }
}

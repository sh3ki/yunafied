import {
  AdminAnalyticsItem,
  AnnouncementItem,
  AssignmentItem,
  AuditLogItem,
  AuthUser,
  BadgeItem,
  CallHistoryItem,
  ChatMessageItem,
  ChatSummaryItem,
  EnrollmentRecordItem,
  EnrollmentStatus,
  GamifiedAttemptResultItem,
  GamifiedCategoryItem,
  GamifiedLeaderboardItem,
  GamifiedQuizDetailItem,
  GamifiedQuizItem,
  LearningMaterialItem,
  MeetingRoom,
  MeetingRoomStatus,
  MessageItem,
  MessageUserItem,
  MilestoneItem,
  NotificationDbItem,
  NotificationItem,
  ScheduleItem,
  StudentTaskItem,
  StudentXpItem,
  SubmissionItem,
  TeacherAvailabilityItem,
  TeacherRecordItem,
  TranslationHistoryItem,
  UserRole,
  UserStatus,
  VocabItem,
  VideoSummaryItem,
  VideoSummaryResponse,
  StudentQuestItem,
  StoreItem,
  StudentStorePurchaseItem,
  StudentRecordItem,
} from "@/app/types/models";

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
}

interface CreateUserPayload {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  password: string;
}

export interface AccountEnrollmentPayload {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: "teacher" | "student";
  studentId?: string;
  teacherId?: string;
  subject?: string;
  tutorialGroup?: string;
  gradeLevel?: string;
  note?: string;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  mobileNumber?: string;
  professionalTitle?: string;
  employmentStatus?: string;
  education?: string;
  certifications?: string;
  yearsExperience?: number;
  specializations?: string[];
  notes?: string;
  availability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  classSchedule?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

interface UpdateUserPayload {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  password?: string;
}

interface ProfileUploadResponse {
  secureUrl: string;
  publicId: string;
}

interface UpdateProfilePayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  currentPassword?: string;
  newPassword?: string;
  mobileNumber?: string | null;
  professionalTitle?: string | null;
  employmentStatus?: string | null;
  education?: string | null;
  certifications?: string | null;
  yearsExperience?: number | null;
  specializations?: string[];
  notes?: string | null;
  availability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

interface YunaAiMessage {
  role: "user" | "assistant";
  content: string;
}

interface YunaAiResponse {
  answer: string;
}

interface TranslateResponse {
  translatedText: string;
  historyItem: TranslationHistoryItem;
}

interface TranslationHistoryResponse {
  rows: TranslationHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BootstrapResponse {
  users: AuthUser[];
  schedules: ScheduleItem[];
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  announcements: AnnouncementItem[];
}

class YunafiedApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const json = await response.json();
        if (json.message) {
          message = json.message;
        }
      } catch (_error) {
        // Ignore JSON parse errors.
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (json.needsVerification) {
        const err = new Error(json.message || "Email verification required") as Error & { needsVerification: true; email: string };
        err.needsVerification = true;
        err.email = json.email || email;
        throw err;
      }
      throw new Error(json.message || `Request failed (${response.status})`);
    }
    return json as LoginResponse;
  }

  async register(payload: RegisterPayload): Promise<{ needsVerification: boolean; email: string }> {
    return this.request<{ needsVerification: boolean; email: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async verifyOtp(email: string, otp: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async enrollAccount(payload: AccountEnrollmentPayload): Promise<{ user: AuthUser; message: string }> {
    return this.request<{ user: AuthUser; message: string }>("/api/enrollments/account", { method: "POST", body: JSON.stringify(payload) });
  }

  async resendVerification(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ userId }) });
  }

  async verifyAccount(token: string): Promise<{ email: string; firstName: string; middleName: string | null; lastName: string; role: "teacher" | "student"; token: string }> {
    return this.request(`/api/auth/verify-account?token=${encodeURIComponent(token)}`);
  }

  async completeAccountSetup(payload: { token: string; firstName: string; middleName?: string; lastName: string; password: string }): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/complete-account-setup", { method: "POST", body: JSON.stringify(payload) });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword }),
    });
  }

  async me(): Promise<AuthUser> {
    const data = await this.request<{ user: AuthUser }>("/api/auth/me");
    return data.user;
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const data = await this.request<{ user: AuthUser }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return data.user;
  }

  async bootstrap(): Promise<BootstrapResponse> {
    return this.request<BootstrapResponse>("/api/bootstrap");
  }

  async listUsers(): Promise<AuthUser[]> {
    return this.request<AuthUser[]>("/api/users");
  }

  async getProfileDetails(): Promise<AuthUser> {
    const data = await this.request<{ user: AuthUser }>("/api/profile/details");
    return data.user;
  }

  async listTeacherRecords(): Promise<TeacherRecordItem[]> {
    return this.request<TeacherRecordItem[]>("/api/admin/teacher-records");
  }

  async updateTeacherRecord(id: string, payload: Partial<Omit<TeacherRecordItem, "teacherId" | "teacher" | "availability" | "updatedAt">>): Promise<void> {
    await this.request<void>(`/api/admin/teacher-records/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  }

  async replaceTeacherAvailability(id: string, availability: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): Promise<void> {
    await this.request<void>(`/api/admin/teacher-records/${id}/availability`, { method: "PUT", body: JSON.stringify({ availability }) });
  }

  async listStudentRecords(): Promise<StudentRecordItem[]> {
    return this.request<StudentRecordItem[]>("/api/student-records");
  }

  async createUser(payload: CreateUserPayload): Promise<AuthUser> {
    return this.request<AuthUser>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<AuthUser> {
    return this.request<AuthUser>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request<void>(`/api/users/${id}`, { method: "DELETE" });
  }

  async uploadProfileImage(file: File): Promise<ProfileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return this.request<ProfileUploadResponse>("/api/uploads/profile-image", {
      method: "POST",
      body: formData,
    });
  }

  async listSchedules(): Promise<ScheduleItem[]> {
    return this.request<ScheduleItem[]>("/api/schedules");
  }

  async createSchedule(payload: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId?: string;
    studentId?: string | null;
    enrollmentId?: string;
    requestNote?: string;
  }): Promise<ScheduleItem> {
    return this.request<ScheduleItem>("/api/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async respondToSchedule(
    id: string,
    payload: {
      decision: "accepted" | "declined";
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      responseNote?: string;
    },
  ): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(`/api/schedules/${id}/respond`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async moveSchedule(
    id: string,
    payload: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(`/api/schedules/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async cancelSchedule(id: string, responseNote: string): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(`/api/schedules/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ responseNote }),
    });
  }

  async adminEditSchedule(
    id: string,
    payload: {
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      teacherId?: string;
      studentId?: string | null;
      status?: "pending" | "accepted" | "declined" | "cancelled";
      requestNote?: string | null;
      responseNote?: string | null;
    },
  ): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(`/api/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.request<void>(`/api/schedules/${id}`, { method: "DELETE" });
  }

  async listGamifiedCategories(): Promise<GamifiedCategoryItem[]> {
    return this.request<GamifiedCategoryItem[]>("/api/gamified/categories");
  }

  async createGamifiedCategory(payload: { name: string; description?: string | null }): Promise<GamifiedCategoryItem> {
    return this.request<GamifiedCategoryItem>("/api/gamified/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateGamifiedCategory(
    id: string,
    payload: { name?: string; description?: string | null },
  ): Promise<GamifiedCategoryItem> {
    return this.request<GamifiedCategoryItem>(`/api/gamified/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async listGamifiedQuizzes(input?: { categoryId?: string }): Promise<GamifiedQuizItem[]> {
    const params = new URLSearchParams();
    if (input?.categoryId) {
      params.set("categoryId", input.categoryId);
    }
    const query = params.toString();
    return this.request<GamifiedQuizItem[]>(`/api/gamified/quizzes${query ? `?${query}` : ""}`);
  }

  async getGamifiedQuiz(id: string): Promise<GamifiedQuizDetailItem> {
    return this.request<GamifiedQuizDetailItem>(`/api/gamified/quizzes/${id}`);
  }

  async createGamifiedQuiz(payload: {
    categoryId: string;
    title: string;
    description?: string;
    timePerQuestionSeconds: number;
    isPublished?: boolean;
    questions: Array<{
      prompt: string;
      points: number;
      choices: Array<{ text: string; isCorrect: boolean }>;
    }>;
  }): Promise<GamifiedQuizDetailItem> {
    return this.request<GamifiedQuizDetailItem>("/api/gamified/quizzes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateGamifiedQuiz(
    id: string,
    payload: {
      categoryId: string;
      title: string;
      description?: string;
      timePerQuestionSeconds: number;
      isPublished?: boolean;
      questions: Array<{
        prompt: string;
        points: number;
        choices: Array<{ text: string; isCorrect: boolean }>;
      }>;
    },
  ): Promise<GamifiedQuizDetailItem> {
    return this.request<GamifiedQuizDetailItem>(`/api/gamified/quizzes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async submitGamifiedAttempt(
    quizId: string,
    payload: {
      answers: Array<{ questionId: string; selectedChoiceId?: string | null; timeRemainingSeconds?: number }>;
    },
  ): Promise<GamifiedAttemptResultItem> {
    return this.request<GamifiedAttemptResultItem>(`/api/gamified/quizzes/${quizId}/attempts`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listGamifiedLeaderboard(input: { categoryId: string; limit?: number }): Promise<GamifiedLeaderboardItem[]> {
    const params = new URLSearchParams();
    params.set("categoryId", input.categoryId);
    if (input.limit) {
      params.set("limit", String(input.limit));
    }

    return this.request<GamifiedLeaderboardItem[]>(`/api/gamified/leaderboard?${params.toString()}`);
  }

  async listStudentQuests(): Promise<StudentQuestItem[]> {
    return this.request<StudentQuestItem[]>('/api/student/quests');
  }

  async claimStudentQuest(id: string): Promise<StudentQuestItem> {
    return this.request<StudentQuestItem>(`/api/student/quests/${id}/claim`, { method: 'POST' });
  }

  async listStoreItems(): Promise<StoreItem[]> {
    return this.request<StoreItem[]>('/api/store/items');
  }

  async purchaseStoreItem(code: string): Promise<StudentStorePurchaseItem> {
    return this.request<StudentStorePurchaseItem>('/api/store/purchase', { method: 'POST', body: JSON.stringify({ code }) });
  }

  async listStudentStorePurchases(): Promise<StudentStorePurchaseItem[]> {
    return this.request<StudentStorePurchaseItem[]>('/api/student/store/purchases');
  }

  async useStoreItem(code: string): Promise<StudentStorePurchaseItem> {
    return this.request<StudentStorePurchaseItem>('/api/store/use', { method: 'POST', body: JSON.stringify({ code }) });
  }

  async listAssignments(): Promise<AssignmentItem[]> {
    return this.request<AssignmentItem[]>("/api/assignments");
  }

  async createAssignment(payload: {
    title: string;
    description: string;
    dueDate: string;
    attachmentFile?: File | null;
    rubricFile?: File | null;
    assignedStudentIds?: string[];
  }): Promise<AssignmentItem> {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description);
    formData.append("dueDate", payload.dueDate);
    if (payload.attachmentFile) {
      formData.append("attachmentFile", payload.attachmentFile);
    }
    if (payload.rubricFile) {
      formData.append("rubricFile", payload.rubricFile);
    }
    if (payload.assignedStudentIds && payload.assignedStudentIds.length > 0) {
      formData.append("assignedStudentIds", JSON.stringify(payload.assignedStudentIds));
    }
    return this.request<AssignmentItem>("/api/assignments", {
      method: "POST",
      body: formData,
    });
  }

  async toggleAssignmentClosed(assignmentId: string, isClosed: boolean): Promise<AssignmentItem> {
    return this.request<AssignmentItem>(`/api/assignments/${assignmentId}/toggle-close`, {
      method: "PATCH",
      body: JSON.stringify({ isClosed }),
    });
  }

  async listSubmissions(): Promise<SubmissionItem[]> {
    return this.request<SubmissionItem[]>("/api/submissions");
  }

  async submitAssignment(assignmentId: string, input: { file?: File | null; contentText?: string }): Promise<SubmissionItem> {
    const formData = new FormData();
    if (input.file) {
      formData.append("file", input.file);
    }
    if (input.contentText) {
      formData.append("contentText", input.contentText);
    }

    return this.request<SubmissionItem>(`/api/assignments/${assignmentId}/submissions`, {
      method: "POST",
      body: formData,
    });
  }

  async gradeSubmission(submissionId: string, payload: { grade: string; feedback: string }): Promise<SubmissionItem> {
    return this.request<SubmissionItem>(`/api/submissions/${submissionId}/grade`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async listAnnouncements(): Promise<AnnouncementItem[]> {
    return this.request<AnnouncementItem[]>("/api/announcements");
  }

  async createAnnouncement(payload: { title: string; content: string }): Promise<AnnouncementItem> {
    return this.request<AnnouncementItem>("/api/announcements", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async askYunaAi(input: {
    message: string;
    currentView: string;
    role: UserRole;
    history: YunaAiMessage[];
  }): Promise<YunaAiResponse> {
    return this.request<YunaAiResponse>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async askStudyGuide(input: {
    message: string;
    subject?: string;
    history: YunaAiMessage[];
  }): Promise<YunaAiResponse> {
    return this.request<YunaAiResponse>("/api/ai/study-guide", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async translateText(payload: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<TranslateResponse> {
    return this.request<TranslateResponse>("/api/ai/translate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listTranslationHistory(input: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<TranslationHistoryResponse> {
    const params = new URLSearchParams();
    params.set("page", String(input.page || 1));
    params.set("pageSize", String(input.pageSize || 6));
    if (input.search && input.search.trim()) {
      params.set("search", input.search.trim());
    }

    return this.request<TranslationHistoryResponse>(`/api/translations/history?${params.toString()}`);
  }

  async summarizeVideo(
    payload:
      | { videoUrl: string; context?: string }
      | { videoFile: File; context?: string },
  ): Promise<VideoSummaryResponse> {
    if ("videoFile" in payload) {
      const formData = new FormData();
      formData.append("file", payload.videoFile);
      if (payload.context) {
        formData.append("context", payload.context);
      }

      return this.request<VideoSummaryResponse>("/api/ai/video-summary", {
        method: "POST",
        body: formData,
      });
    }

    return this.request<VideoSummaryResponse>("/api/ai/video-summary", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listVideoSummaries(params?: { page?: number; pageSize?: number }): Promise<{ rows: VideoSummaryItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    return this.request(`/api/ai/video-summaries?${qs.toString()}`);
  }

  async deleteVideoSummary(id: string): Promise<void> {
    await this.request(`/api/ai/video-summaries/${id}`, { method: "DELETE" });
  }

  async listNotifications(limit = 20): Promise<NotificationItem[]> {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    return this.request<NotificationItem[]>(`/api/notifications?${params.toString()}`);
  }

  async listMessageUsers(): Promise<MessageUserItem[]> {
    return this.request<MessageUserItem[]>("/api/messages/users");
  }

  async listMessages(withUserId: string): Promise<MessageItem[]> {
    const params = new URLSearchParams();
    params.set("withUserId", withUserId);
    return this.request<MessageItem[]>(`/api/messages?${params.toString()}`);
  }

  async sendMessage(payload: { receiverId: string; body: string }): Promise<MessageItem> {
    return this.request<MessageItem>("/api/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listChatUsers(): Promise<MessageUserItem[]> {
    return this.request<MessageUserItem[]>("/api/chats/users");
  }

  async listChats(): Promise<ChatSummaryItem[]> {
    return this.request<ChatSummaryItem[]>("/api/chats");
  }

  async openDirectChat(otherUserId: string): Promise<ChatSummaryItem> {
    return this.request<ChatSummaryItem>("/api/chats/direct", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    });
  }

  async createGroupChat(payload: { name: string; participantIds: string[] }): Promise<ChatSummaryItem> {
    return this.request<ChatSummaryItem>("/api/chats/group", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listChatMessages(chatId: string): Promise<ChatMessageItem[]> {
    return this.request<ChatMessageItem[]>(`/api/chats/${chatId}/messages`);
  }

  async sendChatMessage(chatId: string, payload: { body: string }): Promise<ChatMessageItem> {
    return this.request<ChatMessageItem>(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async markChatRead(chatId: string): Promise<void> {
    await this.request<void>(`/api/chats/${chatId}/read`, { method: "PATCH" });
  }

  async listEnrollments(): Promise<EnrollmentRecordItem[]> {
    return this.request<EnrollmentRecordItem[]>("/api/enrollments");
  }

  async createEnrollment(payload: {
    studentId: string;
    teacherId: string;
    subject: string;
    tutorialGroup?: string;
    gradeLevel?: string;
    status?: EnrollmentStatus;
    note?: string;
    classSchedule?: { dayOfWeek: number; startTime: string; endTime: string }[];
  }): Promise<EnrollmentRecordItem> {
    return this.request<EnrollmentRecordItem>("/api/enrollments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateEnrollment(
    id: string,
    payload: {
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
    },
  ): Promise<EnrollmentRecordItem> {
    return this.request<EnrollmentRecordItem>(`/api/enrollments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async deleteEnrollment(id: string): Promise<void> {
    await this.request<void>(`/api/enrollments/${id}`, { method: "DELETE" });
  }

  async listLearningMaterials(): Promise<LearningMaterialItem[]> {
    return this.request<LearningMaterialItem[]>("/api/materials");
  }

  async createLearningMaterialLink(payload: {
    title: string;
    subject: string;
    description?: string;
    url: string;
  }): Promise<LearningMaterialItem> {
    return this.request<LearningMaterialItem>("/api/materials/link", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async createLearningMaterialFile(payload: {
    title: string;
    subject: string;
    description?: string;
    file: File;
  }): Promise<LearningMaterialItem> {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("subject", payload.subject);
    if (payload.description) {
      formData.append("description", payload.description);
    }
    formData.append("file", payload.file);

    return this.request<LearningMaterialItem>("/api/materials/file", {
      method: "POST",
      body: formData,
    });
  }

  async deleteLearningMaterial(id: string): Promise<void> {
    await this.request<void>(`/api/materials/${id}`, { method: "DELETE" });
  }

  // ─── Meeting Rooms (Video Call) ─────────────────────────────────────────────

  async createMeeting(payload: {
    scheduleId?: string | null;
    studentId?: string | null;
    studentName?: string | null;
    scheduleTitle?: string | null;
    scheduleDescription?: string | null;
  }): Promise<MeetingRoom> {
    return this.request<MeetingRoom>("/api/meetings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getIncomingCall(): Promise<MeetingRoom | null> {
    return this.request<MeetingRoom | null>("/api/meetings/incoming");
  }

  async getMeeting(roomToken: string): Promise<MeetingRoom> {
    return this.request<MeetingRoom>(`/api/meetings/${roomToken}`);
  }

  async getMeetingsBySchedules(scheduleIds: string[]): Promise<Record<string, MeetingRoom | null>> {
    return this.request<Record<string, MeetingRoom | null>>(`/api/meetings/by-schedules`, {
      method: 'POST',
      body: JSON.stringify({ scheduleIds }),
    });
  }

  async sendMeetingSignal(
    roomToken: string,
    payload: {
      offer?: Record<string, unknown> | null;
      answer?: Record<string, unknown> | null;
      addIceCandidate?: Record<string, unknown>;
    },
  ): Promise<MeetingRoom> {
    return this.request<MeetingRoom>(`/api/meetings/${roomToken}/signal`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateMeetingStatus(roomToken: string, status: MeetingRoomStatus): Promise<MeetingRoom> {
    return this.request<MeetingRoom>(`/api/meetings/${roomToken}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // ─── Notifications ──────────────────────────────────────────────────────────

  async markNotificationRead(id: string): Promise<void> {
    await this.request<void>(`/api/notifications/${id}/read`, { method: "PATCH" });
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request<void>("/api/notifications/read-all", { method: "PATCH" });
  }

  async deleteNotification(id: string): Promise<void> {
    await this.request<void>(`/api/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async listNotificationsDb(limit = 30): Promise<NotificationDbItem[]> {
    return this.request<NotificationDbItem[]>(`/api/notifications?limit=${limit}`);
  }

  // ─── Teacher Availability ────────────────────────────────────────────────────

  async listTeacherAvailability(teacherId?: string): Promise<TeacherAvailabilityItem[]> {
    const qs = teacherId ? `?teacherId=${teacherId}` : "";
    return this.request<TeacherAvailabilityItem[]>(`/api/teacher/availability${qs}`);
  }

  async createTeacherAvailability(payload: { dayOfWeek: number; startTime: string; endTime: string; teacherId?: string }): Promise<TeacherAvailabilityItem> {
    return this.request<TeacherAvailabilityItem>("/api/teacher/availability", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async deleteTeacherAvailability(id: string): Promise<void> {
    await this.request<void>(`/api/teacher/availability/${id}`, { method: "DELETE" });
  }

  // ─── Milestones ──────────────────────────────────────────────────────────────

  async listMilestones(studentId?: string): Promise<MilestoneItem[]> {
    const qs = studentId ? `?studentId=${studentId}` : "";
    return this.request<MilestoneItem[]>(`/api/milestones${qs}`);
  }

  // ─── Student Tasks ───────────────────────────────────────────────────────────

  async listStudentTasks(): Promise<StudentTaskItem[]> {
    return this.request<StudentTaskItem[]>("/api/student/tasks");
  }

  async createStudentTask(payload: { title: string; dueDate?: string | null; source?: string; assignmentId?: string | null }): Promise<StudentTaskItem> {
    return this.request<StudentTaskItem>("/api/student/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateStudentTask(id: string, payload: { title?: string; dueDate?: string | null; isCompleted?: boolean }): Promise<StudentTaskItem> {
    return this.request<StudentTaskItem>(`/api/student/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async deleteStudentTask(id: string): Promise<void> {
    await this.request<void>(`/api/student/tasks/${id}`, { method: "DELETE" });
  }

  // ─── Badges & XP ─────────────────────────────────────────────────────────────

  async listBadges(): Promise<BadgeItem[]> {
    return this.request<BadgeItem[]>("/api/badges");
  }

  async listStudentBadges(): Promise<BadgeItem[]> {
    return this.request<BadgeItem[]>("/api/student/badges");
  }

  async getStudentXp(): Promise<StudentXpItem> {
    return this.request<StudentXpItem>("/api/student/xp");
  }

  // ─── Vocabulary ───────────────────────────────────────────────────────────────

  async saveVocabItem(payload: { sourceText: string; translatedText: string; sourceLanguage: string; targetLanguage: string }): Promise<VocabItem> {
    return this.request<VocabItem>("/api/translations/vocab", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listVocabItems(): Promise<VocabItem[]> {
    return this.request<VocabItem[]>("/api/translations/vocab");
  }

  async deleteVocabItem(id: string): Promise<void> {
    await this.request<void>(`/api/translations/vocab/${id}`, { method: "DELETE" });
  }

  // ─── Announcements Edit / Delete ─────────────────────────────────────────────

  async updateAnnouncement(id: string, payload: { title: string; content: string }): Promise<AnnouncementItem> {
    return this.request<AnnouncementItem>(`/api/announcements/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.request<void>(`/api/announcements/${id}`, { method: "DELETE" });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async listAuditLogs(params: { actorId?: string; action?: string; entityType?: string; search?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }): Promise<{ rows: AuditLogItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const qs = new URLSearchParams();
    if (params.actorId) qs.set("actorId", params.actorId);
    if (params.action) qs.set("action", params.action);
    if (params.entityType) qs.set("entityType", params.entityType);
    if (params.search) qs.set("search", params.search);
    if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params.dateTo) qs.set("dateTo", params.dateTo);
    qs.set("page", String(params.page || 1));
    qs.set("pageSize", String(params.pageSize || 20));
    return this.request(`/api/admin/audit-logs?${qs.toString()}`);
  }

  async recordAuditLogPrint(filters: Record<string, string>): Promise<void> {
    await this.request<void>("/api/admin/audit-logs/print", { method: "POST", body: JSON.stringify({ filters }) });
  }

  async listMeetingHistory(): Promise<CallHistoryItem[]> {
    return this.request<CallHistoryItem[]>("/api/admin/meeting-history");
  }

  async getAdminAnalytics(filters?: { dateFrom?: string; dateTo?: string; status?: string }): Promise<AdminAnalyticsItem> {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => value && query.set(key, value));
    return this.request<AdminAnalyticsItem>(`/api/admin/analytics${query.toString() ? `?${query}` : ''}`);
  }

  async changeUserStatus(id: string, payload: { status: UserStatus; reason?: string; dropDate?: string; actionTaken?: string; pullOutReason?: string; notes?: string }): Promise<AuthUser> {
    return this.request<AuthUser>(`/api/users/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) });
  }

  async importUsersFromCsv(file: File): Promise<{ success: number; failed: number; errors: { row: number; reason: string }[] }> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("/api/admin/users/import-csv", {
      method: "POST",
      body: formData,
    });
  }
}

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const apiClient = new YunafiedApiClient(backendUrl);

import {
  AnnouncementItem,
  AssignmentItem,
  AuthUser,
  GamifiedAttemptResultItem,
  GamifiedCategoryItem,
  GamifiedLeaderboardItem,
  GamifiedQuizDetailItem,
  GamifiedQuizItem,
  ScheduleItem,
  SubmissionItem,
  TranslationHistoryItem,
  UserRole,
  UserStatus,
} from "@/app/types/models";

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
}

interface CreateUserPayload {
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  password: string;
}

interface UpdateUserPayload {
  email: string;
  fullName: string;
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
  fullName: string;
  email: string;
  profileImageUrl?: string | null;
  profileImagePublicId?: string | null;
  currentPassword?: string;
  newPassword?: string;
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
    return this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(payload: RegisterPayload): Promise<LoginResponse> {
    return this.request<LoginResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
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

  async listAssignments(): Promise<AssignmentItem[]> {
    return this.request<AssignmentItem[]>("/api/assignments");
  }

  async createAssignment(payload: {
    title: string;
    description: string;
    dueDate: string;
  }): Promise<AssignmentItem> {
    return this.request<AssignmentItem>("/api/assignments", {
      method: "POST",
      body: JSON.stringify(payload),
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
}

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const apiClient = new YunafiedApiClient(backendUrl);

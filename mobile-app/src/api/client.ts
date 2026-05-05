import Constants from 'expo-constants';
import {
  AnnouncementItem,
  AssignmentItem,
  AuditLogItem,
  AuthUser,
  BootstrapResponse,
  CallHistoryItem,
  ChatMessageItem,
  ChatSummaryItem,
  EnrollmentRecordItem,
  GamifiedAttemptResultItem,
  GamifiedCategoryItem,
  GamifiedLeaderboardItem,
  GamifiedQuizDetailItem,
  GamifiedQuizItem,
  LearningMaterialItem,
  MeetingRoom,
  MeetingRoomStatus,
  MessageUserItem,
  NotificationItem,
  ScheduleItem,
  SubmissionItem,
  TranslationHistoryItem,
  UserRole,
  UserStatus,
  VideoSummaryResponse,
} from '../types/models';

interface LoginResponse {
  token: string;
  user: AuthUser;
}

function extractHost(uri: string | undefined | null): string | null {
  if (!uri) {
    return null;
  }

  const normalized = uri.replace(/^[a-z]+:\/\//i, '');
  const hostWithPort = normalized.split('/')[0];
  const host = hostWithPort.split(':')[0];
  return host || null;
}

function detectExpoHost(): string | null {
  const constantsAny = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
    manifest?: { debuggerHost?: string };
  };

  const candidates = [
    constantsAny.expoConfig?.hostUri,
    constantsAny.expoGoConfig?.debuggerHost,
    constantsAny.manifest2?.extra?.expoClient?.hostUri,
    constantsAny.manifest?.debuggerHost,
  ];

  const isLikelyLocalHost = (host: string): boolean => {
    const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
    return isIpv4 || host === 'localhost' || host.endsWith('.local');
  };

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host && isLikelyLocalHost(host)) {
      return host;
    }
  }

  return null;
}

function resolveApiUrl(): string {
  const rawConfigApiUrl = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  const configApiUrl = rawConfigApiUrl?.trim();

  if (configApiUrl && configApiUrl.toLowerCase() !== 'auto') {
    return configApiUrl;
  }

  const detectedHost = detectExpoHost();
  if (detectedHost) {
    return `http://${detectedHost}:4000`;
  }

  return 'http://localhost:4000';
}

const API_URL = resolveApiUrl();

class MobileApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers || {});
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    // Bypass localtunnel's splash page for API requests
    headers.set('bypass-tunnel-reminder', 'true');

    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const json = await response.json();
        if (json.message) {
          message = json.message;
        }
      } catch (_error) {
        // ignore parse errors
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  login(email: string, password: string): Promise<LoginResponse> {
    return fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(async (response) => {
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (json.needsVerification) {
          const err = new Error(json.message || 'Email verification required') as Error & { needsVerification: true; email: string };
          err.needsVerification = true;
          err.email = json.email || email;
          throw err;
        }
        throw new Error(json.message || `Request failed (${response.status})`);
      }
      return json as LoginResponse;
    });
  }

  register(input: { firstName: string; middleName?: string; lastName: string; email: string; password: string }): Promise<{ needsVerification: boolean; email: string }> {
    return this.request<{ needsVerification: boolean; email: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  verifyOtp(email: string, otp: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  resendOtp(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  }

  async me() {
    const data = await this.request<{ user: AuthUser }>('/api/auth/me');
    return data.user;
  }

  bootstrap() {
    return this.request<BootstrapResponse>('/api/bootstrap');
  }

  updateProfile(input: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) {
    return this.request<{ user: AuthUser }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  listUsers() {
    return this.request<AuthUser[]>('/api/users');
  }

  createUser(input: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    password: string;
  }) {
    return this.request<AuthUser>('/api/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateUser(
    id: string,
    input: {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      password?: string;
    },
  ) {
    return this.request<AuthUser>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  deleteUser(id: string) {
    return this.request<void>(`/api/users/${id}`, { method: 'DELETE' });
  }

  listSchedules() {
    return this.request<ScheduleItem[]>('/api/schedules');
  }

  createSchedule(input: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId?: string;
    studentId?: string | null;
    requestNote?: string;
  }) {
    return this.request<ScheduleItem>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  respondToSchedule(
    id: string,
    input: {
      decision: 'accepted' | 'declined';
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      responseNote?: string;
    },
  ) {
    return this.request<ScheduleItem>(`/api/schedules/${id}/respond`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  moveSchedule(
    id: string,
    input: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ) {
    return this.request<ScheduleItem>(`/api/schedules/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  cancelSchedule(id: string, responseNote: string) {
    return this.request<ScheduleItem>(`/api/schedules/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ responseNote }),
    });
  }

  adminEditSchedule(
    id: string,
    input: {
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      teacherId?: string;
      studentId?: string | null;
      status?: 'pending' | 'accepted' | 'declined' | 'cancelled';
      requestNote?: string | null;
      responseNote?: string | null;
    },
  ) {
    return this.request<ScheduleItem>(`/api/schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  deleteSchedule(id: string) {
    return this.request<void>(`/api/schedules/${id}`, { method: 'DELETE' });
  }

  listGamifiedCategories() {
    return this.request<GamifiedCategoryItem[]>('/api/gamified/categories');
  }

  createGamifiedCategory(input: { name: string; description?: string | null }) {
    return this.request<GamifiedCategoryItem>('/api/gamified/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateGamifiedCategory(id: string, input: { name?: string; description?: string | null }) {
    return this.request<GamifiedCategoryItem>(`/api/gamified/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  listGamifiedQuizzes(input?: { categoryId?: string }) {
    const query = input?.categoryId ? `categoryId=${encodeURIComponent(input.categoryId)}` : '';
    return this.request<GamifiedQuizItem[]>(`/api/gamified/quizzes${query ? `?${query}` : ''}`);
  }

  getGamifiedQuiz(id: string) {
    return this.request<GamifiedQuizDetailItem>(`/api/gamified/quizzes/${id}`);
  }

  createGamifiedQuiz(input: {
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
  }) {
    return this.request<GamifiedQuizDetailItem>('/api/gamified/quizzes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateGamifiedQuiz(
    id: string,
    input: {
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
  ) {
    return this.request<GamifiedQuizDetailItem>(`/api/gamified/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  submitGamifiedAttempt(
    quizId: string,
    input: { answers: Array<{ questionId: string; selectedChoiceId?: string | null; timeRemainingSeconds?: number }> },
  ) {
    return this.request<GamifiedAttemptResultItem>(`/api/gamified/quizzes/${quizId}/attempts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listGamifiedLeaderboard(input: { categoryId: string; limit?: number }) {
    const encodedCategoryId = encodeURIComponent(input.categoryId);
    const query = input.limit
      ? `categoryId=${encodedCategoryId}&limit=${encodeURIComponent(String(input.limit))}`
      : `categoryId=${encodedCategoryId}`;
    return this.request<GamifiedLeaderboardItem[]>(`/api/gamified/leaderboard?${query}`);
  }

  listAssignments() {
    return this.request<AssignmentItem[]>('/api/assignments');
  }

  createAssignment(input: { title: string; description: string; dueDate: string }) {
    return this.request<AssignmentItem>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listSubmissions() {
    return this.request<SubmissionItem[]>('/api/submissions');
  }

  submitAssignment(assignmentId: string, input: { contentText?: string }) {
    const formData = new FormData();
    if (input.contentText) {
      formData.append('contentText', input.contentText);
    }

    return this.request<SubmissionItem>(`/api/assignments/${assignmentId}/submissions`, {
      method: 'POST',
      body: formData,
    });
  }

  gradeSubmission(submissionId: string, input: { grade: string; feedback: string }) {
    return this.request<SubmissionItem>(`/api/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  listAnnouncements() {
    return this.request<AnnouncementItem[]>('/api/announcements');
  }

  createAnnouncement(input: { title: string; content: string }) {
    return this.request<AnnouncementItem>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  askYunaAi(input: {
    message: string;
    currentView: string;
    role: UserRole;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) {
    return this.request<{ answer: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  askStudyGuide(input: {
    message: string;
    subject?: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) {
    return this.request<{ answer: string }>('/api/ai/study-guide', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  translateText(input: { text: string; sourceLanguage: string; targetLanguage: string }) {
    return this.request<{ translatedText: string; historyItem: TranslationHistoryItem }>('/api/ai/translate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listTranslationHistory(input: { page?: number; pageSize?: number; search?: string }) {
    const page = encodeURIComponent(String(input.page || 1));
    const pageSize = encodeURIComponent(String(input.pageSize || 6));
    const search = input.search && input.search.trim() ? `&search=${encodeURIComponent(input.search.trim())}` : '';
    const query = `page=${page}&pageSize=${pageSize}${search}`;
    return this.request<{
      rows: TranslationHistoryItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/api/translations/history?${query}`);
  }

  toggleAssignmentClosed(assignmentId: string, isClosed: boolean) {
    return this.request<AssignmentItem>(`/api/assignments/${assignmentId}/toggle-close`, {
      method: 'PATCH',
      body: JSON.stringify({ isClosed }),
    });
  }

  summarizeVideo(input: { videoUrl: string; context?: string }) {
    return this.request<VideoSummaryResponse>('/api/ai/video-summary', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listNotifications(limit = 20) {
    return this.request<NotificationItem[]>(`/api/notifications?limit=${encodeURIComponent(String(limit))}`);
  }

  listLearningMaterials() {
    return this.request<LearningMaterialItem[]>('/api/materials');
  }

  listEnrollments() {
    return this.request<EnrollmentRecordItem[]>('/api/enrollments');
  }

  listChats() {
    return this.request<ChatSummaryItem[]>('/api/chats');
  }

  listChatUsers() {
    return this.request<MessageUserItem[]>('/api/chats/users');
  }

  openDirectChat(otherUserId: string) {
    return this.request<ChatSummaryItem>('/api/chats/direct', {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    });
  }

  listChatMessages(chatId: string) {
    return this.request<ChatMessageItem[]>(`/api/chats/${chatId}/messages`);
  }

  sendChatMessage(chatId: string, body: string) {
    return this.request<ChatMessageItem>(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }

  getIncomingCall() {
    return this.request<MeetingRoom | null>('/api/meetings/incoming');
  }

  updateMeetingStatus(roomToken: string, status: MeetingRoomStatus) {
    return this.request<MeetingRoom>(`/api/meetings/${roomToken}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  createMeeting(input: { scheduleId?: string; studentId?: string }) {
    return this.request<MeetingRoom>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  createLearningMaterialLink(input: { title: string; subject: string; description?: string; url: string }) {
    return this.request<LearningMaterialItem>('/api/materials/link', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  deleteLearningMaterial(id: string) {
    return this.request<void>(`/api/materials/${id}`, { method: 'DELETE' });
  }

  createEnrollment(input: { studentId: string; teacherId: string; subject: string; tutorialGroup?: string; note?: string; status?: string }) {
    return this.request<EnrollmentRecordItem>('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateEnrollment(id: string, input: { status: string; subject?: string; tutorialGroup?: string; note?: string }) {
    return this.request<EnrollmentRecordItem>(`/api/enrollments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  deleteEnrollment(id: string) {
    return this.request<void>(`/api/enrollments/${id}`, { method: 'DELETE' });
  }

  createGroupChat(input: { name: string; memberIds: string[] }) {
    return this.request<ChatSummaryItem>('/api/chats/group', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateAnnouncement(id: string, input: { title: string; content: string }) {
    return this.request<AnnouncementItem>(`/api/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  deleteAnnouncement(id: string) {
    return this.request<void>(`/api/announcements/${id}`, { method: 'DELETE' });
  }

  listAuditLogs(params?: {
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const parts: string[] = [];
    if (params?.action) parts.push(`action=${encodeURIComponent(params.action)}`);
    if (params?.entityType) parts.push(`entityType=${encodeURIComponent(params.entityType)}`);
    if (params?.dateFrom) parts.push(`dateFrom=${encodeURIComponent(params.dateFrom)}`);
    if (params?.dateTo) parts.push(`dateTo=${encodeURIComponent(params.dateTo)}`);
    if (params?.page) parts.push(`page=${encodeURIComponent(String(params.page))}`);
    if (params?.pageSize) parts.push(`pageSize=${encodeURIComponent(String(params.pageSize))}`);
    const qs = parts.join('&');
    return this.request<{ rows: AuditLogItem[]; total: number; page: number; totalPages: number }>(
      `/api/admin/audit-logs${qs ? `?${qs}` : ''}`,
    );
  }

  listMeetingHistory() {
    return this.request<CallHistoryItem[]>('/api/admin/meeting-history');
  }

  getMeeting(roomToken: string) {
    return this.request<MeetingRoom>(`/api/meetings/${roomToken}`);
  }

  sendMeetingSignal(roomToken: string, payload: Record<string, unknown>) {
    return this.request<MeetingRoom>(`/api/meetings/${roomToken}/signal`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

}

export const mobileApiClient = new MobileApiClient();
export const mobileApiBaseUrl = API_URL;

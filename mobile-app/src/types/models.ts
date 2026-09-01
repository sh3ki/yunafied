export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'archived' | 'completed' | 'dropped';
export type ScheduleStatus = 'scheduled' | 'pending' | 'accepted' | 'declined' | 'cancelled';
export type MeetingRoomStatus = 'calling' | 'active' | 'declined' | 'ended';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'archived';
export type ChatType = 'direct' | 'group';

export interface MeetingRoom {
  id: string;
  roomToken: string;
  scheduleId: string | null;
  teacherId: string;
  studentId: string | null;
  teacherName: string;
  studentName: string | null;
  scheduleTitle: string | null;
  scheduleDescription: string | null;
  status: MeetingRoomStatus;
  offer: Record<string, unknown> | null;
  answer: Record<string, unknown> | null;
  teacherIceCandidates: Record<string, unknown>[];
  studentIceCandidates: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface BadgeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
  createdAt?: string;
}

export interface StudentXpItem {
  studentId: string;
  totalXp: number;
  level: string;
  updatedAt: string;
}

export interface TeacherAvailabilityItem {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
}

export interface TeacherRecordItem {
  teacherId: string;
  teacher: AuthUser;
  mobileNumber: string | null;
  professionalTitle: string | null;
  employmentStatus: string | null;
  education: string | null;
  certifications: string | null;
  yearsExperience: number | null;
  specializations: string[];
  notes: string | null;
  availability: TeacherAvailabilityItem[];
  updatedAt: string;
}

export interface StudentRecordItem {
  student: AuthUser & { mobileNumber?: string | null; birthdate?: string | null };
  enrollments: EnrollmentRecordItem[];
  schedules: ScheduleItem[];
  assignments: Array<{ assignment: AssignmentItem; submission: SubmissionItem | null }>;
  gamifiedAttempts: Array<{ id: string; quizId: string; studentId: string; quizTitle: string; categoryName: string; totalQuestions: number; correctAnswers: number; totalScore: number; completedAt: string }>;
  meetingHistory: CallHistoryItem[];
  statusHistory: Array<{ id: string; entityId: string; previousStatus: string | null; newStatus: string; reason: string | null; createdAt: string }>;
}

export interface AdminAnalyticsItem {
  totalStudents: number;
  totalTeachers: number;
  totalSessions: number;
  totalSubmissions: number;
  totalAnnouncements: number;
  totalEnrollments: number;
  gradeDistribution: Array<{ grade: string; count: number }>;
  monthlySessionCounts: Array<{ month: string; count: number }>;
  topStudents: Array<{ studentId: string; studentName: string; avgGrade: number; submissionCount: number }>;
  enrollmentTrends?: Array<{ period: string; count: number }>;
  teacherActivity?: Array<{ teacherId: string; teacherName: string; sessions: number; assignments: number }>;
  studentProgress?: Array<{ studentId: string; studentName: string; firstAverage: number | null; latestAverage: number | null; change: number | null }>;
  interpretations?: Record<string, { text: string; generatedAt: string | null }>;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl: string | null;
  profileImagePublicId: string | null;
  createdAt: string;
  mobileNumber?: string | null;
  birthdate?: string | null;
}

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName: string;
  studentId: string | null;
  studentName: string | null;
  status: ScheduleStatus;
  requestNote: string | null;
  responseNote: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  attachmentFileName?: string | null;
  attachmentUrl?: string | null;
  isClosed?: boolean;
  rubricFileName?: string | null;
  rubricUrl?: string | null;
}

export interface SubmissionItem {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  fileName: string | null;
  fileUrl: string | null;
  contentText: string | null;
  grade: string | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  postedById: string;
  postedByName: string;
  createdAt: string;
}

export interface TranslationHistoryItem {
  id: string;
  userId: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: string;
}

export interface GamifiedCategoryItem {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdByName: string;
  quizCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GamifiedChoiceItem {
  id: string;
  text: string;
  order: number;
  isCorrect?: boolean;
}

export interface GamifiedQuestionItem {
  id: string;
  prompt: string;
  order: number;
  points: number;
  choices: GamifiedChoiceItem[];
}

export interface GamifiedQuizItem {
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

export interface GamifiedQuizDetailItem extends GamifiedQuizItem {
  questions: GamifiedQuestionItem[];
}

export interface GamifiedAttemptAnswerResultItem {
  questionId: string;
  questionPrompt: string;
  selectedChoiceId: string | null;
  selectedChoiceText: string | null;
  correctChoiceId: string;
  correctChoiceText: string;
  isCorrect: boolean;
  maxPoints: number;
  speedBonus: number;
  pointsEarned: number;
  timeRemainingSeconds: number;
}

export interface GamifiedAttemptResultItem {
  attemptId: string;
  quizId: string;
  categoryId: string;
  studentId: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  completedAt: string;
  answers: GamifiedAttemptAnswerResultItem[];
  xpGained?: number;
  newXp?: StudentXpItem;
  awardedBadges?: BadgeItem[];
}

export interface GamifiedLeaderboardItem {
  studentId: string;
  studentName: string;
  bestScore: number;
  attemptCount: number;
  bestCorrectAnswers: number;
  totalQuestions: number;
  completedAt: string;
}

export interface BootstrapResponse {
  users: AuthUser[];
  schedules: ScheduleItem[];
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  announcements: AnnouncementItem[];
}

export interface VideoSummaryResponse {
  title: string;
  summary: string[];
  takeaways: string[];
}

export interface NotificationItem {
  id: string;
  type: 'assignment' | 'submission' | 'announcement' | 'schedule' | 'grade';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  actionView: string;
  isRead?: boolean;
}

export interface LearningMaterialItem {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  materialType: 'link' | 'file';
  resourceUrl: string;
  fileName: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  tutorialGroup: string | null;
  status: EnrollmentStatus;
  note: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  gradeLevel?: string | null;
  dropReason?: string | null;
  dropDate?: string | null;
  actionTaken?: string | null;
  pullOutReason?: string | null;
  statusNotes?: string | null;
  classSchedule?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

export interface MessageUserItem {
  id: string;
  fullName: string;
  role: UserRole;
  profileImageUrl: string | null;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface CallHistoryItem {
  id: string;
  roomToken: string;
  teacherId: string;
  teacherName: string;
  studentId: string | null;
  studentName: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  endedBy: string | null;
}

export interface ChatSummaryItem {
  id: string;
  name: string | null;
  chatType: ChatType;
  directKey: string | null;
  createdById: string;
  createdByName: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  participantCount: number;
  participants: MessageUserItem[];
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  body: string;
  sentAt: string;
}

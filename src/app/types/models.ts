export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive" | "pending" | "archived" | "completed" | "dropped";
export type ScheduleStatus = "pending" | "accepted" | "declined" | "cancelled";
export type EnrollmentStatus = "active" | "completed" | "dropped" | "archived";
export type ChatType = "direct" | "group";
export type MeetingRoomStatus = "calling" | "active" | "declined" | "ended";

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
  specializations?: string[];
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
  rubricFileName?: string | null;
  rubricUrl?: string | null;
  isClosed?: boolean;
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

export interface VideoSummaryResponse {
  id?: string;
  title: string;
  summary: string[];
  takeaways: string[];
  createdAt?: string;
}

export interface VideoSummaryItem {
  id: string;
  userId: string;
  sourceType: "youtube" | "upload";
  sourceReference: string | null;
  contextNote: string | null;
  generatedTitle: string | null;
  summary: string[];
  takeaways: string[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: "assignment" | "submission" | "announcement" | "schedule" | "grade";
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  actionView: string;
}

export interface MessageUserItem {
  id: string;
  fullName: string;
  role: UserRole;
  profileImageUrl: string | null;
}

export interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  body: string;
  sentAt: string;
}

export interface ChatSummaryItem {
  id: string;
  name: string | null;
  chatType: ChatType;
  directKey: string | null;
  createdById: string;
  createdByName: string;
  lastMessageId: string | null;
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

export interface EnrollmentRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  tutorialGroup: string | null;
  gradeLevel: string | null;
  status: EnrollmentStatus;
  note: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  dropReason?: string | null;
  dropDate?: string | null;
  actionTaken?: string | null;
  pullOutReason?: string | null;
  statusNotes?: string | null;
  classSchedule: EnrollmentClassScheduleItem[];
}

export interface EnrollmentClassScheduleItem {
  id?: string;
  enrollmentId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface StatusChangeHistoryItem {
  id: string;
  entityType: "user" | "enrollment";
  entityId: string;
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
  dropDate: string | null;
  actionTaken: string | null;
  pullOutReason: string | null;
  notes: string | null;
  changedById: string | null;
  createdAt: string;
}

export interface LearningMaterialItem {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  materialType: "link" | "file";
  resourceUrl: string;
  fileName: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
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

export interface TeacherAvailabilityItem {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
}

export interface VocabItem {
  id: string;
  userId: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
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

export interface StudentTaskItem {
  id: string;
  studentId: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
  source: string;
  assignmentId: string | null;
  createdAt: string;
}

export interface MilestoneItem {
  id: string;
  studentId: string;
  type: string;
  title: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  createdAt: string;
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

export interface StudentQuestItem {
  id: string;
  studentId: string;
  questType: string;
  title: string;
  description?: string | null;
  target: number;
  progress: number;
  rewardXp: number;
  rewardBadgeCode?: string | null;
  isCompleted: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

export interface StoreItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  xpCost: number;
  isConsumable: boolean;
  createdAt: string;
}

export interface StudentStorePurchaseItem {
  id: string;
  studentId: string;
  storeItemId: string;
  purchasedAt: string;
}

export interface AdminAnalyticsItem {
  totalStudents: number;
  totalTeachers: number;
  totalSessions: number;
  totalSubmissions: number;
  totalAnnouncements: number;
  totalEnrollments: number;
  gradeDistribution: { grade: string; count: number }[];
  monthlySessionCounts: { month: string; count: number }[];
  topStudents: { studentId: string; studentName: string; avgGrade: number; submissionCount: number }[];
  enrollmentStatus?: { status: string; count: number }[];
  submissionStatus?: { status: string; count: number }[];
  enrollmentTrends?: { period: string; count: number }[];
  teacherActivity?: { teacherId: string; teacherName: string; sessions: number; assignments: number }[];
  studentProgress?: { studentId: string; studentName: string; firstAverage: number | null; latestAverage: number | null; change: number | null }[];
  interpretation?: string;
  interpretationGeneratedAt?: string | null;
  interpretations?: Record<string, { text: string; generatedAt: string | null }>;
  filters?: { dateFrom: string | null; dateTo: string | null; academicYear: string | null; classFilter: string | null; status: string | null };
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

export interface StudentRecordAssignment {
  assignment: AssignmentItem;
  submission: SubmissionItem | null;
}

export interface StudentRecordGamifiedAttempt {
  id: string;
  quizId: string;
  studentId: string;
  quizTitle: string;
  categoryName: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  completedAt: string;
}

export interface StudentRecordItem {
  student: Pick<AuthUser, 'id' | 'firstName' | 'middleName' | 'lastName' | 'fullName' | 'role' | 'status' | 'profileImageUrl' | 'createdAt'>;
  enrollments: EnrollmentRecordItem[];
  schedules: ScheduleItem[];
  assignments: StudentRecordAssignment[];
  gamifiedAttempts: StudentRecordGamifiedAttempt[];
  meetingHistory: CallHistoryItem[];
  statusHistory: StatusChangeHistoryItem[];
}

export interface NotificationDbItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  actionView: string | null;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

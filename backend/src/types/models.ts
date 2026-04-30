export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive";
export type ScheduleStatus = "pending" | "accepted" | "declined" | "cancelled";
export type EnrollmentStatus = "active" | "completed" | "dropped";
export type ChatType = "direct" | "group";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl: string | null;
  profileImagePublicId: string | null;
  createdAt: string;
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
  status: EnrollmentStatus;
  note: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
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

export interface GamifiedLeaderboardItem {
  studentId: string;
  studentName: string;
  bestScore: number;
  attemptCount: number;
  bestCorrectAnswers: number;
  totalQuestions: number;
  completedAt: string;
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
}

export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive";
export type ScheduleStatus = "pending" | "accepted" | "declined" | "cancelled";

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

export interface GamifiedAttemptResultItem {
  attemptId: string;
  quizId: string;
  categoryId: string;
  studentId: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  completedAt: string;
}

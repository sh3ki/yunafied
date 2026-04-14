export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive";

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
  day: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName: string;
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';
import { Toaster } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import '@/styles/fonts.css';
import { Login } from '@/app/components/Login';
import { AccountSetup } from '@/app/components/AccountSetup';
import { LandingPage } from '@/app/components/LandingPage';
import { Sidebar } from '@/app/components/Sidebar';
import { BottomNav } from '@/app/components/BottomNav';
import { Schedule } from '@/app/components/Schedule';
import { Assignments } from '@/app/components/Assignments';
import { Communication } from '@/app/components/Communication';
import { Chats } from '@/app/components/Chats';
import { GamifiedLearning } from '@/app/components/GamifiedLearning';
import { VideoSummarizer } from '@/app/components/VideoSummarizer';
import { WordTranslator } from '@/app/components/WordTranslator';
import { AIGuide } from '@/app/components/AIGuide';
import { ProfileSettings } from '@/app/components/ProfileSettings';
import { AIChatbot } from '@/app/components/AIChatbot';
import { MilestonesView } from '@/app/components/MilestonesView';
import { Performance } from '@/app/components/Performance';
import { GradesFeedback } from '@/app/components/GradesFeedback';
import { Notifications } from '@/app/components/Notifications';
import { EnrollmentRecords } from '@/app/components/EnrollmentRecords';
import { StudentRecords } from '@/app/components/StudentRecords';
import { TeacherRecords } from '@/app/components/TeacherRecords';
import { LearningMaterials } from '@/app/components/LearningMaterials';
import { VideoCall } from '@/app/components/VideoCall';
import { IncomingCall } from '@/app/components/IncomingCall';
import { Meetings } from '@/app/components/Meetings';
import { AuditLogs } from '@/app/components/AuditLogs';
import { MeetingHistory } from '@/app/components/MeetingHistory';
import { Analytics } from '@/app/components/Analytics';
import { TeacherDashboard } from '@/app/components/TeacherDashboard';
import { apiClient } from '@/app/services/apiClient';
import {
  AnnouncementItem,
  AssignmentItem,
  AuthUser,
  MeetingRoom,
  ScheduleItem,
  SubmissionItem,
  UserRole,
  UserStatus,
} from '@/app/types/models';

interface AppData {
  users: AuthUser[];
  schedules: ScheduleItem[];
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  announcements: AnnouncementItem[];
}

interface SessionState {
  token: string;
  user: AuthUser;
}

interface AuthenticatedShellProps {
  session: SessionState;
  data: AppData;
  backendBaseUrl: string;
  dashboardStats: {
    upcoming: number;
    assignments: number;
    users: number;
    pending: number;
  };
  onNavigateView: (view: string) => void;
  onLogout: () => void;
  onAddUser: (input: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    password: string;
  }) => Promise<void>;
  onEditUser: (
    id: string,
    input: {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      profileImageUrl?: string | null;
      profileImagePublicId?: string | null;
      password?: string;
    },
  ) => Promise<void>;
  onChangeUserStatus: (id: string, input: { status: UserStatus; reason?: string; dropDate?: string; actionTaken?: string; pullOutReason?: string; notes?: string }) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onCreateSchedule: (payload: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId?: string;
    studentId?: string | null;
    requestNote?: string;
  }) => Promise<void>;
  onRespondSchedule: (
    id: string,
    payload: {
      decision: 'accepted' | 'declined';
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      responseNote?: string;
    },
  ) => Promise<void>;
  onMoveSchedule: (
    id: string,
    payload: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ) => Promise<void>;
  onCancelSchedule: (id: string, responseNote: string) => Promise<void>;
  onAdminEditSchedule: (
    id: string,
    payload: {
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
  ) => Promise<void>;
  onCreateAssignment: (payload: { title: string; description: string; dueDate: string; attachmentFile?: File | null; rubricFile?: File | null; assignedStudentIds?: string[] }) => Promise<void>;
  onSubmitAssignment: (assignmentId: string, input: { file?: File | null; contentText?: string }) => Promise<void>;
  onGradeSubmission: (submissionId: string, grade: string, feedback: string) => Promise<void>;
  onToggleAssignmentClosed: (assignmentId: string, isClosed: boolean) => Promise<void>;
  onCreateAnnouncement: (input: { title: string; content: string }) => Promise<void>;
  onUploadProfileImage: (file: File) => Promise<{ secureUrl: string; publicId: string }>;
  onUpdateMyProfile: (input: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<AuthUser>;
  onStartMeeting: (roomToken: string) => void;
  chatUnreadTotal?: number;
  notificationUnreadCount?: number;
}

const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const roleViews: Record<UserRole, string[]> = {
  admin: ['dashboard', 'announcements', 'chats', 'notifications', 'enrollments', 'teacher-records', 'student-records', 'materials', 'gamified-learning', 'grades', 'audit-logs', 'meeting-history', 'profile'],
  teacher: ['dashboard', 'schedule', 'meetings', 'announcements', 'chats', 'notifications', 'assignments', 'grades', 'materials', 'enrollments', 'student-records', 'gamified-learning', 'video-summarizer', 'profile'],
  student: [
    'dashboard',
    'schedule',
    'announcements',
    'chats',
    'notifications',
    'enrollments',
    'materials',
    'assignments',
    'grades',
    'gamified-learning',
    'video-summarizer',
    'word-translator',
    'ai-guide',
    'milestones',
    'profile',
  ],
};

function AuthenticatedShell({
  session,
  data,
  backendBaseUrl,
  dashboardStats,
  onNavigateView,
  onLogout,
  onAddUser,
  onEditUser,
  onChangeUserStatus,
  onDeleteUser,
  onCreateSchedule,
  onRespondSchedule,
  onMoveSchedule,
  onCancelSchedule,
  onAdminEditSchedule,
  onCreateAssignment,
  onSubmitAssignment,
  onGradeSubmission,
  onToggleAssignmentClosed,
  onCreateAnnouncement,
  onUploadProfileImage,
  onUpdateMyProfile,
  onStartMeeting,
  chatUnreadTotal = 0,
  notificationUnreadCount = 0,
}: AuthenticatedShellProps) {
  const navigate = useNavigate();
  const params = useParams<{ view: string }>();
  const currentView = params.view || 'dashboard';
  const userRole = session.user.role;

  useEffect(() => {
    if (!roleViews[userRole].includes(currentView)) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [currentView, navigate, userRole]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 pb-16 md:pb-0">
      <Sidebar
        role={userRole}
        currentView={currentView}
        onNavigate={onNavigateView}
        onLogout={onLogout}
        userEmail={session.user.email}
        chatUnreadTotal={chatUnreadTotal}
        notificationUnreadCount={notificationUnreadCount}
        schedulePendingCount={
          userRole === 'teacher'
            ? data.schedules.filter((s) => s.teacherId === session.user.id && s.status === 'pending').length
            : 0
        }
        assignmentPendingCount={
          userRole === 'student'
            ? data.assignments.filter(
                (a) => !a.isClosed && !data.submissions.some((s) => s.assignmentId === a.id && s.studentId === session.user.id)
              ).length
            : 0
        }
        gradingPendingCount={
          userRole === 'teacher'
            ? data.submissions.filter(
                (s) => s.grade === null || s.grade === ''
              ).length
            : 0
        }
        meetingsTodayCount={(() => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"
          return data.schedules.filter(
            (s) =>
              s.status === 'accepted' &&
              s.date === todayStr &&
              s.startTime >= nowTime &&
              (userRole === 'teacher' ? s.teacherId === session.user.id : s.studentId === session.user.id),
          ).length;
        })()}
        user={{
          fullName: session.user.fullName,
          email: session.user.email,
          profileImageUrl: session.user.profileImageUrl,
        }}
      />
      <BottomNav role={userRole} currentView={currentView} onNavigate={onNavigateView} chatUnreadTotal={chatUnreadTotal} />
      <AIChatbot role={userRole} currentView={currentView} />

      <main className="flex-1 md:ml-64 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && (
                <div className="p-4 md:p-8">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-800 flex items-center gap-2">
                    Welcome back,{' '}
                    <span
                      className={clsx(
                        'bg-clip-text text-transparent bg-gradient-to-r capitalize',
                        userRole === 'admin'
                          ? 'from-purple-600 to-purple-400'
                          : userRole === 'teacher'
                            ? 'from-indigo-600 to-indigo-400'
                            : 'from-emerald-600 to-emerald-400',
                      )}
                    >
                      {session.user.fullName}
                    </span>
                  </h1>
                  <p className="text-gray-500 text-sm mb-8 capitalize">{userRole} Dashboard</p>

                  {/* Admin Dashboard */}
                  {userRole === 'admin' && false && (() => {
                    const today = new Date().toISOString().slice(0, 10);
                    const totalStudents = data.users.filter((u) => u.role === 'student').length;
                    const activeStudents = data.users.filter((u) => u.role === 'student' && u.status === 'active').length;
                    const inactiveStudents = totalStudents - activeStudents;
                    const totalTeachers = data.users.filter((u) => u.role === 'teacher').length;
                    const activeTeachers = data.users.filter((u) => u.role === 'teacher' && u.status === 'active').length;
                    const inactiveTeachers = totalTeachers - activeTeachers;
                    const ongoingClasses = data.schedules.filter((s) => s.status === 'accepted' && s.date === today).length;
                    const bookingsToday = data.schedules.filter((s) => s.date === today).length;
                    const completedClasses = data.schedules.filter((s) => s.status === 'accepted').length;
                    const cancelledClasses = data.schedules.filter((s) => s.status === 'cancelled').length;

                    const completedVsCancelledData = [
                      { name: 'Completed', value: completedClasses },
                      { name: 'Cancelled', value: cancelledClasses },
                    ];

                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                          {/* Students card */}
                          <div className="bg-indigo-50 rounded-2xl p-5 border border-white shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Students</p>
                            <p className="text-3xl font-extrabold mt-1 text-indigo-600">{totalStudents}</p>
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-emerald-600 font-medium">Active: {activeStudents}</span>
                              <span className="text-red-400 font-medium">Inactive: {inactiveStudents}</span>
                            </div>
                          </div>
                          {/* Teachers card */}
                          <div className="bg-blue-50 rounded-2xl p-5 border border-white shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Teachers</p>
                            <p className="text-3xl font-extrabold mt-1 text-blue-600">{totalTeachers}</p>
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-emerald-600 font-medium">Active: {activeTeachers}</span>
                              <span className="text-red-400 font-medium">Inactive: {inactiveTeachers}</span>
                            </div>
                          </div>
                          {/* Ongoing classes */}
                          <div className="bg-emerald-50 rounded-2xl p-5 border border-white shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Ongoing Classes Today</p>
                            <p className="text-3xl font-extrabold mt-1 text-emerald-600">{ongoingClasses}</p>
                            <p className="text-xs text-gray-400 mt-2">Live sessions scheduled today</p>
                          </div>
                          {/* Bookings Today */}
                          <div className="bg-amber-50 rounded-2xl p-5 border border-white shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Total Bookings Today</p>
                            <p className="text-3xl font-extrabold mt-1 text-amber-600">{bookingsToday}</p>
                            <p className="text-xs text-gray-400 mt-2">All statuses</p>
                          </div>
                          {/* Completed classes */}
                          <div className="bg-teal-50 rounded-2xl p-5 border border-white shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Completed Classes</p>
                            <p className="text-3xl font-extrabold mt-1 text-teal-600">{completedClasses}</p>
                          </div>
                          {/* Cancelled classes */}
                          <div className="bg-red-50 rounded-2xl p-5 border border-white shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Cancelled Classes</p>
                            <p className="text-3xl font-extrabold mt-1 text-red-500">{cancelledClasses}</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-md">
                          <h3 className="text-sm font-semibold text-gray-700 mb-4">Completed vs Cancelled Classes</h3>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={completedVsCancelledData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                <Cell fill="#14b8a6" />
                                <Cell fill="#ef4444" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    );
                  })()}
                  {userRole === 'admin' && <Analytics onNavigateView={onNavigateView} submissions={data.submissions} assignments={data.assignments} users={data.users} schedules={data.schedules} />}
                  {userRole === 'teacher' && <TeacherDashboard teacher={session.user} users={data.users} assignments={data.assignments} submissions={data.submissions} schedules={data.schedules} announcements={data.announcements} />}

                  {/* Student Dashboard */}
                  {userRole === 'student' && (() => {
                    const mySchedules = data.schedules.filter((s) => s.studentId === session.user.id);
                    const acceptedSessions = mySchedules.filter((s) => s.status === 'accepted').length;
                    const pendingSessions = mySchedules.filter((s) => s.status === 'pending').length;
                    const mySubs = data.submissions.filter((s) => s.studentId === session.user.id);
                    const gradedSubs = mySubs.filter((s) => s.grade).length;
                    const pendingSubs = mySubs.filter((s) => !s.grade).length;

                    const assignmentProgressData = data.assignments.map((a) => {
                      const sub = mySubs.find((s) => s.assignmentId === a.id);
                      return {
                        name: a.title.length > 12 ? a.title.slice(0, 12) + '…' : a.title,
                        status: sub?.grade ? 2 : sub ? 1 : 0,
                      };
                    });

                    const submissionData = [
                      { name: 'Graded', value: gradedSubs },
                      { name: 'Submitted', value: pendingSubs },
                      { name: 'Not Started', value: Math.max(0, data.assignments.length - mySubs.length) },
                    ];

                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                          {[
                            { label: 'Accepted Sessions', value: acceptedSessions, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Pending Requests', value: pendingSessions, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Submitted Work', value: mySubs.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Graded', value: gradedSubs, color: 'text-blue-600', bg: 'bg-blue-50' },
                          ].map((stat) => (
                            <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-white shadow-sm`}>
                              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{stat.label}</p>
                              <p className={`text-3xl font-extrabold mt-2 ${stat.color}`}>{stat.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">My Assignment Progress</h3>
                            {submissionData.some((d) => d.value > 0) ? (
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie data={submissionData.filter((d) => d.value > 0)} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                                    <Cell fill="#10b981" />
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#e5e7eb" />
                                  </Pie>
                                  <Tooltip />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No assignments yet</div>
                            )}
                          </div>
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Schedule Requests</h3>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={[
                                { name: 'Accepted', value: acceptedSessions },
                                { name: 'Pending', value: pendingSessions },
                                { name: 'Declined', value: mySchedules.filter((s) => s.status === 'declined').length },
                              ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {currentView === 'schedule' && (
                <div className="p-4 md:p-8">
                  <Schedule
                    schedules={data.schedules}
                    users={data.users}
                    role={userRole}
                    userId={session.user.id}
                    onCreate={onCreateSchedule}
                    onRespond={onRespondSchedule}
                    onMove={onMoveSchedule}
                    onCancel={onCancelSchedule}
                    onAdminEdit={onAdminEditSchedule}
                    onStartMeeting={onStartMeeting}
                  />
                </div>
              )}

              {currentView === 'meetings' && (
                <Meetings
                  schedules={data.schedules}
                  userId={session.user.id}
                  onStartMeeting={onStartMeeting}
                />
              )}

              {currentView === 'announcements' && (
                <div className="p-4 md:p-8 h-[calc(100vh-64px)]">
                  <Communication role={userRole} userId={session.user.id} announcements={data.announcements} onCreateAnnouncement={onCreateAnnouncement} />
                </div>
              )}

              {currentView === 'chats' && <Chats role={userRole} currentUserId={session.user.id} />}

              {currentView === 'notifications' && <Notifications onNavigate={onNavigateView} />}

              {currentView === 'enrollments' && <EnrollmentRecords role={userRole} onAddUser={onAddUser} onEditUser={onEditUser} onDeleteUser={onDeleteUser} onUploadProfileImage={onUploadProfileImage} onChangeUserStatus={onChangeUserStatus} />}

              {currentView === 'teacher-records' && userRole === 'admin' && <TeacherRecords />}

              {currentView === 'student-records' && (userRole === 'admin' || userRole === 'teacher') && <StudentRecords role={userRole} />}

              {currentView === 'materials' && <LearningMaterials role={userRole} backendBaseUrl={backendBaseUrl} />}

              {currentView === 'gamified-learning' && (
                <GamifiedLearning role={userRole} userId={session.user.id} />
              )}

              {currentView === 'video-summarizer' && (userRole === 'student' || userRole === 'teacher') && <VideoSummarizer />}

              {currentView === 'word-translator' && userRole === 'student' && (
                <WordTranslator
                  onTranslate={(payload) => apiClient.translateText(payload)}
                  onLoadHistory={(input) => apiClient.listTranslationHistory(input)}
                />
              )}

              {currentView === 'ai-guide' && userRole === 'student' && (
                <div className="p-4 md:p-8 h-[calc(100vh-64px)]">
                  <AIGuide onAsk={(input) => apiClient.askStudyGuide(input)} />
                </div>
              )}

              {currentView === 'profile' && (
                <ProfileSettings
                  user={session.user}
                  onUpdateProfile={onUpdateMyProfile}
                  onUploadProfileImage={onUploadProfileImage}
                />
              )}

              {currentView === 'milestones' && userRole === 'student' && (
                <MilestonesView
                  assignments={data.assignments}
                  submissions={data.submissions}
                  userId={session.user.id}
                />
              )}

              {currentView === 'performance' && userRole === 'teacher' && (
                <Performance
                  submissions={data.submissions}
                  assignments={data.assignments}
                  users={data.users}
                  schedules={data.schedules}
                  role={userRole}
                  userId={session.user.id}
                />
              )}

              {currentView === 'assignments' && (
                <div className="p-4 md:p-8 h-[calc(100vh-64px)]">
                  <Assignments
                    assignments={data.assignments}
                    submissions={data.submissions}
                    role={userRole}
                    userId={session.user.id}
                    students={data.users.filter((u) => u.role === 'student').map((u) => ({ id: u.id, name: u.fullName }))}
                    onCreateAssignment={onCreateAssignment}
                    onSubmitAssignment={onSubmitAssignment}
                    onGradeSubmission={onGradeSubmission}
                    onToggleClose={onToggleAssignmentClosed}
                    backendBaseUrl={backendBaseUrl}
                  />
                </div>
              )}

              {currentView === 'grades' && (
                <GradesFeedback
                  assignments={data.assignments}
                  submissions={data.submissions}
                  role={userRole}
                  userId={session.user.id}
                  onGradeSubmission={onGradeSubmission}
                />
              )}


              {currentView === 'audit-logs' && userRole === 'admin' && <AuditLogs />}

              {currentView === 'meeting-history' && userRole === 'admin' && <MeetingHistory />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionState | null>(null);
  const [data, setData] = useState<AppData>({
    users: [],
    schedules: [],
    assignments: [],
    submissions: [],
    announcements: [],
  });

  const navigate = useNavigate();
  const location = useLocation();

  const dashboardStats = useMemo(() => {
    const pending = data.submissions.filter((s) => !s.grade).length;
    return {
      upcoming: data.schedules.length,
      assignments: data.assignments.length,
      users: data.users.length,
      pending,
    };
  }, [data]);

  const loadData = async () => {
    const payload = await apiClient.bootstrap();
    setData(payload);
  };

  useEffect(() => {
    const restore = async () => {
      const storedToken = localStorage.getItem('yunafied_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        apiClient.setToken(storedToken);
        const user = await apiClient.me();
        setSession({ token: storedToken, user });
        await loadData();
      } catch (_error) {
        apiClient.setToken(null);
        localStorage.removeItem('yunafied_token');
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const isAppRoute = location.pathname.startsWith('/app');
    if (!session && isAppRoute) {
      navigate('/login', { replace: true });
      return;
    }

    if (session && (location.pathname === '/' || location.pathname === '/login')) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [loading, location.pathname, navigate, session]);

  const handleLogin = async (email: string, pass: string) => {
    const response = await apiClient.login(email, pass);
    apiClient.setToken(response.token);
    localStorage.setItem('yunafied_token', response.token);
    setSession({ token: response.token, user: response.user });
    await loadData();
    navigate('/app/dashboard', { replace: true });
  };

  const handleSignup = async (firstName: string, middleName: string, lastName: string, email: string, pass: string): Promise<string> => {
    const result = await apiClient.register({ firstName, middleName: middleName || undefined, lastName, email, password: pass });
    return result.email;
  };

  const handleForgotPassword = async (email: string) => {
    await apiClient.forgotPassword(email);
  };

  const handleResetPassword = async (email: string, otp: string, newPassword: string) => {
    await apiClient.resetPassword(email, otp, newPassword);
  };

  const handleVerifyOtp = async (email: string, otp: string) => {
    const response = await apiClient.verifyOtp(email, otp);
    apiClient.setToken(response.token);
    localStorage.setItem('yunafied_token', response.token);
    setSession({ token: response.token, user: response.user });
    await loadData();
    navigate('/app/dashboard', { replace: true });
  };

  const handleResendOtp = async (email: string) => {
    await apiClient.resendOtp(email);
  };

  const handleLogout = () => {
    apiClient.setToken(null);
    localStorage.removeItem('yunafied_token');
    setSession(null);
    setData({ users: [], schedules: [], assignments: [], submissions: [], announcements: [] });
    navigate('/login', { replace: true });
  };

  const addUser = async (input: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    password: string;
  }) => {
    const created = await apiClient.createUser(input);
    setData((prev) => ({ ...prev, users: [created, ...prev.users] }));
  };

  const editUser = async (
    id: string,
    input: {
      firstName: string;
      middleName?: string;
      lastName: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      profileImageUrl?: string | null;
      profileImagePublicId?: string | null;
      password?: string;
    },
  ) => {
    const updated = await apiClient.updateUser(id, input);
    setData((prev) => ({
      ...prev,
      users: prev.users.map((user) => (user.id === id ? updated : user)),
    }));
  };

  const changeUserStatus = async (id: string, input: { status: UserStatus; reason?: string; dropDate?: string; actionTaken?: string; pullOutReason?: string; notes?: string }) => {
    const updated = await apiClient.changeUserStatus(id, input);
    setData((prev) => ({ ...prev, users: prev.users.map((user) => (user.id === id ? updated : user)) }));
  };

  const deleteUser = async (id: string) => {
    await apiClient.deleteUser(id);
    setData((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  };

  const upsertSchedule = (next: ScheduleItem) => {
    setData((prev) => {
      const exists = prev.schedules.some((row) => row.id === next.id);
      return {
        ...prev,
        schedules: exists ? prev.schedules.map((row) => (row.id === next.id ? next : row)) : [next, ...prev.schedules],
      };
    });
  };

  const createSchedule = async (payload: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId?: string;
    studentId?: string | null;
    requestNote?: string;
  }) => {
    const created = await apiClient.createSchedule(payload);
    upsertSchedule(created);
  };

  const respondSchedule = async (
    id: string,
    payload: {
      decision: 'accepted' | 'declined';
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      responseNote?: string;
    },
  ) => {
    const updated = await apiClient.respondToSchedule(id, payload);
    upsertSchedule(updated);
  };

  const moveSchedule = async (
    id: string,
    payload: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ) => {
    const updated = await apiClient.moveSchedule(id, payload);
    upsertSchedule(updated);
  };

  const cancelSchedule = async (id: string, responseNote: string) => {
    const updated = await apiClient.cancelSchedule(id, responseNote);
    upsertSchedule(updated);
  };

  const adminEditSchedule = async (
    id: string,
    payload: {
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
  ) => {
    const updated = await apiClient.adminEditSchedule(id, payload);
    upsertSchedule(updated);
  };

  const createAssignment = async (payload: { title: string; description: string; dueDate: string; attachmentFile?: File | null; rubricFile?: File | null; assignedStudentIds?: string[] }) => {
    const created = await apiClient.createAssignment(payload);
    setData((prev) => ({ ...prev, assignments: [created, ...prev.assignments] }));
  };

  const toggleAssignmentClosed = async (assignmentId: string, isClosed: boolean) => {
    const updated = await apiClient.toggleAssignmentClosed(assignmentId, isClosed);
    setData((prev) => ({ ...prev, assignments: prev.assignments.map((a) => a.id === updated.id ? updated : a) }));
  };

  const submitAssignment = async (assignmentId: string, input: { file?: File | null; contentText?: string }) => {
    const submission = await apiClient.submitAssignment(assignmentId, input);
    setData((prev) => {
      const filtered = prev.submissions.filter((s) => s.id !== submission.id);
      const older = filtered.filter(
        (s) => !(s.assignmentId === submission.assignmentId && s.studentId === submission.studentId),
      );
      return { ...prev, submissions: [submission, ...older] };
    });
  };

  const gradeSubmission = async (submissionId: string, grade: string, feedback: string) => {
    const graded = await apiClient.gradeSubmission(submissionId, { grade, feedback });
    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) => (s.id === submissionId ? graded : s)),
    }));
  };

  const createAnnouncement = async (input: { title: string; content: string }) => {
    const created = await apiClient.createAnnouncement(input);
    setData((prev) => ({ ...prev, announcements: [created, ...prev.announcements] }));
  };

  const uploadProfileImage = async (file: File) => {
    return apiClient.uploadProfileImage(file);
  };

  const updateMyProfile = async (input: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const updated = await apiClient.updateProfile(input);
    setSession((prev) => (prev ? { ...prev, user: updated } : prev));
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
    }));
    return updated;
  };

  const navigateView = (view: string) => {
    if (view === 'chats') setChatUnreadTotal(0);
    if (view === 'notifications') setNotificationUnreadCount(0);
    navigate(`/app/${view}`);
  };

  // ── Incoming call polling (students only) ──────────────────────────────────
  const [incomingCall, setIncomingCall] = useState<MeetingRoom | null>(null);
  const [chatUnreadTotal, setChatUnreadTotal] = useState(0);
  // Track tokens the student has already accepted/declined so the overlay
  // doesn't flash back during the next poll cycle before the DB updates.
  const dismissedCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!session || session.user.role !== 'student') return;
    const poll = setInterval(async () => {
      try {
        const call = await apiClient.getIncomingCall();
        if (call && call.status === 'calling' && !dismissedCallsRef.current.has(call.roomToken)) {
          setIncomingCall((prev) => (prev?.roomToken === call.roomToken ? prev : call));
        } else {
          setIncomingCall(null);
        }
      } catch (_e) {
        // ignore network errors during polling
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [session]);

  // ── Chat unread total polling ──────────────────────────────────────────────
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    const fetchNotifUnread = async () => {
      try {
        const items = await apiClient.listNotificationsDb(50);
        setNotificationUnreadCount(items.filter((n) => !n.isRead).length);
      } catch (_e) {
        // ignore
      }
    };
    fetchNotifUnread();
    const poll = setInterval(fetchNotifUnread, 15000);
    return () => clearInterval(poll);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const fetchUnread = async () => {
      try {
        const chats = await apiClient.listChats();
        const total = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
        setChatUnreadTotal(total);
      } catch (_e) {
        // ignore
      }
    };
    fetchUnread();
    const poll = setInterval(fetchUnread, 8000);
    return () => clearInterval(poll);
  }, [session]);

  const handleAcceptCall = (roomToken: string) => {
    dismissedCallsRef.current.add(roomToken);
    setIncomingCall(null);
    // Update DB status to active immediately so the backend won't return
    // this room as 'calling' on the next poll cycle.
    apiClient.updateMeetingStatus(roomToken, 'active').catch(() => undefined);
    window.open(`/app/video-call/${roomToken}`, '_blank', 'noopener,noreferrer');
  };

  const handleDeclineCall = (roomToken: string) => {
    dismissedCallsRef.current.add(roomToken);
    setIncomingCall(null);
  };

  const handleStartMeeting = (roomToken: string) => {
    window.open(`/app/video-call/${roomToken}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-indigo-600 animate-pulse">Loading System...</div>;
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      {incomingCall && (
        <IncomingCall
          call={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/app/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} onSignup={handleSignup} onForgotPassword={handleForgotPassword} onResetPassword={handleResetPassword} onVerifyOtp={handleVerifyOtp} onResendOtp={handleResendOtp} />
            )
          }
        />
        <Route path="/verify-account" element={<AccountSetup />} />
        <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
        <Route
          path="/app/video-call/:roomToken"
          element={
            session ? (
              <VideoCall userId={session.user.id} role={session.user.role as 'teacher' | 'student'} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/app/:view"
          element={
            session ? (
              <AuthenticatedShell
                session={session}
                data={data}
                backendBaseUrl={backendBaseUrl}
                dashboardStats={dashboardStats}
                onNavigateView={navigateView}
                onLogout={handleLogout}
                onAddUser={addUser}
                onEditUser={editUser}
                onChangeUserStatus={changeUserStatus}
                onDeleteUser={deleteUser}
                onCreateSchedule={createSchedule}
                onRespondSchedule={respondSchedule}
                onMoveSchedule={moveSchedule}
                onCancelSchedule={cancelSchedule}
                onAdminEditSchedule={adminEditSchedule}
                onCreateAssignment={createAssignment}
                onSubmitAssignment={submitAssignment}
                onGradeSubmission={gradeSubmission}
                onToggleAssignmentClosed={toggleAssignmentClosed}
                onCreateAnnouncement={createAnnouncement}
                onUploadProfileImage={uploadProfileImage}
                onUpdateMyProfile={updateMyProfile}
                onStartMeeting={handleStartMeeting}
                chatUnreadTotal={chatUnreadTotal}
                notificationUnreadCount={notificationUnreadCount}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={session ? '/app/dashboard' : '/'} replace />} />
      </Routes>
    </>
  );
}

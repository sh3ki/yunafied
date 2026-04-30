import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';
import { Toaster } from 'sonner';
import '@/styles/fonts.css';
import { Login } from '@/app/components/Login';
import { LandingPage } from '@/app/components/LandingPage';
import { Sidebar } from '@/app/components/Sidebar';
import { BottomNav } from '@/app/components/BottomNav';
import { Schedule } from '@/app/components/Schedule';
import { Assignments } from '@/app/components/Assignments';
import { UsersView } from '@/app/components/Users';
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
import { Notifications } from '@/app/components/Notifications';
import { EnrollmentRecords } from '@/app/components/EnrollmentRecords';
import { LearningMaterials } from '@/app/components/LearningMaterials';
import { apiClient } from '@/app/services/apiClient';
import {
  AnnouncementItem,
  AssignmentItem,
  AuthUser,
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
    fullName: string;
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
      fullName: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      profileImageUrl?: string | null;
      profileImagePublicId?: string | null;
      password?: string;
    },
  ) => Promise<void>;
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
  onCreateAssignment: (payload: { title: string; description: string; dueDate: string }) => Promise<void>;
  onSubmitAssignment: (assignmentId: string, input: { file?: File | null; contentText?: string }) => Promise<void>;
  onGradeSubmission: (submissionId: string, grade: string, feedback: string) => Promise<void>;
  onCreateAnnouncement: (input: { title: string; content: string }) => Promise<void>;
  onUploadProfileImage: (file: File) => Promise<{ secureUrl: string; publicId: string }>;
  onUpdateMyProfile: (input: {
    fullName: string;
    email: string;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<AuthUser>;
}

const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const roleViews: Record<UserRole, string[]> = {
  admin: ['dashboard', 'schedule', 'announcements', 'chats', 'notifications', 'enrollments', 'materials', 'gamified-learning', 'performance', 'users', 'profile'],
  teacher: ['dashboard', 'schedule', 'announcements', 'chats', 'notifications', 'assignments', 'materials', 'enrollments', 'gamified-learning', 'performance', 'profile'],
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
  onDeleteUser,
  onCreateSchedule,
  onRespondSchedule,
  onMoveSchedule,
  onCancelSchedule,
  onAdminEditSchedule,
  onCreateAssignment,
  onSubmitAssignment,
  onGradeSubmission,
  onCreateAnnouncement,
  onUploadProfileImage,
  onUpdateMyProfile,
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
        user={{
          fullName: session.user.fullName,
          email: session.user.email,
          profileImageUrl: session.user.profileImageUrl,
        }}
      />
      <BottomNav role={userRole} currentView={currentView} onNavigate={onNavigateView} />
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
                  <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                    Welcome back,
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                      <h3 className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Upcoming Classes</h3>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardStats.upcoming}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                      <h3 className="text-gray-500 text-xs uppercase tracking-wide font-semibold">Assignments</h3>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{dashboardStats.assignments}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                      <h3 className="text-gray-500 text-xs uppercase tracking-wide font-semibold">
                        {userRole === 'admin' ? 'Total Users' : 'Pending Reviews'}
                      </h3>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {userRole === 'admin' ? dashboardStats.users : dashboardStats.pending}
                      </p>
                    </div>
                  </div>

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
                  />
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
                  />
                </div>
              )}

              {currentView === 'announcements' && (
                <div className="p-4 md:p-8 h-[calc(100vh-64px)]">
                  <Communication role={userRole} announcements={data.announcements} onCreateAnnouncement={onCreateAnnouncement} />
                </div>
              )}

              {currentView === 'chats' && <Chats role={userRole} currentUserId={session.user.id} />}

              {currentView === 'notifications' && <Notifications onNavigate={onNavigateView} />}

              {currentView === 'enrollments' && <EnrollmentRecords role={userRole} />}

              {currentView === 'materials' && <LearningMaterials role={userRole} backendBaseUrl={backendBaseUrl} />}

              {currentView === 'gamified-learning' && (
                <GamifiedLearning role={userRole} userId={session.user.id} />
              )}

              {currentView === 'video-summarizer' && userRole === 'student' && <VideoSummarizer />}

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

              {currentView === 'milestones' && userRole === 'student' && <MilestonesView />}

              {currentView === 'performance' && (userRole === 'admin' || userRole === 'teacher') && (
                <Performance submissions={data.submissions} />
              )}

              {(currentView === 'assignments' || currentView === 'grades') && (
                <Assignments
                  assignments={data.assignments}
                  submissions={data.submissions}
                  role={userRole}
                  userId={session.user.id}
                  onCreateAssignment={onCreateAssignment}
                  onSubmitAssignment={onSubmitAssignment}
                  onGradeSubmission={onGradeSubmission}
                  backendBaseUrl={backendBaseUrl}
                />
              )}

              {currentView === 'users' && userRole === 'admin' && (
                <UsersView
                  users={data.users}
                  onAddUser={onAddUser}
                  onEditUser={onEditUser}
                  onDeleteUser={onDeleteUser}
                  onUploadProfileImage={onUploadProfileImage}
                />
              )}
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

  const handleSignup = async (fullName: string, email: string, pass: string) => {
    await apiClient.register({ fullName, email, password: pass });
  };

  const handleLogout = () => {
    apiClient.setToken(null);
    localStorage.removeItem('yunafied_token');
    setSession(null);
    setData({ users: [], schedules: [], assignments: [], submissions: [], announcements: [] });
    navigate('/login', { replace: true });
  };

  const addUser = async (input: {
    fullName: string;
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
      fullName: string;
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

  const createAssignment = async (payload: { title: string; description: string; dueDate: string }) => {
    const created = await apiClient.createAssignment(payload);
    setData((prev) => ({ ...prev, assignments: [created, ...prev.assignments] }));
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
    fullName: string;
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
    navigate(`/app/${view}`);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-indigo-600 animate-pulse">Loading System...</div>;
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            session ? (
              <Navigate to="/app/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} onSignup={handleSignup} />
            )
          }
        />
        <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
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
                onDeleteUser={deleteUser}
                onCreateSchedule={createSchedule}
                onRespondSchedule={respondSchedule}
                onMoveSchedule={moveSchedule}
                onCancelSchedule={cancelSchedule}
                onAdminEditSchedule={adminEditSchedule}
                onCreateAssignment={createAssignment}
                onSubmitAssignment={submitAssignment}
                onGradeSubmission={gradeSubmission}
                onCreateAnnouncement={createAnnouncement}
                onUploadProfileImage={uploadProfileImage}
                onUpdateMyProfile={updateMyProfile}
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

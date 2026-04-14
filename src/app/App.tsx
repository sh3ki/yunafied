import React, { useEffect, useMemo, useState } from 'react';
import { Login } from '@/app/components/Login';
import { Sidebar } from '@/app/components/Sidebar';
import { BottomNav } from '@/app/components/BottomNav';
import { Schedule } from '@/app/components/Schedule';
import { Assignments } from '@/app/components/Assignments';
import { UsersView } from '@/app/components/Users';
import { Communication } from '@/app/components/Communication';
import { GamifiedLearning } from '@/app/components/GamifiedLearning';
import { VideoSummarizer } from '@/app/components/VideoSummarizer';
import { WordTranslator } from '@/app/components/WordTranslator';
import { AIGuide } from '@/app/components/AIGuide';
import { ProfileSettings } from '@/app/components/ProfileSettings';
import { AIChatbot } from '@/app/components/AIChatbot';
import { MilestonesView } from '@/app/components/MilestonesView';
import { Performance } from '@/app/components/Performance';
import { Toaster, toast } from 'sonner';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import '@/styles/fonts.css';
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

const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ token: string; user: AuthUser } | null>(null);

  const [data, setData] = useState<AppData>({
    users: [],
    schedules: [],
    assignments: [],
    submissions: [],
    announcements: [],
  });

  const userRole: UserRole = session?.user.role || 'student';

  const dashboardStats = useMemo(() => {
    const pending = data.submissions.filter((s) => !s.grade).length;
    return {
      upcoming: data.schedules.length,
      assignments: data.assignments.length,
      users: data.users.length,
      pending,
    };
  }, [data]);

  const loadData = async (_role: UserRole) => {
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
        await loadData(user.role);
      } catch (_error) {
        apiClient.setToken(null);
        localStorage.removeItem('yunafied_token');
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const handleLogin = async (email: string, pass: string) => {
    const response = await apiClient.login(email, pass);
    apiClient.setToken(response.token);
    localStorage.setItem('yunafied_token', response.token);
    setSession({ token: response.token, user: response.user });
    await loadData(response.user.role);
  };

  const handleSignup = async (fullName: string, email: string, pass: string) => {
    await apiClient.register({ fullName, email, password: pass });
  };

  const handleLogout = () => {
    apiClient.setToken(null);
    localStorage.removeItem('yunafied_token');
    setSession(null);
    setData({ users: [], schedules: [], assignments: [], submissions: [], announcements: [] });
    setCurrentView('dashboard');
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

  const addSchedule = async (payload: {
    title: string;
    day: string;
    startTime: string;
    endTime: string;
  }) => {
    const created = await apiClient.createSchedule(payload);
    setData((prev) => ({ ...prev, schedules: [...prev.schedules, created] }));
  };

  const removeSchedule = async (id: string) => {
    await apiClient.deleteSchedule(id);
    setData((prev) => ({
      ...prev,
      schedules: prev.schedules.filter((s) => s.id !== id),
    }));
  };

  const createAssignment = async (payload: { title: string; description: string; dueDate: string }) => {
    const created = await apiClient.createAssignment(payload);
    setData((prev) => ({ ...prev, assignments: [created, ...prev.assignments] }));
  };

  const submitAssignment = async (
    assignmentId: string,
    input: { file?: File | null; contentText?: string },
  ) => {
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

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-indigo-600 animate-pulse">Loading System...</div>;
  }

  if (!session) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <Login onLogin={handleLogin} onSignup={handleSignup} />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 pb-16 md:pb-0">
      <Toaster position="top-right" richColors />

      <Sidebar
        role={userRole}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
        userEmail={session.user.email}
        user={{
          fullName: session.user.fullName,
          email: session.user.email,
          profileImageUrl: session.user.profileImageUrl,
        }}
      />
      <BottomNav role={userRole} currentView={currentView} onNavigate={setCurrentView} />
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
                    role={userRole}
                    userId={session.user.id}
                    onAdd={addSchedule}
                    onDelete={removeSchedule}
                  />
                </div>
              )}

              {currentView === 'schedule' && (
                <div className="p-4 md:p-8">
                  <Schedule
                    schedules={data.schedules}
                    role={userRole}
                    userId={session.user.id}
                    onAdd={addSchedule}
                    onDelete={removeSchedule}
                  />
                </div>
              )}

              {currentView === 'announcements' && (
                <div className="p-4 md:p-8 h-[calc(100vh-64px)]">
                  <Communication
                    role={userRole}
                    announcements={data.announcements}
                    onCreateAnnouncement={createAnnouncement}
                  />
                </div>
              )}

              {currentView === 'gamified-learning' && userRole === 'student' && <GamifiedLearning />}

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
                  onUpdateProfile={updateMyProfile}
                  onUploadProfileImage={uploadProfileImage}
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
                  onCreateAssignment={createAssignment}
                  onSubmitAssignment={submitAssignment}
                  onGradeSubmission={gradeSubmission}
                  backendBaseUrl={backendBaseUrl}
                />
              )}

              {currentView === 'users' && userRole === 'admin' && (
                <UsersView
                  users={data.users}
                  onAddUser={addUser}
                  onEditUser={editUser}
                  onDeleteUser={deleteUser}
                  onUploadProfileImage={uploadProfileImage}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

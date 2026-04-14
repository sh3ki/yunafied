import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApiClient } from '../api/client';
import {
  AnnouncementItem,
  AssignmentItem,
  AuthUser,
  BootstrapResponse,
  ScheduleItem,
  SubmissionItem,
  UserRole,
  UserStatus,
} from '../types/models';

type Session = { token: string; user: AuthUser } | null;

interface AppContextValue {
  loading: boolean;
  session: Session;
  data: BootstrapResponse;
  dashboardStats: { upcoming: number; assignments: number; users: number; pending: number };
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: {
    fullName: string;
    email: string;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<AuthUser>;
  addUser: (input: { fullName: string; email: string; role: UserRole; status: UserStatus; password: string }) => Promise<void>;
  editUser: (
    id: string,
    input: { fullName: string; email: string; role: UserRole; status: UserStatus; password?: string },
  ) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  createSchedule: (input: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId?: string;
    studentId?: string | null;
    requestNote?: string;
  }) => Promise<void>;
  respondToSchedule: (
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
  ) => Promise<void>;
  moveSchedule: (
    id: string,
    input: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ) => Promise<void>;
  cancelSchedule: (id: string, responseNote: string) => Promise<void>;
  adminEditSchedule: (
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
  ) => Promise<void>;
  createAssignment: (input: { title: string; description: string; dueDate: string }) => Promise<void>;
  submitAssignment: (assignmentId: string, input: { contentText?: string }) => Promise<void>;
  gradeSubmission: (submissionId: string, input: { grade: string; feedback: string }) => Promise<void>;
  createAnnouncement: (input: { title: string; content: string }) => Promise<void>;
}

const initialData: BootstrapResponse = {
  users: [],
  schedules: [],
  assignments: [],
  submissions: [],
  announcements: [],
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session>(null);
  const [data, setData] = useState<BootstrapResponse>(initialData);

  const dashboardStats = useMemo(() => {
    const pending = data.submissions.filter((s) => !s.grade).length;
    return {
      upcoming: data.schedules.length,
      assignments: data.assignments.length,
      users: data.users.length,
      pending,
    };
  }, [data]);

  const refresh = async () => {
    const bootstrap = await mobileApiClient.bootstrap();
    setData(bootstrap);
  };

  useEffect(() => {
    const restore = async () => {
      try {
        const token = await AsyncStorage.getItem('yunafied_mobile_token');
        if (!token) {
          setLoading(false);
          return;
        }

        mobileApiClient.setToken(token);
        const user = await mobileApiClient.me();
        setSession({ token, user });
        const bootstrap = await mobileApiClient.bootstrap();
        setData(bootstrap);
      } catch (_error) {
        await AsyncStorage.removeItem('yunafied_mobile_token');
        mobileApiClient.setToken(null);
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await mobileApiClient.login(email, password);
    mobileApiClient.setToken(response.token);
    await AsyncStorage.setItem('yunafied_mobile_token', response.token);
    setSession({ token: response.token, user: response.user });
    const bootstrap = await mobileApiClient.bootstrap();
    setData(bootstrap);
  };

  const signup = async (fullName: string, email: string, password: string) => {
    await mobileApiClient.register({ fullName, email, password });
  };

  const logout = async () => {
    mobileApiClient.setToken(null);
    await AsyncStorage.removeItem('yunafied_mobile_token');
    setSession(null);
    setData(initialData);
  };

  const updateProfile = async (input: {
    fullName: string;
    email: string;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const response = await mobileApiClient.updateProfile(input);
    setSession((prev) => (prev ? { ...prev, user: response.user } : prev));
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === response.user.id ? response.user : u)),
    }));
    return response.user;
  };

  const addUser = async (input: { fullName: string; email: string; role: UserRole; status: UserStatus; password: string }) => {
    const user = await mobileApiClient.createUser(input);
    setData((prev) => ({ ...prev, users: [user, ...prev.users] }));
  };

  const editUser = async (
    id: string,
    input: { fullName: string; email: string; role: UserRole; status: UserStatus; password?: string },
  ) => {
    const user = await mobileApiClient.updateUser(id, input);
    setData((prev) => ({ ...prev, users: prev.users.map((u) => (u.id === id ? user : u)) }));
  };

  const deleteUser = async (id: string) => {
    await mobileApiClient.deleteUser(id);
    setData((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== id) }));
  };

  const upsertSchedule = (schedule: ScheduleItem) => {
    setData((prev) => {
      const exists = prev.schedules.some((s) => s.id === schedule.id);
      return {
        ...prev,
        schedules: exists ? prev.schedules.map((s) => (s.id === schedule.id ? schedule : s)) : [schedule, ...prev.schedules],
      };
    });
  };

  const createSchedule = async (input: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId?: string;
    studentId?: string | null;
    requestNote?: string;
  }) => {
    const created = await mobileApiClient.createSchedule(input);
    upsertSchedule(created);
  };

  const respondToSchedule = async (
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
  ) => {
    const updated = await mobileApiClient.respondToSchedule(id, input);
    upsertSchedule(updated);
  };

  const moveSchedule = async (
    id: string,
    input: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ) => {
    const updated = await mobileApiClient.moveSchedule(id, input);
    upsertSchedule(updated);
  };

  const cancelSchedule = async (id: string, responseNote: string) => {
    const updated = await mobileApiClient.cancelSchedule(id, responseNote);
    upsertSchedule(updated);
  };

  const adminEditSchedule = async (
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
  ) => {
    const updated = await mobileApiClient.adminEditSchedule(id, input);
    upsertSchedule(updated);
  };

  const createAssignment = async (input: { title: string; description: string; dueDate: string }) => {
    const created = await mobileApiClient.createAssignment(input);
    setData((prev) => ({ ...prev, assignments: [created, ...prev.assignments] }));
  };

  const submitAssignment = async (assignmentId: string, input: { contentText?: string }) => {
    const submission = await mobileApiClient.submitAssignment(assignmentId, input);
    setData((prev) => {
      const filtered = prev.submissions.filter((s) => s.id !== submission.id);
      const older = filtered.filter(
        (s) => !(s.assignmentId === submission.assignmentId && s.studentId === submission.studentId),
      );
      return { ...prev, submissions: [submission, ...older] };
    });
  };

  const gradeSubmission = async (submissionId: string, input: { grade: string; feedback: string }) => {
    const graded = await mobileApiClient.gradeSubmission(submissionId, input);
    setData((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) => (s.id === submissionId ? graded : s)),
    }));
  };

  const createAnnouncement = async (input: { title: string; content: string }) => {
    const created = await mobileApiClient.createAnnouncement(input);
    setData((prev) => ({ ...prev, announcements: [created, ...prev.announcements] }));
  };

  const value: AppContextValue = {
    loading,
    session,
    data,
    dashboardStats,
    login,
    signup,
    logout,
    refresh,
    updateProfile,
    addUser,
    editUser,
    deleteUser,
    createSchedule,
    respondToSchedule,
    moveSchedule,
    cancelSchedule,
    adminEditSchedule,
    createAssignment,
    submitAssignment,
    gradeSubmission,
    createAnnouncement,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
}

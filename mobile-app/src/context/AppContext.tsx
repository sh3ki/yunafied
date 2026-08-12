import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApiClient } from '../api/client';
import Constants from 'expo-constants';
import {
  AnnouncementItem,
  AssignmentItem,
  AuthUser,
  BootstrapResponse,
  MeetingRoom,
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
  signup: (firstName: string, middleName: string, lastName: string, email: string, password: string) => Promise<{ needsVerification: boolean; email: string }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: {
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    profileImageUrl?: string | null;
    profileImagePublicId?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<AuthUser>;
  addUser: (input: { firstName: string; middleName?: string; lastName: string; email: string; role: UserRole; status: UserStatus; password: string }) => Promise<void>;
  editUser: (
    id: string,
    input: { firstName: string; middleName?: string; lastName: string; email: string; role: UserRole; status: UserStatus; password?: string },
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
  toggleAssignmentClosed: (assignmentId: string, isClosed: boolean) => Promise<void>;
  incomingCall: MeetingRoom | null;
  dismissIncomingCall: () => void;
  acceptCall: (roomToken: string) => Promise<void>;
  declineCall: (roomToken: string) => Promise<void>;
  activeCallToken: string | null;
  startVideoCall: (roomToken: string) => void;
  endVideoCall: () => void;
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
  const [incomingCall, setIncomingCall] = useState<MeetingRoom | null>(null);
  const [activeCallToken, setActiveCallToken] = useState<string | null>(null);
  const browserOpenedRef = useRef(false);
  const incomingCallPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCallPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startVideoCall = (roomToken: string) => setActiveCallToken(roomToken);
  const endVideoCall = () => setActiveCallToken(null);

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

  const signup = async (firstName: string, middleName: string, lastName: string, email: string, password: string): Promise<{ needsVerification: boolean; email: string }> => {
    return mobileApiClient.register({ firstName, middleName: middleName || undefined, lastName, email, password });
  };

  const verifyOtp = async (email: string, otp: string) => {
    const response = await mobileApiClient.verifyOtp(email, otp);
    mobileApiClient.setToken(response.token);
    await AsyncStorage.setItem('yunafied_mobile_token', response.token);
    setSession({ token: response.token, user: response.user });
    const bootstrap = await mobileApiClient.bootstrap();
    setData(bootstrap);
  };

  const resendOtp = async (email: string) => {
    await mobileApiClient.resendOtp(email);
  };

  const logout = async () => {
    mobileApiClient.setToken(null);
    await AsyncStorage.removeItem('yunafied_mobile_token');
    setSession(null);
    setData(initialData);
  };

  const updateProfile = async (input: {
    firstName: string;
    middleName?: string;
    lastName: string;
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

  const addUser = async (input: { firstName: string; middleName?: string; lastName: string; email: string; role: UserRole; status: UserStatus; password: string }) => {
    const user = await mobileApiClient.createUser(input);
    setData((prev) => ({ ...prev, users: [user, ...prev.users] }));
  };

  const editUser = async (
    id: string,
    input: { firstName: string; middleName?: string; lastName: string; email: string; role: UserRole; status: UserStatus; password?: string },
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

  const toggleAssignmentClosed = async (assignmentId: string, isClosed: boolean) => {
    const updated = await mobileApiClient.toggleAssignmentClosed(assignmentId, isClosed);
    setData((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => (a.id === assignmentId ? updated : a)),
    }));
  };

  const dismissIncomingCall = () => setIncomingCall(null);

  const acceptCall = async (roomToken: string) => {
    await mobileApiClient.updateMeetingStatus(roomToken, 'active');
    setIncomingCall(null);
    setActiveCallToken(roomToken);

    // Try to open the web video call in the device browser or in-app browser
    // Prefer expo web browser if available (allows programmatic dismissal), fallback to Linking via client code.
    try {
      // Build web URL from config
      const webBase = (Constants.expoConfig?.extra as any | undefined)?.apiUrl || 'https://www.yunafied.online';
      const url = `${webBase.replace(/\/$/, '')}/app/video-call/${roomToken}`;
      try {
        // dynamic require so app doesn't crash if module not installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const WebBrowser = require('expo-web-browser');
        if (WebBrowser && WebBrowser.openBrowserAsync) {
          await WebBrowser.openBrowserAsync(url);
          browserOpenedRef.current = true;
        } else {
          // fallback: the navigator will open a WebView/modal which itself opens Linking
        }
      } catch (_e) {
        // expo-web-browser not available; UI will trigger Linking/open externally when modal shows
      }
    } catch (_e) {
      // ignore open errors
    }
  };

  const declineCall = async (roomToken: string) => {
    await mobileApiClient.updateMeetingStatus(roomToken, 'declined');
    setIncomingCall(null);
  };

  // Poll for incoming calls every 6 seconds when a student is logged in
  useEffect(() => {
    if (!session || session.user.role !== 'student') {
      if (incomingCallPollRef.current) {
        clearInterval(incomingCallPollRef.current);
        incomingCallPollRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const call = await mobileApiClient.getIncomingCall();
        if (call && call.status === 'calling') {
          setIncomingCall(call);
        }
      } catch {
        // ignore poll errors
      }
    };

    poll();
    incomingCallPollRef.current = setInterval(poll, 6000);

    return () => {
      if (incomingCallPollRef.current) {
        clearInterval(incomingCallPollRef.current);
        incomingCallPollRef.current = null;
      }
    };
  }, [session]);

  // When an active call is set (we opened the web call), poll the meeting
  // status and automatically clear the active call + dismiss in-app browser
  useEffect(() => {
    if (!activeCallToken) {
      if (activeCallPollRef.current) {
        clearInterval(activeCallPollRef.current);
        activeCallPollRef.current = null;
      }
      return;
    }

    activeCallPollRef.current = setInterval(async () => {
      try {
        const room = await mobileApiClient.getMeeting(activeCallToken);
        if (!room) return;
        if (room.status === 'ended' || room.status === 'declined') {
          // try dismissing expo web browser if it was used
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const WebBrowser = require('expo-web-browser');
            if (WebBrowser && (WebBrowser.dismissBrowser || WebBrowser.dismissBrowserAsync)) {
              // prefer async if available
              if (WebBrowser.dismissBrowserAsync) await WebBrowser.dismissBrowserAsync();
              else WebBrowser.dismissBrowser();
            }
          } catch (_e) {
            // ignore
          }

          setActiveCallToken(null);
        }
      } catch (_e) {
        // ignore
      }
    }, 3000);

    return () => {
      if (activeCallPollRef.current) {
        clearInterval(activeCallPollRef.current);
        activeCallPollRef.current = null;
      }
    };
  }, [activeCallToken]);

  const value: AppContextValue = {
    loading,
    session,
    data,
    dashboardStats,
    login,
    signup,
    verifyOtp,
    resendOtp,
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
    toggleAssignmentClosed,
    incomingCall,
    dismissIncomingCall,
    acceptCall,
    declineCall,
    activeCallToken,
    startVideoCall,
    endVideoCall,
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

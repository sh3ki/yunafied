import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { mobileApiClient } from '../api/client';
import { useAppContext } from '../context/AppContext';
import {
  AssignmentItem,
  GamifiedAttemptResultItem,
  GamifiedCategoryItem,
  GamifiedLeaderboardItem,
  GamifiedQuizDetailItem,
  GamifiedQuizItem,
  SubmissionItem,
  TranslationHistoryItem,
  UserRole,
} from '../types/models';

const RootStack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f7f7fb',
    card: '#ffffff',
    primary: '#6d28d9',
    text: '#111827',
    border: '#e5e7eb',
    notification: '#7c3aed',
  },
};

function Shell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function PillButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function LandingScreen({ navigation }: any) {
  return (
    <SafeAreaView style={[styles.safe, styles.landingBg]}>
      <StatusBar style="light" />
      <View style={styles.landingWrap}>
        <Text style={styles.landingTag}>YUNAFIED MOBILE</Text>
        <Text style={styles.landingTitle}>Your tutorial system, now in your pocket.</Text>
        <Text style={styles.landingText}>
          Manage tutorials, classes, assignments, grades, and AI-powered study support in one mobile workspace.
        </Text>
        <PillButton label="Continue to Login" onPress={() => navigation.navigate('Login')} />
      </View>
    </SafeAreaView>
  );
}

function LoginScreen() {
  const { login, signup } = useAppContext();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    try {
      setBusy(true);
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        if (password !== confirmPassword) {
          Alert.alert('Validation', 'Passwords do not match.');
          return;
        }
        await signup(fullName.trim(), email.trim(), password);
        Alert.alert('Success', 'Account created. Please login.');
        setMode('login');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Welcome to YUNAFied" subtitle="Sign in to continue">
      <Card>
        {mode === 'signup' ? (
          <>
            <Text style={styles.label}>Full Name</Text>
            <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Juan Dela Cruz" />
          </>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="name@email.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="********"
        />

        {mode === 'signup' ? (
          <>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
              placeholder="********"
            />
          </>
        ) : null}

        <PillButton label={busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'} onPress={onSubmit} disabled={busy} />

        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.linkText}>
            {mode === 'login' ? 'Need an account? Sign up' : 'Already registered? Login'}
          </Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.smallTitle}>Demo Accounts</Text>
        <Text style={styles.muted}>Use password: password</Text>
        <Text style={styles.muted}>admin@yuna.edu | teacher@yuna.edu | student@yuna.edu</Text>
      </Card>
    </Shell>
  );
}

function DashboardScreen() {
  const { session, dashboardStats, data } = useAppContext();
  const user = session!.user;

  return (
    <Shell title={`Hello, ${user.fullName}`} subtitle="Dashboard overview">
      <View style={styles.rowWrap}>
        <Card>
          <Text style={styles.smallTitle}>Upcoming Classes</Text>
          <Text style={styles.bigValue}>{dashboardStats.upcoming}</Text>
        </Card>
        <Card>
          <Text style={styles.smallTitle}>Assignments</Text>
          <Text style={styles.bigValue}>{dashboardStats.assignments}</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.smallTitle}>{user.role === 'admin' ? 'Total Users' : 'Pending Reviews'}</Text>
        <Text style={styles.bigValue}>{user.role === 'admin' ? dashboardStats.users : dashboardStats.pending}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Today Schedule</Text>
        {data.schedules.length === 0 ? <Text style={styles.muted}>No schedules yet.</Text> : null}
        {data.schedules.slice(0, 5).map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.title}</Text>
            <Text style={styles.muted}>{`${item.day} | ${item.startTime} - ${item.endTime}`}</Text>
          </View>
        ))}
      </Card>
    </Shell>
  );
}

function ScheduleScreen() {
  const { data, session, createSchedule, respondToSchedule, moveSchedule, cancelSchedule, adminEditSchedule } = useAppContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [requestNote, setRequestNote] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [studentId, setStudentId] = useState('');

  const [actionDraft, setActionDraft] = useState<Record<string, {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  }>>({});

  const role = session!.user.role;
  const canManage = role === 'admin' || role === 'teacher';
  const isStudent = role === 'student';
  const teachers = data.users.filter((u) => u.role === 'teacher' && u.status === 'active');
  const students = data.users.filter((u) => u.role === 'student' && u.status === 'active');

  const getDraft = (id: string, fallback: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  }) => {
    return actionDraft[id] || fallback;
  };

  const patchDraft = (id: string, patch: Partial<{
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  }>) => {
    setActionDraft((prev) => {
      const current = prev[id] || {
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        note: '',
        status: 'pending' as const,
      };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  };

  const onAdd = async () => {
    try {
      if (!title.trim() || !description.trim()) {
        Alert.alert('Validation', 'Title and description are required.');
        return;
      }

      if (isStudent) {
        if (!teacherId) {
          Alert.alert('Validation', 'Please select a teacher.');
          return;
        }
        await createSchedule({
          title: title.trim(),
          description: description.trim(),
          date,
          startTime,
          endTime,
          teacherId,
          requestNote: requestNote.trim() || undefined,
        });
      } else {
        await createSchedule({
          title: title.trim(),
          description: description.trim(),
          date,
          startTime,
          endTime,
          teacherId: role === 'admin' ? teacherId || undefined : undefined,
          studentId: role === 'admin' ? studentId || null : undefined,
        });
      }

      setTitle('');
      setDescription('');
      setRequestNote('');
      setStudentId('');
      Alert.alert('Success', isStudent ? 'Schedule request sent.' : 'Schedule created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save schedule.');
    }
  };

  const onAccept = async (id: string) => {
    const draft = actionDraft[id];
    if (!draft) {
      Alert.alert('Validation', 'Please edit draft fields first.');
      return;
    }

    try {
      await respondToSchedule(id, {
        decision: 'accepted',
        title: draft.title,
        description: draft.description,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        responseNote: draft.note || undefined,
      });
      Alert.alert('Success', 'Schedule request accepted.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request.');
    }
  };

  const onDecline = async (id: string) => {
    const draft = actionDraft[id];
    if (!draft?.note?.trim()) {
      Alert.alert('Validation', 'Decline note is required.');
      return;
    }

    try {
      await respondToSchedule(id, {
        decision: 'declined',
        responseNote: draft.note.trim(),
      });
      Alert.alert('Success', 'Schedule request declined.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline request.');
    }
  };

  const onMove = async (id: string) => {
    const draft = actionDraft[id];
    if (!draft?.date || !draft.startTime || !draft.endTime) {
      Alert.alert('Validation', 'Date, start time, and end time are required.');
      return;
    }

    try {
      await moveSchedule(id, {
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        title: draft.title || undefined,
        description: draft.description || undefined,
      });
      Alert.alert('Success', 'Schedule moved.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to move schedule.');
    }
  };

  const onCancel = async (id: string) => {
    const draft = actionDraft[id];
    if (!draft?.note?.trim()) {
      Alert.alert('Validation', 'Cancellation note is required.');
      return;
    }

    try {
      await cancelSchedule(id, draft.note.trim());
      Alert.alert('Success', 'Schedule cancelled.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel schedule.');
    }
  };

  const onAdminSave = async (id: string) => {
    const draft = actionDraft[id];
    if (!draft) {
      Alert.alert('Validation', 'Please edit draft fields first.');
      return;
    }

    try {
      await adminEditSchedule(id, {
        title: draft.title,
        description: draft.description,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        status: draft.status,
      });
      Alert.alert('Success', 'Schedule updated by admin.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update schedule.');
    }
  };

  return (
    <Shell title="Schedules" subtitle="Requests, approvals, and timetable management">
      {canManage ? (
        <Card>
          <Text style={styles.sectionTitle}>Create Schedule</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Subject title" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textarea]}
            placeholder="Description"
            multiline
          />
          <TextInput value={date} onChangeText={setDate} style={styles.input} placeholder="YYYY-MM-DD" />
          <View style={styles.rowWrap}>
            <TextInput value={startTime} onChangeText={setStartTime} style={[styles.input, styles.half]} placeholder="HH:MM" />
            <TextInput value={endTime} onChangeText={setEndTime} style={[styles.input, styles.half]} placeholder="HH:MM" />
          </View>

          {role === 'admin' ? (
            <>
              <Text style={styles.label}>Assign Teacher</Text>
              <View style={styles.chipWrap}>
                {teachers.map((teacher) => (
                  <Pressable key={teacher.id} onPress={() => setTeacherId(teacher.id)} style={[styles.chip, teacherId === teacher.id ? styles.chipActive : null]}>
                    <Text style={teacherId === teacher.id ? styles.chipActiveText : styles.chipText}>{teacher.fullName}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Optional Student</Text>
              <View style={styles.chipWrap}>
                <Pressable onPress={() => setStudentId('')} style={[styles.chip, studentId === '' ? styles.chipActive : null]}>
                  <Text style={studentId === '' ? styles.chipActiveText : styles.chipText}>Unassigned</Text>
                </Pressable>
                {students.map((student) => (
                  <Pressable key={student.id} onPress={() => setStudentId(student.id)} style={[styles.chip, studentId === student.id ? styles.chipActive : null]}>
                    <Text style={studentId === student.id ? styles.chipActiveText : styles.chipText}>{student.fullName}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <PillButton label="Create Schedule" onPress={onAdd} />
        </Card>
      ) : null}

      {isStudent ? (
        <Card>
          <Text style={styles.sectionTitle}>Request Teacher Schedule</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Subject title" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textarea]}
            placeholder="Description"
            multiline
          />
          <TextInput value={date} onChangeText={setDate} style={styles.input} placeholder="YYYY-MM-DD" />
          <View style={styles.rowWrap}>
            <TextInput value={startTime} onChangeText={setStartTime} style={[styles.input, styles.half]} placeholder="HH:MM" />
            <TextInput value={endTime} onChangeText={setEndTime} style={[styles.input, styles.half]} placeholder="HH:MM" />
          </View>

          <Text style={styles.label}>Choose Teacher</Text>
          <View style={styles.chipWrap}>
            {teachers.map((teacher) => (
              <Pressable key={teacher.id} onPress={() => setTeacherId(teacher.id)} style={[styles.chip, teacherId === teacher.id ? styles.chipActive : null]}>
                <Text style={teacherId === teacher.id ? styles.chipActiveText : styles.chipText}>{teacher.fullName}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={requestNote}
            onChangeText={setRequestNote}
            style={[styles.input, styles.textarea]}
            placeholder="Optional note to teacher"
            multiline
          />
          <PillButton label="Request Schedule" onPress={onAdd} />
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>All Schedules</Text>
        {data.schedules.map((item) => (
          <View key={item.id} style={styles.listItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.description}</Text>
              <Text style={styles.muted}>{`${item.date} (${item.day}) ${item.startTime}-${item.endTime}`}</Text>
              <Text style={styles.muted}>Teacher: {item.teacherName}</Text>
              <Text style={styles.muted}>Student: {item.studentName || 'Unassigned'}</Text>
              <Text style={styles.muted}>Status: {item.status}</Text>
              {item.requestNote ? <Text style={styles.muted}>Request Note: {item.requestNote}</Text> : null}
              {item.responseNote ? <Text style={styles.muted}>Note: {item.responseNote}</Text> : null}

              {(canManage && (role === 'admin' || item.teacherId === session!.user.id)) ? (
                <View style={{ marginTop: 8, gap: 8 }}>
                  <TextInput
                    value={getDraft(item.id, {
                      title: item.title,
                      description: item.description,
                      date: item.date,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      note: item.responseNote || '',
                      status: item.status,
                    }).title}
                    onChangeText={(value) => patchDraft(item.id, { title: value })}
                    style={styles.input}
                    placeholder="Edit title"
                  />
                  <TextInput
                    value={getDraft(item.id, {
                      title: item.title,
                      description: item.description,
                      date: item.date,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      note: item.responseNote || '',
                      status: item.status,
                    }).description}
                    onChangeText={(value) => patchDraft(item.id, { description: value })}
                    style={[styles.input, styles.textarea]}
                    placeholder="Edit description"
                    multiline
                  />
                  <View style={styles.rowWrap}>
                    <TextInput
                      value={getDraft(item.id, {
                        title: item.title,
                        description: item.description,
                        date: item.date,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        note: item.responseNote || '',
                        status: item.status,
                      }).date}
                      onChangeText={(value) => patchDraft(item.id, { date: value })}
                      style={[styles.input, styles.half]}
                      placeholder="YYYY-MM-DD"
                    />
                    <TextInput
                      value={getDraft(item.id, {
                        title: item.title,
                        description: item.description,
                        date: item.date,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        note: item.responseNote || '',
                        status: item.status,
                      }).startTime}
                      onChangeText={(value) => patchDraft(item.id, { startTime: value })}
                      style={[styles.input, styles.half]}
                      placeholder="HH:MM"
                    />
                    <TextInput
                      value={getDraft(item.id, {
                        title: item.title,
                        description: item.description,
                        date: item.date,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        note: item.responseNote || '',
                        status: item.status,
                      }).endTime}
                      onChangeText={(value) => patchDraft(item.id, { endTime: value })}
                      style={[styles.input, styles.half]}
                      placeholder="HH:MM"
                    />
                  </View>
                  <TextInput
                    value={getDraft(item.id, {
                      title: item.title,
                      description: item.description,
                      date: item.date,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      note: item.responseNote || '',
                      status: item.status,
                    }).note}
                    onChangeText={(value) => patchDraft(item.id, { note: value })}
                    style={[styles.input, styles.textarea]}
                    placeholder="Teacher/Admin note"
                    multiline
                  />

                  {role === 'admin' ? (
                    <TextInput
                      value={getDraft(item.id, {
                        title: item.title,
                        description: item.description,
                        date: item.date,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        note: item.responseNote || '',
                        status: item.status,
                      }).status}
                      onChangeText={(value) => patchDraft(item.id, { status: value as any })}
                      style={styles.input}
                      placeholder="pending|accepted|declined|cancelled"
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            {(role === 'teacher' && item.teacherId === session!.user.id && item.status === 'pending') ? (
              <View style={{ gap: 8 }}>
                <Pressable onPress={() => onAccept(item.id)}>
                  <Text style={styles.linkInline}>Accept</Text>
                </Pressable>
                <Pressable onPress={() => onDecline(item.id)}>
                  <Text style={styles.dangerText}>Decline</Text>
                </Pressable>
              </View>
            ) : null}

            {(canManage && (role === 'admin' || item.teacherId === session!.user.id)) ? (
              <View style={{ gap: 8 }}>
                <Pressable onPress={() => onMove(item.id)}>
                  <Text style={styles.linkInline}>Move</Text>
                </Pressable>
                <Pressable onPress={() => onCancel(item.id)}>
                  <Text style={styles.dangerText}>Cancel</Text>
                </Pressable>
                {role === 'admin' ? (
                  <Pressable onPress={() => onAdminSave(item.id)}>
                    <Text style={styles.linkInline}>Admin Save</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ))}
      </Card>
    </Shell>
  );
}

type QuizQuestionDraft = {
  prompt: string;
  points: string;
  choices: [string, string, string, string];
  correctIndex: number;
};

const createEmptyQuestionDraft = (): QuizQuestionDraft => ({
  prompt: '',
  points: '1000',
  choices: ['', '', '', ''],
  correctIndex: 0,
});

function GamifiedLearningScreen() {
  const { session } = useAppContext();
  const role = session!.user.role;
  const canManage = role === 'admin' || role === 'teacher';

  const [busy, setBusy] = useState(true);
  const [categories, setCategories] = useState<GamifiedCategoryItem[]>([]);
  const [quizzes, setQuizzes] = useState<GamifiedQuizItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<GamifiedLeaderboardItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [timePerQuestionSeconds, setTimePerQuestionSeconds] = useState('20');
  const [quizPublished, setQuizPublished] = useState(true);
  const [questionDrafts, setQuestionDrafts] = useState<QuizQuestionDraft[]>([createEmptyQuestionDraft()]);

  const [playingQuiz, setPlayingQuiz] = useState<GamifiedQuizDetailItem | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedChoiceId: string | null; timeRemainingSeconds: number }>>({});
  const [attemptResult, setAttemptResult] = useState<GamifiedAttemptResultItem | null>(null);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);

  const loadData = async (preferredCategoryId?: string) => {
    try {
      setBusy(true);
      const nextCategories = await mobileApiClient.listGamifiedCategories();
      setCategories(nextCategories);

      const fallbackCategoryId =
        preferredCategoryId ||
        (nextCategories.some((category) => category.id === selectedCategoryId) ? selectedCategoryId : nextCategories[0]?.id || '');

      setSelectedCategoryId(fallbackCategoryId);

      const nextQuizzes = await mobileApiClient.listGamifiedQuizzes(
        fallbackCategoryId ? { categoryId: fallbackCategoryId } : undefined,
      );
      setQuizzes(nextQuizzes);

      if (fallbackCategoryId) {
        const nextLeaderboard = await mobileApiClient.listGamifiedLeaderboard({ categoryId: fallbackCategoryId, limit: 10 });
        setLeaderboard(nextLeaderboard);
      } else {
        setLeaderboard([]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load gamified data.');
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (!playingQuiz || submittingAttempt) {
      return;
    }

    if (timeRemaining <= 0) {
      const currentQuestion = playingQuiz.questions[activeQuestionIndex];
      if (currentQuestion) {
        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            selectedChoiceId: prev[currentQuestion.id]?.selectedChoiceId || null,
            timeRemainingSeconds: 0,
          },
        }));
      }

      if (activeQuestionIndex >= playingQuiz.questions.length - 1) {
        const submitFromTimer = async () => {
          await submitAttempt();
        };
        submitFromTimer();
      } else {
        setActiveQuestionIndex((prev) => prev + 1);
        setTimeRemaining(playingQuiz.timePerQuestionSeconds);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [playingQuiz, activeQuestionIndex, timeRemaining, submittingAttempt]);

  const resetQuizEditor = () => {
    setEditingQuizId(null);
    setQuizTitle('');
    setQuizDescription('');
    setTimePerQuestionSeconds('20');
    setQuizPublished(true);
    setQuestionDrafts([createEmptyQuestionDraft()]);
  };

  const addCategory = async () => {
    try {
      if (!categoryName.trim()) {
        Alert.alert('Validation', 'Category name is required.');
        return;
      }

      const created = await mobileApiClient.createGamifiedCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });

      setCategoryName('');
      setCategoryDescription('');
      await loadData(created.id);
      Alert.alert('Success', 'Category created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create category.');
    }
  };

  const patchQuestion = (index: number, patch: Partial<QuizQuestionDraft>) => {
    setQuestionDrafts((prev) => prev.map((question, qIndex) => (qIndex === index ? { ...question, ...patch } : question)));
  };

  const patchChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    setQuestionDrafts((prev) =>
      prev.map((question, qIndex) => {
        if (qIndex !== questionIndex) {
          return question;
        }

        const nextChoices = [...question.choices] as [string, string, string, string];
        nextChoices[choiceIndex] = value;
        return { ...question, choices: nextChoices };
      }),
    );
  };

  const addQuestionDraft = () => {
    setQuestionDrafts((prev) => [...prev, createEmptyQuestionDraft()]);
  };

  const removeQuestionDraft = (index: number) => {
    setQuestionDrafts((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_question, qIndex) => qIndex !== index);
    });
  };

  const saveQuiz = async () => {
    try {
      if (!selectedCategoryId) {
        Alert.alert('Validation', 'Please select a category first.');
        return;
      }

      if (!quizTitle.trim()) {
        Alert.alert('Validation', 'Quiz title is required.');
        return;
      }

      const normalizedTime = Number.parseInt(timePerQuestionSeconds, 10);
      if (!Number.isFinite(normalizedTime) || normalizedTime < 5 || normalizedTime > 120) {
        Alert.alert('Validation', 'Time per question must be between 5 and 120 seconds.');
        return;
      }

      const normalizedQuestions = questionDrafts.map((question, index) => {
        if (!question.prompt.trim()) {
          throw new Error(`Question ${index + 1} prompt is required.`);
        }

        const points = Number.parseInt(question.points, 10);
        if (!Number.isFinite(points) || points < 1 || points > 5000) {
          throw new Error(`Question ${index + 1} points must be between 1 and 5000.`);
        }

        const trimmedChoices = question.choices.map((choice) => choice.trim());
        const hasEmptyChoice = trimmedChoices.some((choice) => !choice);
        if (hasEmptyChoice) {
          throw new Error(`Question ${index + 1} requires 4 non-empty choices.`);
        }

        return {
          prompt: question.prompt.trim(),
          points,
          choices: trimmedChoices.map((text, choiceIndex) => ({
            text,
            isCorrect: choiceIndex === question.correctIndex,
          })),
        };
      });

      const payload = {
        categoryId: selectedCategoryId,
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        timePerQuestionSeconds: normalizedTime,
        isPublished: quizPublished,
        questions: normalizedQuestions,
      };

      if (editingQuizId) {
        await mobileApiClient.updateGamifiedQuiz(editingQuizId, payload);
      } else {
        await mobileApiClient.createGamifiedQuiz(payload);
      }

      resetQuizEditor();
      await loadData(selectedCategoryId);
      Alert.alert('Success', editingQuizId ? 'Quiz updated.' : 'Quiz created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save quiz.');
    }
  };

  const editQuiz = async (quizId: string) => {
    try {
      const detail = await mobileApiClient.getGamifiedQuiz(quizId);
      setEditingQuizId(detail.id);
      setSelectedCategoryId(detail.categoryId);
      setQuizTitle(detail.title);
      setQuizDescription(detail.description || '');
      setTimePerQuestionSeconds(String(detail.timePerQuestionSeconds));
      setQuizPublished(detail.isPublished);

      const mappedQuestions = detail.questions.map((question) => {
        const orderedChoices = [...question.choices].sort((a, b) => a.order - b.order);
        const normalizedChoices: [string, string, string, string] = [
          orderedChoices[0]?.text || '',
          orderedChoices[1]?.text || '',
          orderedChoices[2]?.text || '',
          orderedChoices[3]?.text || '',
        ];
        const foundCorrectIndex = Math.max(0, orderedChoices.findIndex((choice) => !!choice.isCorrect));

        return {
          prompt: question.prompt,
          points: String(question.points),
          choices: normalizedChoices,
          correctIndex: foundCorrectIndex,
        };
      });

      setQuestionDrafts(mappedQuestions.length ? mappedQuestions : [createEmptyQuestionDraft()]);
      Alert.alert('Ready', 'Quiz loaded in editor.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load quiz.');
    }
  };

  const selectCategory = async (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setAttemptResult(null);
    setPlayingQuiz(null);

    try {
      const [nextQuizzes, nextLeaderboard] = await Promise.all([
        mobileApiClient.listGamifiedQuizzes({ categoryId }),
        mobileApiClient.listGamifiedLeaderboard({ categoryId, limit: 10 }),
      ]);
      setQuizzes(nextQuizzes);
      setLeaderboard(nextLeaderboard);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to switch category.');
    }
  };

  const startQuiz = async (quizId: string) => {
    try {
      const detail = await mobileApiClient.getGamifiedQuiz(quizId);
      if (!detail.questions.length) {
        Alert.alert('Validation', 'This quiz has no questions yet.');
        return;
      }

      setPlayingQuiz(detail);
      setActiveQuestionIndex(0);
      setTimeRemaining(detail.timePerQuestionSeconds);
      setAnswers({});
      setAttemptResult(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start quiz.');
    }
  };

  const submitAttempt = async () => {
    if (!playingQuiz || submittingAttempt) {
      return;
    }

    try {
      setSubmittingAttempt(true);
      const payloadAnswers = playingQuiz.questions.map((question) => ({
        questionId: question.id,
        selectedChoiceId: answers[question.id]?.selectedChoiceId || null,
        timeRemainingSeconds: answers[question.id]?.timeRemainingSeconds || 0,
      }));

      const result = await mobileApiClient.submitGamifiedAttempt(playingQuiz.id, { answers: payloadAnswers });
      setAttemptResult(result);
      setPlayingQuiz(null);

      if (selectedCategoryId) {
        const nextLeaderboard = await mobileApiClient.listGamifiedLeaderboard({ categoryId: selectedCategoryId, limit: 10 });
        setLeaderboard(nextLeaderboard);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit attempt.');
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const currentQuestion = playingQuiz?.questions[activeQuestionIndex];

  const goNextQuestion = async () => {
    if (!playingQuiz || !currentQuestion) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        selectedChoiceId: prev[currentQuestion.id]?.selectedChoiceId || null,
        timeRemainingSeconds: prev[currentQuestion.id]?.timeRemainingSeconds ?? timeRemaining,
      },
    }));

    if (activeQuestionIndex >= playingQuiz.questions.length - 1) {
      await submitAttempt();
      return;
    }

    setActiveQuestionIndex((prev) => prev + 1);
    setTimeRemaining(playingQuiz.timePerQuestionSeconds);
  };

  const selectChoice = (questionId: string, choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedChoiceId: choiceId,
        timeRemainingSeconds: timeRemaining,
      },
    }));
  };

  const visibleQuizzes = quizzes.filter((quiz) => (selectedCategoryId ? quiz.categoryId === selectedCategoryId : true));

  return (
    <Shell title="Gamified Learning" subtitle="Create quizzes, play timed rounds, and climb the leaderboard">
      <Card>
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.chipWrap}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => selectCategory(category.id)}
              style={[styles.chip, selectedCategoryId === category.id ? styles.chipActive : null]}
            >
              <Text style={selectedCategoryId === category.id ? styles.chipActiveText : styles.chipText}>{category.name}</Text>
            </Pressable>
          ))}
        </View>
        {!categories.length ? <Text style={styles.muted}>No categories yet.</Text> : null}
      </Card>

      {canManage ? (
        <Card>
          <Text style={styles.sectionTitle}>Create Category</Text>
          <TextInput value={categoryName} onChangeText={setCategoryName} style={styles.input} placeholder="Category name" />
          <TextInput
            value={categoryDescription}
            onChangeText={setCategoryDescription}
            style={[styles.input, styles.textarea]}
            placeholder="Category description"
            multiline
          />
          <PillButton label="Add Category" onPress={addCategory} />
        </Card>
      ) : null}

      {canManage ? (
        <Card>
          <Text style={styles.sectionTitle}>{editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</Text>
          <TextInput value={quizTitle} onChangeText={setQuizTitle} style={styles.input} placeholder="Quiz title" />
          <TextInput
            value={quizDescription}
            onChangeText={setQuizDescription}
            style={[styles.input, styles.textarea]}
            placeholder="Quiz description"
            multiline
          />
          <TextInput
            value={timePerQuestionSeconds}
            onChangeText={setTimePerQuestionSeconds}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Seconds per question"
          />

          <View style={styles.rowWrap}>
            <PillButton
              label={quizPublished ? 'Published' : 'Draft'}
              onPress={() => setQuizPublished((prev) => !prev)}
            />
            {editingQuizId ? <PillButton label="Cancel Edit" onPress={resetQuizEditor} /> : null}
          </View>

          {questionDrafts.map((question, qIndex) => (
            <View key={`question-${qIndex}`} style={styles.editorQuestionCard}>
              <Text style={styles.smallTitle}>Question {qIndex + 1}</Text>
              <TextInput
                value={question.prompt}
                onChangeText={(value) => patchQuestion(qIndex, { prompt: value })}
                style={[styles.input, styles.textarea]}
                placeholder="Question prompt"
                multiline
              />
              <TextInput
                value={question.points}
                onChangeText={(value) => patchQuestion(qIndex, { points: value })}
                style={styles.input}
                keyboardType="number-pad"
                placeholder="Points"
              />

              {question.choices.map((choice, cIndex) => (
                <View key={`question-${qIndex}-choice-${cIndex}`} style={styles.choiceEditorRow}>
                  <Pressable
                    onPress={() => patchQuestion(qIndex, { correctIndex: cIndex })}
                    style={[styles.answerDot, question.correctIndex === cIndex ? styles.answerDotActive : null]}
                  />
                  <TextInput
                    value={choice}
                    onChangeText={(value) => patchChoice(qIndex, cIndex, value)}
                    style={[styles.input, styles.flexGrow]}
                    placeholder={`Choice ${cIndex + 1}`}
                  />
                </View>
              ))}

              <Pressable onPress={() => removeQuestionDraft(qIndex)}>
                <Text style={styles.dangerText}>Remove Question</Text>
              </Pressable>
            </View>
          ))}

          <PillButton label="Add Question" onPress={addQuestionDraft} />
          <PillButton label={editingQuizId ? 'Save Changes' : 'Create Quiz'} onPress={saveQuiz} />
        </Card>
      ) : null}

      {playingQuiz && currentQuestion ? (
        <Card>
          <Text style={styles.sectionTitle}>{playingQuiz.title}</Text>
          <Text style={styles.muted}>{`Question ${activeQuestionIndex + 1} of ${playingQuiz.questions.length}`}</Text>
          <Text style={[styles.timerText, timeRemaining <= 5 ? styles.timerDanger : null]}>{`Time Left: ${timeRemaining}s`}</Text>
          <Text style={styles.listTitle}>{currentQuestion.prompt}</Text>

          {currentQuestion.choices.map((choice) => {
            const selected = answers[currentQuestion.id]?.selectedChoiceId === choice.id;
            return (
              <Pressable
                key={choice.id}
                onPress={() => selectChoice(currentQuestion.id, choice.id)}
                style={[styles.choiceButton, selected ? styles.choiceButtonActive : null]}
              >
                <Text style={selected ? styles.choiceButtonTextActive : styles.choiceButtonText}>{choice.text}</Text>
              </Pressable>
            );
          })}

          <PillButton
            label={activeQuestionIndex >= playingQuiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
            onPress={() => {
              goNextQuestion();
            }}
            disabled={submittingAttempt}
          />
        </Card>
      ) : null}

      {attemptResult ? (
        <Card>
          <Text style={styles.sectionTitle}>Latest Result</Text>
          <Text style={styles.bigValue}>{attemptResult.totalScore}</Text>
          <Text style={styles.muted}>{`Correct: ${attemptResult.correctAnswers}/${attemptResult.totalQuestions}`}</Text>
          <Text style={styles.muted}>{`Completed: ${new Date(attemptResult.completedAt).toLocaleString()}`}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Quizzes</Text>
        {!visibleQuizzes.length ? <Text style={styles.muted}>No quizzes found in this category.</Text> : null}
        {visibleQuizzes.map((quiz) => (
          <View key={quiz.id} style={styles.listItemRow}>
            <View style={styles.flexGrow}>
              <Text style={styles.listTitle}>{quiz.title}</Text>
              <Text style={styles.muted}>{quiz.description || 'No description'}</Text>
              <Text style={styles.muted}>{`${quiz.questionCount} questions | ${quiz.timePerQuestionSeconds}s/question`}</Text>
              <Text style={styles.muted}>{`Status: ${quiz.isPublished ? 'Published' : 'Draft'}`}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {canManage ? (
                <Pressable onPress={() => editQuiz(quiz.id)}>
                  <Text style={styles.linkInline}>Edit</Text>
                </Pressable>
              ) : null}
              {role === 'student' ? (
                <Pressable onPress={() => startQuiz(quiz.id)}>
                  <Text style={styles.linkInline}>Play</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {!selectedCategoryId ? <Text style={styles.muted}>Select a category to view leaderboard.</Text> : null}
        {selectedCategoryId && leaderboard.length === 0 ? <Text style={styles.muted}>No attempts yet.</Text> : null}
        {leaderboard.map((entry, index) => (
          <View key={entry.studentId} style={styles.listItemRow}>
            <View style={styles.flexGrow}>
              <Text style={styles.listTitle}>{`${index + 1}. ${entry.studentName}`}</Text>
              <Text style={styles.muted}>{`Best Score: ${entry.bestScore}`}</Text>
              <Text style={styles.muted}>{`Best Accuracy: ${entry.bestCorrectAnswers}/${entry.totalQuestions}`}</Text>
            </View>
            <Text style={styles.muted}>{`${entry.attemptCount} attempts`}</Text>
          </View>
        ))}
      </Card>

      {busy ? (
        <Card>
          <Text style={styles.muted}>Loading gamified data...</Text>
        </Card>
      ) : null}
    </Shell>
  );
}

function AnnouncementsScreen() {
  const { data, session, createAnnouncement } = useAppContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const canCreate = session!.user.role === 'admin' || session!.user.role === 'teacher';

  const onCreate = async () => {
    try {
      await createAnnouncement({ title, content });
      setTitle('');
      setContent('');
      Alert.alert('Success', 'Announcement posted.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post announcement.');
    }
  };

  return (
    <Shell title="Announcements" subtitle="School and class updates">
      {canCreate ? (
        <Card>
          <Text style={styles.sectionTitle}>Create Announcement</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Title" />
          <TextInput
            value={content}
            onChangeText={setContent}
            style={[styles.input, styles.textarea]}
            placeholder="Write announcement"
            multiline
          />
          <PillButton label="Post Announcement" onPress={onCreate} />
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Recent</Text>
        {data.announcements.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.title}</Text>
            <Text style={styles.muted}>{item.content}</Text>
            <Text style={styles.muted}>By {item.postedByName}</Text>
          </View>
        ))}
      </Card>
    </Shell>
  );
}

function AssignmentsScreen() {
  const { data, session, createAssignment, submitAssignment, gradeSubmission } = useAppContext();
  const role = session!.user.role;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('2026-12-31');
  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});
  const [gradeMap, setGradeMap] = useState<Record<string, { grade: string; feedback: string }>>({});

  const canCreate = role === 'admin' || role === 'teacher';
  const isStudent = role === 'student';

  const onCreate = async () => {
    try {
      await createAssignment({ title, description, dueDate });
      setTitle('');
      setDescription('');
      Alert.alert('Success', 'Assignment created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create assignment.');
    }
  };

  const onSubmit = async (assignmentId: string) => {
    try {
      await submitAssignment(assignmentId, { contentText: submissionText[assignmentId] || '' });
      setSubmissionText((prev) => ({ ...prev, [assignmentId]: '' }));
      Alert.alert('Success', 'Submission sent.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit assignment.');
    }
  };

  const onGrade = async (submissionId: string) => {
    try {
      const payload = gradeMap[submissionId];
      await gradeSubmission(submissionId, {
        grade: payload?.grade || 'N/A',
        feedback: payload?.feedback || 'Reviewed',
      });
      Alert.alert('Success', 'Submission graded.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to grade submission.');
    }
  };

  const submissionsByAssignment = useMemo(() => {
    const map = new Map<string, SubmissionItem[]>();
    data.submissions.forEach((s) => {
      if (!map.has(s.assignmentId)) {
        map.set(s.assignmentId, []);
      }
      map.get(s.assignmentId)!.push(s);
    });
    return map;
  }, [data.submissions]);

  return (
    <Shell title="Assignments" subtitle="Create, submit, and review tasks">
      {canCreate ? (
        <Card>
          <Text style={styles.sectionTitle}>Create Assignment</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Title" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textarea]}
            placeholder="Description"
            multiline
          />
          <TextInput value={dueDate} onChangeText={setDueDate} style={styles.input} placeholder="YYYY-MM-DD" />
          <PillButton label="Create Assignment" onPress={onCreate} />
        </Card>
      ) : null}

      {data.assignments.map((assignment: AssignmentItem) => (
        <Card key={assignment.id}>
          <Text style={styles.listTitle}>{assignment.title}</Text>
          <Text style={styles.muted}>{assignment.description}</Text>
          <Text style={styles.muted}>Due: {assignment.dueDate}</Text>
          <Text style={styles.muted}>Teacher: {assignment.teacherName}</Text>

          {isStudent ? (
            <>
              <TextInput
                value={submissionText[assignment.id] || ''}
                onChangeText={(value) => setSubmissionText((prev) => ({ ...prev, [assignment.id]: value }))}
                style={[styles.input, styles.textarea]}
                placeholder="Write your submission"
                multiline
              />
              <PillButton label="Submit" onPress={() => onSubmit(assignment.id)} />
            </>
          ) : null}

          {!isStudent ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionTitle}>Submissions</Text>
              {(submissionsByAssignment.get(assignment.id) || []).map((submission) => (
                <View key={submission.id} style={styles.listItem}>
                  <Text style={styles.listTitle}>{submission.studentName}</Text>
                  <Text style={styles.muted}>{submission.contentText || 'No text submission'}</Text>
                  <TextInput
                    value={gradeMap[submission.id]?.grade || ''}
                    onChangeText={(value) =>
                      setGradeMap((prev) => ({
                        ...prev,
                        [submission.id]: { grade: value, feedback: prev[submission.id]?.feedback || '' },
                      }))
                    }
                    style={styles.input}
                    placeholder="Grade"
                  />
                  <TextInput
                    value={gradeMap[submission.id]?.feedback || ''}
                    onChangeText={(value) =>
                      setGradeMap((prev) => ({
                        ...prev,
                        [submission.id]: { grade: prev[submission.id]?.grade || '', feedback: value },
                      }))
                    }
                    style={[styles.input, styles.textarea]}
                    placeholder="Feedback"
                    multiline
                  />
                  <PillButton label="Save Grade" onPress={() => onGrade(submission.id)} />
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ))}
    </Shell>
  );
}

function GradesScreen() {
  const { data, session } = useAppContext();
  const mySubs = data.submissions.filter((s) => s.studentId === session!.user.id);

  return (
    <Shell title="Grades & Feedback" subtitle="Track your performance">
      {mySubs.map((item) => (
        <Card key={item.id}>
          <Text style={styles.listTitle}>{item.assignmentTitle}</Text>
          <Text style={styles.muted}>Grade: {item.grade || 'Pending'}</Text>
          <Text style={styles.muted}>Feedback: {item.feedback || 'Not yet reviewed'}</Text>
        </Card>
      ))}
      {mySubs.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No submissions yet.</Text>
        </Card>
      ) : null}
    </Shell>
  );
}

function SimpleInfoScreen({ title, subtitle, body }: { title: string; subtitle: string; body: string }) {
  return (
    <Shell title={title} subtitle={subtitle}>
      <Card>
        <Text style={styles.muted}>{body}</Text>
      </Card>
    </Shell>
  );
}

function WordTranslatorScreen() {
  const [text, setText] = useState('');
  const [translated, setTranslated] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [targetLanguage, setTargetLanguage] = useState('Korean');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);

  const loadHistory = async (nextPage = 1, keyword = '') => {
    try {
      const result = await mobileApiClient.listTranslationHistory({ page: nextPage, pageSize: 6, search: keyword });
      setHistory(result.rows);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load history.');
    }
  };

  React.useEffect(() => {
    loadHistory(1, '');
  }, []);

  const translate = async () => {
    if (!text.trim()) {
      return;
    }

    try {
      setBusy(true);
      const result = await mobileApiClient.translateText({ text, sourceLanguage, targetLanguage });
      setTranslated(result.translatedText);
      await loadHistory(1, search);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Translation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Word Translator" subtitle="AI translation with saved history">
      <Card>
        <Text style={styles.label}>Source Language</Text>
        <TextInput value={sourceLanguage} onChangeText={setSourceLanguage} style={styles.input} />
        <Text style={styles.label}>Target Language</Text>
        <TextInput value={targetLanguage} onChangeText={setTargetLanguage} style={styles.input} />
        <TextInput
          value={text}
          onChangeText={setText}
          style={[styles.input, styles.textarea]}
          multiline
          placeholder="Enter text to translate"
        />
        <PillButton label={busy ? 'Translating...' : 'Translate'} onPress={translate} disabled={busy} />
        {translated ? (
          <View style={styles.resultBox}>
            <Text style={styles.listTitle}>Result</Text>
            <Text style={styles.muted}>{translated}</Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>History</Text>
        <TextInput value={search} onChangeText={setSearch} style={styles.input} placeholder="Search history" />
        <PillButton label="Search" onPress={() => loadHistory(1, search)} />

        {history.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.muted}>{`${item.sourceLanguage} -> ${item.targetLanguage}`}</Text>
            <Text style={styles.listTitle}>{item.sourceText}</Text>
            <Text style={styles.muted}>{item.translatedText}</Text>
          </View>
        ))}

        <View style={styles.rowWrap}>
          <PillButton label="Prev" onPress={() => loadHistory(Math.max(1, page - 1), search)} disabled={page <= 1} />
          <PillButton label={`Page ${page}/${totalPages}`} onPress={() => {}} disabled />
          <PillButton label="Next" onPress={() => loadHistory(Math.min(totalPages, page + 1), search)} disabled={page >= totalPages} />
        </View>
      </Card>
    </Shell>
  );
}

function AIGuideScreen() {
  const [subject, setSubject] = useState('General');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Study Guide. Ask me about any topic and I will guide you step-by-step.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const content = input.trim();
    if (!content) {
      return;
    }

    const userMessage = { role: 'user' as const, content };
    const history = [...messages.slice(1), userMessage].slice(-10);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      setBusy(true);
      const result = await mobileApiClient.askStudyGuide({
        message: content,
        subject: subject === 'General' ? undefined : subject,
        history,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.answer }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to get AI response.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="AI Study Guide" subtitle="Guided learning conversations">
      <Card>
        <Text style={styles.label}>Subject</Text>
        <TextInput value={subject} onChangeText={setSubject} style={styles.input} />
      </Card>

      <Card>
        {messages.map((m, index) => (
          <View key={`${m.role}-${index}`} style={[styles.chatBubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={m.role === 'user' ? styles.userText : styles.aiText}>{m.content}</Text>
          </View>
        ))}

        <TextInput
          value={input}
          onChangeText={setInput}
          style={[styles.input, styles.textarea]}
          multiline
          placeholder="Ask your question"
        />
        <PillButton label={busy ? 'Thinking...' : 'Send'} onPress={send} disabled={busy} />
      </Card>
    </Shell>
  );
}

function PerformanceScreen() {
  const { data } = useAppContext();

  const stats = useMemo(() => {
    const graded = data.submissions.filter((s) => !!s.grade);
    const gradedCount = graded.length;
    return {
      totalSubmissions: data.submissions.length,
      gradedCount,
      pendingCount: data.submissions.length - gradedCount,
    };
  }, [data.submissions]);

  return (
    <Shell title="Performance" subtitle="Class submission summary">
      <View style={styles.rowWrap}>
        <Card>
          <Text style={styles.smallTitle}>Total Submissions</Text>
          <Text style={styles.bigValue}>{stats.totalSubmissions}</Text>
        </Card>
        <Card>
          <Text style={styles.smallTitle}>Graded</Text>
          <Text style={styles.bigValue}>{stats.gradedCount}</Text>
        </Card>
      </View>
      <Card>
        <Text style={styles.smallTitle}>Pending Review</Text>
        <Text style={styles.bigValue}>{stats.pendingCount}</Text>
      </Card>
    </Shell>
  );
}

function UsersScreen() {
  const { data, addUser, editUser, deleteUser } = useAppContext();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [password, setPassword] = useState('password');

  const create = async () => {
    try {
      await addUser({ fullName, email, role, status, password });
      setFullName('');
      setEmail('');
      Alert.alert('Success', 'User created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create user.');
    }
  };

  const toggleStatus = async (id: string, currentStatus: 'active' | 'inactive', row: any) => {
    try {
      await editUser(id, {
        fullName: row.fullName,
        email: row.email,
        role: row.role,
        status: currentStatus === 'active' ? 'inactive' : 'active',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update user.');
    }
  };

  return (
    <Shell title="Users" subtitle="Admin user management">
      <Card>
        <Text style={styles.sectionTitle}>Create User</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Full name" />
        <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" autoCapitalize="none" />
        <TextInput value={role} onChangeText={(text) => setRole(text as UserRole)} style={styles.input} placeholder="Role" />
        <TextInput value={status} onChangeText={(text) => setStatus(text as 'active' | 'inactive')} style={styles.input} placeholder="Status" />
        <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" />
        <PillButton label="Add User" onPress={create} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>All Users</Text>
        {data.users.map((user) => (
          <View key={user.id} style={styles.listItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{user.fullName}</Text>
              <Text style={styles.muted}>{user.email}</Text>
              <Text style={styles.muted}>{`${user.role} | ${user.status}`}</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable onPress={() => toggleStatus(user.id, user.status, user)}>
                <Text style={styles.linkInline}>Toggle</Text>
              </Pressable>
              <Pressable onPress={() => deleteUser(user.id)}>
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
    </Shell>
  );
}

function ProfileScreen() {
  const { session, updateProfile } = useAppContext();
  const [fullName, setFullName] = useState(session!.user.fullName);
  const [email, setEmail] = useState(session!.user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const save = async () => {
    try {
      await updateProfile({
        fullName,
        email,
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Success', 'Profile updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    }
  };

  return (
    <Shell title="Profile Settings" subtitle="Manage account details">
      <Card>
        <Text style={styles.label}>Full Name</Text>
        <TextInput value={fullName} onChangeText={setFullName} style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />

        <Text style={styles.label}>Current Password</Text>
        <TextInput value={currentPassword} onChangeText={setCurrentPassword} style={styles.input} secureTextEntry />

        <Text style={styles.label}>New Password</Text>
        <TextInput value={newPassword} onChangeText={setNewPassword} style={styles.input} secureTextEntry />

        <PillButton label="Save Changes" onPress={save} />
      </Card>
    </Shell>
  );
}

function CustomDrawerContent(props: any) {
  const { session, logout } = useAppContext();

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerName}>{session?.user.fullName}</Text>
        <Text style={styles.drawerEmail}>{session?.user.email}</Text>
        <Text style={styles.drawerRole}>{session?.user.role.toUpperCase()}</Text>
      </View>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Sign Out"
        onPress={() => {
          logout();
        }}
      />
    </DrawerContentScrollView>
  );
}

function DrawerArea() {
  const { session } = useAppContext();
  const role = session!.user.role;

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#6d28d9' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#6d28d9',
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Schedule" component={ScheduleScreen} />
      <Drawer.Screen name="Announcements" component={AnnouncementsScreen} />

      {(role === 'teacher' || role === 'student' || role === 'admin') ? (
        <Drawer.Screen name="Assignments" component={AssignmentsScreen} />
      ) : null}

      {role === 'student' ? <Drawer.Screen name="Grades" component={GradesScreen} /> : null}
      {(role === 'teacher' || role === 'student' || role === 'admin') ? (
        <Drawer.Screen name="Gamified Learning" component={GamifiedLearningScreen} />
      ) : null}

      {role === 'student' ? (
        <Drawer.Screen
          name="Video Summarizer"
          children={() => (
            <SimpleInfoScreen
              title="Video Summarizer"
              subtitle="Condense learning videos"
              body="Paste lecture notes or transcript text and use YUNA tools to summarize key ideas quickly."
            />
          )}
        />
      ) : null}

      {role === 'student' ? <Drawer.Screen name="Word Translator" component={WordTranslatorScreen} /> : null}
      {role === 'student' ? <Drawer.Screen name="AI Guide" component={AIGuideScreen} /> : null}

      {role === 'student' ? (
        <Drawer.Screen
          name="Milestones"
          children={() => (
            <SimpleInfoScreen
              title="Milestones"
              subtitle="Track learning goals"
              body="Set target outcomes and monitor your progress as you complete sessions and assignments."
            />
          )}
        />
      ) : null}

      {(role === 'admin' || role === 'teacher') ? <Drawer.Screen name="Performance" component={PerformanceScreen} /> : null}
      {role === 'admin' ? <Drawer.Screen name="Users" component={UsersScreen} /> : null}
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { loading, session } = useAppContext();

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#6d28d9" />
        <Text style={styles.muted}>Loading mobile workspace...</Text>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {session ? (
        <DrawerArea />
      ) : (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Landing" component={LandingScreen} />
          <RootStack.Screen name="Login" component={LoginScreen} />
        </RootStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f7f7fb',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  landingBg: {
    backgroundColor: '#0f172a',
  },
  landingWrap: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 14,
  },
  landingTag: {
    color: '#a5b4fc',
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  landingTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 34,
    lineHeight: 40,
  },
  landingText: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 22,
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  header: {
    gap: 4,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ede9fe',
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  smallTitle: {
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  bigValue: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textarea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  label: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#6d28d9',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 10,
  },
  flexGrow: {
    flex: 1,
  },
  half: {
    flex: 1,
  },
  editorQuestionCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: '#fafafa',
  },
  choiceEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  answerDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#a78bfa',
    backgroundColor: '#ffffff',
  },
  answerDotActive: {
    backgroundColor: '#6d28d9',
    borderColor: '#6d28d9',
  },
  timerText: {
    color: '#6d28d9',
    fontWeight: '700',
  },
  timerDanger: {
    color: '#dc2626',
  },
  choiceButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  choiceButtonActive: {
    borderColor: '#6d28d9',
    backgroundColor: '#f5f3ff',
  },
  choiceButtonText: {
    color: '#1f2937',
    fontWeight: '500',
  },
  choiceButtonTextActive: {
    color: '#5b21b6',
    fontWeight: '700',
  },
  listItem: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    gap: 3,
  },
  listItemRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    paddingBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listTitle: {
    fontWeight: '700',
    color: '#111827',
    fontSize: 14,
  },
  muted: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
  },
  dangerText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  linkText: {
    color: '#6d28d9',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  linkInline: {
    color: '#6d28d9',
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#f5f3ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: '#6d28d9',
    backgroundColor: '#6d28d9',
  },
  chipText: {
    color: '#5b21b6',
    fontSize: 12,
    fontWeight: '600',
  },
  chipActiveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  chatBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#6d28d9',
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  aiBubble: {
    backgroundColor: '#eef2ff',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#1f2937',
  },
  resultBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#f5f3ff',
    padding: 10,
    gap: 6,
  },
  drawerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  drawerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  drawerEmail: {
    color: '#6b7280',
    marginTop: 4,
  },
  drawerRole: {
    marginTop: 8,
    color: '#6d28d9',
    fontWeight: '700',
    fontSize: 12,
  },
});

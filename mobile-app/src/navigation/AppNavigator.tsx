import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
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
  AuditLogItem,
  CallHistoryItem,
  ChatMessageItem,
  ChatSummaryItem,
  EnrollmentRecordItem,
  GamifiedAttemptResultItem,
  GamifiedCategoryItem,
  GamifiedLeaderboardItem,
  GamifiedQuizDetailItem,
  GamifiedQuizItem,
  LearningMaterialItem,
  MeetingRoom,
  MessageUserItem,
  NotificationItem,
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
      <View style={styles.screenHeader}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
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
  const logoUri = 'https://www.yunafied.online/yunafied%20logo.png';
  const features = [
    { icon: '👥', title: 'Role-Based Access', text: 'Dedicated modules for admin, teacher, and student.' },
    { icon: '📅', title: 'Smart Scheduling', text: 'Conflict-free timetable with request workflows.' },
    { icon: '📚', title: 'Assignments & Grades', text: 'Submission tracking, grading, and feedback.' },
    { icon: '✨', title: 'AI Learning Tools', text: 'YUNA AI, translator, guide, and gamified quizzes.' },
  ];
  return (
    <SafeAreaView style={styles.landingBg}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.landingScroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.landingHeader}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.landingBrandName}>YUNAFied</Text>
            <Text style={styles.landingBrandSub}>AI-Powered Tutorial System</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.landingLoginBtn}>
            <Text style={styles.landingLoginBtnText}>Login</Text>
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.landingHero}>
          <View style={styles.landingBadge}>
            <Text style={styles.landingBadgeText}>Built for Students & Teachers</Text>
          </View>
          <Text style={styles.landingTitle}>
            Smarter Tutorials,{' '}
            <Text style={styles.landingTitleAccent}>Guided by YUNA AI</Text>
          </Text>
          <Text style={styles.landingText}>
            Manage schedules, assignments, grading, AI learning support, and more in one unified platform for admins, teachers, and students.
          </Text>
          <View style={styles.landingActions}>
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.landingGetStartedBtn}>
              <Text style={styles.landingGetStartedText}>Get Started</Text>
            </Pressable>
          </View>
        </View>

        {/* Feature Cards */}
        <View style={styles.landingFeatureGrid}>
          {features.map((f) => (
            <View key={f.title} style={styles.landingFeatureCard}>
              <Text style={styles.landingFeatureIcon}>{f.icon}</Text>
              <Text style={styles.landingFeatureTitle}>{f.title}</Text>
              <Text style={styles.landingFeatureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Purpose Section */}
        <View style={styles.landingPurpose}>
          <Text style={styles.landingPurposeTitle}>System Purpose</Text>
          <Text style={styles.landingPurposeText}>
            YUNAFied supports tutorial operations and student success through structured management tools plus AI assistance.
          </Text>
          <View style={styles.landingRoleRow}>
            <View style={[styles.landingRoleCard, { borderColor: '#a78bfa' }]}>
              <Text style={[styles.landingRoleTitle, { color: '#c4b5fd' }]}>Administration</Text>
              <Text style={styles.landingRoleText}>User governance, analytics, and platform control.</Text>
            </View>
            <View style={[styles.landingRoleCard, { borderColor: '#67e8f9' }]}>
              <Text style={[styles.landingRoleTitle, { color: '#a5f3fc' }]}>Instruction</Text>
              <Text style={styles.landingRoleText}>Scheduling, assignments, and announcements.</Text>
            </View>
            <View style={[styles.landingRoleCard, { borderColor: '#f0abfc' }]}>
              <Text style={[styles.landingRoleTitle, { color: '#f5d0fe' }]}>Student Growth</Text>
              <Text style={styles.landingRoleText}>Milestones, AI study support, and translation.</Text>
            </View>
          </View>
        </View>

        {/* CTA Footer */}
        <View style={styles.landingCta}>
          <PillButton label="Get Started — Login" onPress={() => navigation.navigate('Login')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginScreen() {
  const { login, signup, verifyOtp, resendOtp } = useAppContext();
  const [mode, setMode] = useState<'login' | 'signup' | 'otp' | 'forgot' | 'reset'>('login');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // OTP state (email verify + password reset)
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const enterOtpMode = (forEmail: string) => {
    setPendingEmail(forEmail);
    setOtpValue('');
    setResendCountdown(60);
    setMode('otp');
  };

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
        const result = await signup(firstName.trim(), middleName.trim(), lastName.trim(), email.trim(), password);
        if (result.needsVerification) {
          Alert.alert('Check your email', 'A 6-digit verification code has been sent to ' + result.email);
          enterOtpMode(result.email);
        }
      }
    } catch (error: any) {
      if (error.needsVerification) {
        Alert.alert('Verify your email', 'A new code has been sent to ' + (error.email || email.trim()));
        enterOtpMode(error.email || email.trim());
      } else {
        Alert.alert('Error', error.message || 'Authentication failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      Alert.alert('Validation', 'Please enter the complete 6-digit code.');
      return;
    }
    try {
      setBusy(true);
      await verifyOtp(pendingEmail, otpValue);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid or expired code.');
      setOtpValue('');
    } finally {
      setBusy(false);
    }
  };

  const onResendOtp = async () => {
    if (resendCountdown > 0) return;
    try {
      await resendOtp(pendingEmail);
      setResendCountdown(60);
      setOtpValue('');
      Alert.alert('Code sent', 'A new verification code has been sent to your email.');
    } catch {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  };

  const onForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Validation', 'Please enter your email address first.');
      return;
    }
    try {
      setBusy(true);
      await mobileApiClient.forgotPassword(trimmedEmail);
      setPendingEmail(trimmedEmail);
      setOtpValue('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResendCountdown(60);
      setMode('reset');
      Alert.alert('Code sent', `A reset code has been sent to ${trimmedEmail}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset code.');
    } finally {
      setBusy(false);
    }
  };

  const onResetPassword = async () => {
    if (otpValue.length !== 6) {
      Alert.alert('Validation', 'Please enter the 6-digit code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
    try {
      setBusy(true);
      await mobileApiClient.resetPassword(pendingEmail, otpValue, newPassword);
      Alert.alert('Success', 'Password reset successfully. You can now log in.');
      setMode('login');
      setOtpValue('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password.');
    } finally {
      setBusy(false);
    }
  };

  const onResendResetOtp = async () => {
    if (resendCountdown > 0) return;
    try {
      await mobileApiClient.forgotPassword(pendingEmail);
      setResendCountdown(60);
      setOtpValue('');
      Alert.alert('Code sent', 'A new reset code has been sent.');
    } catch {
      Alert.alert('Error', 'Failed to resend reset code.');
    }
  };

  const logoUri = 'https://www.yunafied.online/yunafied%20logo.png';

  if (mode === 'forgot') {
    return (
      <SafeAreaView style={styles.loginBg}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.loginLogoRow}>
            <View style={styles.logoWrap}><Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" /></View>
            <View>
              <Text style={styles.loginBrand}>YUNAFied</Text>
              <Text style={styles.loginBrandSub}>AI-Powered Tutorial System</Text>
            </View>
          </View>
          <View style={styles.loginCard}>
            <Text style={styles.loginCardTitle}>Forgot Password</Text>
            <Text style={styles.loginCardSub}>Enter your email to receive a reset code</Text>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="name@email.com"
              placeholderTextColor="#9ca3af"
            />
            <PillButton label={busy ? 'Sending...' : 'Send Reset Code'} onPress={onForgotPassword} disabled={busy} />
            <Pressable onPress={() => setMode('login')}>
              <Text style={styles.linkText}>← Back to login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'otp') {
    return (
      <SafeAreaView style={styles.loginBg}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.loginLogoRow}>
            <View style={styles.logoWrap}><Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" /></View>
            <View>
              <Text style={styles.loginBrand}>YUNAFied</Text>
              <Text style={styles.loginBrandSub}>AI-Powered Tutorial System</Text>
            </View>
          </View>
          <View style={styles.loginCard}>
            <Text style={styles.loginCardTitle}>Verify Your Email</Text>
            <Text style={styles.loginCardSub}>Enter the 6-digit code sent to {pendingEmail}</Text>
            <Text style={styles.label}>6-Digit Code</Text>
            <TextInput
              value={otpValue}
              onChangeText={(v) => setOtpValue(v.replace(/\D/g, '').slice(0, 6))}
              style={[styles.input, { textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: 'bold' }]}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#9ca3af"
            />
            <PillButton label={busy ? 'Verifying...' : 'Verify & Continue'} onPress={onVerifyOtp} disabled={busy || otpValue.length !== 6} />
            <Pressable onPress={onResendOtp} disabled={resendCountdown > 0}>
              <Text style={[styles.linkText, resendCountdown > 0 && { opacity: 0.4 }]}>
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Code'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setMode('login')}>
              <Text style={styles.linkText}>← Back to login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'reset') {
    return (
      <SafeAreaView style={styles.loginBg}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.loginLogoRow}>
            <View style={styles.logoWrap}><Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" /></View>
            <View>
              <Text style={styles.loginBrand}>YUNAFied</Text>
              <Text style={styles.loginBrandSub}>AI-Powered Tutorial System</Text>
            </View>
          </View>
          <View style={styles.loginCard}>
            <Text style={styles.loginCardTitle}>Reset Password</Text>
            <Text style={styles.loginCardSub}>Enter the code sent to {pendingEmail}</Text>
            <Text style={styles.label}>6-Digit Reset Code</Text>
            <TextInput
              value={otpValue}
              onChangeText={(v) => setOtpValue(v.replace(/\D/g, '').slice(0, 6))}
              style={[styles.input, { textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: 'bold' }]}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.label}>New Password</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor="#9ca3af" />
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor="#9ca3af" />
            <PillButton label={busy ? 'Resetting...' : 'Reset Password'} onPress={onResetPassword} disabled={busy || otpValue.length !== 6} />
            <Pressable onPress={onResendResetOtp} disabled={resendCountdown > 0}>
              <Text style={[styles.linkText, resendCountdown > 0 && { opacity: 0.4 }]}>
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Code'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setMode('login')}>
              <Text style={styles.linkText}>← Back to login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.loginBg}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.loginScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.loginLogoRow}>
          <View style={styles.logoWrap}><Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" /></View>
          <View>
            <Text style={styles.loginBrand}>YUNAFied</Text>
            <Text style={styles.loginBrandSub}>AI-Powered Tutorial System</Text>
          </View>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.loginCardSub}>{mode === 'login' ? 'Sign in to your workspace' : 'Join the YUNAFied platform'}</Text>

          {mode === 'signup' ? (
            <>
              <Text style={styles.label}>First Name</Text>
              <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="Juan" placeholderTextColor="#9ca3af" />
              <Text style={styles.label}>Middle Name (optional)</Text>
              <TextInput value={middleName} onChangeText={setMiddleName} style={styles.input} placeholder="Santos" placeholderTextColor="#9ca3af" />
              <Text style={styles.label}>Last Name</Text>
              <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="Dela Cruz" placeholderTextColor="#9ca3af" />
            </>
          ) : null}

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="name@email.com"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
          />

          {mode === 'signup' ? (
            <>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
              />
            </>
          ) : null}

          <PillButton label={busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'} onPress={onSubmit} disabled={busy} />

          <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.linkText}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already registered? Sign in'}
            </Text>
          </Pressable>

          {mode === 'login' ? (
            <Pressable onPress={() => { setMode('forgot'); }}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  const [editTarget, setEditTarget] = useState<{ id: string; title: string; content: string } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const canCreate = session!.user.role === 'admin' || session!.user.role === 'teacher';
  const userId = session!.user.id;
  const [localAnnouncements, setLocalAnnouncements] = useState(data.announcements);

  React.useEffect(() => {
    setLocalAnnouncements(data.announcements);
  }, [data.announcements]);

  const onCreate = async () => {
    try {
      setSaving(true);
      await createAnnouncement({ title, content });
      setTitle('');
      setContent('');
      Alert.alert('Success', 'Announcement posted.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post announcement.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: { id: string; title: string; content: string }) => {
    setEditTarget(item);
    setEditTitle(item.title);
    setEditContent(item.content);
  };

  const onEditSave = async () => {
    if (!editTarget) return;
    try {
      setSaving(true);
      const updated = await mobileApiClient.updateAnnouncement(editTarget.id, { title: editTitle, content: editContent });
      setLocalAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setEditTarget(null);
      Alert.alert('Success', 'Announcement updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update announcement.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (item: { id: string; title: string }) => {
    Alert.alert('Confirm Delete', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await mobileApiClient.deleteAnnouncement(item.id);
            setLocalAnnouncements((prev) => prev.filter((a) => a.id !== item.id));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete announcement.');
          }
        }
      },
    ]);
  };

  const canManage = (postedById: string) =>
    session!.user.role === 'admin' || postedById === userId;

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
          <PillButton label={saving ? 'Posting...' : 'Post Announcement'} onPress={onCreate} disabled={saving} />
        </Card>
      ) : null}

      {editTarget ? (
        <Card>
          <Text style={styles.sectionTitle}>Edit Announcement</Text>
          <TextInput value={editTitle} onChangeText={setEditTitle} style={styles.input} placeholder="Title" />
          <TextInput
            value={editContent}
            onChangeText={setEditContent}
            style={[styles.input, styles.textarea]}
            placeholder="Content"
            multiline
          />
          <View style={styles.rowWrap}>
            <PillButton label={saving ? 'Saving...' : 'Save Changes'} onPress={onEditSave} disabled={saving} />
            <Pressable onPress={() => setEditTarget(null)} style={{ alignSelf: 'center' }}>
              <Text style={styles.dangerText}>Cancel</Text>
            </Pressable>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Recent</Text>
        {localAnnouncements.length === 0 ? <Text style={styles.muted}>No announcements yet.</Text> : null}
        {localAnnouncements.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.rowBetween}>
              <Text style={[styles.listTitle, { flex: 1 }]}>{item.title}</Text>
              {canManage(item.postedById) ? (
                <View style={styles.rowWrap}>
                  <Pressable onPress={() => openEdit(item)} style={{ marginLeft: 8 }}>
                    <Text style={styles.linkInline}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => onDelete(item)} style={{ marginLeft: 8 }}>
                    <Text style={styles.dangerText}>Delete</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <Text style={styles.muted}>{item.content}</Text>
            <Text style={styles.muted}>By {item.postedByName}</Text>
          </View>
        ))}
      </Card>
    </Shell>
  );
}

function AssignmentsScreen() {
  const { data, session, createAssignment, submitAssignment, gradeSubmission, toggleAssignmentClosed } = useAppContext();
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

  const onToggleClose = async (assignment: AssignmentItem) => {
    try {
      await toggleAssignmentClosed(assignment.id, !assignment.isClosed);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle assignment status.');
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

      {data.assignments.map((assignment: AssignmentItem) => {
        const mySubmission = isStudent
          ? data.submissions.find((s) => s.assignmentId === assignment.id && s.studentId === session!.user.id)
          : undefined;

        return (
          <Card key={assignment.id}>
            <View style={styles.rowBetween}>
              <Text style={[styles.listTitle, { flex: 1 }]}>{assignment.title}</Text>
              {assignment.isClosed ? (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedBadgeText}>CLOSED</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.muted}>{assignment.description}</Text>
            <Text style={styles.muted}>Due: {assignment.dueDate}</Text>
            <Text style={styles.muted}>Teacher: {assignment.teacherName}</Text>

            {assignment.attachmentUrl ? (
              <Pressable onPress={() => Linking.openURL(assignment.attachmentUrl!)}>
                <Text style={styles.linkInline}>📎 {assignment.attachmentFileName || 'Download Attachment'}</Text>
              </Pressable>
            ) : null}

            {canCreate ? (
              <Pressable onPress={() => onToggleClose(assignment)} style={styles.toggleBtn}>
                <Text style={styles.toggleBtnText}>
                  {assignment.isClosed ? '🔓 Re-open Submissions' : '🔒 Close Submissions'}
                </Text>
              </Pressable>
            ) : null}

            {isStudent && !mySubmission ? (
              assignment.isClosed ? (
                <View style={styles.closedNotice}>
                  <Text style={styles.closedNoticeText}>🔒 Submissions are closed for this assignment.</Text>
                </View>
              ) : (
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
              )
            ) : null}

            {isStudent && mySubmission ? (
              <View style={styles.submittedBadge}>
                <Text style={styles.submittedText}>
                  ✅ Submitted{mySubmission.grade ? ` — Grade: ${mySubmission.grade}` : ''}
                </Text>
                {mySubmission.feedback ? <Text style={styles.muted}>Feedback: {mySubmission.feedback}</Text> : null}
              </View>
            ) : null}

            {!isStudent ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.sectionTitle}>Submissions</Text>
                {(submissionsByAssignment.get(assignment.id) || []).map((submission) => (
                  <View key={submission.id} style={styles.listItem}>
                    <Text style={styles.listTitle}>{submission.studentName}</Text>
                    {submission.fileUrl ? (
                      <Pressable onPress={() => Linking.openURL(submission.fileUrl!)}>
                        <Text style={styles.linkInline}>📄 {submission.fileName || 'View File'}</Text>
                      </Pressable>
                    ) : null}
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
                {!(submissionsByAssignment.get(assignment.id) || []).length ? (
                  <Text style={styles.muted}>No submissions yet.</Text>
                ) : null}
              </View>
            ) : null}
          </Card>
        );
      })}
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

function LearningMaterialsScreen() {
  const { session } = useAppContext();
  const role = session!.user.role;
  const canManage = role === 'admin' || role === 'teacher';
  const [materials, setMaterials] = useState<LearningMaterialItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setBusy(true);
      const items = await mobileApiClient.listLearningMaterials();
      setMaterials(items);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load materials.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const bySubject = useMemo(() => {
    const map = new Map<string, LearningMaterialItem[]>();
    materials.forEach((m) => {
      if (!map.has(m.subject)) map.set(m.subject, []);
      map.get(m.subject)!.push(m);
    });
    return map;
  }, [materials]);

  const addLink = async () => {
    if (!title.trim() || !subject.trim() || !url.trim()) {
      Alert.alert('Validation', 'Title, subject, and URL are required.');
      return;
    }
    try {
      setSaving(true);
      await mobileApiClient.createLearningMaterialLink({
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim() || undefined,
        url: url.trim(),
      });
      setTitle(''); setSubject(''); setDescription(''); setUrl('');
      await load();
      Alert.alert('Success', 'Learning material added.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add material.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await mobileApiClient.deleteLearningMaterial(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove material.');
    }
  };

  return (
    <Shell title="Learning Materials" subtitle="Access and manage study resources by subject">
      {canManage ? (
        <Card>
          <Text style={styles.sectionTitle}>Add Link Material</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Title" />
          <TextInput value={subject} onChangeText={setSubject} style={styles.input} placeholder="Subject" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textarea]}
            placeholder="Description (optional)"
            multiline
          />
          <TextInput
            value={url}
            onChangeText={setUrl}
            style={styles.input}
            placeholder="https://..."
            autoCapitalize="none"
          />
          <PillButton label={saving ? 'Saving...' : 'Add Material'} onPress={addLink} disabled={saving} />
        </Card>
      ) : null}
      {busy ? (
        <Card>
          <ActivityIndicator color="#6d28d9" />
        </Card>
      ) : null}
      {!busy && materials.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No learning materials available yet.</Text>
        </Card>
      ) : null}
      {Array.from(bySubject.entries()).map(([subj, items]) => (
        <Card key={subj}>
          <Text style={styles.sectionTitle}>{subj}</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.rowBetween}>
                <Text style={[styles.listTitle, { flex: 1 }]}>{item.title}</Text>
                {canManage ? (
                  <Pressable onPress={() => remove(item.id)}>
                    <Text style={styles.dangerText}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
              {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
              <Text style={styles.muted}>By {item.createdByName}</Text>
              <Pressable onPress={() => Linking.openURL(item.resourceUrl)}>
                <Text style={styles.linkInline}>
                  {item.materialType === 'file' ? '📄 Download File' : '🔗 Open Link'}
                </Text>
              </Pressable>
            </View>
          ))}
        </Card>
      ))}
    </Shell>
  );
}

function EnrollmentsScreen() {
  const { session, data } = useAppContext();
  const [enrollments, setEnrollments] = useState<EnrollmentRecordItem[]>([]);
  const [busy, setBusy] = useState(false);
  const role = session!.user.role;
  const isAdmin = role === 'admin';

  const students = useMemo(() => data.users.filter((u) => u.role === 'student' && u.status === 'active'), [data.users]);
  const teachers = useMemo(() => data.users.filter((u) => u.role === 'teacher' && u.status === 'active'), [data.users]);

  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [tutorialGroup, setTutorialGroup] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setBusy(true);
      const items = await mobileApiClient.listEnrollments();
      setEnrollments(items);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load enrollments.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const myEnrollments = useMemo(() => {
    if (role === 'student') return enrollments.filter((e) => e.studentId === session!.user.id);
    if (role === 'teacher') return enrollments.filter((e) => e.teacherId === session!.user.id);
    return enrollments;
  }, [enrollments, role, session]);

  const statusColor = (status: string) => {
    if (status === 'active') return '#16a34a';
    if (status === 'completed') return '#2563eb';
    return '#dc2626';
  };

  const onCreate = async () => {
    if (!studentId || !teacherId || !subject.trim()) {
      Alert.alert('Validation', 'Student, teacher, and subject are required.');
      return;
    }
    try {
      setSaving(true);
      await mobileApiClient.createEnrollment({
        studentId,
        teacherId,
        subject: subject.trim(),
        tutorialGroup: tutorialGroup.trim() || undefined,
        note: note.trim() || undefined,
      });
      setStudentId(''); setTeacherId(''); setSubject(''); setTutorialGroup(''); setNote('');
      await load();
      Alert.alert('Success', 'Enrollment created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create enrollment.');
    } finally {
      setSaving(false);
    }
  };

  const onUpdateStatus = async (id: string, status: string) => {
    try {
      await mobileApiClient.updateEnrollment(id, { status });
      await load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update enrollment.');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await mobileApiClient.deleteEnrollment(id);
      setEnrollments((prev) => prev.filter((e) => e.id !== id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete enrollment.');
    }
  };

  return (
    <Shell title="Enrollments" subtitle={isAdmin ? 'Manage student-teacher enrollments' : 'Your enrolled subjects and classes'}>
      {isAdmin ? (
        <Card>
          <Text style={styles.sectionTitle}>Create Enrollment</Text>
          <Text style={styles.label}>Student</Text>
          <View style={styles.chipWrap}>
            {students.map((s) => (
              <Pressable key={s.id} onPress={() => setStudentId(s.id)} style={[styles.chip, studentId === s.id ? styles.chipActive : null]}>
                <Text style={studentId === s.id ? styles.chipActiveText : styles.chipText}>{s.fullName}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Teacher</Text>
          <View style={styles.chipWrap}>
            {teachers.map((t) => (
              <Pressable key={t.id} onPress={() => setTeacherId(t.id)} style={[styles.chip, teacherId === t.id ? styles.chipActive : null]}>
                <Text style={teacherId === t.id ? styles.chipActiveText : styles.chipText}>{t.fullName}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={subject} onChangeText={setSubject} style={styles.input} placeholder="Subject" />
          <TextInput value={tutorialGroup} onChangeText={setTutorialGroup} style={styles.input} placeholder="Tutorial group (optional)" />
          <TextInput value={note} onChangeText={setNote} style={[styles.input, styles.textarea]} placeholder="Note (optional)" multiline />
          <PillButton label={saving ? 'Saving...' : 'Create Enrollment'} onPress={onCreate} disabled={saving} />
        </Card>
      ) : null}
      {busy ? (
        <Card>
          <ActivityIndicator color="#6d28d9" />
        </Card>
      ) : null}
      {!busy && myEnrollments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No enrollment records found.</Text>
        </Card>
      ) : null}
      {myEnrollments.map((item) => (
        <Card key={item.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.listTitle}>{item.subject}</Text>
            <Text style={[styles.smallTitle, { color: statusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
          </View>
          {item.tutorialGroup ? <Text style={styles.muted}>Group: {item.tutorialGroup}</Text> : null}
          <Text style={styles.muted}>Teacher: {item.teacherName}</Text>
          <Text style={styles.muted}>Student: {item.studentName}</Text>
          {item.note ? <Text style={styles.muted}>Note: {item.note}</Text> : null}
          {isAdmin ? (
            <View style={[styles.rowWrap, { marginTop: 8 }]}>
              <Pressable onPress={() => onUpdateStatus(item.id, item.status === 'active' ? 'completed' : 'active')}>
                <Text style={styles.linkInline}>{item.status === 'active' ? 'Mark Completed' : 'Mark Active'}</Text>
              </Pressable>
              <Pressable onPress={() => onDelete(item.id)} style={{ marginLeft: 12 }}>
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </View>
          ) : null}
        </Card>
      ))}
    </Shell>
  );
}

function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setBusy(true);
      const items = await mobileApiClient.listNotifications(30);
      setNotifications(items);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load notifications.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const priorityColor = (priority: string) => {
    if (priority === 'high') return '#dc2626';
    if (priority === 'medium') return '#d97706';
    return '#6b7280';
  };

  return (
    <Shell title="Notifications" subtitle="Your recent activity">
      <PillButton label={busy ? 'Refreshing...' : 'Refresh'} onPress={load} disabled={busy} />
      {!busy && notifications.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No notifications yet.</Text>
        </Card>
      ) : null}
      {notifications.map((item) => (
        <Card key={item.id}>
          <View style={styles.rowBetween}>
            <Text style={[styles.listTitle, { flex: 1 }]}>{item.title}</Text>
            <Text style={[styles.smallTitle, { color: priorityColor(item.priority) }]}>{item.priority.toUpperCase()}</Text>
          </View>
          <Text style={styles.muted}>{item.message}</Text>
          <Text style={styles.muted}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </Card>
      ))}
    </Shell>
  );
}

function ChatsScreen({ navigation }: any) {
  const { session } = useAppContext();
  const [chats, setChats] = useState<ChatSummaryItem[]>([]);
  const [users, setUsers] = useState<MessageUserItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState<'direct' | 'group'>('direct');
  const [directUserId, setDirectUserId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setBusy(true);
      const [items, chatUsers] = await Promise.all([
        mobileApiClient.listChats(),
        mobileApiClient.listChatUsers(),
      ]);
      setChats(items);
      setUsers(chatUsers.filter((u) => u.id !== session!.user.id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load chats.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createChat = async () => {
    try {
      setCreating(true);
      if (composerMode === 'direct') {
        if (!directUserId) { Alert.alert('Validation', 'Select a user.'); return; }
        const chat = await mobileApiClient.openDirectChat(directUserId);
        const displayName = users.find((u) => u.id === directUserId)?.fullName || 'Chat';
        setShowComposer(false);
        await load();
        navigation.navigate('ChatDetail', { chatId: chat.id, chatName: displayName });
      } else {
        if (!groupName.trim() || groupMemberIds.length === 0) {
          Alert.alert('Validation', 'Group name and at least one member are required.');
          return;
        }
        const chat = await mobileApiClient.createGroupChat({ name: groupName.trim(), memberIds: groupMemberIds });
        const name = groupName.trim();
        setGroupName(''); setGroupMemberIds([]);
        setShowComposer(false);
        await load();
        navigation.navigate('ChatDetail', { chatId: chat.id, chatName: name });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create chat.');
    } finally {
      setCreating(false);
    }
  };

  const toggleGroupMember = (id: string) => {
    setGroupMemberIds((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Shell title="Chats" subtitle="Direct and group messages">
      <View style={styles.rowWrap}>
        <PillButton label={busy ? 'Loading...' : 'Refresh'} onPress={load} disabled={busy} />
        <PillButton label={showComposer ? 'Cancel' : '+ New Chat'} onPress={() => setShowComposer((v) => !v)} />
      </View>

      {showComposer ? (
        <Card>
          <Text style={styles.sectionTitle}>New Conversation</Text>
          <View style={styles.chipWrap}>
            <Pressable onPress={() => setComposerMode('direct')} style={[styles.chip, composerMode === 'direct' ? styles.chipActive : null]}>
              <Text style={composerMode === 'direct' ? styles.chipActiveText : styles.chipText}>Direct</Text>
            </Pressable>
            <Pressable onPress={() => setComposerMode('group')} style={[styles.chip, composerMode === 'group' ? styles.chipActive : null]}>
              <Text style={composerMode === 'group' ? styles.chipActiveText : styles.chipText}>Group</Text>
            </Pressable>
          </View>
          {composerMode === 'direct' ? (
            <>
              <Text style={styles.label}>Select User</Text>
              <View style={styles.chipWrap}>
                {users.map((u) => (
                  <Pressable key={u.id} onPress={() => setDirectUserId(u.id)} style={[styles.chip, directUserId === u.id ? styles.chipActive : null]}>
                    <Text style={directUserId === u.id ? styles.chipActiveText : styles.chipText}>{u.fullName}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <TextInput value={groupName} onChangeText={setGroupName} style={styles.input} placeholder="Group name" />
              <Text style={styles.label}>Members</Text>
              <View style={styles.chipWrap}>
                {users.map((u) => (
                  <Pressable key={u.id} onPress={() => toggleGroupMember(u.id)} style={[styles.chip, groupMemberIds.includes(u.id) ? styles.chipActive : null]}>
                    <Text style={groupMemberIds.includes(u.id) ? styles.chipActiveText : styles.chipText}>{u.fullName}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          <PillButton label={creating ? 'Creating...' : 'Start Chat'} onPress={createChat} disabled={creating} />
        </Card>
      ) : null}

      {!busy && chats.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No conversations yet. Start a new chat above.</Text>
        </Card>
      ) : null}
      {chats.map((chat) => {
        const other = chat.participants.find((p) => p.id !== session!.user.id);
        const displayName = chat.name || other?.fullName || 'Group Chat';
        return (
          <Pressable key={chat.id} onPress={() => navigation.navigate('ChatDetail', { chatId: chat.id, chatName: displayName })}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={[styles.listTitle, { flex: 1 }]}>{displayName}</Text>
                {chat.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                  </View>
                ) : null}
                <Text style={styles.muted}>{formatTime(chat.lastMessageAt)}</Text>
              </View>
              {chat.lastMessageBody ? (
                <Text style={styles.muted} numberOfLines={1}>{chat.lastMessageBody}</Text>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
    </Shell>
  );
}

function ChatDetailScreen({ route }: any) {
  const { session } = useAppContext();
  const { chatId, chatName } = route.params as { chatId: string; chatName: string };
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const items = await mobileApiClient.listChatMessages(chatId);
      setMessages(items);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [chatId]);

  const send = async () => {
    const text = body.trim();
    if (!text) return;
    try {
      setBusy(true);
      setBody('');
      await mobileApiClient.sendChatMessage(chatId, text);
      await load();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={chatName} subtitle="Conversation">
      <Card>
        {messages.map((msg) => {
          const isMine = msg.senderId === session!.user.id;
          return (
            <View
              key={msg.id}
              style={[styles.chatBubble, isMine ? styles.userBubble : styles.aiBubble, { marginBottom: 6 }]}
            >
              {!isMine ? <Text style={[styles.muted, { fontSize: 11, marginBottom: 2 }]}>{msg.senderName}</Text> : null}
              <Text style={isMine ? styles.userText : styles.aiText}>{msg.body}</Text>
            </View>
          );
        })}
        {messages.length === 0 ? <Text style={styles.muted}>No messages yet.</Text> : null}
      </Card>
      <Card>
        <TextInput
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.textarea]}
          placeholder="Type a message..."
          multiline
        />
        <PillButton label={busy ? 'Sending...' : 'Send'} onPress={send} disabled={busy || !body.trim()} />
      </Card>
    </Shell>
  );
}

function MilestonesScreen() {
  const { data, session } = useAppContext();
  const isStudent = session!.user.role === 'student';
  const userId = session!.user.id;

  const mySubmissions = useMemo(() => {
    if (!isStudent) return [];
    return data.submissions.filter((s) => s.studentId === userId);
  }, [data.submissions, isStudent, userId]);

  const stats = useMemo(() => {
    const total = data.assignments.length;
    const submitted = mySubmissions.length;
    const graded = mySubmissions.filter((s) => s.grade).length;
    const grades = mySubmissions.filter((s) => s.grade).map((s) => parseFloat(s.grade || '0')).filter((n) => !isNaN(n));
    const avgGrade = grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : null;
    return { total, submitted, graded, avgGrade };
  }, [data.assignments, mySubmissions]);

  const milestones = [
    { label: 'First Submission', earned: mySubmissions.length >= 1, icon: '🎯' },
    { label: '5 Assignments Submitted', earned: mySubmissions.length >= 5, icon: '📚' },
    { label: '10 Assignments Submitted', earned: mySubmissions.length >= 10, icon: '🏆' },
    { label: 'First Graded Work', earned: mySubmissions.some((s) => !!s.grade), icon: '⭐' },
    { label: 'Passed 5 Assignments', earned: mySubmissions.filter((s) => parseFloat(s.grade || '0') >= 60).length >= 5, icon: '🎓' },
  ];

  return (
    <Shell title="Milestones" subtitle="Track your learning journey">
      {isStudent ? (
        <>
          <View style={styles.rowWrap}>
            <Card>
              <Text style={styles.smallTitle}>Submitted</Text>
              <Text style={styles.bigValue}>{stats.submitted}/{stats.total}</Text>
            </Card>
            <Card>
              <Text style={styles.smallTitle}>Graded</Text>
              <Text style={styles.bigValue}>{stats.graded}</Text>
            </Card>
          </View>
          {stats.avgGrade ? (
            <Card>
              <Text style={styles.smallTitle}>Average Grade</Text>
              <Text style={styles.bigValue}>{stats.avgGrade}</Text>
            </Card>
          ) : null}
          <Card>
            <Text style={styles.sectionTitle}>Badges</Text>
            {milestones.map((m) => (
              <View key={m.label} style={[styles.listItem, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <Text style={{ fontSize: 24, opacity: m.earned ? 1 : 0.3 }}>{m.icon}</Text>
                <View>
                  <Text style={[styles.listTitle, { opacity: m.earned ? 1 : 0.5 }]}>{m.label}</Text>
                  <Text style={styles.muted}>{m.earned ? 'Earned' : 'Not yet earned'}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card>
          <Text style={styles.muted}>Milestone tracking is available for students only.</Text>
        </Card>
      )}
    </Shell>
  );
}

function VideoSummarizerScreen() {
  const [videoUrl, setVideoUrl] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<{ title: string; summary: string[]; takeaways: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const summarize = async () => {
    if (!videoUrl.trim()) {
      Alert.alert('Validation', 'Please enter a video URL or YouTube link.');
      return;
    }
    try {
      setBusy(true);
      setResult(null);
      const response = await mobileApiClient.summarizeVideo({ videoUrl: videoUrl.trim(), context: context.trim() || undefined });
      setResult(response);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to summarize video.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Video Summarizer" subtitle="AI-powered lecture video summaries">
      <Card>
        <Text style={styles.label}>YouTube / Video URL</Text>
        <TextInput
          value={videoUrl}
          onChangeText={setVideoUrl}
          style={styles.input}
          placeholder="https://youtube.com/watch?v=..."
          autoCapitalize="none"
        />
        <Text style={styles.label}>Context (optional)</Text>
        <TextInput
          value={context}
          onChangeText={setContext}
          style={[styles.input, styles.textarea]}
          placeholder="e.g. Calculus lecture for beginners"
          multiline
        />
        <PillButton label={busy ? 'Summarizing...' : 'Transcribe & Summarize'} onPress={summarize} disabled={busy} />
      </Card>

      {result ? (
        <Card>
          <Text style={styles.sectionTitle}>{result.title}</Text>
          <Text style={styles.label}>Summary</Text>
          {result.summary.map((point, i) => (
            <Text key={i} style={styles.muted}>• {point}</Text>
          ))}
          <Text style={[styles.label, { marginTop: 10 }]}>Key Takeaways</Text>
          {result.takeaways.map((t, i) => (
            <Text key={i} style={styles.muted}>✓ {t}</Text>
          ))}
        </Card>
      ) : null}
    </Shell>
  );
}

function VideoCallWebScreen({ roomToken, token, onClose }: { roomToken: string; token: string; onClose: () => void }) {
  const webUrl = `https://www.yunafied.online/app/video-call/${roomToken}`;

  useEffect(() => {
    // Open the call URL in the external browser where getUserMedia / WebRTC works reliably
    (async () => {
      try {
        await Linking.openURL(webUrl);
      } catch (_e) {
        // ignore
      }
    })();
  }, [webUrl]);

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1b4b', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(109,40,217,0.4)' }}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: 'https://www.yunafied.online/yunafied%20logo.png' }} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, flex: 1, marginLeft: 10 }}>Video Call</Text>
          <Pressable
            onPress={onClose}
            style={{ backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.5)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 13 }}>✕ Leave</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>Opening the video call in your device browser for full camera and microphone access.</Text>
          <Pressable onPress={() => Linking.openURL(webUrl)} style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#6d28d9', borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Open in Browser</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ marginTop: 12 }}>
            <Text style={{ color: '#f87171', fontWeight: '700' }}>Close</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function IncomingCallModal({ call, onAccept, onDecline }: { call: MeetingRoom; onAccept: () => void; onDecline: () => void }) {
  const vibrateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Vibration ring pattern: 400ms vibrate, 200ms pause, repeat
    const ringPattern = [0, 400, 200, 400, 200, 400, 800];
    Vibration.vibrate(ringPattern, true);

    vibrateRef.current = setInterval(() => {
      Vibration.vibrate(ringPattern, false);
    }, 2500);

    return () => {
      Vibration.cancel();
      if (vibrateRef.current) clearInterval(vibrateRef.current);
    };
  }, []);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.callOverlay}>
        <View style={styles.callCard}>
          <View style={styles.callAvatarWrap}>
            <Text style={styles.callAvatarText}>📹</Text>
          </View>
          <Text style={styles.callLabel}>Incoming Video Call</Text>
          <Text style={styles.callName}>{call.teacherName}</Text>
          {call.scheduleTitle ? <Text style={styles.callSubtitle}>{call.scheduleTitle}</Text> : null}
          <View style={styles.callActions}>
            <Pressable onPress={onDecline} style={styles.declineBtn}>
              <Text style={styles.declineBtnText}>✕ Decline</Text>
            </Pressable>
            <Pressable onPress={onAccept} style={styles.acceptBtn}>
              <Text style={styles.acceptBtnText}>✓ Accept</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  const [firstName, setFirstName] = useState('');
  const [middleName2, setMiddleName2] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [password, setPassword] = useState('password');

  const create = async () => {
    try {
      await addUser({ firstName, middleName: middleName2 || undefined, lastName, email, role, status, password });
      setFirstName('');
      setMiddleName2('');
      setLastName('');
      setEmail('');
      Alert.alert('Success', 'User created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create user.');
    }
  };

  const toggleStatus = async (id: string, currentStatus: 'active' | 'inactive', row: any) => {
    try {
      await editUser(id, {
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
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
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="First name" />
        <TextInput value={middleName2} onChangeText={setMiddleName2} style={styles.input} placeholder="Middle name (optional)" />
        <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="Last name" />
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
  const [firstName, setFirstNameP] = useState(session!.user.firstName);
  const [middleName, setMiddleNameP] = useState(session!.user.middleName || '');
  const [lastName, setLastNameP] = useState(session!.user.lastName);
  const [email, setEmail] = useState(session!.user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const save = async () => {
    try {
      await updateProfile({
        firstName,
        middleName: middleName || undefined,
        lastName,
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
        <Text style={styles.label}>First Name</Text>
        <TextInput value={firstName} onChangeText={setFirstNameP} style={styles.input} />
        <Text style={styles.label}>Middle Name (optional)</Text>
        <TextInput value={middleName} onChangeText={setMiddleNameP} style={styles.input} />
        <Text style={styles.label}>Last Name</Text>
        <TextInput value={lastName} onChangeText={setLastNameP} style={styles.input} />

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

function AnalyticsScreen() {
  const { data } = useAppContext();

  const gradeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    data.submissions.forEach((s) => {
      if (s.grade) {
        const letter = s.grade.charAt(0).toUpperCase();
        map[letter] = (map[letter] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.submissions]);

  const graded = data.submissions.filter((s) => !!s.grade).length;
  const pending = data.submissions.length - graded;

  return (
    <Shell title="Analytics" subtitle="Performance overview and grade distribution">
      <View style={styles.rowWrap}>
        <Card>
          <Text style={styles.smallTitle}>Total Submissions</Text>
          <Text style={styles.bigValue}>{data.submissions.length}</Text>
        </Card>
        <Card>
          <Text style={styles.smallTitle}>Total Assignments</Text>
          <Text style={styles.bigValue}>{data.assignments.length}</Text>
        </Card>
      </View>
      <View style={styles.rowWrap}>
        <Card>
          <Text style={styles.smallTitle}>Graded</Text>
          <Text style={[styles.bigValue, { color: '#16a34a' }]}>{graded}</Text>
        </Card>
        <Card>
          <Text style={styles.smallTitle}>Pending Review</Text>
          <Text style={[styles.bigValue, { color: '#d97706' }]}>{pending}</Text>
        </Card>
      </View>
      <Card>
        <Text style={styles.sectionTitle}>Grade Distribution</Text>
        {gradeDistribution.length === 0 ? <Text style={styles.muted}>No graded submissions yet.</Text> : null}
        {gradeDistribution.map(([letter, count]) => (
          <View key={letter} style={[styles.listItemRow, { alignItems: 'center', marginBottom: 6 }]}>
            <Text style={[styles.listTitle, { width: 40 }]}>{letter}</Text>
            <View style={{ flex: 1, height: 18, backgroundColor: '#f3f4f6', borderRadius: 9, overflow: 'hidden', marginHorizontal: 8 }}>
              <View
                style={{
                  width: data.submissions.length ? `${Math.round((count / data.submissions.length) * 100)}%` : '0%',
                  height: '100%',
                  backgroundColor: '#6d28d9',
                  borderRadius: 9,
                }}
              />
            </View>
            <Text style={styles.muted}>{count}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Users</Text>
        <View style={styles.rowWrap}>
          <View style={{ marginRight: 20 }}>
            <Text style={styles.muted}>Students</Text>
            <Text style={styles.bigValue}>{data.users.filter((u) => u.role === 'student').length}</Text>
          </View>
          <View>
            <Text style={styles.muted}>Teachers</Text>
            <Text style={styles.bigValue}>{data.users.filter((u) => u.role === 'teacher').length}</Text>
          </View>
        </View>
      </Card>
    </Shell>
  );
}

function MeetingsScreen() {
  const { data, session, startVideoCall } = useAppContext();
  const role = session!.user.role;
  const isTeacher = role === 'teacher';
  const [startingId, setStartingId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    return data.schedules.filter((s) => {
      if (s.status !== 'accepted') return false;
      if (role === 'teacher') return s.teacherId === session!.user.id;
      if (role === 'student') return s.studentId === session!.user.id;
      return true;
    });
  }, [data.schedules, role, session]);

  const startMeeting = async (scheduleId: string, studentId: string | null) => {
    try {
      setStartingId(scheduleId);
      const room = await mobileApiClient.createMeeting({ scheduleId, studentId: studentId || undefined });
      startVideoCall(room.roomToken);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start meeting.');
    } finally {
      setStartingId(null);
    }
  };

  return (
    <Shell title="Meetings" subtitle="Video call sessions based on your schedules">
      <Card>
        <Text style={styles.sectionTitle}>Accepted Sessions</Text>
        {sessions.length === 0 ? <Text style={styles.muted}>No accepted sessions found.</Text> : null}
        {sessions.map((item) => (
          <View key={item.id} style={[styles.listItemRow, { marginBottom: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.muted}>{`${item.date} | ${item.startTime} – ${item.endTime}`}</Text>
              <Text style={styles.muted}>Teacher: {item.teacherName}</Text>
              {item.studentName ? <Text style={styles.muted}>Student: {item.studentName}</Text> : null}
            </View>
            {isTeacher ? (
              <Pressable
                onPress={() => startMeeting(item.id, item.studentId)}
                disabled={startingId === item.id}
              >
                <Text style={styles.linkInline}>{startingId === item.id ? 'Starting...' : '▶ Start'}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>
      {role === 'student' ? (
        <Card>
          <Text style={styles.sectionTitle}>Incoming Calls</Text>
          <Text style={styles.muted}>When your teacher starts a session, an incoming call popup will appear automatically.</Text>
        </Card>
      ) : null}
      {role === 'admin' ? (
        <Card>
          <Text style={styles.sectionTitle}>Admin Note</Text>
          <Text style={styles.muted}>Teachers initiate video calls from their accepted sessions. All accepted schedules are listed above.</Text>
        </Card>
      ) : null}
    </Shell>
  );
}

function YunaAIScreen() {
  const { session } = useAppContext();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hi! I am YUNA AI. I can help you navigate pages, explain features, and answer study or system questions.' },
  ]);

  const send = async () => {
    const content = input.trim();
    if (!content || busy) return;
    const userMsg = { role: 'user' as const, content };
    const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const result = await mobileApiClient.askYunaAi({
        message: content,
        role: session!.user.role,
        currentView: 'mobile',
        history,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.answer }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'YUNA AI is unavailable right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="YUNA AI" subtitle="Your AI assistant for study and navigation help">
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
          placeholder="Ask YUNA AI anything..."
        />
        <PillButton label={busy ? 'Thinking...' : 'Send'} onPress={send} disabled={busy || !input.trim()} />
      </Card>
    </Shell>
  );
}

function AuditLogsScreen() {
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const load = async (pg = 1) => {
    try {
      setBusy(true);
      const result = await mobileApiClient.listAuditLogs({
        action: filterAction || undefined,
        entityType: filterEntityType || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        page: pg,
        pageSize: 20,
      });
      setRows(result.rows);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load audit logs.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(1); }, [filterAction, filterEntityType, filterDateFrom, filterDateTo]);

  const displayedRows = search.trim()
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.actorName.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.entityType.toLowerCase().includes(q)
        );
      })
    : rows;

  return (
    <Shell title="Audit Logs" subtitle={`${total} total log entries`}>
      <Card>
        <Text style={styles.sectionTitle}>Filters</Text>
        <TextInput value={filterAction} onChangeText={setFilterAction} style={styles.input} placeholder="Action (e.g. CREATE_USER)" />
        <TextInput value={filterEntityType} onChangeText={setFilterEntityType} style={styles.input} placeholder="Entity type (e.g. user)" />
        <View style={styles.rowWrap}>
          <TextInput value={filterDateFrom} onChangeText={setFilterDateFrom} style={[styles.input, styles.half]} placeholder="Date from YYYY-MM-DD" />
          <TextInput value={filterDateTo} onChangeText={setFilterDateTo} style={[styles.input, styles.half]} placeholder="Date to YYYY-MM-DD" />
        </View>
        <TextInput value={search} onChangeText={setSearch} style={styles.input} placeholder="Search actor / action / entity…" />
        <PillButton label={busy ? 'Loading...' : 'Refresh'} onPress={() => load(1)} disabled={busy} />
      </Card>

      {selected ? (
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Log Detail</Text>
            <Pressable onPress={() => setSelected(null)}><Text style={styles.dangerText}>✕ Close</Text></Pressable>
          </View>
          <Text style={styles.muted}>{`Action: ${selected.action}`}</Text>
          <Text style={styles.muted}>{`Actor: ${selected.actorName} (${selected.actorRole})`}</Text>
          <Text style={styles.muted}>{`Entity: ${selected.entityType}${selected.entityId ? ` #${selected.entityId}` : ''}`}</Text>
          {selected.ipAddress ? <Text style={styles.muted}>{`IP: ${selected.ipAddress}`}</Text> : null}
          <Text style={styles.muted}>{`Time: ${new Date(selected.createdAt).toLocaleString()}`}</Text>
          {selected.payload ? (
            <Text style={[styles.muted, { fontFamily: 'monospace', fontSize: 11 }]}>{JSON.stringify(selected.payload, null, 2)}</Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Logs</Text>
        {!busy && displayedRows.length === 0 ? <Text style={styles.muted}>No log entries found.</Text> : null}
        {displayedRows.map((row) => (
          <Pressable key={row.id} onPress={() => setSelected(row)}>
            <View style={[styles.listItemRow, { paddingVertical: 8 }]}>
              <View style={styles.flexGrow}>
                <Text style={styles.listTitle}>{row.action}</Text>
                <Text style={styles.muted}>{`${row.actorName} · ${row.entityType}${row.entityId ? ` #${row.entityId}` : ''}`}</Text>
                <Text style={styles.muted}>{new Date(row.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={[styles.muted, { fontSize: 11 }]}>{row.actorRole}</Text>
            </View>
          </Pressable>
        ))}
        <View style={[styles.rowWrap, { marginTop: 8 }]}>
          <PillButton label="Prev" onPress={() => load(Math.max(1, page - 1))} disabled={page <= 1 || busy} />
          <PillButton label={`${page}/${totalPages}`} onPress={() => {}} disabled />
          <PillButton label="Next" onPress={() => load(Math.min(totalPages, page + 1))} disabled={page >= totalPages || busy} />
        </View>
      </Card>
    </Shell>
  );
}

function MeetingHistoryScreen() {
  const [rooms, setRooms] = useState<CallHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setBusy(true);
      const items = await mobileApiClient.listMeetingHistory();
      setRooms(items);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load meeting history.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = search.trim()
    ? rooms.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.teacherName.toLowerCase().includes(q) ||
          (r.studentName || '').toLowerCase().includes(q) ||
          r.roomToken.toLowerCase().includes(q)
        );
      })
    : rooms;

  const fmtDuration = (secs: number | null) => {
    if (secs == null) return '—';
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  return (
    <Shell title="Meeting History" subtitle={`${rooms.length} total rooms recorded`}>
      <Card>
        <TextInput value={search} onChangeText={setSearch} style={styles.input} placeholder="Search by teacher, student or token…" />
        <PillButton label={busy ? 'Loading...' : 'Refresh'} onPress={load} disabled={busy} />
      </Card>
      {!busy && filtered.length === 0 ? (
        <Card><Text style={styles.muted}>No meeting rooms found.</Text></Card>
      ) : null}
      {filtered.map((room) => (
        <Card key={room.id}>
          <Text style={styles.listTitle}>{room.teacherName} → {room.studentName || 'No student'}</Text>
          <Text style={[styles.muted, { fontFamily: 'monospace', fontSize: 11 }]}>{room.roomToken.slice(0, 16)}…</Text>
          <View style={styles.rowWrap}>
            <View style={{ marginRight: 16 }}>
              <Text style={styles.muted}>Started</Text>
              <Text style={styles.smallTitle}>{new Date(room.startedAt).toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.muted}>Duration</Text>
              <Text style={styles.smallTitle}>{fmtDuration(room.durationSeconds)}</Text>
            </View>
          </View>
          {room.endedAt ? <Text style={styles.muted}>Ended: {new Date(room.endedAt).toLocaleString()}</Text> : null}
        </Card>
      ))}
    </Shell>
  );
}

function AllStudentMilestonesScreen() {  const { data } = useAppContext();
  const students = data.users.filter((u) => u.role === 'student');

  return (
    <Shell title="All Milestones" subtitle="Student progress and achievement overview">
      {students.length === 0 ? (
        <Card><Text style={styles.muted}>No students found.</Text></Card>
      ) : null}
      {students.map((student) => {
        const subs = data.submissions.filter((s) => s.studentId === student.id);
        const graded = subs.filter((s) => !!s.grade).length;
        const grades = subs.filter((s) => s.grade).map((s) => parseFloat(s.grade || '0')).filter((n) => !isNaN(n));
        const avg = grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : null;
        const badges = [
          { icon: '🎯', earned: subs.length >= 1 },
          { icon: '📚', earned: subs.length >= 5 },
          { icon: '🏆', earned: subs.length >= 10 },
          { icon: '⭐', earned: subs.some((s) => !!s.grade) },
          { icon: '🎓', earned: subs.filter((s) => parseFloat(s.grade || '0') >= 60).length >= 5 },
        ];
        return (
          <Card key={student.id}>
            <Text style={styles.listTitle}>{student.fullName}</Text>
            <Text style={styles.muted}>{student.email}</Text>
            <View style={styles.rowWrap}>
              <View style={{ marginRight: 16 }}>
                <Text style={styles.muted}>Submitted</Text>
                <Text style={styles.smallTitle}>{subs.length}</Text>
              </View>
              <View style={{ marginRight: 16 }}>
                <Text style={styles.muted}>Graded</Text>
                <Text style={styles.smallTitle}>{graded}</Text>
              </View>
              {avg ? (
                <View>
                  <Text style={styles.muted}>Avg Grade</Text>
                  <Text style={styles.smallTitle}>{avg}</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.rowWrap, { marginTop: 6 }]}>
              {badges.map((badge, i) => (
                <Text key={i} style={{ fontSize: 22, opacity: badge.earned ? 1 : 0.2, marginRight: 6 }}>{badge.icon}</Text>
              ))}
            </View>
          </Card>
        );
      })}
    </Shell>
  );
}

function CustomDrawerContent(props: any) {
  const { session, logout } = useAppContext();
  const logoUri = 'https://www.yunafied.online/yunafied%20logo.png';
  const user = session?.user;
  const roleColors: Record<string, string> = {
    admin: '#f59e0b',
    teacher: '#34d399',
    student: '#a78bfa',
  };
  const roleColor = roleColors[user?.role || 'student'] || '#a78bfa';

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: '#0f172a' }}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      {/* Logo + Brand */}
      <View style={styles.drawerLogoRow}>
        <View style={styles.logoWrap}>
          <Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.drawerBrandName}>YUNAFied</Text>
          <Text style={styles.drawerBrandSub}>Tutorial Management</Text>
        </View>
      </View>

      {/* User Profile Card */}
      <View style={styles.drawerProfileCard}>
        <View style={styles.drawerAvatar}>
          <Text style={styles.drawerAvatarText}>{user?.fullName?.charAt(0)?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.drawerName} numberOfLines={1}>{user?.fullName}</Text>
          <Text style={styles.drawerEmail} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>
      <View style={styles.drawerRoleBadgeRow}>
        <View style={[styles.drawerRoleBadge, { borderColor: roleColor }]}>
          <Text style={[styles.drawerRoleBadgeText, { color: roleColor }]}>{user?.role?.toUpperCase()} MODULE</Text>
        </View>
      </View>

      {/* Nav Items */}
      <View style={styles.drawerNav}>
        <DrawerItemList
          {...props}
          activeTintColor="#fff"
          inactiveTintColor="#94a3b8"
          activeBackgroundColor="#6d28d9"
          inactiveBackgroundColor="transparent"
          labelStyle={{ fontWeight: '600', fontSize: 14 }}
          itemStyle={{ borderRadius: 10, marginHorizontal: 4, marginVertical: 1 }}
        />
      </View>

      {/* Sign Out */}
      <View style={styles.drawerSignOutWrap}>
        <Pressable
          onPress={() => logout()}
          style={({ pressed }) => [styles.drawerSignOutBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.drawerSignOutText}>⏻  Sign Out</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

function DrawerArea() {
  const { session } = useAppContext();
  const role = session!.user.role;
  const isStudent = role === 'student';
  const isTeacherOrAdmin = role === 'teacher' || role === 'admin';
  const isAdmin = role === 'admin';

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e1b4b' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        drawerStyle: { backgroundColor: '#0f172a', width: 272 },
        drawerActiveTintColor: '#fff',
        drawerInactiveTintColor: '#94a3b8',
        drawerActiveBackgroundColor: '#6d28d9',
        drawerInactiveBackgroundColor: 'transparent',
        drawerItemStyle: { borderRadius: 10, marginHorizontal: 4, marginVertical: 1 },
        drawerLabelStyle: { fontWeight: '600', fontSize: 14 },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* All roles */}
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Schedule" component={ScheduleScreen} />
      <Drawer.Screen name="Assignments" component={AssignmentsScreen} />
      <Drawer.Screen name="Gamified Learning" component={GamifiedLearningScreen} />
      <Drawer.Screen name="Announcements" component={AnnouncementsScreen} />
      <Drawer.Screen name="Chats" component={ChatsScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Meetings" component={MeetingsScreen} />
      <Drawer.Screen name="YUNA AI" component={YunaAIScreen} />

      {/* Student screens */}
      {isStudent ? <Drawer.Screen name="Learning Materials" component={LearningMaterialsScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Grades" component={GradesScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Enrollments" component={EnrollmentsScreen} /> : null}
      {isStudent ? <Drawer.Screen name="AI Guide" component={AIGuideScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Milestones" component={MilestonesScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Video Summarizer" component={VideoSummarizerScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Word Translator" component={WordTranslatorScreen} /> : null}

      {/* Teacher / Admin screens */}
      {isTeacherOrAdmin ? <Drawer.Screen name="Learning Materials" component={LearningMaterialsScreen} /> : null}
      {isTeacherOrAdmin ? <Drawer.Screen name="AI Guide" component={AIGuideScreen} /> : null}
      {isTeacherOrAdmin ? <Drawer.Screen name="Video Summarizer" component={VideoSummarizerScreen} /> : null}
      {isTeacherOrAdmin ? <Drawer.Screen name="Word Translator" component={WordTranslatorScreen} /> : null}
      {isTeacherOrAdmin ? <Drawer.Screen name="Performance" component={PerformanceScreen} /> : null}
      {isTeacherOrAdmin ? <Drawer.Screen name="All Milestones" component={AllStudentMilestonesScreen} /> : null}

      {/* Admin-only screens */}
      {isAdmin ? <Drawer.Screen name="Enrollments" component={EnrollmentsScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Analytics" component={AnalyticsScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Users" component={UsersScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Audit Logs" component={AuditLogsScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Meeting History" component={MeetingHistoryScreen} /> : null}

      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { loading, session, incomingCall, acceptCall, declineCall, activeCallToken, endVideoCall } = useAppContext();

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingScreen, styles.center]}>
        <StatusBar style="light" />
        <View style={styles.loadingLogoWrap}>
          <Image source={{ uri: 'https://www.yunafied.online/yunafied%20logo.png' }} style={styles.loadingLogo} resizeMode="contain" />
        </View>
        <Text style={styles.loadingBrand}>YUNAFied</Text>
        <ActivityIndicator size="large" color="#a78bfa" style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Loading your workspace...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <NavigationContainer theme={navTheme}>
        {session ? (
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Main" component={DrawerArea} />
            <RootStack.Screen
              name="ChatDetail"
              component={ChatDetailScreen}
              options={{ headerShown: true, headerTitle: 'Chat', headerStyle: { backgroundColor: '#6d28d9' }, headerTintColor: '#fff' }}
            />
          </RootStack.Navigator>
        ) : (
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Landing" component={LandingScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
          </RootStack.Navigator>
        )}
      </NavigationContainer>
      {incomingCall ? (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => acceptCall(incomingCall.roomToken)}
          onDecline={() => declineCall(incomingCall.roomToken)}
        />
      ) : null}
      {activeCallToken && session ? (
        <VideoCallWebScreen
          roomToken={activeCallToken}
          token={session.token}
          onClose={endVideoCall}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // ─── LOADING ─────────────────────────────────────────────────────────
  loadingScreen: { flex: 1, backgroundColor: '#0f172a' },
  loadingLogoWrap: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 8, shadowColor: '#7c3aed', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  loadingLogo: { width: 64, height: 64, borderRadius: 12 },
  loadingBrand: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  loadingText: { color: '#94a3b8', fontSize: 14, marginTop: 8 },
  // ─── LOGO ─────────────────────────────────────────────────────────────
  logoWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4, shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  logoImg: { width: 36, height: 36, borderRadius: 8 },
  // ─── GENERAL ──────────────────────────────────────────────────────────
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  // ─── LANDING ──────────────────────────────────────────────────────────
  landingBg: { flex: 1, backgroundColor: '#0f172a' },
  landingScroll: { flexGrow: 1, paddingBottom: 40 },
  landingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  landingLoginBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  landingLoginBtnText: { color: '#1e1b4b', fontWeight: '700', fontSize: 14 },
  landingBrandName: { color: '#fff', fontWeight: '800', fontSize: 18 },
  landingBrandSub: { color: '#a5b4fc', fontSize: 11 },
  landingHero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  landingBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(103,232,249,0.1)', borderWidth: 1, borderColor: 'rgba(103,232,249,0.3)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14 },
  landingBadgeText: { color: '#a5f3fc', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  landingTitle: { color: '#fff', fontWeight: '900', fontSize: 32, lineHeight: 38, marginBottom: 14 },
  landingTitleAccent: { color: '#c4b5fd' },
  landingText: { color: '#94a3b8', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  landingActions: { flexDirection: 'row', gap: 10 },
  landingGetStartedBtn: { backgroundColor: '#6d28d9', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24, alignItems: 'center' },
  landingGetStartedText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  landingFeatureGrid: { paddingHorizontal: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  landingFeatureCard: { width: '47%', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14 },
  landingFeatureIcon: { fontSize: 24, marginBottom: 8 },
  landingFeatureTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  landingFeatureText: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  landingPurpose: { marginHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginBottom: 24 },
  landingPurposeTitle: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 8 },
  landingPurposeText: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  landingRoleRow: { flexDirection: 'row', gap: 8 },
  landingRoleCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.04)' },
  landingRoleTitle: { fontWeight: '700', fontSize: 12, marginBottom: 4 },
  landingRoleText: { color: '#94a3b8', fontSize: 11, lineHeight: 16 },
  landingCta: { paddingHorizontal: 20, paddingBottom: 20 },
  // ─── LOGIN ────────────────────────────────────────────────────────────
  loginBg: { flex: 1, backgroundColor: '#0f172a' },
  loginScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  loginLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28, paddingHorizontal: 4 },
  loginBrand: { color: '#fff', fontWeight: '800', fontSize: 20 },
  loginBrandSub: { color: '#a5b4fc', fontSize: 12 },
  loginCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, gap: 10, shadowColor: '#6d28d9', shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
  loginCardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  loginCardSub: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  // ─── SHELL / SCREEN HEADER ────────────────────────────────────────────
  screenHeader: { backgroundColor: '#1e1b4b', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(109,40,217,0.3)' },
  // ─── DRAWER ───────────────────────────────────────────────────────────
  drawerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  drawerBrandName: { color: '#fff', fontWeight: '800', fontSize: 16 },
  drawerBrandSub: { color: '#94a3b8', fontSize: 11 },
  drawerProfileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  drawerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6d28d9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#a78bfa' },
  drawerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  drawerRoleBadgeRow: { paddingHorizontal: 12, marginTop: 8, marginBottom: 8 },
  drawerRoleBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  drawerRoleBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  drawerNav: { marginTop: 4 },
  drawerSignOutWrap: { padding: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginTop: 8 },
  drawerSignOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  drawerSignOutText: { color: '#f87171', fontWeight: '700', fontSize: 14 },
  // kept for compatibility with unchanged drawer code
  drawerHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  drawerName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  drawerEmail: { color: '#94a3b8', marginTop: 4 },
  drawerRole: { marginTop: 8, color: '#a78bfa', fontWeight: '700', fontSize: 12 },
  // ─── CONTAINERS / LAYOUT ──────────────────────────────────────────────
  container: { paddingHorizontal: 16, paddingTop: 0, gap: 12, paddingBottom: 24 },
  header: { gap: 4, marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { color: '#c4b5fd', fontSize: 14 },
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  closedBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  closedBadgeText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '700',
  },
  closedNotice: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  closedNoticeText: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 13,
  },
  toggleBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  toggleBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  submittedBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  submittedText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 13,
  },
  unreadBadge: {
    backgroundColor: '#6d28d9',
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  callOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    gap: 10,
  },
  callAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: '#4c1d95',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  callAvatarText: {
    fontSize: 36,
  },
  callLabel: {
    color: '#a5b4fc',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  callName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
  },
  callSubtitle: {
    color: '#c4b5fd',
    fontSize: 14,
  },
  callActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  declineBtn: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  declineBtnText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 15,
  },
  acceptBtn: {
    backgroundColor: '#14532d',
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  acceptBtnText: {
    color: '#86efac',
    fontWeight: '700',
    fontSize: 15,
  },
});

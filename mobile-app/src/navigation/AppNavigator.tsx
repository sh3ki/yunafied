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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { mobileApiClient } from '../api/client';
import VideoCallNative from '../screens/VideoCallNative';
import { useAppContext } from '../context/AppContext';
import MobileChart from '../components/MobileChart';
import {
  AssignmentItem,
  AdminAnalyticsItem,
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
  ScheduleItem,
  StudentRecordItem,
  TeacherRecordItem,
  TeacherAvailabilityItem,
  TranslationHistoryItem,
  UserRole,
  UserStatus,
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
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screenHeader}>
        <Pressable onPress={() => navigation.toggleDrawer()} style={{ marginRight: 12 }}>
          <Text style={styles.hamburger}>☰</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
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

function PillButton({ label, onPress, disabled, modalChildren, style, textStyle }: { label: string; onPress?: () => void; disabled?: boolean; modalChildren?: React.ReactNode | ((close: () => void) => React.ReactNode); style?: any; textStyle?: any }) {
  const [visible, setVisible] = useState(false);

  const handlePress = () => {
    if (modalChildren) {
      setVisible(true);
      return;
    }
    if (onPress) onPress();
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          disabled ? styles.buttonDisabled : null,
          pressed ? styles.buttonPressed : null,
          style,
        ]}
      >
        <Text style={[styles.buttonText, textStyle]}>{label}</Text>
      </Pressable>
      {modalChildren ? (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ flex: 1, padding: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, maxHeight: '90%' }}>
                {typeof modalChildren === 'function' ? modalChildren(() => setVisible(false)) : modalChildren}
                <Pressable onPress={() => setVisible(false)} style={{ alignSelf: 'flex-end', marginTop: 12 }}>
                  <Text style={{ color: '#6d28d9', fontWeight: '700' }}>Close</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </>
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
          <PillButton label="Login" style={styles.landingLoginBtn} textStyle={{ color: '#000' }} onPress={() => navigation.navigate('Login')} />
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
            <PillButton label="Get Started" style={styles.landingGetStartedBtn} onPress={() => navigation.navigate('Login')} />
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
  const { login, verifyOtp, resendOtp } = useAppContext();
  const [mode, setMode] = useState<'login' | 'otp' | 'forgot' | 'forgot-otp' | 'new-password'>('login');
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
      setMode('forgot-otp');
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

  if (mode === 'forgot-otp') {
    return (
      <SafeAreaView style={styles.loginBg}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.loginLogoRow}><View style={styles.logoWrap}><Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode="contain" /></View><View><Text style={styles.loginBrand}>YUNAFied</Text><Text style={styles.loginBrandSub}>AI-Powered Tutorial System</Text></View></View>
          <View style={styles.loginCard}>
            <Text style={styles.loginCardTitle}>Enter Reset Code</Text>
            <Text style={styles.loginCardSub}>We sent a 6-digit code to {pendingEmail}</Text>
            <Text style={styles.label}>Enter reset code</Text>
            <TextInput value={otpValue} onChangeText={(v) => setOtpValue(v.replace(/\D/g, '').slice(0, 6))} style={[styles.input, { textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: 'bold' }]} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor="#9ca3af" />
            <PillButton label="Verify Code" onPress={() => { if (otpValue.length !== 6) { Alert.alert('Validation', 'Please enter the complete 6-digit code.'); return; } setMode('new-password'); }} disabled={otpValue.length !== 6} />
            <Pressable onPress={onResendResetOtp} disabled={resendCountdown > 0}><Text style={[styles.linkText, resendCountdown > 0 && { opacity: 0.4 }]}>{resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Code'}</Text></Pressable>
            <Pressable onPress={() => setMode('forgot')}><Text style={styles.linkText}>← Back</Text></Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'new-password') {
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
            <Text style={styles.loginCardTitle}>Set New Password</Text>
            <Text style={styles.loginCardSub}>Choose a strong new password for your account.</Text>
            <Text style={styles.label}>New Password</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor="#9ca3af" />
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor="#9ca3af" />
            <PillButton label={busy ? 'Resetting...' : 'Reset Password'} onPress={onResetPassword} disabled={busy} />
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
          <Text style={styles.loginCardTitle}>Welcome Back</Text>
          <Text style={styles.loginCardSub}>Sign in to your workspace</Text>

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

          {false ? (
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

          <PillButton label={busy ? 'Please wait...' : 'Sign In'} onPress={onSubmit} disabled={busy} />

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
  const { session, data } = useAppContext();
  const user = session!.user;
  const today = new Date().toISOString().slice(0, 10);
  const mySchedules = data.schedules.filter((item) => user.role === 'student' ? item.studentId === user.id : user.role === 'teacher' ? item.teacherId === user.id : true);
  const mySubmissions = data.submissions.filter((item) => user.role !== 'student' || item.studentId === user.id);
  const assigned = data.assignments.filter((item) => user.role !== 'teacher' || item.teacherId === user.id);
  const graded = mySubmissions.filter((item) => Boolean(item.grade));
  const students = data.users.filter((item) => item.role === 'student');
  if (user.role === 'admin') return <AnalyticsScreen />;
  return <Shell title={`Welcome back, ${user.fullName}`} subtitle={`${user.role} Dashboard`}>
    <View style={styles.rowWrap}>
      {user.role === 'student' ? <><Card><Text style={styles.smallTitle}>Accepted Sessions</Text><Text style={styles.bigValue}>{mySchedules.filter((item) => item.status === 'scheduled').length}</Text></Card><Card><Text style={styles.smallTitle}>Pending Requests</Text><Text style={styles.bigValue}>{mySchedules.filter((item) => item.status === 'pending').length}</Text></Card><Card><Text style={styles.smallTitle}>Submitted Work</Text><Text style={styles.bigValue}>{mySubmissions.length}</Text></Card><Card><Text style={styles.smallTitle}>Graded</Text><Text style={styles.bigValue}>{graded.length}</Text></Card></> : <><Card><Text style={styles.smallTitle}>Assigned Students</Text><Text style={styles.bigValue}>{new Set([...mySubmissions.map((item) => item.studentId), ...mySchedules.map((item) => item.studentId).filter(Boolean)]).size}</Text></Card><Card><Text style={styles.smallTitle}>Average Grade</Text><Text style={styles.bigValue}>{graded.length ? `${Math.round(graded.reduce((sum, item) => sum + (Number.parseFloat(item.grade || '') || 0), 0) / graded.length)}%` : '—'}</Text></Card><Card><Text style={styles.smallTitle}>Pending Grading</Text><Text style={styles.bigValue}>{mySubmissions.length - graded.length}</Text></Card><Card><Text style={styles.smallTitle}>Upcoming Meetings</Text><Text style={styles.bigValue}>{mySchedules.filter((item) => item.date >= today && item.status !== 'cancelled' && item.status !== 'declined').length}</Text></Card></>}
    </View>
    <Card><Text style={styles.sectionTitle}>{user.role === 'teacher' ? 'Grade and submission status' : 'My assignment progress'}</Text><MobileChart type="pie" data={[{ label: 'Graded', value: graded.length }, { label: 'Pending', value: Math.max(0, mySubmissions.length - graded.length) }, { label: 'Not started', value: Math.max(0, assigned.length - mySubmissions.length) }]} height={160} /></Card>
    <Card><Text style={styles.sectionTitle}>{user.role === 'teacher' ? 'Upcoming meetings' : 'Schedule requests'}</Text>{mySchedules.filter((item) => user.role === 'teacher' ? item.date >= today && item.status !== 'cancelled' : true).slice(0, 5).map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.muted}>{item.date} · {item.startTime}–{item.endTime} · {item.status}</Text></View>)}{!mySchedules.length ? <Text style={styles.muted}>No upcoming meetings scheduled.</Text> : null}</Card>
    <Card><Text style={styles.sectionTitle}>Latest announcements</Text>{data.announcements.slice(0, 4).map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.muted}>{item.content}</Text></View>)}{!data.announcements.length ? <Text style={styles.muted}>No announcements available.</Text> : null}</Card>
    {user.role === 'teacher' ? <Card><Text style={styles.sectionTitle}>Assigned work</Text><Text style={styles.muted}>{assigned.length} assignment{assigned.length === 1 ? '' : 's'} · {students.length} students in system</Text></Card> : <Card><Text style={styles.sectionTitle}>Assignments to finish</Text>{assigned.filter((item) => !mySubmissions.some((submission) => submission.assignmentId === item.id)).slice(0, 4).map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.muted}>Due {item.dueDate}</Text></View>)}{!assigned.some((item) => !mySubmissions.some((submission) => submission.assignmentId === item.id)) ? <Text style={styles.muted}>You are all caught up.</Text> : null}</Card>}
  </Shell>;
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
  const [enrollmentId, setEnrollmentId] = useState('');

  const [actionDraft, setActionDraft] = useState<Record<string, {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
    status: 'scheduled' | 'pending' | 'accepted' | 'declined' | 'cancelled';
  }>>({});

  const role = session!.user.role;
  const canManage = role === 'admin';
  const [createOpen, setCreateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => localDateIso(new Date()));
  const [calendarTab, setCalendarTab] = useState<'today' | 'class' | 'teacher' | 'meeting'>('today');
  const [calendarEnrollments, setCalendarEnrollments] = useState<EnrollmentRecordItem[]>([]);
  const [calendarAvailability, setCalendarAvailability] = useState<TeacherAvailabilityItem[]>([]);
  const teachers = data.users.filter((u) => u.role === 'teacher' && u.status === 'active');
  const students = data.users.filter((u) => u.role === 'student' && u.status === 'active');
  const activeEnrollments = calendarEnrollments.filter((item: EnrollmentRecordItem) => item.status === 'active');

  function ManilaTodayDate() {
    // Use timezone-aware locale date to ensure Manila date is correct on device
    try {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    } catch (e) {
      const now = new Date();
      const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
      const manila = new Date(utc.getTime() + 8 * 60 * 60000);
      return manila.toISOString().slice(0, 10);
    }
  }

  function minutesFromHHMM(hhmm: string) {
    const [h, m] = hhmm.split(':').map((s) => parseInt(s || '0', 10));
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  }

  const ENGLISH_LEVELS = [
    'Beginner (Basic English)',
    'Pre-Intermediate',
    'Intermediate',
    'Upper Intermediate',
    'Advanced',
    'Business English',
    'Conversational English',
    'Kids English',
  ];

  function manilaNowHHMM() {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const manila = new Date(utc.getTime() + 8 * 60 * 60000);
    const hh = String(manila.getHours()).padStart(2, '0');
    const mm = String(manila.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function to12Hour(hhmm24: string) {
    const [hh, mm] = hhmm24.split(':').map((s) => parseInt(s || '0', 10));
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = ((hh + 11) % 12) + 1;
    return { time: `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, period };
  }

  function convertTo24(hhmm12: string, period: string) {
    let [hh, mm] = hhmm12.split(':').map((s) => parseInt(s || '0', 10));
    const p = (period || '').toUpperCase();
    if (p === 'PM' && hh < 12) hh = hh + 12;
    if (p === 'AM' && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  function addMinutes24(hhmm24: string, delta: number) {
    const [hh, mm] = hhmm24.split(':').map((s) => parseInt(s || '0', 10));
    const d = (hh * 60 + mm + delta + 24 * 60) % (24 * 60);
    const nh = Math.floor(d / 60);
    const nm = d % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  function StudentRequestModal({ onClose }: { onClose?: () => void }) {
    const now24 = manilaNowHHMM();
    const start12 = to12Hour(now24);
    const defaultEnd24 = addMinutes24(now24, 60);
    const end12 = to12Hour(defaultEnd24);

    const [mDate, setMDate] = useState(ManilaTodayDate());
    const [mStart, setMStart] = useState(start12.time);
    const [mStartPeriod, setMStartPeriod] = useState(start12.period);
    const [mEnd, setMEnd] = useState(end12.time);
    const [mEndPeriod, setMEndPeriod] = useState(end12.period);
    const [mTeacher, setMTeacher] = useState(teachers.length ? teachers[0].id : '');
    const [busyReq, setBusyReq] = useState(false);
    const [openTeachers, setOpenTeachers] = useState(false);
    const [openLevels, setOpenLevels] = useState(false);
    const [mNote, setMNote] = useState('');
    const [mSubject, setMSubject] = useState('English');
    const [mLevel, setMLevel] = useState(ENGLISH_LEVELS[0]);

    const submit = async () => {
      try {
        if (!mTeacher) {
          Alert.alert('Validation', 'Please choose a teacher.');
          return;
        }

        // date not in past (Manila)
        const manilaToday = ManilaTodayDate();
        if (mDate < manilaToday) {
          Alert.alert('Validation', 'Please select today or a future date (Manila time).');
          return;
        }

        const start24 = convertTo24(mStart, mStartPeriod);
        const end24 = convertTo24(mEnd, mEndPeriod);

        const startMin = minutesFromHHMM(start24);
        const endMin = minutesFromHHMM(end24);
        if (endMin <= startMin) {
          Alert.alert('Validation', 'End time must be after start time.');
          return;
        }
        if (endMin - startMin > 6 * 60) {
          Alert.alert('Validation', 'Schedule duration cannot exceed 6 hours.');
          return;
        }

        setBusyReq(true);
        Alert.alert('Unavailable', 'Schedule requests are not available in the current web system.');
        setMDate(ManilaTodayDate());
        const now24b = manilaNowHHMM();
        const s12 = to12Hour(now24b);
        const e12 = to12Hour(addMinutes24(now24b, 60));
        setMStart(s12.time);
        setMStartPeriod(s12.period);
        setMEnd(e12.time);
        setMEndPeriod(e12.period);
        setMNote('');
        setBusyReq(false);
        onClose && onClose();
      } catch (err: any) {
        setBusyReq(false);
        Alert.alert('Error', err.message || 'Failed to send request.');
      }
    };

    return (
      <View>
        <Text style={styles.sectionTitle}>Request Teacher Schedule</Text>

        <Text style={styles.label}>Subject</Text>
        <View style={styles.input}>
          <Text>{mSubject}</Text>
        </View>

        <Text style={styles.label}>Level / Module</Text>
        <Pressable onPress={() => setOpenLevels((s) => !s)} style={styles.input}>
          <Text>{mLevel}</Text>
        </Pressable>
        {openLevels ? (
          <View style={[styles.card, { marginTop: 8 }]}> 
            {ENGLISH_LEVELS.map((lvl) => (
              <Pressable key={lvl} onPress={() => { setMLevel(lvl); setOpenLevels(false); }} style={[styles.chip, mLevel === lvl ? styles.chipActive : null]}>
                <Text style={mLevel === lvl ? styles.chipActiveText : styles.chipText}>{lvl}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Choose Teacher</Text>
        <Pressable onPress={() => setOpenTeachers((s) => !s)} style={styles.input}>
          <Text>{teachers.find((t) => t.id === mTeacher)?.fullName || 'Select teacher'}</Text>
        </Pressable>
        {openTeachers ? (
          <View style={[styles.card, { marginTop: 8 }]}> 
            {teachers.map((t) => (
              <Pressable key={t.id} onPress={() => { setMTeacher(t.id); setOpenTeachers(false); }} style={[styles.chip, mTeacher === t.id ? styles.chipActive : null]}>
                <Text style={mTeacher === t.id ? styles.chipActiveText : styles.chipText}>{t.fullName}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput value={mDate} onChangeText={setMDate} style={styles.input} placeholder="YYYY-MM-DD" />

        <View style={styles.rowWrap}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Start</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput value={mStart} onChangeText={setMStart} style={[styles.input, { flex: 1 }]} placeholder="HH:MM" />
              <View style={{ flexDirection: 'row' }}>
                <Pressable onPress={() => setMStartPeriod('AM')} style={{ padding: 8 }}>
                  <Text style={{ color: mStartPeriod === 'AM' ? '#000' : '#6b7280' }}>AM</Text>
                </Pressable>
                <Pressable onPress={() => setMStartPeriod('PM')} style={{ padding: 8 }}>
                  <Text style={{ color: mStartPeriod === 'PM' ? '#000' : '#6b7280' }}>PM</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>End</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput value={mEnd} onChangeText={setMEnd} style={[styles.input, { flex: 1 }]} placeholder="HH:MM" />
              <View style={{ flexDirection: 'row' }}>
                <Pressable onPress={() => setMEndPeriod('AM')} style={{ padding: 8 }}>
                  <Text style={{ color: mEndPeriod === 'AM' ? '#000' : '#6b7280' }}>AM</Text>
                </Pressable>
                <Pressable onPress={() => setMEndPeriod('PM')} style={{ padding: 8 }}>
                  <Text style={{ color: mEndPeriod === 'PM' ? '#000' : '#6b7280' }}>PM</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput value={mNote} onChangeText={setMNote} style={[styles.input, styles.textarea]} multiline />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <PillButton label={busyReq ? 'Sending...' : 'Send Request'} onPress={submit} disabled={busyReq} />
        </View>
      </View>
    );
  }

  const getDraft = (id: string, fallback: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
    status: 'scheduled' | 'pending' | 'accepted' | 'declined' | 'cancelled';
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
    status: 'scheduled' | 'pending' | 'accepted' | 'declined' | 'cancelled';
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
      const selectedEnrollment = activeEnrollments.find((item) => item.id === enrollmentId);
      if (!selectedEnrollment) {
        Alert.alert('Validation', 'Select an active class assignment.');
        return;
      }
      if (!date || !startTime || !endTime || minutesFromHHMM(endTime) <= minutesFromHHMM(startTime)) {
        Alert.alert('Validation', 'End time must be later than start time.');
        return;
      }

      await createSchedule({
          title: selectedEnrollment.subject,
          description: selectedEnrollment.tutorialGroup || description.trim(),
          date,
          startTime,
          endTime,
          teacherId: selectedEnrollment.teacherId,
          studentId: selectedEnrollment.studentId,
          enrollmentId: selectedEnrollment.id,
        });

      setTitle('');
      setDescription('');
      setRequestNote('');
      setStudentId('');
      Alert.alert('Success', 'Video meeting scheduled. Teacher and student were notified.');
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await mobileApiClient.listEnrollments();
        const visible = rows.filter((item) => item.status === 'active' && (role === 'admin' || (role === 'teacher' ? item.teacherId === session!.user.id : item.studentId === session!.user.id)));
        const teacherIds = Array.from(new Set(visible.map((item) => item.teacherId)));
        const availability = (await Promise.all(teacherIds.map((id) => mobileApiClient.listTeacherAvailability(id)))).flat();
        if (!cancelled) { setCalendarEnrollments(visible); setCalendarAvailability(availability); }
      } catch { if (!cancelled) { setCalendarEnrollments([]); setCalendarAvailability([]); } }
    })();
    return () => { cancelled = true; };
  }, [role, session]);

  const recurringCalendarItems = useMemo(() => {
    const day = new Date(`${selectedCalendarDate}T00:00:00`).getDay();
    const classes = calendarEnrollments.flatMap((enrollment) => (enrollment.classSchedule || []).filter((slot) => slot.dayOfWeek === day).map((slot) => ({ id: `class-${enrollment.id}-${slot.dayOfWeek}`, label: enrollment.subject, detail: `${enrollment.teacherName} · ${enrollment.studentName}`, time: `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}` })));
    const teacherSlots = calendarAvailability.filter((slot) => slot.dayOfWeek === day).map((slot) => ({ id: `teacher-${slot.id}`, label: 'Teacher availability', detail: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}`, time: `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}` }));
    return [...classes, ...teacherSlots];
  }, [calendarEnrollments, calendarAvailability, selectedCalendarDate]);

  const calendarCells = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [calendarMonth]);
  const calendarSchedules = useMemo(() => data.schedules.filter((item) => item.status !== 'cancelled' && item.status !== 'declined' && (role === 'admin' || (role === 'teacher' ? item.teacherId === session!.user.id : item.studentId === session!.user.id))), [data.schedules, role, session]);
  const selectedCalendarSchedules = calendarSchedules.filter((item) => item.date === selectedCalendarDate);

  return (
    <Shell title="Schedules" subtitle="Requests, approvals, and timetable management">
      {canManage ? (
        <>
        <Card><PillButton label="+ Create Schedule" onPress={() => setCreateOpen(true)} /></Card>
        <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Card>
          <Text style={styles.sectionTitle}>Create Schedule</Text>
          <Text style={styles.label}>Class Assignment</Text>
          <View style={styles.chipWrap}>
            {activeEnrollments.map((item) => (
              <Pressable key={item.id} onPress={() => { setEnrollmentId(item.id); setTitle(item.subject); setDescription(item.tutorialGroup || ''); }} style={[styles.chip, enrollmentId === item.id ? styles.chipActive : null]}>
                <Text style={enrollmentId === item.id ? styles.chipActiveText : styles.chipText}>{item.subject} · {item.tutorialGroup || 'No group'} · {item.teacherName} · {item.studentName}</Text>
              </Pressable>
            ))}
          </View>
          {!activeEnrollments.length ? <Text style={styles.muted}>No active class assignments are available.</Text> : null}
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

          <View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setCreateOpen(false)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label="Create Schedule" onPress={async () => { await onAdd(); setCreateOpen(false); }} /></View>
        </Card></View></View></Modal>
        </>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Scheduling Calendar</Text>
        <Text style={styles.muted}>Recurring schedules and video meeting dates.</Text>
        <View style={styles.rowBetween}><Pressable onPress={() => { const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); setCalendarMonth(next); }}><Text style={styles.linkInline}>‹ Previous</Text></Pressable><Text style={styles.listTitle}>{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text><Pressable onPress={() => { const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); setCalendarMonth(next); }}><Text style={styles.linkInline}>Next ›</Text></Pressable></View>
        <View style={styles.calendarWeek}><Text style={styles.calendarWeekText}>Sun</Text><Text style={styles.calendarWeekText}>Mon</Text><Text style={styles.calendarWeekText}>Tue</Text><Text style={styles.calendarWeekText}>Wed</Text><Text style={styles.calendarWeekText}>Thu</Text><Text style={styles.calendarWeekText}>Fri</Text><Text style={styles.calendarWeekText}>Sat</Text></View>
        <View style={styles.calendarGrid}>{calendarCells.map((day) => { const dayIso = localDateIso(day); const count = calendarSchedules.filter((item) => item.date === dayIso).length; const selected = dayIso === selectedCalendarDate; return <Pressable key={dayIso} onPress={() => setSelectedCalendarDate(dayIso)} style={[styles.calendarCell, day.getMonth() !== calendarMonth.getMonth() ? styles.calendarCellMuted : null, selected ? styles.calendarCellSelected : null]}><Text style={styles.calendarDayNumber}>{day.getDate()}</Text>{count > 0 ? <View style={styles.calendarEventDot}><Text style={styles.calendarEventText}>{count}</Text></View> : null}</Pressable>; })}</View>
        <View style={[styles.rowWrap, { marginTop: 12 }]}>{([['today', 'Schedules for TODAY'], ['class', 'Class Schedules'], ['teacher', 'Teacher Schedules'], ['meeting', 'Video Meeting Schedules']] as const).map(([key, label]) => <PillButton key={key} label={label} onPress={() => setCalendarTab(key)} style={calendarTab === key ? null : { backgroundColor: '#e5e7eb' }} textStyle={calendarTab === key ? null : { color: '#374151' }} />)}</View>
        <Text style={[styles.smallTitle, { marginTop: 12 }]}>Selected day: {selectedCalendarDate}</Text>
        {calendarTab !== 'class' && calendarTab !== 'teacher' ? selectedCalendarSchedules.filter((item) => calendarTab === 'today' || item.status === 'scheduled').map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.muted}>{item.startTime}–{item.endTime} · {item.teacherName}{item.studentName ? ` · ${item.studentName}` : ''}</Text></View>) : null}
        {(calendarTab === 'today' || calendarTab === 'class') ? recurringCalendarItems.filter((item) => item.id.startsWith('class-')).map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.label}</Text><Text style={styles.muted}>{item.time} · {item.detail}</Text></View>) : null}
        {(calendarTab === 'today' || calendarTab === 'teacher') ? recurringCalendarItems.filter((item) => item.id.startsWith('teacher-')).map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.label}</Text><Text style={styles.muted}>{item.time} · {item.detail}</Text></View>) : null}
        {selectedCalendarSchedules.length === 0 && recurringCalendarItems.length === 0 ? <Text style={styles.muted}>No schedules for this day.</Text> : null}
      </Card>

      {recurringCalendarItems.length > 0 ? <Card><Text style={styles.sectionTitle}>Recurring schedules</Text>{recurringCalendarItems.map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.label}</Text><Text style={styles.muted}>{item.time} · {item.detail}</Text></View>)}</Card> : null}

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
  const [quests, setQuests] = useState<any[]>([]);
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
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

  const loadQuestsAndStore = async () => {
    try {
      setBusy(true);
      const [q, items, p] = await Promise.all([
        mobileApiClient.listStudentQuests(),
        mobileApiClient.listStoreItems(),
        mobileApiClient.listStudentStorePurchases(),
      ]);
      setQuests(q || []);
      setStoreItems(items || []);
      setPurchases(p || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load quests or store.');
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if ((questsOpen || storeOpen) && session) {
      loadQuestsAndStore();
    }
  }, [questsOpen, storeOpen, session]);

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

      {role === 'student' ? (
        <Card>
          <Text style={styles.sectionTitle}>Daily Quests & Shop</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PillButton label="Quests" onPress={() => setQuestsOpen((s) => !s)} />
            <PillButton label="Shop" onPress={() => setStoreOpen((s) => !s)} />
          </View>

          {questsOpen ? (
            <View style={{ marginTop: 12 }}>
              {!quests.length ? <Text style={styles.muted}>No quests available.</Text> : null}
              {quests.map((quest) => (
                <View key={quest.id} style={styles.listItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{quest.title}</Text>
                    <Text style={styles.muted}>{quest.description}</Text>
                  </View>
                  <PillButton
                    label={quest.completed ? 'Claim' : quest.progress && quest.progress >= quest.target ? 'Claim' : 'Go'}
                    onPress={async () => {
                      try {
                        if (quest.progress >= quest.target) {
                          await mobileApiClient.claimStudentQuest(quest.id);
                          await loadQuestsAndStore();
                          Alert.alert('Success', 'Quest claimed.');
                        } else {
                          Alert.alert('Keep going', 'Complete the quest to claim your reward.');
                        }
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to claim quest.');
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {storeOpen ? (
            <View style={{ marginTop: 12 }}>
              {!storeItems.length ? <Text style={styles.muted}>Store is empty.</Text> : null}
              {storeItems.map((item) => (
                <View key={item.id} style={styles.listItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle}>{item.name}</Text>
                    <Text style={styles.muted}>{item.description}</Text>
                  </View>
                  <PillButton
                    label={purchases.some((p) => p.storeItemId === item.id) ? 'Owned' : `Buy ${item.cost}`}
                    onPress={async () => {
                      try {
                        if (purchases.some((p) => p.storeItemId === item.id)) {
                          Alert.alert('Owned', 'You already own this item.');
                          return;
                        }
                        await mobileApiClient.purchaseStoreItem(item.code);
                        await loadQuestsAndStore();
                        Alert.alert('Success', 'Item purchased.');
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to purchase item.');
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

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
  const [createOpen, setCreateOpen] = useState(false);
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
        <>
        <Card><PillButton label="+ Create Announcement" onPress={() => setCreateOpen(true)} /></Card>
        <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.sectionTitle}>Create Announcement</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Title" />
          <TextInput
            value={content}
            onChangeText={setContent}
            style={[styles.input, styles.textarea]}
            placeholder="Write announcement"
            multiline
          />
          <View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setCreateOpen(false)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label={saving ? 'Posting...' : 'Post Announcement'} onPress={async () => { await onCreate(); setCreateOpen(false); }} disabled={saving} /></View>
        </View></View></Modal>
        </>
      ) : null}

      {editTarget ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setEditTarget(null)}>
          <View style={styles.modalBackdrop}><View style={styles.modalCard}>
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
          </View></View>
        </Modal>
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
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, DocumentPicker.DocumentPickerAsset | null>>({});
  const [gradeMap, setGradeMap] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [rubricFile, setRubricFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const canCreate = role === 'admin' || role === 'teacher';
  const isStudent = role === 'student';

  const onCreate = async () => {
    try {
      if (!title.trim() || !description.trim() || !dueDate) { Alert.alert('Validation', 'Please complete all assignment fields.'); return; }
      if (!assignToAll && selectedStudentIds.length === 0) { Alert.alert('Validation', 'Please select at least one student or assign to all.'); return; }
      await createAssignment({ title: title.trim(), description: description.trim(), dueDate, attachmentFile: attachmentFile ? { uri: attachmentFile.uri, name: attachmentFile.name, type: attachmentFile.mimeType } : null, rubricFile: rubricFile ? { uri: rubricFile.uri, name: rubricFile.name, type: rubricFile.mimeType } : null, assignedStudentIds: assignToAll ? undefined : selectedStudentIds });
      setTitle('');
      setDescription('');
      setAttachmentFile(null); setRubricFile(null);
      setAssignToAll(true); setSelectedStudentIds([]);
      Alert.alert('Success', 'Assignment created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create assignment.');
    }
  };

  const pickAssignmentFile = async (kind: 'attachment' | 'rubric') => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled) { if (kind === 'attachment') setAttachmentFile(result.assets[0]); else setRubricFile(result.assets[0]); }
  };

  const onSubmit = async (assignmentId: string) => {
    try {
      const file = submissionFiles[assignmentId];
      await submitAssignment(assignmentId, { contentText: submissionText[assignmentId] || '', file: file ? { uri: file.uri, name: file.name, type: file.mimeType } : null });
      setSubmissionText((prev) => ({ ...prev, [assignmentId]: '' }));
      setSubmissionFiles((prev) => ({ ...prev, [assignmentId]: null }));
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
        <>
        <Card><PillButton label="+ Create Assignment" onPress={() => setCreateOpen(true)} /></Card>
        <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>
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
          <PillButton label={attachmentFile ? `Attachment: ${attachmentFile.name}` : 'Choose Attachment'} onPress={() => pickAssignmentFile('attachment')} />
          <PillButton label={rubricFile ? `Rubric: ${rubricFile.name}` : 'Choose Rubric (optional)'} onPress={() => pickAssignmentFile('rubric')} style={{ backgroundColor: '#eef2ff' }} textStyle={{ color: '#4338ca' }} />
          <Text style={styles.label}>Assign to students</Text>
          <Pressable onPress={() => setAssignToAll((value) => !value)} style={styles.policyCheck}><Text style={styles.muted}>{assignToAll ? '☑' : '☐'} Assign to all students</Text></Pressable>
          {!assignToAll ? <View style={styles.chipWrap}>{data.users.filter((item) => item.role === 'student' && item.status === 'active').map((student) => <Pressable key={student.id} onPress={() => setSelectedStudentIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} style={[styles.chip, selectedStudentIds.includes(student.id) ? styles.chipActive : null]}><Text style={selectedStudentIds.includes(student.id) ? styles.chipActiveText : styles.chipText}>{student.fullName}</Text></Pressable>)}</View> : null}
          <View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setCreateOpen(false)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label="Create Assignment" onPress={async () => { await onCreate(); setCreateOpen(false); }} /></View>
        </View></View></Modal>
        </>
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
            {assignment.rubricUrl ? <Pressable onPress={() => Linking.openURL(assignment.rubricUrl!)}><Text style={styles.linkInline}>Rubric: {assignment.rubricFileName || 'View rubric'}</Text></Pressable> : null}

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
                  <PillButton label={submissionFiles[assignment.id]?.name || 'Attach File (optional)'} onPress={async () => { const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true }); if (!result.canceled) setSubmissionFiles((prev) => ({ ...prev, [assignment.id]: result.assets[0] })); }} style={{ backgroundColor: '#eef2ff' }} textStyle={{ color: '#4338ca' }} />
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
  const { data, session, gradeSubmission } = useAppContext();
  const mySubs = data.submissions.filter((s) => s.studentId === session!.user.id);
  const role = session!.user.role;
  const [gradeFilter, setGradeFilter] = useState<'all' | 'graded' | 'pending'>('all');
  const visibleSubs = mySubs.filter((item) => gradeFilter === 'all' || (gradeFilter === 'graded' ? Boolean(item.grade) : !item.grade));
  const [gradeMap, setGradeMap] = useState<Record<string, { grade: string; feedback: string }>>({});
  const saveGrade = async (id: string) => {
    const draft = gradeMap[id];
    if (!draft?.grade.trim() || !draft.feedback.trim()) { Alert.alert('Validation', 'Please provide both grade and feedback.'); return; }
    try { await gradeSubmission(id, draft); Alert.alert('Success', 'Grade and feedback saved.'); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to save grade.'); }
  };

  if (role === 'teacher') {
    return <Shell title="Grades & Feedback" subtitle="Review and manage all student grades and feedback"><Card><Text style={styles.sectionTitle}>All Submissions</Text>{data.submissions.map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.assignmentTitle}</Text><Text style={styles.muted}>Student: {item.studentName}</Text><Text style={styles.muted}>{item.contentText || 'No text submission'}</Text>{item.fileUrl ? <Pressable onPress={() => Linking.openURL(item.fileUrl!)}><Text style={styles.linkInline}>View submitted file</Text></Pressable> : null}<TextInput value={gradeMap[item.id]?.grade ?? item.grade ?? ''} onChangeText={(value) => setGradeMap((current) => ({ ...current, [item.id]: { grade: value, feedback: current[item.id]?.feedback ?? item.feedback ?? '' } }))} style={styles.input} placeholder="Grade" /><TextInput value={gradeMap[item.id]?.feedback ?? item.feedback ?? ''} onChangeText={(value) => setGradeMap((current) => ({ ...current, [item.id]: { grade: current[item.id]?.grade ?? item.grade ?? '', feedback: value } }))} style={[styles.input, styles.textarea]} placeholder="Feedback" multiline /><PillButton label="Save Grade" onPress={() => saveGrade(item.id)} /></View>)}{!data.submissions.length ? <Text style={styles.muted}>No submissions yet.</Text> : null}</Card></Shell>;
  }

  return (
    <Shell title="Grades & Feedback" subtitle="Track your performance">
      <View style={styles.rowWrap}><Card><Text style={styles.bigValue}>{mySubs.length}</Text><Text style={styles.muted}>Total Submitted</Text></Card><Card><Text style={styles.bigValue}>{mySubs.filter((item) => item.grade).length}</Text><Text style={styles.muted}>Graded</Text></Card><Card><Text style={styles.bigValue}>{mySubs.filter((item) => !item.grade).length}</Text><Text style={styles.muted}>Awaiting Grade</Text></Card></View>
      <View style={styles.rowWrap}><PillButton label="All" onPress={() => setGradeFilter('all')} style={gradeFilter === 'all' ? null : { backgroundColor: '#e5e7eb' }} textStyle={gradeFilter === 'all' ? null : { color: '#374151' }} /><PillButton label={`Graded (${mySubs.filter((item) => item.grade).length})`} onPress={() => setGradeFilter('graded')} style={gradeFilter === 'graded' ? null : { backgroundColor: '#e5e7eb' }} textStyle={gradeFilter === 'graded' ? null : { color: '#374151' }} /><PillButton label={`Pending (${mySubs.filter((item) => !item.grade).length})`} onPress={() => setGradeFilter('pending')} style={gradeFilter === 'pending' ? null : { backgroundColor: '#e5e7eb' }} textStyle={gradeFilter === 'pending' ? null : { color: '#374151' }} /></View>
      {visibleSubs.map((item) => (
        <Card key={item.id}>
          <Text style={styles.listTitle}>{item.assignmentTitle}</Text>
          <Text style={styles.muted}>Grade: {item.grade || 'Pending'}</Text>
          <Text style={styles.muted}>Feedback: {item.feedback || 'Not yet reviewed'}</Text>
        </Card>
      ))}
      {visibleSubs.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No submissions yet.</Text>
        </Card>
      ) : null}
    </Shell>
  );
}

type AssessmentQuestion = {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'identification';
  prompt: string;
  options: string[];
  answer: string;
  points: number;
};

function localDateIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

type AssessmentTemplate = {
  id: string;
  title: string;
  subject: string;
  level: string;
  type: 'Pre-assessment' | 'Post-assessment';
  date: string;
  questions: AssessmentQuestion[];
  status: 'Published' | 'Draft';
};

type AssessmentAssignment = {
  id: string;
  title: string;
  teacherId: string;
  studentIds: string[];
  dueDate: string;
  questions: AssessmentQuestion[];
  completed: string[];
  scores: Record<string, number>;
};

const assessmentQuestions: AssessmentQuestion[] = [
  { id: 'q1', type: 'multiple-choice', prompt: 'Which word is a noun?', options: ['Quickly', 'Teacher', 'Run', 'Beautiful'], answer: 'Teacher', points: 1 },
  { id: 'q2', type: 'true-false', prompt: 'A sentence begins with a capital letter.', options: ['True', 'False'], answer: 'True', points: 1 },
  { id: 'q3', type: 'identification', prompt: 'Complete the sentence: She ___ to school every day.', options: [], answer: 'goes', points: 1 },
];

function AssessmentsScreen() {
  const { session, data } = useAppContext();
  const user = session!.user;
  const students = data.users.filter((item) => item.role === 'student');
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([
    { id: 't1', title: 'English Beginner Pre-Assessment', subject: 'English', level: 'Beginner', type: 'Pre-assessment', date: '2026-09-01', questions: assessmentQuestions, status: 'Published' },
    { id: 't2', title: 'English Beginner Post-Assessment', subject: 'English', level: 'Beginner', type: 'Post-assessment', date: '2026-09-01', questions: assessmentQuestions.map((q, index) => ({ ...q, id: `post-${index}`, prompt: index === 0 ? 'Which word describes a person, place, or thing?' : index === 1 ? 'A verb shows an action or state of being.' : 'Complete the sentence: They ___ English together.', answer: index === 0 ? 'Teacher' : index === 1 ? 'True' : 'study' })), status: 'Published' },
  ]);
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>([
    { id: 'a1', title: 'English Beginner Pre-Assessment', teacherId: students[0]?.id ? user.id : 'teacher-1', studentIds: students.map((item) => item.id), dueDate: '2026-09-15', questions: assessmentQuestions, completed: [], scores: {} },
  ]);
  const [tab, setTab] = useState<'templates' | 'assignments'>('templates');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const active = assignments.find((item) => item.id === activeId);

  const createTemplate = () => {
    const id = `t${Date.now()}`;
    setTemplates((current) => [{ id, title: 'New English Assessment', subject: 'English', level: 'Beginner', type: 'Pre-assessment', date: new Date().toISOString().slice(0, 10), questions: [{ id: `q${Date.now()}`, type: 'multiple-choice', prompt: 'New question', options: ['Option A', 'Option B'], answer: 'Option A', points: 1 }], status: 'Draft' }, ...current]);
  };

  const assignTemplate = (template: AssessmentTemplate) => {
    setAssignments((current) => [{ id: `a${Date.now()}`, title: template.title, teacherId: user.id, studentIds: students.map((item) => item.id), dueDate: template.date, questions: template.questions, completed: [], scores: {} }, ...current]);
    setTab('assignments');
  };

  const updateTemplate = (id: string, field: 'title' | 'subject' | 'level' | 'type' | 'date', value: string) => {
    setTemplates((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateTemplateQuestion = (templateId: string, questionId: string, field: 'prompt' | 'answer', value: string) => {
    setTemplates((current) => current.map((item) => item.id === templateId ? { ...item, questions: item.questions.map((question) => question.id === questionId ? { ...question, [field]: value } : question) } : item));
  };

  const updateAssignmentQuestion = (assignmentId: string, questionId: string, field: 'prompt' | 'answer', value: string) => {
    setAssignments((current) => current.map((item) => item.id === assignmentId ? { ...item, questions: item.questions.map((question) => question.id === questionId ? { ...question, [field]: value } : question) } : item));
  };

  const submit = () => {
    if (!active) return;
    const earned = active.questions.reduce((sum, question) => sum + (answers[question.id]?.trim().toLowerCase() === question.answer.toLowerCase() ? question.points : 0), 0);
    const total = active.questions.reduce((sum, question) => sum + question.points, 0);
    const percent = total ? Math.round((earned / total) * 100) : 0;
    setAssignments((current) => current.map((item) => item.id === active.id ? { ...item, completed: [...new Set([...item.completed, user.id])], scores: { ...item.scores, [user.id]: percent } } : item));
    setActiveId(null);
    setAnswers({});
    Alert.alert('Assessment submitted', `Your score is ${percent}%.`);
  };

  if (active && user.role === 'student') {
    return <Shell title={active.title} subtitle="Automatic scoring">
      <Pressable onPress={() => setActiveId(null)}><Text style={styles.linkInline}>← Back to assessments</Text></Pressable>
      <Card><Text style={styles.smallTitle}>{active.questions.length} questions · Due {active.dueDate}</Text>
        {active.questions.map((question, index) => <View key={question.id} style={styles.listItem}>
          <Text style={styles.listTitle}>{index + 1}. {question.prompt}</Text>
          {question.type === 'identification' ? <TextInput style={styles.input} placeholder="Type your answer" value={answers[question.id] || ''} onChangeText={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} /> : question.options.map((option) => <Pressable key={option} onPress={() => setAnswers((current) => ({ ...current, [question.id]: option }))} style={[styles.choiceButton, answers[question.id] === option ? styles.choiceButtonActive : null]}><Text style={[styles.choiceButtonText, answers[question.id] === option ? styles.choiceButtonTextActive : null]}>{option}</Text></Pressable>)}
        </View>)}
        <PillButton label="Submit assessment" onPress={submit} />
      </Card>
    </Shell>;
  }

  return <Shell title={user.role === 'admin' ? 'Assessment Templates' : user.role === 'teacher' ? 'Assessments' : 'My Assessments'} subtitle="Assessment Center">
    <Text style={styles.muted}>{user.role === 'admin' ? 'Create standardized English assessments for every learning level.' : user.role === 'teacher' ? 'Assign assessments and monitor student performance.' : 'Complete your assessments and track your progress.'}</Text>
    <View style={styles.rowWrap}><PillButton label={user.role === 'student' ? 'Available assessments' : 'Templates'} style={tab === 'templates' ? null : { backgroundColor: '#e5e7eb' }} textStyle={tab === 'templates' ? null : { color: '#374151' }} onPress={() => setTab('templates')} />{user.role !== 'admin' ? <PillButton label="Performance" style={tab === 'assignments' ? null : { backgroundColor: '#e5e7eb' }} textStyle={tab === 'assignments' ? null : { color: '#374151' }} onPress={() => setTab('assignments')} /> : null}{user.role === 'admin' ? <PillButton label="New template" onPress={createTemplate} /> : null}</View>
    {tab === 'templates' && user.role === 'student' ? assignments.filter((item) => item.studentIds.includes(user.id)).map((item) => <Card key={item.id}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.muted}>{item.questions.length} questions · Due {item.dueDate}</Text><PillButton label={item.completed.includes(user.id) ? `Completed · ${item.scores[user.id]}%` : 'Start assessment'} disabled={item.completed.includes(user.id)} onPress={() => setActiveId(item.id)} /></Card>) : null}
    {tab === 'templates' && user.role !== 'student' ? templates.map((template) => <Card key={template.id}><Text style={styles.chipText}>{template.type}</Text>{user.role === 'admin' ? <><TextInput value={template.title} onChangeText={(value) => updateTemplate(template.id, 'title', value)} style={styles.input} placeholder="Title" /><View style={styles.rowWrap}><TextInput value={template.subject} onChangeText={(value) => updateTemplate(template.id, 'subject', value)} style={[styles.input, styles.half]} placeholder="Subject" /><TextInput value={template.level} onChangeText={(value) => updateTemplate(template.id, 'level', value)} style={[styles.input, styles.half]} placeholder="Level" /></View><View style={styles.rowWrap}><Pressable onPress={() => updateTemplate(template.id, 'type', template.type === 'Pre-assessment' ? 'Post-assessment' : 'Pre-assessment')} style={styles.chip}><Text style={styles.chipText}>{template.type}</Text></Pressable><TextInput value={template.date} onChangeText={(value) => updateTemplate(template.id, 'date', value)} style={[styles.input, styles.half]} placeholder="YYYY-MM-DD" /></View>{template.questions.map((question) => <View key={question.id} style={styles.listItem}><TextInput value={question.prompt} onChangeText={(value) => updateTemplateQuestion(template.id, question.id, 'prompt', value)} style={styles.input} placeholder="Question" /><TextInput value={question.answer} onChangeText={(value) => updateTemplateQuestion(template.id, question.id, 'answer', value)} style={styles.input} placeholder="Correct answer" /></View>)}</> : <><Text style={styles.listTitle}>{template.title}</Text><Text style={styles.muted}>{template.subject} · {template.level} · {template.questions.length} questions</Text></>}{user.role === 'teacher' ? <PillButton label="Use & assign" onPress={() => assignTemplate(template)} /> : <PillButton label="Save template" onPress={() => Alert.alert('Template saved')} />}</Card>) : null}
    {tab === 'assignments' ? <><View style={styles.rowWrap}><Card><Text style={styles.smallTitle}>Assigned</Text><Text style={styles.bigValue}>{assignments.length}</Text></Card><Card><Text style={styles.smallTitle}>Completed</Text><Text style={styles.bigValue}>{assignments.filter((item) => item.completed.length > 0).length}</Text></Card></View>{user.role === 'teacher' ? <><Card><Text style={styles.sectionTitle}>Assigned assessment copies</Text>{assignments.map((assignment) => <View key={assignment.id} style={styles.listItem}><Text style={styles.listTitle}>{assignment.title}</Text>{assignment.questions.map((question) => <View key={question.id}><TextInput value={question.prompt} onChangeText={(value) => updateAssignmentQuestion(assignment.id, question.id, 'prompt', value)} style={styles.input} placeholder="Question" /><TextInput value={question.answer} onChangeText={(value) => updateAssignmentQuestion(assignment.id, question.id, 'answer', value)} style={styles.input} placeholder="Correct answer" /></View>)}</View>)}</Card><Card><Text style={styles.sectionTitle}>Student performance</Text>{students.map((student) => <View key={student.id} style={styles.listItemRow}><Text style={styles.listTitle}>{student.fullName}</Text><Text style={styles.muted}>{assignments.some((item) => item.scores[student.id] !== undefined) ? `${assignments.find((item) => item.scores[student.id] !== undefined)?.scores[student.id]}%` : 'Not started'}</Text></View>)}</Card></> : null}</> : null}
  </Shell>;
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
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
      setTitle(''); setSubject(''); setDescription(''); setUrl(''); setCreateOpen(false);
      await load();
      Alert.alert('Success', 'Learning material added.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add material.');
    } finally {
      setSaving(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const addFile = async () => {
    if (!title.trim() || !subject.trim() || !file) { Alert.alert('Validation', 'Title, subject, and file are required.'); return; }
    try {
      setSaving(true);
      await mobileApiClient.createLearningMaterialFile({ title: title.trim(), subject: subject.trim(), description: description.trim() || undefined, file: { uri: file.uri, name: file.name, type: file.mimeType } });
      setTitle(''); setSubject(''); setDescription(''); setFile(null); setCreateOpen(false); await load(); Alert.alert('Success', 'Learning material file uploaded.');
    } catch (error: any) { Alert.alert('Error', error.message || 'Failed to upload material file.'); } finally { setSaving(false); }
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
        <>
        <Card><PillButton label="+ Add Learning Material" onPress={() => setCreateOpen(true)} /></Card>
        <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.sectionTitle}>Add Learning Material</Text>
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
          <View style={styles.rowWrap}><PillButton label="Add Link" onPress={addLink} disabled={saving} /><PillButton label={file ? file.name : 'Choose File'} onPress={pickFile} disabled={saving} /><PillButton label={saving ? 'Uploading...' : 'Upload File'} onPress={addFile} disabled={saving || !file} /></View>
        </View></View></Modal>
        </>
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
  const [gradeLevel, setGradeLevel] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [dropTarget, setDropTarget] = useState<EnrollmentRecordItem | null>(null);
  const [dropReason, setDropReason] = useState('');
  const [dropDate, setDropDate] = useState(new Date().toISOString().slice(0, 10));
  const [dropActionTaken, setDropActionTaken] = useState('');
  const [dropPullOutReason, setDropPullOutReason] = useState('');
  const [dropNotes, setDropNotes] = useState('');
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentRecordItem | null>(null);
  const [editEnrollment, setEditEnrollment] = useState({ studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '', status: 'active', classSchedule: [] as Array<{ dayOfWeek: number; startTime: string; endTime: string }> });
  const [scheduleTarget, setScheduleTarget] = useState<EnrollmentRecordItem | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<Array<{ dayOfWeek: number; startTime: string; endTime: string }>>([]);

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
        gradeLevel: gradeLevel.trim() || undefined,
        note: note.trim() || undefined,
      });
      setStudentId(''); setTeacherId(''); setSubject(''); setTutorialGroup(''); setGradeLevel(''); setNote('');
      await load();
      Alert.alert('Success', 'Enrollment created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create enrollment.');
    } finally {
      setSaving(false);
    }
  };

  const onUpdateStatus = async (id: string, status: string) => {
    if (status === 'dropped') {
      setDropTarget(myEnrollments.find((item) => item.id === id) || null);
      setDropDate(new Date().toISOString().slice(0, 10));
      setDropReason('');
      setDropActionTaken('');
      setDropPullOutReason('');
      setDropNotes('');
      return;
    }
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

  const openEnrollmentEdit = (item: EnrollmentRecordItem) => {
    setEditingEnrollment(item);
    setEditEnrollment({ studentId: item.studentId, teacherId: item.teacherId, subject: item.subject, tutorialGroup: item.tutorialGroup || '', gradeLevel: item.gradeLevel || '', note: item.note || '', status: item.status, classSchedule: item.classSchedule || [] });
  };

  const saveEnrollmentEdit = async () => {
    if (!editingEnrollment || !editEnrollment.subject.trim()) { Alert.alert('Validation', 'Subject is required.'); return; }
    try {
      setSaving(true);
      await mobileApiClient.updateEnrollment(editingEnrollment.id, { ...editEnrollment, subject: editEnrollment.subject.trim(), tutorialGroup: editEnrollment.tutorialGroup.trim() || null, gradeLevel: editEnrollment.gradeLevel.trim() || null, note: editEnrollment.note.trim() || null });
      setEditingEnrollment(null);
      await load();
    } catch (error: any) { Alert.alert('Error', error.message || 'Failed to update enrollment.'); } finally { setSaving(false); }
  };

  const openScheduleEdit = (item: EnrollmentRecordItem) => { setScheduleTarget(item); setScheduleDraft(item.classSchedule || []); };
  const saveScheduleEdit = async () => {
    if (!scheduleTarget) return;
    try { setSaving(true); await mobileApiClient.updateEnrollment(scheduleTarget.id, { classSchedule: scheduleDraft }); setScheduleTarget(null); await load(); }
    catch (error: any) { Alert.alert('Error', error.message || 'Failed to update class schedule.'); }
    finally { setSaving(false); }
  };

  const filteredEnrollments = myEnrollments.filter((item) => {
    const query = search.trim().toLowerCase();
    return (!query || `${item.studentName} ${item.teacherName} ${item.subject} ${item.tutorialGroup || ''} ${item.gradeLevel || ''}`.toLowerCase().includes(query)) && (!statusFilter || item.status === statusFilter) && (!teacherFilter || item.teacherId === teacherFilter) && (!subjectFilter || item.subject === subjectFilter) && (!groupFilter || item.tutorialGroup === groupFilter) && (!gradeFilter || item.gradeLevel === gradeFilter) && (!createdFrom || item.createdAt.slice(0, 10) >= createdFrom) && (!createdTo || item.createdAt.slice(0, 10) <= createdTo);
  });

  return (
    <Shell title="Enrollments" subtitle={isAdmin ? 'Manage student-teacher enrollments' : 'Your enrolled subjects and classes'}>
      <Modal visible={Boolean(scheduleTarget)} transparent animationType="slide" onRequestClose={() => setScheduleTarget(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>{scheduleTarget ? <><Text style={styles.sectionTitle}>Edit Class Schedule</Text><Text style={styles.muted}>{scheduleTarget.subject} · {scheduleTarget.studentName}</Text>{scheduleDraft.map((slot, index) => <View key={`${index}-${slot.dayOfWeek}`} style={styles.listItem}><TextInput style={styles.input} value={String(slot.dayOfWeek)} onChangeText={(value) => setScheduleDraft((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, dayOfWeek: Math.max(0, Math.min(6, Number(value) || 0)) } : current))} placeholder="Day (0 Sun - 6 Sat)" keyboardType="numeric" /><View style={styles.rowWrap}><TextInput style={[styles.input, styles.half]} value={slot.startTime} onChangeText={(value) => setScheduleDraft((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, startTime: value } : current))} placeholder="09:00" /><TextInput style={[styles.input, styles.half]} value={slot.endTime} onChangeText={(value) => setScheduleDraft((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, endTime: value } : current))} placeholder="17:00" /><Pressable onPress={() => setScheduleDraft((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.dangerText}>Remove</Text></Pressable></View></View>)}<View style={styles.rowWrap}><PillButton label="+ Add time" onPress={() => setScheduleDraft((items) => [...items, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }])} style={{ backgroundColor: '#eef2ff' }} textStyle={{ color: '#4338ca' }} /><PillButton label="Cancel" onPress={() => setScheduleTarget(null)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label={saving ? 'Saving...' : 'Save Schedule'} onPress={saveScheduleEdit} disabled={saving} /></View></> : null}</View></View></Modal>
      <Modal visible={Boolean(editingEnrollment)} transparent animationType="slide" onRequestClose={() => setEditingEnrollment(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>{editingEnrollment ? <><Text style={styles.sectionTitle}>Edit Class/Tutorial Assignment</Text><Text style={styles.muted}>Update the assignment record for {editingEnrollment.studentName}.</Text><TextInput style={styles.input} placeholder="Subject" value={editEnrollment.subject} onChangeText={(value) => setEditEnrollment((current) => ({ ...current, subject: value }))} /><TextInput style={styles.input} placeholder="Tutorial group" value={editEnrollment.tutorialGroup} onChangeText={(value) => setEditEnrollment((current) => ({ ...current, tutorialGroup: value }))} /><TextInput style={styles.input} placeholder="Grade level" value={editEnrollment.gradeLevel} onChangeText={(value) => setEditEnrollment((current) => ({ ...current, gradeLevel: value }))} /><TextInput style={[styles.input, styles.textarea]} placeholder="Note" multiline value={editEnrollment.note} onChangeText={(value) => setEditEnrollment((current) => ({ ...current, note: value }))} /><Text style={styles.label}>Status</Text><View style={styles.rowWrap}>{(['active', 'completed', 'dropped', 'archived'] as const).map((status) => <Pressable key={status} onPress={() => setEditEnrollment((current) => ({ ...current, status }))} style={[styles.chip, editEnrollment.status === status ? styles.chipActive : null]}><Text style={editEnrollment.status === status ? styles.chipActiveText : styles.chipText}>{status}</Text></Pressable>)}</View><View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setEditingEnrollment(null)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label={saving ? 'Saving...' : 'Save Changes'} onPress={saveEnrollmentEdit} disabled={saving} /></View></> : null}</View></View></Modal>
      {isAdmin ? (
        <>
        <Card><View style={styles.rowWrap}><PillButton label="+ Create Enrollment" onPress={() => setCreateOpen(true)} /><PillButton label="User Management" modalChildren={() => <UsersScreen />} /></View></Card>
        <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>
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
          <TextInput value={gradeLevel} onChangeText={setGradeLevel} style={styles.input} placeholder="Grade level (optional)" />
          <TextInput value={note} onChangeText={setNote} style={[styles.input, styles.textarea]} placeholder="Note (optional)" multiline />
          <View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setCreateOpen(false)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label={saving ? 'Saving...' : 'Create Enrollment'} onPress={async () => { await onCreate(); setCreateOpen(false); }} disabled={saving} /></View>
        </View></View></Modal>
        </>
      ) : null}
      {busy ? (
        <Card>
          <ActivityIndicator color="#6d28d9" />
        </Card>
      ) : null}
      <Card><TextInput value={search} onChangeText={setSearch} style={styles.input} placeholder="Search students, teachers, subjects..." /><Text style={styles.label}>Teachers</Text><View style={styles.chipWrap}><Pressable onPress={() => setTeacherFilter('')} style={[styles.chip, !teacherFilter ? styles.chipActive : null]}><Text style={!teacherFilter ? styles.chipActiveText : styles.chipText}>All</Text></Pressable>{teachers.map((teacher) => <Pressable key={teacher.id} onPress={() => setTeacherFilter(teacher.id)} style={[styles.chip, teacherFilter === teacher.id ? styles.chipActive : null]}><Text style={teacherFilter === teacher.id ? styles.chipActiveText : styles.chipText}>{teacher.fullName}</Text></Pressable>)}</View><Text style={styles.label}>Subjects / Groups / Grade levels</Text><View style={styles.rowWrap}><TextInput value={subjectFilter} onChangeText={setSubjectFilter} style={[styles.input, styles.half]} placeholder="Subject" /><TextInput value={groupFilter} onChangeText={setGroupFilter} style={[styles.input, styles.half]} placeholder="Group" /><TextInput value={gradeFilter} onChangeText={setGradeFilter} style={[styles.input, styles.half]} placeholder="Grade level" /></View><View style={styles.rowWrap}><TextInput value={createdFrom} onChangeText={setCreatedFrom} style={[styles.input, styles.half]} placeholder="Created from YYYY-MM-DD" /><TextInput value={createdTo} onChangeText={setCreatedTo} style={[styles.input, styles.half]} placeholder="Created to YYYY-MM-DD" /></View><View style={styles.rowWrap}><PillButton label="All" onPress={() => setStatusFilter('')} style={!statusFilter ? null : { backgroundColor: '#e5e7eb' }} textStyle={!statusFilter ? null : { color: '#374151' }} /><PillButton label="Active" onPress={() => setStatusFilter('active')} style={statusFilter === 'active' ? null : { backgroundColor: '#e5e7eb' }} textStyle={statusFilter === 'active' ? null : { color: '#374151' }} /><PillButton label="Completed" onPress={() => setStatusFilter('completed')} style={statusFilter === 'completed' ? null : { backgroundColor: '#e5e7eb' }} textStyle={statusFilter === 'completed' ? null : { color: '#374151' }} /><PillButton label="Dropped" onPress={() => setStatusFilter('dropped')} style={statusFilter === 'dropped' ? null : { backgroundColor: '#e5e7eb' }} textStyle={statusFilter === 'dropped' ? null : { color: '#374151' }} /><PillButton label="Archived" onPress={() => setStatusFilter('archived')} style={statusFilter === 'archived' ? null : { backgroundColor: '#e5e7eb' }} textStyle={statusFilter === 'archived' ? null : { color: '#374151' }} /></View></Card>
      {!busy && filteredEnrollments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No enrollment records found.</Text>
        </Card>
      ) : null}
      {filteredEnrollments.map((item) => (
        <Card key={item.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.listTitle}>{item.subject}</Text>
            <Text style={[styles.smallTitle, { color: statusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
          </View>
          {item.tutorialGroup ? <Text style={styles.muted}>Group: {item.tutorialGroup}</Text> : null}
          <Text style={styles.muted}>Teacher: {item.teacherName}</Text>
          <Text style={styles.muted}>Student: {item.studentName}</Text>
          {item.gradeLevel ? <Text style={styles.muted}>Grade level: {item.gradeLevel}</Text> : null}
          {item.classSchedule?.length ? <Text style={styles.muted}>Class schedule: {item.classSchedule.map((slot) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek]} ${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`).join(', ')}</Text> : null}
          {item.note ? <Text style={styles.muted}>Note: {item.note}</Text> : null}
          {isAdmin ? (
            <View style={[styles.rowWrap, { marginTop: 8 }]}>
              <Pressable onPress={() => openEnrollmentEdit(item)}><Text style={styles.linkInline}>Edit</Text></Pressable>
              <Pressable onPress={() => openScheduleEdit(item)}><Text style={styles.linkInline}>Schedule</Text></Pressable>
              <Pressable onPress={() => onUpdateStatus(item.id, item.status === 'active' ? 'completed' : 'active')}>
                <Text style={styles.linkInline}>{item.status === 'active' ? 'Mark Completed' : 'Mark Active'}</Text>
              </Pressable>
              <Pressable onPress={() => onUpdateStatus(item.id, 'dropped')} style={{ marginLeft: 12 }}><Text style={styles.dangerText}>Drop</Text></Pressable>
              <Pressable onPress={() => onDelete(item.id)} style={{ marginLeft: 12 }}>
                <Text style={styles.dangerText}>Archive</Text>
              </Pressable>
            </View>
          ) : null}
        </Card>
      ))}
      <Modal visible={Boolean(dropTarget)} transparent animationType="slide" onRequestClose={() => setDropTarget(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>{dropTarget ? <><Text style={styles.sectionTitle}>Drop {dropTarget.studentName} from {dropTarget.subject}?</Text><Text style={styles.muted}>Record the reason and action taken for this status change.</Text><TextInput style={[styles.input, styles.textarea]} placeholder="Reason for dropping (required)" multiline value={dropReason} onChangeText={setDropReason} /><TextInput style={styles.input} placeholder="Date of drop (YYYY-MM-DD)" value={dropDate} onChangeText={setDropDate} /><TextInput style={[styles.input, styles.textarea]} placeholder="Action taken (optional)" multiline value={dropActionTaken} onChangeText={setDropActionTaken} /><TextInput style={[styles.input, styles.textarea]} placeholder="Pull-out reason (optional)" multiline value={dropPullOutReason} onChangeText={setDropPullOutReason} /><TextInput style={[styles.input, styles.textarea]} placeholder="Other relevant notes (optional)" multiline value={dropNotes} onChangeText={setDropNotes} /><View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setDropTarget(null)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label="Save Dropped Status" onPress={async () => { if (!dropReason.trim()) { Alert.alert('Validation', 'A reason is required.'); return; } try { await mobileApiClient.updateEnrollment(dropTarget.id, { status: 'dropped', dropReason: dropReason.trim(), dropDate, actionTaken: dropActionTaken.trim() || undefined, pullOutReason: dropPullOutReason.trim() || undefined, statusNotes: dropNotes.trim() || undefined }); setDropTarget(null); await load(); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to update enrollment status.'); } }} /></View></> : null}</View></View></Modal>
    </Shell>
  );
}

function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

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

  const markRead = async (id: string) => { try { await mobileApiClient.markNotificationRead(id); setNotifications((items) => items.map((item) => item.id === id ? { ...item, isRead: true } : item)); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to mark notification as read.'); } };
  const markAllRead = async () => { try { await mobileApiClient.markAllNotificationsRead(); setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to mark notifications as read.'); } };
  const remove = async (id: string) => { try { await mobileApiClient.deleteNotification(id); setNotifications((items) => items.filter((item) => item.id !== id)); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to delete notification.'); } };
  const displayed = notifications.filter((item) => priorityFilter === 'all' || item.priority === priorityFilter);
  const unread = notifications.filter((item) => !item.isRead).length;

  const priorityColor = (priority: string) => {
    if (priority === 'high') return '#dc2626';
    if (priority === 'medium') return '#d97706';
    return '#6b7280';
  };

  return (
    <Shell title="Notifications" subtitle="Your recent activity">
      <View style={styles.rowWrap}><PillButton label={busy ? 'Refreshing...' : 'Refresh'} onPress={load} disabled={busy} />{unread > 0 ? <PillButton label="Mark all read" onPress={markAllRead} style={{ backgroundColor: '#16a34a' }} /> : null}</View>
      <Card><View style={styles.rowWrap}>{(['all', 'high', 'medium', 'low'] as const).map((priority) => <PillButton key={priority} label={priority === 'all' ? 'All priorities' : `${priority[0].toUpperCase()}${priority.slice(1)}`} onPress={() => setPriorityFilter(priority)} style={priorityFilter === priority ? null : { backgroundColor: '#e5e7eb' }} textStyle={priorityFilter === priority ? null : { color: '#374151' }} />)}</View></Card>
      {!busy && displayed.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No notifications yet.</Text>
        </Card>
      ) : null}
      {displayed.map((item) => (
        <Card key={item.id}>
          <View style={styles.rowBetween}>
            <Text style={[styles.listTitle, { flex: 1 }]}>{item.title}</Text>
            <Text style={[styles.smallTitle, { color: priorityColor(item.priority) }]}>{item.priority.toUpperCase()}</Text>
          </View>
          <Text style={styles.muted}>{item.message}</Text>
          <Text style={styles.muted}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <View style={styles.rowWrap}>{item.actionView ? <PillButton label="Open" onPress={() => navigation.navigate(item.actionView === 'schedule' ? 'Scheduling' : item.actionView === 'assignments' ? 'Assignments' : item.actionView === 'grades' ? 'Grades/Feedback' : item.actionView === 'announcements' ? 'Announcements' : item.actionView === 'materials' ? 'Learning Materials' : item.actionView === 'assessments' ? 'Assessments' : item.actionView === 'enrollments' ? 'Enrollments' : item.actionView === 'meetings' ? 'Video Meetings' : 'Dashboard')} style={{ backgroundColor: '#eef2ff' }} textStyle={{ color: '#4338ca' }} /> : null}{!item.isRead ? <PillButton label="Mark read" onPress={() => markRead(item.id)} style={{ backgroundColor: '#ecfdf5' }} textStyle={{ color: '#166534' }} /> : null}<PillButton label="Delete" onPress={() => remove(item.id)} style={{ backgroundColor: '#fef2f2' }} textStyle={{ color: '#b91c1c' }} /></View>
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

  const speak = (toSay: string) => {
    if (!toSay || !toSay.trim()) return;
    try {
      // require dynamically so bundler doesn't fail if package isn't installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Speech = require('expo-speech');
      if (Speech && typeof Speech.speak === 'function') {
        try {
          Speech.stop && Speech.stop();
        } catch (_e) {}
        Speech.speak(toSay, { rate: 0.95 });
        return;
      }
    } catch (_err) {
      // fall through
    }
    Alert.alert('TTS not available', 'Install expo-speech to enable text-to-speech.');
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
            <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
              <PillButton label="🔊 Speak" onPress={() => speak(translated)} />
              <PillButton label="🔈 Source" onPress={() => speak(text)} />
            </View>
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
  const { data, enrollAccount, editUser, deleteUser, changeUserStatus } = useAppContext();
  const [firstName, setFirstName] = useState('');
  const [middleName2, setMiddleName2] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [status, setStatus] = useState<UserStatus>('active');
  const [password, setPassword] = useState('password');
  const [mobileNumber, setMobileNumber] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [minorPolicyAgreed, setMinorPolicyAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [statusTarget, setStatusTarget] = useState<any | null>(null);
  const [statusDraft, setStatusDraft] = useState({ status: 'active' as UserStatus, reason: '', dropDate: new Date().toISOString().slice(0, 10), actionTaken: '', pullOutReason: '', notes: '' });
  const [editDraft, setEditDraft] = useState({ firstName: '', middleName: '', lastName: '', email: '', mobileNumber: '', birthdate: '', role: 'student' as UserRole, status: 'active' as UserStatus });
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | ''>('');
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatus | ''>('');
  const [userDateFrom, setUserDateFrom] = useState('');
  const [userDateTo, setUserDateTo] = useState('');
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;

  const create = async () => {
    try {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        Alert.alert('Validation', 'First name, last name, and email are required.');
        return;
      }
      if (role === 'student' && birthdate) {
        const birth = new Date(`${birthdate}T00:00:00`);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
        if (age < 18 && !minorPolicyAgreed) { Alert.alert('Validation', 'Please acknowledge the parent/guardian guidance policy for students under 18.'); return; }
      }
      await enrollAccount({ firstName: firstName.trim(), middleName: middleName2.trim() || undefined, lastName: lastName.trim(), email: email.trim(), role, mobileNumber: mobileNumber.trim() || undefined, birthdate: birthdate || undefined });
      setFirstName('');
      setMiddleName2('');
      setLastName('');
      setEmail('');
      setMobileNumber('');
      setBirthdate('');
      setMinorPolicyAgreed(false);
      setCreateOpen(false);
      Alert.alert('Success', 'User created.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create user.');
    }
  };

  const openEdit = (row: any) => { setEditTarget(row); setEditDraft({ firstName: row.firstName, middleName: row.middleName || '', lastName: row.lastName, email: row.email, mobileNumber: row.mobileNumber || '', birthdate: row.birthdate || '', role: row.role, status: row.status }); };
  const saveEdit = async () => {
    if (!editTarget) return;
    try { await editUser(editTarget.id, editDraft); setEditTarget(null); Alert.alert('Success', 'User updated.'); }
    catch (error: any) { Alert.alert('Error', error.message || 'Failed to update user.'); }
  };

  const toggleStatus = async (id: string, currentStatus: UserStatus, row: any) => {
    try {
      await editUser(id, {
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
        email: row.email,
        mobileNumber: row.mobileNumber || null,
        birthdate: row.birthdate || null,
        role: row.role,
        status: currentStatus === 'active' ? 'inactive' : 'active',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update user.');
    }
  };

  const saveStatus = async () => {
    if (!statusTarget) return;
    if (statusDraft.status === 'dropped' && !statusDraft.reason.trim()) { Alert.alert('Validation', 'A reason is required when marking a student as dropped.'); return; }
    try { await changeUserStatus(statusTarget.id, { ...statusDraft, reason: statusDraft.reason.trim() || undefined, actionTaken: statusDraft.actionTaken.trim() || undefined, pullOutReason: statusDraft.pullOutReason.trim() || undefined, notes: statusDraft.notes.trim() || undefined }); setStatusTarget(null); Alert.alert('Success', 'User status updated.'); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to update user status.'); }
  };

  const filteredUsers = data.users
    .filter((user) => user.role !== 'admin')
    .filter((user) => {
      const keyword = userSearch.trim().toLowerCase();
      const createdDate = user.createdAt?.slice(0, 10) || '';
      return (!keyword || user.fullName.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword))
        && (!userRoleFilter || user.role === userRoleFilter)
        && (!userStatusFilter || user.status === userStatusFilter)
        && (!userDateFrom || createdDate >= userDateFrom)
        && (!userDateTo || createdDate <= userDateTo);
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  const userPageCount = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));
  const safeUserPage = Math.min(userPage, userPageCount);
  const paginatedUsers = filteredUsers.slice((safeUserPage - 1) * userPageSize, safeUserPage * userPageSize);

  return (
    <Shell title="Users" subtitle="Admin user management">
      <Modal visible={Boolean(editTarget)} transparent animationType="slide" onRequestClose={() => setEditTarget(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>{editTarget ? <><Text style={styles.sectionTitle}>Edit User</Text><TextInput value={editDraft.firstName} onChangeText={(value) => setEditDraft((current) => ({ ...current, firstName: value }))} style={styles.input} placeholder="First name" /><TextInput value={editDraft.middleName} onChangeText={(value) => setEditDraft((current) => ({ ...current, middleName: value }))} style={styles.input} placeholder="Middle name" /><TextInput value={editDraft.lastName} onChangeText={(value) => setEditDraft((current) => ({ ...current, lastName: value }))} style={styles.input} placeholder="Last name" /><TextInput value={editDraft.email} onChangeText={(value) => setEditDraft((current) => ({ ...current, email: value }))} style={styles.input} placeholder="Email" autoCapitalize="none" /><TextInput value={editDraft.mobileNumber} onChangeText={(value) => setEditDraft((current) => ({ ...current, mobileNumber: value }))} style={styles.input} placeholder="Mobile number" /><TextInput value={editDraft.birthdate} onChangeText={(value) => setEditDraft((current) => ({ ...current, birthdate: value }))} style={styles.input} placeholder="Birthdate (YYYY-MM-DD)" /><Text style={styles.label}>Role</Text><View style={styles.rowWrap}>{(['admin', 'teacher', 'student'] as const).map((value) => <Pressable key={value} onPress={() => setEditDraft((current) => ({ ...current, role: value }))} style={[styles.chip, editDraft.role === value ? styles.chipActive : null]}><Text style={editDraft.role === value ? styles.chipActiveText : styles.chipText}>{value}</Text></Pressable>)}</View><Text style={styles.label}>Status</Text><View style={styles.rowWrap}>{(['active', 'inactive', 'pending', 'archived'] as const).map((value) => <Pressable key={value} onPress={() => setEditDraft((current) => ({ ...current, status: value }))} style={[styles.chip, editDraft.status === value ? styles.chipActive : null]}><Text style={editDraft.status === value ? styles.chipActiveText : styles.chipText}>{value}</Text></Pressable>)}</View><View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setEditTarget(null)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label="Save Changes" onPress={saveEdit} /></View></> : null}</View></View></Modal>
      <Modal visible={Boolean(statusTarget)} transparent animationType="slide" onRequestClose={() => setStatusTarget(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>{statusTarget ? <><Text style={styles.sectionTitle}>Change {statusTarget.fullName}'s status</Text><Text style={styles.label}>Status</Text><View style={styles.rowWrap}>{(['active', 'inactive', 'pending', 'dropped', 'archived'] as const).map((value) => <Pressable key={value} onPress={() => setStatusDraft((current) => ({ ...current, status: value }))} style={[styles.chip, statusDraft.status === value ? styles.chipActive : null]}><Text style={statusDraft.status === value ? styles.chipActiveText : styles.chipText}>{value}</Text></Pressable>)}</View><TextInput style={[styles.input, styles.textarea]} placeholder="Reason for dropping" value={statusDraft.reason} onChangeText={(value) => setStatusDraft((current) => ({ ...current, reason: value }))} multiline /><TextInput style={styles.input} placeholder="Date of drop (YYYY-MM-DD)" value={statusDraft.dropDate} onChangeText={(value) => setStatusDraft((current) => ({ ...current, dropDate: value }))} /><TextInput style={[styles.input, styles.textarea]} placeholder="Action taken" value={statusDraft.actionTaken} onChangeText={(value) => setStatusDraft((current) => ({ ...current, actionTaken: value }))} multiline /><TextInput style={[styles.input, styles.textarea]} placeholder="Pull-out reason" value={statusDraft.pullOutReason} onChangeText={(value) => setStatusDraft((current) => ({ ...current, pullOutReason: value }))} multiline /><TextInput style={[styles.input, styles.textarea]} placeholder="Other relevant notes" value={statusDraft.notes} onChangeText={(value) => setStatusDraft((current) => ({ ...current, notes: value }))} multiline /><View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setStatusTarget(null)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label="Save Status" onPress={saveStatus} /></View></> : null}</View></View></Modal>
      <Modal visible={policyOpen} transparent animationType="fade" onRequestClose={() => setPolicyOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.sectionTitle}>Parent/Guardian Guidance Policy</Text><Text style={styles.muted}>For students under 18 years old</Text><Text style={[styles.muted, { marginTop: 12 }]}>Students under 18 should be guided and supervised by a parent or legal guardian while navigating and using the YUNAFied system. Parents or guardians should help students understand system activities, communications, schedules, and learning content, and should be available when support or consent is needed.</Text><PillButton label="I understand" onPress={() => setPolicyOpen(false)} /></View></View></Modal>
      <Card>
        <PillButton label="+ Create User" onPress={() => setCreateOpen(true)} />
      </Card>
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <Text style={styles.sectionTitle}>Create User</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="First name" />
        <TextInput value={middleName2} onChangeText={setMiddleName2} style={styles.input} placeholder="Middle name (optional)" />
        <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="Last name" />
        <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" autoCapitalize="none" />
        <Text style={styles.label}>Role</Text><View style={styles.rowWrap}>{(['teacher', 'student'] as const).map((value) => <Pressable key={value} onPress={() => setRole(value)} style={[styles.chip, role === value ? styles.chipActive : null]}><Text style={role === value ? styles.chipActiveText : styles.chipText}>{value}</Text></Pressable>)}</View>
        <Text style={styles.label}>Status</Text><View style={styles.rowWrap}>{(['active', 'inactive', 'pending', 'archived'] as const).map((value) => <Pressable key={value} onPress={() => setStatus(value)} style={[styles.chip, status === value ? styles.chipActive : null]}><Text style={status === value ? styles.chipActiveText : styles.chipText}>{value}</Text></Pressable>)}</View>
        <TextInput value={mobileNumber} onChangeText={setMobileNumber} style={styles.input} placeholder="Mobile number (optional)" />
        {role === 'student' ? <TextInput value={birthdate} onChangeText={setBirthdate} style={styles.input} placeholder="Birthdate (YYYY-MM-DD)" /> : null}
        {role === 'student' && birthdate ? <Pressable onPress={() => setMinorPolicyAgreed((value) => !value)} style={styles.policyCheck}><Text style={styles.muted}>{minorPolicyAgreed ? '☑' : '☐'} I acknowledge the parent/guardian guidance policy. </Text><Text style={styles.linkInline} onPress={() => setPolicyOpen(true)}>Read the policy</Text></Pressable> : null}
        <View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setCreateOpen(false)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label="Add User" onPress={create} /></View>
      </View></View></Modal>

      <Card>
        <Text style={styles.sectionTitle}>All Users</Text>
        <TextInput style={styles.input} placeholder="Search name or email..." value={userSearch} onChangeText={(value) => { setUserSearch(value); setUserPage(1); }} />
        <Text style={styles.label}>Roles</Text>
        <View style={styles.rowWrap}>{(['', 'teacher', 'student'] as const).map((value) => <Pressable key={value || 'all'} onPress={() => { setUserRoleFilter(value); setUserPage(1); }} style={[styles.chip, userRoleFilter === value ? styles.chipActive : null]}><Text style={userRoleFilter === value ? styles.chipActiveText : styles.chipText}>{value || 'All'}</Text></Pressable>)}</View>
        <Text style={styles.label}>Statuses</Text>
        <View style={styles.rowWrap}>{(['', 'active', 'inactive', 'pending', 'completed', 'dropped', 'archived'] as const).map((value) => <Pressable key={value || 'all'} onPress={() => { setUserStatusFilter(value); setUserPage(1); }} style={[styles.chip, userStatusFilter === value ? styles.chipActive : null]}><Text style={userStatusFilter === value ? styles.chipActiveText : styles.chipText}>{value || 'All'}</Text></Pressable>)}</View>
        <View style={styles.rowWrap}><TextInput style={[styles.input, { flex: 1, minWidth: 130 }]} placeholder="Created from (YYYY-MM-DD)" value={userDateFrom} onChangeText={(value) => { setUserDateFrom(value); setUserPage(1); }} /><TextInput style={[styles.input, { flex: 1, minWidth: 130 }]} placeholder="Created to (YYYY-MM-DD)" value={userDateTo} onChangeText={(value) => { setUserDateTo(value); setUserPage(1); }} /></View>
        {paginatedUsers.map((user) => (
          <View key={user.id} style={styles.listItemRow}>
            {user.profileImageUrl ? <Image source={{ uri: user.profileImageUrl }} style={styles.userListAvatar} /> : <View style={styles.userListAvatar}><Text style={styles.drawerAvatarText}>{`${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()}</Text></View>}
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{user.fullName}</Text>
              <Text style={styles.muted}>{user.email}</Text>
              <Text style={styles.muted}>{`${user.role} | ${user.status}`}</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Pressable onPress={() => openEdit(user)}>
                <Text style={styles.linkInline}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => toggleStatus(user.id, user.status, user)}>
                <Text style={styles.linkInline}>Toggle</Text>
              </Pressable>
              {user.role === 'student' ? <Pressable onPress={() => { setStatusTarget(user); setStatusDraft({ status: user.status, reason: '', dropDate: new Date().toISOString().slice(0, 10), actionTaken: '', pullOutReason: '', notes: '' }); }}><Text style={styles.linkInline}>Change Status</Text></Pressable> : null}
              {user.status === 'pending' ? <Pressable onPress={async () => { try { await mobileApiClient.resendVerification(user.id); Alert.alert('Success', 'Verification link sent.'); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to resend verification link.'); } }}><Text style={styles.linkInline}>Resend Verification</Text></Pressable> : null}
              <Pressable onPress={() => deleteUser(user.id)}>
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <View style={[styles.rowWrap, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={styles.muted}>{filteredUsers.length} users</Text>
          <PillButton label="Prev" onPress={() => setUserPage(Math.max(1, safeUserPage - 1))} disabled={safeUserPage <= 1} />
          <Text style={styles.muted}>Page {safeUserPage}/{userPageCount}</Text>
          <PillButton label="Next" onPress={() => setUserPage(Math.min(userPageCount, safeUserPage + 1))} disabled={safeUserPage >= userPageCount} />
        </View>
      </Card>
    </Shell>
  );
}

function TeacherRecordsScreen() {
  const [records, setRecords] = useState<TeacherRecordItem[]>([]);
  const [selected, setSelected] = useState<TeacherRecordItem | null>(null);
  const [search, setSearch] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  useEffect(() => { mobileApiClient.listTeacherRecords().then(setRecords).catch((error: any) => Alert.alert('Error', error.message || 'Failed to load teacher records.')); }, []);
  const visible = records.filter((record) => `${record.teacher.fullName} ${record.teacher.email} ${record.specializations.join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (!employmentStatus || record.employmentStatus === employmentStatus));
  return <Shell title="Teacher Records" subtitle={`${records.length} teachers`}>
    <Card><TextInput style={styles.input} placeholder="Search teachers or specializations..." value={search} onChangeText={setSearch} /><Text style={styles.label}>Employment statuses</Text><View style={styles.chipWrap}><Pressable onPress={() => setEmploymentStatus('')} style={[styles.chip, !employmentStatus ? styles.chipActive : null]}><Text style={!employmentStatus ? styles.chipActiveText : styles.chipText}>All</Text></Pressable>{Array.from(new Set(records.map((record) => record.employmentStatus).filter(Boolean))).map((value) => <Pressable key={value} onPress={() => setEmploymentStatus(value!)} style={[styles.chip, employmentStatus === value ? styles.chipActive : null]}><Text style={employmentStatus === value ? styles.chipActiveText : styles.chipText}>{value}</Text></Pressable>)}</View><Text style={styles.sectionTitle}>Teachers</Text>{visible.length === 0 ? <Text style={styles.muted}>No teacher records found.</Text> : visible.map((record) => <Pressable key={record.teacherId} onPress={() => setSelected(record)}><View style={styles.listItemRow}><View style={styles.flexGrow}><Text style={styles.listTitle}>{record.teacher.fullName}</Text><Text style={styles.muted}>{record.teacher.email} · {record.specializations.join(', ') || 'Not specified'}</Text><Text style={styles.muted}>{record.professionalTitle || 'Professional title not specified'} · {record.employmentStatus || 'Employment status not specified'}</Text><Text style={styles.muted}>Availability: {record.availability.length ? record.availability.map((item) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][item.dayOfWeek]} ${item.startTime.slice(0, 5)}-${item.endTime.slice(0, 5)}`).join(', ') : 'Not specified'}</Text></View><Text style={styles.linkInline}>Edit</Text></View></Pressable>)}</Card>
    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>{selected ? <TeacherRecordEditor record={selected} onClose={() => setSelected(null)} onSaved={(updated) => { setRecords((items) => items.map((item) => item.teacherId === updated.teacherId ? updated : item)); setSelected(null); }} /> : null}</View></View></Modal>
  </Shell>;
}

function TeacherRecordEditor({ record, onClose, onSaved }: { record: TeacherRecordItem; onClose: () => void; onSaved: (record: TeacherRecordItem) => void }) {
  const [draft, setDraft] = useState(record);
  const [saving, setSaving] = useState(false);
  const save = async () => { try { setSaving(true); await mobileApiClient.updateTeacherRecord(draft.teacherId, { mobileNumber: draft.mobileNumber, professionalTitle: draft.professionalTitle, employmentStatus: draft.employmentStatus, education: draft.education, certifications: draft.certifications, yearsExperience: draft.yearsExperience, specializations: draft.specializations, notes: draft.notes }); onSaved(draft); } catch (error: any) { Alert.alert('Error', error.message || 'Failed to save teacher record.'); } finally { setSaving(false); } };
  return <><Text style={styles.sectionTitle}>{draft.teacher.fullName}</Text><Text style={styles.muted}>Teacher personnel record</Text><TextInput style={styles.input} placeholder="Mobile number" value={draft.mobileNumber || ''} onChangeText={(value) => setDraft({ ...draft, mobileNumber: value })} /><TextInput style={styles.input} placeholder="Professional title" value={draft.professionalTitle || ''} onChangeText={(value) => setDraft({ ...draft, professionalTitle: value })} /><TextInput style={styles.input} placeholder="Employment status" value={draft.employmentStatus || ''} onChangeText={(value) => setDraft({ ...draft, employmentStatus: value })} /><TextInput style={styles.input} placeholder="Years of experience" keyboardType="numeric" value={draft.yearsExperience == null ? '' : String(draft.yearsExperience)} onChangeText={(value) => setDraft({ ...draft, yearsExperience: value ? Number(value) : null })} /><TextInput style={styles.input} placeholder="Specializations (comma separated)" value={draft.specializations.join(', ')} onChangeText={(value) => setDraft({ ...draft, specializations: value.split(',').map((item) => item.trim()).filter(Boolean) })} /><TextInput style={[styles.input, styles.textarea]} placeholder="Education" multiline value={draft.education || ''} onChangeText={(value) => setDraft({ ...draft, education: value })} /><TextInput style={[styles.input, styles.textarea]} placeholder="Certifications" multiline value={draft.certifications || ''} onChangeText={(value) => setDraft({ ...draft, certifications: value })} /><TextInput style={[styles.input, styles.textarea]} placeholder="Notes" multiline value={draft.notes || ''} onChangeText={(value) => setDraft({ ...draft, notes: value })} /><Text style={styles.smallTitle}>Weekly availability</Text>{draft.availability.map((item) => <Text key={item.id} style={styles.muted}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][item.dayOfWeek]} · {item.startTime.slice(0, 5)}–{item.endTime.slice(0, 5)}</Text>)}<View style={styles.rowWrap}><PillButton label="Cancel" onPress={onClose} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label={saving ? 'Saving...' : 'Save Record'} onPress={save} disabled={saving} /></View></>;
}

function StudentRecordsScreen() {
  const [records, setRecords] = useState<StudentRecordItem[]>([]);
  const [selected, setSelected] = useState<StudentRecordItem | null>(null);
  const [search, setSearch] = useState('');
  const [recordStatus, setRecordStatus] = useState<'active' | 'all'>('active');
  const [recordView, setRecordView] = useState<'cards' | 'list'>('cards');
  const [recordPage, setRecordPage] = useState(1);
  const [recordTab, setRecordTab] = useState<'overview' | 'academic' | 'sessions'>('overview');
  useEffect(() => { mobileApiClient.listStudentRecords().then(setRecords).catch((error: any) => Alert.alert('Error', error.message || 'Failed to load student records.')); }, []);
  const visible = records.filter((record) => `${record.student.fullName} ${record.enrollments.map((item) => item.subject).join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (recordStatus === 'all' || record.student.status === 'active'));
  const recordPageSize = 10;
  const recordPageCount = Math.max(1, Math.ceil(visible.length / recordPageSize));
  const safeRecordPage = Math.min(recordPage, recordPageCount);
  const paginatedRecords = visible.slice((safeRecordPage - 1) * recordPageSize, safeRecordPage * recordPageSize);
  return <Shell title="Student Records" subtitle={`${records.length} students`}>
    <View style={styles.rowWrap}><Card><Text style={styles.smallTitle}>Students shown</Text><Text style={styles.bigValue}>{visible.length}</Text></Card><Card><Text style={styles.smallTitle}>Assessment attempts</Text><Text style={styles.bigValue}>{visible.reduce((sum, record) => sum + record.gamifiedAttempts.length, 0)}</Text></Card></View>
    <Card><TextInput style={styles.input} placeholder="Search students, subjects, teachers..." value={search} onChangeText={(value) => { setSearch(value); setRecordPage(1); }} /><View style={styles.rowWrap}><PillButton label="Active" onPress={() => { setRecordStatus('active'); setRecordPage(1); }} style={recordStatus === 'active' ? null : { backgroundColor: '#e5e7eb' }} textStyle={recordStatus === 'active' ? null : { color: '#374151' }} /><PillButton label="All" onPress={() => { setRecordStatus('all'); setRecordPage(1); }} style={recordStatus === 'all' ? null : { backgroundColor: '#e5e7eb' }} textStyle={recordStatus === 'all' ? null : { color: '#374151' }} /><PillButton label="Cards" onPress={() => setRecordView('cards')} style={recordView === 'cards' ? null : { backgroundColor: '#e5e7eb' }} textStyle={recordView === 'cards' ? null : { color: '#374151' }} /><PillButton label="List" onPress={() => setRecordView('list')} style={recordView === 'list' ? null : { backgroundColor: '#e5e7eb' }} textStyle={recordView === 'list' ? null : { color: '#374151' }} /></View><Text style={styles.sectionTitle}>Students</Text>{visible.length === 0 ? <Text style={styles.muted}>No student records found.</Text> : paginatedRecords.map((record) => <Pressable key={record.student.id} onPress={() => { setSelected(record); setRecordTab('overview'); }}><View style={[styles.listItemRow, recordView === 'cards' ? styles.card : null]}><View style={styles.flexGrow}><Text style={styles.listTitle}>{record.student.fullName}</Text><Text style={styles.muted}>{record.student.status} · {record.enrollments.map((item) => item.subject).join(', ') || 'No enrollment'}</Text><Text style={styles.muted}>{record.assignments.length} assignments · {record.gamifiedAttempts.length} quizzes · {record.schedules.length} sessions</Text></View><Text style={styles.linkInline}>View</Text></View></Pressable>)}<View style={styles.rowWrap}><PillButton label="Prev" onPress={() => setRecordPage(Math.max(1, safeRecordPage - 1))} disabled={safeRecordPage <= 1} /><Text style={styles.muted}>Page {safeRecordPage}/{recordPageCount}</Text><PillButton label="Next" onPress={() => setRecordPage(Math.min(recordPageCount, safeRecordPage + 1))} disabled={safeRecordPage >= recordPageCount} /></View></Card>
    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}>{selected ? <><Text style={styles.sectionTitle}>{selected.student.fullName}</Text><Text style={styles.muted}>{selected.student.status} · Student record</Text><View style={styles.rowWrap}><PillButton label="Overview" onPress={() => setRecordTab('overview')} style={recordTab === 'overview' ? null : { backgroundColor: '#e5e7eb' }} textStyle={recordTab === 'overview' ? null : { color: '#374151' }} /><PillButton label="Assignments & Assessments" onPress={() => setRecordTab('academic')} style={recordTab === 'academic' ? null : { backgroundColor: '#e5e7eb' }} textStyle={recordTab === 'academic' ? null : { color: '#374151' }} /><PillButton label="Schedule & Meetings" onPress={() => setRecordTab('sessions')} style={recordTab === 'sessions' ? null : { backgroundColor: '#e5e7eb' }} textStyle={recordTab === 'sessions' ? null : { color: '#374151' }} /></View>{recordTab === 'overview' ? <><Text style={styles.muted}>Enrollments: {selected.enrollments.length}</Text><Text style={styles.muted}>Assignments: {selected.assignments.length}</Text><Text style={styles.muted}>Assessment attempts: {selected.gamifiedAttempts.length}</Text><Text style={styles.muted}>Scheduled sessions: {selected.schedules.length}</Text></> : null}{recordTab === 'academic' ? <><Text style={styles.sectionTitle}>Assignments & Grades</Text>{selected.assignments.map((row) => <View key={row.assignment.id} style={styles.listItemRow}><Text style={styles.listTitle}>{row.assignment.title}</Text><Text style={styles.muted}>{row.submission?.grade || 'Not submitted'}</Text></View>)}<Text style={styles.sectionTitle}>Diagnostic Assessment Results</Text>{selected.gamifiedAttempts.map((attempt) => <View key={attempt.id} style={styles.listItemRow}><Text style={styles.listTitle}>{attempt.quizTitle}</Text><Text style={styles.muted}>{attempt.correctAnswers}/{attempt.totalQuestions}</Text></View>)}</> : null}{recordTab === 'sessions' ? <><Text style={styles.sectionTitle}>Schedule & Meetings</Text>{selected.schedules.map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>{item.title}</Text><Text style={styles.muted}>{item.date} · {item.startTime}–{item.endTime} · {item.status}</Text></View>)}{selected.meetingHistory.map((item) => <View key={item.id} style={styles.listItem}><Text style={styles.listTitle}>Video meeting</Text><Text style={styles.muted}>{new Date(item.startedAt).toLocaleString()}</Text></View>)}</> : null}<PillButton label="Close" onPress={() => setSelected(null)} /></> : null}</View></View></Modal>
  </Shell>;
}

function ProfileScreen() {
  const { session, updateProfile, uploadProfileImage } = useAppContext();
  const [firstName, setFirstNameP] = useState(session!.user.firstName);
  const [middleName, setMiddleNameP] = useState(session!.user.middleName || '');
  const [lastName, setLastNameP] = useState(session!.user.lastName);
  const [email, setEmail] = useState(session!.user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState(session!.user.mobileNumber || '');
  const [birthdate, setBirthdate] = useState(session!.user.birthdate || '');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState<Array<{ dayOfWeek: number; startTime: string; endTime: string }>>([]);
  const [profileImageUrl, setProfileImageUrl] = useState(session!.user.profileImageUrl || '');
  const [selectedPhoto, setSelectedPhoto] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => { mobileApiClient.getProfileDetails().then((details) => { setMobileNumber(details.mobileNumber || ''); setBirthdate(details.birthdate || ''); setProfessionalTitle(details.professionalTitle || ''); setEmploymentStatus(details.employmentStatus || ''); setEducation(details.education || ''); setCertifications(details.certifications || ''); setYearsExperience(details.yearsExperience == null ? '' : String(details.yearsExperience)); setSpecializations((details.specializations || []).join(', ')); setNotes(details.notes || ''); setAvailability((details.availability || []).map((item) => ({ dayOfWeek: item.dayOfWeek, startTime: item.startTime.slice(0, 5), endTime: item.endTime.slice(0, 5) }))); }).catch(() => undefined); }, [session]);

  const save = async () => {
    try {
      let nextImageUrl = profileImageUrl;
      let nextImagePublicId = session!.user.profileImagePublicId;
      if (selectedPhoto) { const uploaded = await uploadProfileImage({ uri: selectedPhoto.uri, name: selectedPhoto.name, type: selectedPhoto.mimeType }); nextImageUrl = uploaded.secureUrl; nextImagePublicId = uploaded.publicId; }
      await updateProfile({
        firstName,
        middleName: middleName || undefined,
        lastName,
        email,
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
        profileImageUrl: nextImageUrl || null,
        profileImagePublicId: nextImagePublicId || null,
        mobileNumber: mobileNumber.trim() || null,
        birthdate: session!.user.role === 'student' ? (birthdate || null) : undefined,
        ...(session!.user.role === 'teacher' ? { professionalTitle: professionalTitle.trim() || null, employmentStatus: employmentStatus.trim() || null, education: education.trim() || null, certifications: certifications.trim() || null, yearsExperience: yearsExperience ? Number(yearsExperience) : null, specializations: specializations.split(',').map((item) => item.trim()).filter(Boolean), notes: notes.trim() || null, availability } : {}),
      });
      setProfileImageUrl(nextImageUrl || ''); setSelectedPhoto(null);
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
        {profileImageUrl ? <Image source={{ uri: profileImageUrl }} style={styles.profileImage} /> : <Text style={styles.muted}>No profile photo selected.</Text>}
        <PillButton label={selectedPhoto ? `Photo: ${selectedPhoto.name}` : 'Choose Profile Photo'} onPress={async () => { const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true }); if (!result.canceled) setSelectedPhoto(result.assets[0]); }} />
        <Text style={styles.label}>First Name</Text>
        <TextInput value={firstName} onChangeText={setFirstNameP} style={styles.input} />
        <Text style={styles.label}>Middle Name (optional)</Text>
        <TextInput value={middleName} onChangeText={setMiddleNameP} style={styles.input} />
        <Text style={styles.label}>Last Name</Text>
        <TextInput value={lastName} onChangeText={setLastNameP} style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
        <Text style={styles.label}>Mobile Number</Text><TextInput value={mobileNumber} onChangeText={setMobileNumber} style={styles.input} keyboardType="phone-pad" />
        {session!.user.role === 'student' ? <><Text style={styles.label}>Birthdate</Text><TextInput value={birthdate} onChangeText={setBirthdate} style={styles.input} placeholder="YYYY-MM-DD" /></> : null}
        {session!.user.role === 'teacher' ? <><Text style={styles.label}>Professional Title</Text><TextInput value={professionalTitle} onChangeText={setProfessionalTitle} style={styles.input} /><Text style={styles.label}>Employment Status</Text><TextInput value={employmentStatus} onChangeText={setEmploymentStatus} style={styles.input} /><Text style={styles.label}>Years of Experience</Text><TextInput value={yearsExperience} onChangeText={setYearsExperience} style={styles.input} keyboardType="numeric" /><Text style={styles.label}>Specializations</Text><TextInput value={specializations} onChangeText={setSpecializations} style={styles.input} placeholder="Comma separated" /><TextInput value={education} onChangeText={setEducation} style={[styles.input, styles.textarea]} placeholder="Education" multiline /><TextInput value={certifications} onChangeText={setCertifications} style={[styles.input, styles.textarea]} placeholder="Certifications" multiline /><TextInput value={notes} onChangeText={setNotes} style={[styles.input, styles.textarea]} placeholder="Notes" multiline /><View style={styles.rowBetween}><Text style={styles.label}>Availability</Text><Pressable onPress={() => setAvailability((items) => [...items, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }])}><Text style={styles.linkInline}>+ Add time</Text></Pressable></View>{availability.map((item, index) => <View key={`${index}-${item.dayOfWeek}`} style={styles.listItem}><TextInput value={String(item.dayOfWeek)} onChangeText={(value) => setAvailability((items) => items.map((x, i) => i === index ? { ...x, dayOfWeek: Math.max(0, Math.min(6, Number(value) || 0)) } : x))} style={styles.input} keyboardType="numeric" placeholder="Day (0 Sun - 6 Sat)" /><View style={styles.rowWrap}><TextInput value={item.startTime} onChangeText={(value) => setAvailability((items) => items.map((x, i) => i === index ? { ...x, startTime: value } : x))} style={[styles.input, styles.half]} placeholder="09:00" /><TextInput value={item.endTime} onChangeText={(value) => setAvailability((items) => items.map((x, i) => i === index ? { ...x, endTime: value } : x))} style={[styles.input, styles.half]} placeholder="17:00" /><Pressable onPress={() => setAvailability((items) => items.filter((_, i) => i !== index))}><Text style={styles.dangerText}>Remove</Text></Pressable></View></View>)}</> : null}

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
  const [analytics, setAnalytics] = useState<AdminAnalyticsItem | null>(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'performance'>('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [analyticsStatus, setAnalyticsStatus] = useState('');

  const loadAnalytics = async (refresh = false) => {
    try { setAnalyticsBusy(true); setAnalytics(await mobileApiClient.getAdminAnalytics({ dateFrom, dateTo, status: analyticsStatus }, refresh)); }
    catch (error: any) { Alert.alert('Error', error.message || 'Failed to load admin dashboard.'); }
    finally { setAnalyticsBusy(false); }
  };

  useEffect(() => { loadAnalytics(); }, []);

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
  const totals = analytics || { totalStudents: data.users.filter((u) => u.role === 'student').length, totalTeachers: data.users.filter((u) => u.role === 'teacher').length, totalSessions: data.schedules.length, totalSubmissions: data.submissions.length, totalEnrollments: 0, gradeDistribution: gradeDistribution.map(([grade, count]) => ({ grade, count })), monthlySessionCounts: [] as Array<{ month: string; count: number }>, topStudents: [] };

  return (
    <Shell title="Admin Dashboard" subtitle="Quick overview and decision-making center">
      <Card><View style={styles.rowWrap}><TextInput value={dateFrom} onChangeText={setDateFrom} style={[styles.input, styles.half]} placeholder="From YYYY-MM-DD" /><TextInput value={dateTo} onChangeText={setDateTo} style={[styles.input, styles.half]} placeholder="To YYYY-MM-DD" /><TextInput value={analyticsStatus} onChangeText={setAnalyticsStatus} style={[styles.input, styles.half]} placeholder="Status" /></View><View style={styles.rowWrap}><PillButton label={analyticsBusy ? 'Loading...' : 'Apply filters'} onPress={() => loadAnalytics(false)} disabled={analyticsBusy} /><PillButton label="Refresh AI" onPress={() => loadAnalytics(true)} disabled={analyticsBusy} /></View></Card>
      <View style={styles.rowWrap}><PillButton label="Overview" onPress={() => setAnalyticsTab('overview')} style={analyticsTab === 'overview' ? null : { backgroundColor: '#e5e7eb' }} textStyle={analyticsTab === 'overview' ? null : { color: '#374151' }} /><PillButton label="Performance Analytics" onPress={() => setAnalyticsTab('performance')} style={analyticsTab === 'performance' ? null : { backgroundColor: '#e5e7eb' }} textStyle={analyticsTab === 'performance' ? null : { color: '#374151' }} /></View>
      <View style={styles.rowWrap}>
        <Card>
          <Text style={styles.smallTitle}>Total Submissions</Text>
          <Text style={styles.bigValue}>{totals.totalSubmissions}</Text>
        </Card>
        <Card>
          <Text style={styles.smallTitle}>Total Assignments</Text>
          <Text style={styles.bigValue}>{data.assignments.length}</Text>
        </Card>
        <Card><Text style={styles.smallTitle}>Students</Text><Text style={styles.bigValue}>{totals.totalStudents}</Text></Card>
        <Card><Text style={styles.smallTitle}>Teachers</Text><Text style={styles.bigValue}>{totals.totalTeachers}</Text></Card>
        <Card><Text style={styles.smallTitle}>Sessions</Text><Text style={styles.bigValue}>{totals.totalSessions}</Text></Card>
        <Card><Text style={styles.smallTitle}>Enrollments</Text><Text style={styles.bigValue}>{totals.totalEnrollments}</Text>
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
      {analyticsTab === 'overview' ? <><Card><Text style={styles.sectionTitle}>Enrollment trends</Text><MobileChart data={(analytics?.enrollmentTrends || []).map((item) => ({ label: item.period, value: item.count }))} /></Card><Card><Text style={styles.sectionTitle}>Session overview</Text><MobileChart data={(analytics?.monthlySessionCounts || []).map((item) => ({ label: item.month, value: item.count }))} /></Card><Card><Text style={styles.sectionTitle}>Teacher activity</Text><MobileChart data={(analytics?.teacherActivity || []).map((item) => ({ label: item.teacherName, value: item.sessions }))} /></Card></> : <><Card><Text style={styles.sectionTitle}>Student performance</Text><MobileChart data={(analytics?.studentProgress || analytics?.topStudents || []).map((item) => ({ label: item.studentName, value: 'latestAverage' in item ? item.latestAverage || 0 : item.avgGrade }))} /></Card><Card><Text style={styles.sectionTitle}>Submission status</Text><MobileChart type="pie" data={[{ label: 'Graded', value: graded, color: '#10b981' }, { label: 'Pending', value: pending, color: '#f59e0b' }]} /></Card></>}
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

function meetingDateToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function meetingMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function meetingNowMinutes() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === 'hour')?.value || 0) * 60
    + Number(parts.find((part) => part.type === 'minute')?.value || 0);
}

function MeetingsScreen() {
  const { data, session, startVideoCall } = useAppContext();
  const today = meetingDateToday();
  const now = meetingNowMinutes();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'today' | 'upcoming' | 'past'>('today');

  const sessions = useMemo(() => {
    return data.schedules.filter((s) => {
      if (s.status !== 'scheduled') return false;
      return s.teacherId === session!.user.id;
    });
  }, [data.schedules, session]);

  const todaySessions = sessions.filter((item) => item.date === today);
  const upcoming = sessions.filter((item) => item.date > today);
  const past = sessions.filter((item) => item.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const active = todaySessions.filter((item) => now >= meetingMinutes(item.startTime) - 10 && now <= meetingMinutes(item.endTime));
  const later = todaySessions.filter((item) => now < meetingMinutes(item.startTime) - 10);
  const earlier = todaySessions.filter((item) => now > meetingMinutes(item.endTime));

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

  const renderMeeting = (item: ScheduleItem, showDate = false, isPast = false, isActive = false) => (
    <View key={item.id} style={[styles.listItemRow, { marginBottom: 10, backgroundColor: isActive ? '#ecfdf5' : '#fff', borderColor: isActive ? '#86efac' : '#e5e7eb', borderWidth: 1, borderRadius: 12, padding: 12 }]}>
      <View style={{ flex: 1 }}>
        {isActive ? <Text style={{ color: '#059669', fontWeight: '800', fontSize: 11 }}>● ACTIVE NOW</Text> : null}
        <Text style={styles.listTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.muted} numberOfLines={1}>{item.description}</Text> : null}
        <Text style={styles.muted}>{showDate ? `${item.date} | ` : ''}{item.startTime} – {item.endTime}</Text>
        {item.studentName ? <Text style={styles.muted}>Student: {item.studentName}</Text> : null}
      </View>
      <Pressable onPress={() => startMeeting(item.id, item.studentId)} disabled={startingId === item.id} style={[styles.button, { backgroundColor: isPast ? '#fff' : '#059669', borderColor: '#059669', borderWidth: 1 }]}>
        <Text style={{ color: isPast ? '#047857' : '#fff', fontWeight: '800', fontSize: 12 }}>{startingId === item.id ? 'Starting…' : isPast ? 'Reopen' : 'Start Video Call'}</Text>
      </Pressable>
    </View>
  );

  const sections: Array<{ title: string; items: ScheduleItem[]; showDate?: boolean; past?: boolean; active?: boolean }> = tab === 'today'
    ? [{ title: '● Active Now', items: active, active: true }, { title: 'Later Today', items: later }, { title: 'Earlier Today', items: earlier, past: true }]
    : tab === 'upcoming' ? [{ title: 'Upcoming', items: upcoming, showDate: true }] : [{ title: 'Past Schedules', items: past, showDate: true, past: true }];

  return (
    <Shell title="Video Meetings" subtitle={`${today} · Manila time`}>
      <Card>
        <Text style={styles.sectionTitle}>How it works</Text>
        <Text style={styles.muted}>The meeting window opens 10 minutes before the scheduled start. Start the call to send the student a ringing notification.</Text>
      </Card>
      <View style={[styles.tabRow, { marginBottom: 12 }]}>
        {(['today', 'upcoming', 'past'] as const).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.tabButton, tab === item && styles.tabButtonActive]}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'past' ? 'Past Schedules' : item[0].toUpperCase() + item.slice(1)} </Text>
          </Pressable>
        ))}
      </View>
      <Card>
        {sections.every((section) => section.items.length === 0) ? <Text style={styles.muted}>No {tab === 'today' ? 'scheduled meetings for today' : `${tab} meetings`}.</Text> : null}
        {sections.map((section) => section.items.length > 0 ? <View key={section.title}>
          <Text style={[styles.smallTitle, { color: section.active ? '#059669' : '#6b7280', marginBottom: 8 }]}>{section.title}</Text>
          {section.items.map((item) => renderMeeting(item, section.showDate, section.past, section.active))}
        </View> : null)}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Incoming Calls</Text>
        <Text style={styles.muted}>When a student joins a call, the meeting opens in the video room.</Text>
      </Card>
      {false && (/*
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
        */ null)}
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
          onPress={() => setShowLogoutConfirm(true)}
          style={({ pressed }) => [styles.drawerSignOutBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.drawerSignOutText}>⏻  Sign Out</Text>
        </Pressable>
      </View>
      <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.sectionTitle}>Sign out?</Text><Text style={styles.muted}>You will need to log in again to access your account.</Text><View style={styles.rowWrap}><PillButton label="Cancel" onPress={() => setShowLogoutConfirm(false)} style={{ backgroundColor: '#e5e7eb' }} textStyle={{ color: '#374151' }} /><PillButton label="Sign Out" onPress={() => { setShowLogoutConfirm(false); void logout(); }} /></View></View></View></Modal>
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
        headerShown: false,
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
      {/* Keep this list aligned with the web Sidebar role matrix. */}
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Scheduling" component={ScheduleScreen} />
      <Drawer.Screen name="Learning Materials" component={LearningMaterialsScreen} />
      <Drawer.Screen name="Assessments" component={AssessmentsScreen} />
      <Drawer.Screen name="Gamified Learning" component={GamifiedLearningScreen} />
      <Drawer.Screen name="Chats" component={ChatsScreen} />
      <Drawer.Screen name="Announcements" component={AnnouncementsScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />

      {isStudent ? <Drawer.Screen name="Assignments" component={AssignmentsScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Grades/Feedback" component={GradesScreen} /> : null}
      {isStudent ? <Drawer.Screen name="AI Guide Bot" component={AIGuideScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Milestones" component={MilestonesScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Video Summarizer" component={VideoSummarizerScreen} /> : null}
      {isStudent ? <Drawer.Screen name="Word Translator" component={WordTranslatorScreen} /> : null}

      {isTeacherOrAdmin && role === 'teacher' ? <Drawer.Screen name="Video Meetings" component={MeetingsScreen} /> : null}
      {isTeacherOrAdmin && role === 'teacher' ? <Drawer.Screen name="Assignments" component={AssignmentsScreen} /> : null}
      {isTeacherOrAdmin && role === 'teacher' ? <Drawer.Screen name="Grades/Feedback" component={GradesScreen} /> : null}
      {isTeacherOrAdmin && role === 'teacher' ? <Drawer.Screen name="Student Records" component={StudentRecordsScreen} /> : null}
      {isTeacherOrAdmin && role === 'teacher' ? <Drawer.Screen name="Video Summarizer" component={VideoSummarizerScreen} /> : null}

      {isAdmin ? <Drawer.Screen name="Enrollments" component={EnrollmentsScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Teacher Records" component={TeacherRecordsScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Student Records" component={StudentRecordsScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Audit Logs" component={AuditLogsScreen} /> : null}
      {isAdmin ? <Drawer.Screen name="Meeting History" component={MeetingHistoryScreen} /> : null}

      <Drawer.Screen name="Profile Settings" component={ProfileScreen} />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { loading, session, incomingCall, acceptCall, declineCall, activeCallToken, endVideoCall } = useAppContext();

  if (loading) {
    return (
      <SafeAreaProvider><SafeAreaView style={[styles.loadingScreen, styles.center]}>
        <StatusBar style="light" />
        <View style={styles.loadingLogoWrap}>
          <Image source={{ uri: 'https://www.yunafied.online/yunafied%20logo.png' }} style={styles.loadingLogo} resizeMode="contain" />
        </View>
        <Text style={styles.loadingBrand}>YUNAFied</Text>
        <ActivityIndicator size="large" color="#a78bfa" style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Loading your workspace...</Text>
      </SafeAreaView></SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider><>
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
    </></SafeAreaProvider>
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
  screenHeader: { backgroundColor: '#1e1b4b', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(109,40,217,0.3)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  // ─── DRAWER ───────────────────────────────────────────────────────────
  drawerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  drawerBrandName: { color: '#fff', fontWeight: '800', fontSize: 16 },
  drawerBrandSub: { color: '#94a3b8', fontSize: 11 },
  drawerProfileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  drawerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6d28d9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#a78bfa' },
  userListAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  policyCheck: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingVertical: 8 },
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
  container: { padding: 16, gap: 12, paddingBottom: 24 },
  header: { gap: 4, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  subtitle: { color: '#c4b5fd', fontSize: 12 },

  hamburger: { color: '#fff', fontSize: 20, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ede9fe',
    padding: 14,
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
  },
  profileImage: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center', marginBottom: 6 },
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#6b7280',
    fontWeight: '700',
    fontSize: 12,
  },
  tabTextActive: {
    color: '#111827',
  },
  calendarWeek: {
    flexDirection: 'row',
    marginTop: 14,
  },
  calendarWeekText: {
    flex: 1,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#e5e7eb',
  },
  calendarCell: {
    width: '14.2857%',
    minHeight: 48,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    padding: 5,
    alignItems: 'center',
  },
  calendarCellMuted: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  calendarCellSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  calendarDayNumber: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarEventDot: {
    marginTop: 4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarEventText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
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

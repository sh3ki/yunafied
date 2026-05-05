import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { SystemLogo } from '@/app/components/SystemLogo';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignup?: (firstName: string, middleName: string, lastName: string, email: string, pass: string) => Promise<string>;
  onForgotPassword?: (email: string) => Promise<void>;
  onResetPassword?: (email: string, otp: string, newPassword: string) => Promise<void>;
  onVerifyOtp?: (email: string, otp: string) => Promise<void>;
  onResendOtp?: (email: string) => Promise<void>;
}

export function Login({ onLogin, onSignup, onForgotPassword, onResetPassword, onVerifyOtp, onResendOtp }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'otp' | 'forgot-otp' | 'new-password'>('login');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP state
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const forgotOtpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const enterOtpMode = (forEmail: string) => {
    setPendingEmail(forEmail);
    setOtpDigits(['', '', '', '', '', '']);
    setResendCountdown(60);
    setMode('otp');
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpInput = (index: number, value: string, isForgot = false) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    if (isForgot) {
      const next = [...forgotOtpDigits];
      next[index] = digit;
      setForgotOtpDigits(next);
      if (digit && index < 5) forgotOtpRefs.current[index + 1]?.focus();
    } else {
      const next = [...otpDigits];
      next[index] = digit;
      setOtpDigits(next);
      if (digit && index < 5) otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isForgot = false) => {
    const refs = isForgot ? forgotOtpRefs : otpRefs;
    const digits = isForgot ? forgotOtpDigits : otpDigits;
    if (e.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent, isForgot = false) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill('');
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    if (isForgot) {
      setForgotOtpDigits(next);
      forgotOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
    } else {
      setOtpDigits(next);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await onVerifyOtp!(pendingEmail, otp);
      toast.success("Email verified! Welcome aboard.");
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired code.");
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || !onResendOtp) return;
    try {
      await onResendOtp(pendingEmail);
      setResendCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      toast.success("A new code has been sent to your email.");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch {
      toast.error("Failed to resend code. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === 'login') {
        await onLogin(email, password);
        toast.success("Welcome back!");
      } else if (mode === 'signup' && onSignup) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }

        const verifyEmail = await onSignup(firstName, middleName, lastName, email, password);
        toast.success("Account created! Check your email for the 6-digit verification code.");
        setPassword('');
        setConfirmPassword('');
        enterOtpMode(verifyEmail);
      } else if (mode === 'forgot' && onForgotPassword) {
        await onForgotPassword(email);
        toast.success("If that email exists, a reset code has been sent.");
        setPendingEmail(email);
        setForgotOtpDigits(['', '', '', '', '', '']);
        setMode('forgot-otp');
        setTimeout(() => forgotOtpRefs.current[0]?.focus(), 100);
      }
    } catch (error: any) {
      console.error(error);
      if (error.needsVerification) {
        toast.info("Please verify your email. A new code has been sent.");
        enterOtpMode(error.email || email);
      } else if (error.message?.includes('Invalid login credentials')) {
        toast.error("Account not found. Please sign up first.");
      } else if (error.message?.includes('already been registered')) {
        toast.error("This email is already registered. Please sign in.");
        setMode('login');
      } else {
        toast.error(error.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = forgotOtpDigits.join('');
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    // Just store the OTP and move to new password step
    setMode('new-password');
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const otp = forgotOtpDigits.join('');
      await onResetPassword!(pendingEmail, otp, newPassword);
      toast.success("Password reset successfully. Please sign in.");
      setMode('login');
      setNewPassword('');
      setConfirmNewPassword('');
      setForgotOtpDigits(['', '', '', '', '', '']);
      setPendingEmail('');
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired code. Please try again.");
      setMode('forgot-otp');
      setForgotOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => forgotOtpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Screen ────────────────────────────────────────────────
  if (mode === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white overflow-hidden flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.30),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.20),transparent_30%)]" />

        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden z-10">
          <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

          <div className="text-center mb-8 relative z-10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-violet-500/30 border border-violet-400/40 flex items-center justify-center shadow-lg shadow-violet-700/30">
                <ShieldCheck className="h-8 w-8 text-violet-200" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
            <p className="text-indigo-100/75 text-sm mt-2">
              We sent a 6-digit code to
            </p>
            <p className="text-cyan-200 font-semibold text-sm mt-0.5 break-all">{pendingEmail}</p>
          </div>

          <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-indigo-50 mb-3 text-center">Enter verification code</label>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={digit}
                    onChange={(e) => handleOtpInput(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border border-white/20 bg-white/10 text-white rounded-xl outline-none transition focus:ring-2 focus:ring-violet-400 focus:border-violet-300 caret-transparent"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-900/40 hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Verify & Continue"
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCountdown > 0}
              className="flex items-center justify-center gap-1.5 text-sm mx-auto disabled:opacity-50 disabled:cursor-not-allowed text-cyan-200 hover:text-cyan-100 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend Code"}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-sm text-indigo-100/60 hover:text-indigo-100/90 transition"
            >
              ← Back to login
            </button>
          </div>
        </div>

        <div className="fixed bottom-4 text-xs text-indigo-100/60 z-10">
          &copy; 2024 YUNAFied. All rights reserved.
        </div>
      </div>
    );
  }

  // ── Login / Signup / Forgot Screen ───────────────────────────
  if (mode === 'forgot-otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white overflow-hidden flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.30),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.20),transparent_30%)]" />
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden z-10">
          <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/30 border border-violet-400/40 mb-4">
              <ShieldCheck className="h-8 w-8 text-violet-200" />
            </div>
            <h2 className="text-2xl font-bold text-white">Enter Reset Code</h2>
            <p className="text-indigo-100/80 text-sm mt-2">We sent a 6-digit code to <span className="font-medium text-cyan-200">{pendingEmail}</span></p>
          </div>
          <form onSubmit={handleForgotOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-indigo-50 mb-3 text-center">Enter reset code</label>
              <div className="flex gap-2 justify-center" onPaste={(e) => handleOtpPaste(e, true)}>
                {forgotOtpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { forgotOtpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={digit}
                    onChange={(e) => handleOtpInput(i, e.target.value, true)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e, true)}
                    className="w-12 h-14 text-center text-2xl font-bold border border-white/20 bg-white/10 text-white rounded-xl outline-none transition focus:ring-2 focus:ring-violet-400 focus:border-violet-300 caret-transparent"
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={forgotOtpDigits.join('').length !== 6}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-900/40"
            >
              Verify Code
            </button>
          </form>
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setMode('forgot')} className="text-sm text-indigo-100/60 hover:text-indigo-100/90 transition">
              ← Back
            </button>
          </div>
        </div>
        <div className="fixed bottom-4 text-xs text-indigo-100/60 z-10">&copy; 2024 YUNAFied. All rights reserved.</div>
      </div>
    );
  }

  if (mode === 'new-password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white overflow-hidden flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.30),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.20),transparent_30%)]" />
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden z-10">
          <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/30 border border-violet-400/40 mb-4">
              <Lock className="h-8 w-8 text-violet-200" />
            </div>
            <h2 className="text-2xl font-bold text-white">Set New Password</h2>
            <p className="text-indigo-100/80 text-sm mt-2">Choose a strong new password for your account.</p>
          </div>
          <form onSubmit={handleNewPasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-indigo-50 mb-1">New Password <span className="text-rose-300">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-200/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-3 border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-300 outline-none transition"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-200/70 hover:text-white">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-indigo-50 mb-1">Confirm New Password <span className="text-rose-300">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-200/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none transition ${
                    confirmNewPassword && newPassword !== confirmNewPassword
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/40 bg-white/10 text-white placeholder:text-indigo-200/60'
                      : 'border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 focus:ring-2 focus:ring-violet-400'
                  }`}
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-xs text-rose-300 mt-1">Passwords do not match</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || (!!confirmNewPassword && newPassword !== confirmNewPassword)}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-900/40"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reset Password"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setMode('login')} className="text-sm text-indigo-100/60 hover:text-indigo-100/90 transition">
              ← Back to login
            </button>
          </div>
        </div>
        <div className="fixed bottom-4 text-xs text-indigo-100/60 z-10">&copy; 2024 YUNAFied. All rights reserved.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white overflow-hidden flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(167,139,250,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.30),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.20),transparent_30%)]" />

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden z-10">
        <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <SystemLogo className="justify-center" textClassName="text-white text-center" imageClassName="shadow-lg shadow-violet-700/40" />
          <p className="text-indigo-100/85 text-sm mt-2 font-medium">
            {mode === 'login' && 'Sign in to access your dashboard'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-indigo-50 mb-1">First Name <span className="text-rose-300">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 rounded-lg outline-none transition focus:ring-2 focus:ring-violet-400 focus:border-violet-300"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-indigo-50 mb-1">Middle Name <span className="text-indigo-300/70 font-normal">(optional)</span></label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 rounded-lg outline-none transition focus:ring-2 focus:ring-violet-400 focus:border-violet-300"
                  placeholder="Santos"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-indigo-50 mb-1">Last Name <span className="text-rose-300">*</span></label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 rounded-lg outline-none transition focus:ring-2 focus:ring-violet-400 focus:border-violet-300"
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-indigo-50 mb-1">Email Address <span className="text-rose-300">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-200/70" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 rounded-lg outline-none transition focus:ring-2 focus:ring-violet-400 focus:border-violet-300"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-semibold text-indigo-50 mb-1">Password <span className="text-rose-300">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-200/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-10 py-3 border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-300 outline-none transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-200/70 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-indigo-50 mb-1">Confirm Password <span className="text-rose-300">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-200/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none transition ${
                     confirmPassword && password !== confirmPassword
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-400/40 bg-white/10 text-white placeholder:text-indigo-200/60'
                      : 'border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 focus:ring-2 focus:ring-violet-400'
                  }`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                 <p className="text-xs text-rose-300 mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {mode === 'login' && (onForgotPassword || onResetPassword) && (
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm text-cyan-200 hover:text-cyan-100 font-medium"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && password !== confirmPassword)}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-900/40 hover:shadow-lg active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              mode === 'login' ? "Sign In" : (mode === 'signup' ? "Sign Up" : "Send Reset Code")
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-white/15">
          {mode === 'login' ? (
            <p className="text-indigo-100/80 text-sm">
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('signup')}
                className="text-cyan-200 font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-indigo-100/80 text-sm">
              Already have an account?{' '}
              <button 
                onClick={() => setMode('login')}
                className="text-cyan-200 font-bold hover:underline"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
      
      <div className="fixed bottom-4 text-xs text-indigo-100/60 z-10">
        &copy; 2024 YUNAFied. All rights reserved.
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { SystemLogo } from '@/app/components/SystemLogo';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignup?: (fullName: string, email: string, pass: string) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
}

export function Login({ onLogin, onSignup, onResetPassword }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

        await onSignup(fullName, email, password);
        toast.success("Account created! You can now sign in.");
        setMode('login');
        setFullName('');
        setPassword(''); // Clear password for login
        setConfirmPassword('');
      } else if (mode === 'forgot' && onResetPassword) {
        await onResetPassword(email);
        toast.success("Password reset link sent to your email.");
        setMode('login');
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('Invalid login credentials')) {
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
          
          {/* Email Field */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-indigo-50 mb-1">Full Name <span className="text-rose-300">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-white/20 bg-white/10 text-white placeholder:text-indigo-200/60 rounded-lg outline-none transition focus:ring-2 focus:ring-violet-400 focus:border-violet-300"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
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

          {mode === 'login' && onResetPassword && (
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
              mode === 'login' ? "Sign In" : (mode === 'signup' ? "Sign Up" : "Send Reset Link")
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
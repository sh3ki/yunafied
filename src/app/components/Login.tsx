import React, { useState } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans p-4">
      {/* Android Status Bar Simulation (Visual only - mobile view helper) */}
      <div className="w-full h-6 bg-black/5 fixed top-0 left-0 z-50 md:hidden backdrop-blur-sm"></div>

      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/50 mt-8 mb-8 relative overflow-hidden">
        
        {/* Decorative background blob */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* System Name */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-xl mb-4 shadow-lg shadow-indigo-200">
             <span className="text-white font-bold text-2xl">Y</span>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">YUNAFied</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">
            {mode === 'login' && 'Sign in to access your dashboard'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Demo Credentials Helper */}
        {mode === 'login' && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-xs font-semibold text-indigo-900 mb-2">Demo Accounts (Password: password)</p>
            <div className="space-y-1 text-xs text-indigo-700">
              <div className="flex justify-between">
                <span>Admin:</span>
                <button 
                  type="button"
                  onClick={() => {
                    setEmail('admin@yuna.edu');
                    setPassword('password');
                  }}
                  className="font-mono hover:underline"
                >
                  admin@yuna.edu
                </button>
              </div>
              <div className="flex justify-between">
                <span>Teacher:</span>
                <button 
                  type="button"
                  onClick={() => {
                    setEmail('teacher@yuna.edu');
                    setPassword('password');
                  }}
                  className="font-mono hover:underline"
                >
                  teacher@yuna.edu
                </button>
              </div>
              <div className="flex justify-between">
                <span>Student:</span>
                <button 
                  type="button"
                  onClick={() => {
                    setEmail('student@yuna.edu');
                    setPassword('password');
                  }}
                  className="font-mono hover:underline"
                >
                  student@yuna.edu
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Field */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg outline-none transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none transition ${
                     confirmPassword && password !== confirmPassword
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
                      : 'border-gray-300 focus:ring-2 focus:ring-indigo-500'
                  }`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                 <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {mode === 'login' && onResetPassword && (
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && password !== confirmPassword)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              mode === 'login' ? "Sign In" : (mode === 'signup' ? "Sign Up" : "Send Reset Link")
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          {mode === 'login' ? (
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('signup')}
                className="text-indigo-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <button 
                onClick={() => setMode('login')}
                className="text-indigo-600 font-bold hover:underline"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
      
      <div className="mb-4 text-xs text-gray-400">
        &copy; 2024 YUNAFied. All rights reserved.
      </div>
    </div>
  );
}
import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Users, 
  BarChart,
  LogOut,
  Flag,
  Megaphone,
  Sparkles,
  UserRound
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  role: 'admin' | 'teacher' | 'student';
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  userEmail: string;
  user: {
    fullName: string;
    email: string;
    profileImageUrl: string | null;
  };
}

export function Sidebar({ role, currentView, onNavigate, onLogout, userEmail, user }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { id: 'schedule', label: 'Scheduling', icon: Calendar, roles: ['admin', 'teacher', 'student'] },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'teacher', 'student'] },
    { id: 'assignments', label: 'Assignments', icon: BookOpen, roles: ['teacher', 'student'] },
    { id: 'grades', label: 'Grades & Feedback', icon: BookOpen, roles: ['student'] },
    { id: 'gamified-learning', label: 'Gamified Learning', icon: Sparkles, roles: ['admin', 'teacher', 'student'] },
    { id: 'video-summarizer', label: 'Video Summarizer', icon: Sparkles, roles: ['student'] },
    { id: 'word-translator', label: 'Word Translator', icon: BookOpen, roles: ['student'] },
    { id: 'ai-guide', label: 'AI Guide Bot', icon: Sparkles, roles: ['student'] },
    { id: 'milestones', label: 'Milestones', icon: Flag, roles: ['student'] },
    { id: 'performance', label: 'Performance', icon: BarChart, roles: ['admin', 'teacher'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
    { id: 'profile', label: 'Profile Settings', icon: UserRound, roles: ['admin', 'teacher', 'student'] },
  ];

  const activeBgColor = 'bg-violet-600';
  const activeTextColor = 'text-violet-300';

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="hidden md:flex w-64 bg-slate-900 text-white flex-col h-screen fixed left-0 top-0 z-10 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className={clsx("p-1.5 rounded-lg", activeBgColor)}>
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">YUNAFied</span>
        </h2>
        <div className="mt-4 p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-3">
          <img
            src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'User')}&background=ede9fe&color=5b21b6`}
            alt="Profile"
            className="h-10 w-10 rounded-full object-cover border border-violet-300/30"
          />
          <div className="min-w-0">
            <p className="text-sm text-white font-semibold truncate">{user.fullName}</p>
            <p className="text-xs text-slate-400 truncate">{user.email || userEmail}</p>
          </div>
        </div>
        <span className={clsx(
          "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded text-white mt-2 inline-block font-bold",
          activeBgColor.replace('bg-', 'bg-').replace('600', '500/20'),
          activeTextColor
        )}>
          {role} Module
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
                isActive 
                  ? clsx(activeBgColor, "text-white shadow-lg shadow-black/20 translate-x-1") 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5">
            <h3 className="text-lg font-bold text-gray-800">Sign out?</h3>
            <p className="text-sm text-gray-500 mt-1">You will need to log in again to access your account.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
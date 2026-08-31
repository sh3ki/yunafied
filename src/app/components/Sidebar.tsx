import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Users, 
  Bell,
  MessageCircle,
  Library,
  LogOut,
  Flag,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Video
} from 'lucide-react';
import { clsx } from 'clsx';
import { SystemLogo } from '@/app/components/SystemLogo';

interface SidebarProps {
  role: 'admin' | 'teacher' | 'student';
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  userEmail: string;
  chatUnreadTotal?: number;
  schedulePendingCount?: number;
  assignmentPendingCount?: number;
  meetingsTodayCount?: number;
  notificationUnreadCount?: number;
  gradingPendingCount?: number;
  user: {
    fullName: string;
    email: string;
    profileImageUrl: string | null;
  };
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.charAt(0) || ''}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase() || '?';
}

export function Sidebar({ role, currentView, onNavigate, onLogout, userEmail, user, chatUnreadTotal = 0, schedulePendingCount = 0, assignmentPendingCount = 0, meetingsTodayCount = 0, notificationUnreadCount = 0, gradingPendingCount = 0 }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { id: 'schedule', label: 'Scheduling', icon: Calendar, roles: ['teacher', 'student'] },
    { id: 'meetings', label: 'Video Meetings', icon: Video, roles: ['teacher'] },
    { id: 'materials', label: 'Learning Materials', icon: Library, roles: ['admin', 'teacher', 'student'] },
    { id: 'assignments', label: 'Assignments', icon: BookOpen, roles: ['teacher', 'student'] },
    { id: 'grades', label: 'Grades/Feedback', icon: BookOpen, roles: ['teacher', 'student'] },
    { id: 'enrollments', label: 'Enrollments', icon: Users, roles: ['admin'] },
    { id: 'ai-guide', label: 'AI Guide Bot', icon: Sparkles, roles: ['student'] },
    { id: 'gamified-learning', label: 'Gamified Learning', icon: Sparkles, roles: ['admin', 'teacher', 'student'] },
    { id: 'milestones', label: 'Milestones', icon: Flag, roles: ['student'] },
    { id: 'video-summarizer', label: 'Video Summarizer', icon: Video, roles: ['student', 'teacher'] },
    { id: 'word-translator', label: 'Word Translator', icon: BookOpen, roles: ['student'] },
    { id: 'chats', label: 'Chats', icon: MessageCircle, roles: ['admin', 'teacher', 'student'] },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'teacher', 'student'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'teacher', 'student'] },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck, roles: ['admin'] },
    { id: 'meeting-history', label: 'Meeting History', icon: Video, roles: ['admin'] },
    { id: 'profile', label: 'Profile Settings', icon: UserRound, roles: ['admin', 'teacher', 'student'] },
  ];

  const activeBgColor = 'bg-violet-600';
  const activeTextColor = 'text-violet-300';

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="hidden md:flex w-64 bg-slate-900 text-white flex-col h-screen fixed left-0 top-0 z-10 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <SystemLogo compact showText imageClassName="ring-1 ring-white/10 shadow-lg shadow-violet-900/20" textClassName="text-white" />
        <div className="mt-4 p-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-3">
          {user.profileImageUrl ? <><img src={user.profileImageUrl} alt="Profile" onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling?.classList.remove('hidden'); }} className="h-10 w-10 rounded-full object-cover border border-violet-300/30" /><span className="hidden h-10 w-10 rounded-full border border-violet-300/30 bg-violet-500/20 text-violet-200 flex items-center justify-center text-sm font-bold">{getInitials(user.fullName)}</span></> : <span className="h-10 w-10 rounded-full border border-violet-300/30 bg-violet-500/20 text-violet-200 flex items-center justify-center text-sm font-bold">{getInitials(user.fullName)}</span>}
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
              {item.id === 'chats' && chatUnreadTotal > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
                </span>
              )}
              {item.id === 'schedule' && schedulePendingCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {schedulePendingCount > 99 ? '99+' : schedulePendingCount}
                </span>
              )}
              {item.id === 'assignments' && assignmentPendingCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {assignmentPendingCount > 99 ? '99+' : assignmentPendingCount}
                </span>
              )}
              {item.id === 'meetings' && meetingsTodayCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {meetingsTodayCount > 99 ? '99+' : meetingsTodayCount}
                </span>
              )}
              {item.id === 'notifications' && notificationUnreadCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </span>
              )}
              {item.id === 'grades' && gradingPendingCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {gradingPendingCount > 99 ? '99+' : gradingPendingCount}
                </span>
              )}
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

import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Users, 
  Flag,
  Bell,
  MessageCircle,
  Library,
  Megaphone,
  Sparkles,
  UserRound,
  Video,
  ClipboardList
  ,ClipboardCheck
  ,LogOut
} from 'lucide-react';
import { clsx } from 'clsx';

interface BottomNavProps {
  role: 'admin' | 'teacher' | 'student';
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  chatUnreadTotal?: number;
}

export function BottomNav({ role, currentView, onNavigate, onLogout, chatUnreadTotal = 0 }: BottomNavProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { id: 'schedule', label: 'Schedule', icon: Calendar, roles: ['admin', 'teacher', 'student'] },
    { id: 'meetings', label: 'Meetings', icon: Video, roles: ['teacher'] },
    { id: 'materials', label: 'Materials', icon: Library, roles: ['admin', 'teacher', 'student'] },
    { id: 'assignments', label: 'Assignments', icon: BookOpen, roles: ['teacher', 'student'] },
    { id: 'assessments', label: 'Assessments', icon: ClipboardCheck, roles: ['admin', 'teacher', 'student'] },
    { id: 'grades', label: 'Grades', icon: BookOpen, roles: ['teacher', 'student'] },
    { id: 'enrollments', label: 'Enrollments', icon: Users, roles: ['admin'] },
    { id: 'teacher-records', label: 'Teacher Records', icon: ClipboardList, roles: ['admin'] },
    { id: 'student-records', label: 'Student Records', icon: ClipboardList, roles: ['admin', 'teacher'] },
    { id: 'gamified-learning', label: 'Gamified Learning', icon: Sparkles, roles: ['admin', 'teacher', 'student'] },
    { id: 'milestones', label: 'Milestones', icon: Flag, roles: ['student'] },
    { id: 'video-summarizer', label: 'Video Summarizer', icon: Video, roles: ['student', 'teacher'] },
    { id: 'word-translator', label: 'Word Translator', icon: BookOpen, roles: ['student'] },
    { id: 'ai-guide', label: 'AI Guide Bot', icon: Sparkles, roles: ['student'] },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'teacher', 'student'] },
    { id: 'chats', label: 'Chats', icon: MessageCircle, roles: ['admin', 'teacher', 'student'] },
    { id: 'notifications', label: 'Alerts', icon: Bell, roles: ['admin', 'teacher', 'student'] },
    { id: 'profile', label: 'Profile', icon: UserRound, roles: ['admin', 'teacher', 'student'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex gap-1 items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={clsx(
              "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 active:scale-95 min-w-[4.5rem] flex-shrink-0 relative",
              isActive ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25' : 'text-gray-400 hover:bg-violet-50 hover:text-violet-600'
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5 mb-1" />
              {item.id === 'chats' && chatUnreadTotal > 0 && currentView !== 'chats' && (
                <span className="absolute -top-1 -right-2 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                  {chatUnreadTotal > 99 ? '99+' : chatUnreadTotal}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setShowLogoutConfirm(true)}
        className="flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 active:scale-95 min-w-[4.5rem] flex-shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-medium">Logout</span>
      </button>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-5">
            <h3 className="text-lg font-bold text-gray-800">Sign out?</h3>
            <p className="text-sm text-gray-500 mt-1">You will need to log in again to access your account.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
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

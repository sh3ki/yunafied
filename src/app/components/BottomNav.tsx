import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Users, 
  GraduationCap,
  Megaphone,
  Sparkles,
  UserRound
} from 'lucide-react';
import { clsx } from 'clsx';

interface BottomNavProps {
  role: 'admin' | 'teacher' | 'student';
  currentView: string;
  onNavigate: (view: string) => void;
}

export function BottomNav({ role, currentView, onNavigate }: BottomNavProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
    { id: 'schedule', label: 'Schedule', icon: Calendar, roles: ['admin', 'teacher', 'student'] },
    { id: 'assignments', label: 'Tasks', icon: BookOpen, roles: ['teacher', 'student'] },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'teacher', 'student'] },
    { id: 'gamified-learning', label: 'Quiz', icon: Sparkles, roles: ['admin', 'teacher', 'student'] },
    { id: 'ai-guide', label: 'AI Guide', icon: Sparkles, roles: ['student'] },
    { id: 'users', label: 'Users', icon: Users, roles: ['admin'] },
    { id: 'grades', label: 'Grades', icon: GraduationCap, roles: ['student'] },
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
              "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 active:scale-95 min-w-16",
              isActive ? 'text-violet-600' : 'text-gray-400 hover:text-gray-600'
            )}
          >
            <Icon className={clsx("h-6 w-6 mb-1", isActive && "fill-current opacity-20")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

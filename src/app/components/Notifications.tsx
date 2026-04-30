import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Calendar, CheckCircle2, FileText, Megaphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { NotificationItem } from '@/app/types/models';

interface NotificationsProps {
  onNavigate: (view: string) => void;
}

const typeIconMap: Record<NotificationItem['type'], React.ComponentType<{ className?: string }>> = {
  announcement: Megaphone,
  assignment: FileText,
  submission: FileText,
  schedule: Calendar,
  grade: CheckCircle2,
};

const priorityClassMap: Record<NotificationItem['priority'], string> = {
  low: 'border-emerald-200 bg-emerald-50',
  medium: 'border-amber-200 bg-amber-50',
  high: 'border-rose-200 bg-rose-50',
};

export function Notifications({ onNavigate }: NotificationsProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<'all' | NotificationItem['priority']>('all');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const items = await apiClient.listNotifications(30);
      setRows(items);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredRows = useMemo(() => {
    if (priorityFilter === 'all') {
      return rows;
    }
    return rows.filter((item) => item.priority === priorityFilter);
  }, [rows, priorityFilter]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Bell className="h-7 w-7 text-violet-600" />
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">Stay updated with deadlines, grading, schedule requests, and announcements.</p>
        </div>

        <button
          onClick={loadNotifications}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap gap-2">
        {(['all', 'high', 'medium', 'low'] as const).map((priority) => (
          <button
            key={priority}
            onClick={() => setPriorityFilter(priority)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              priorityFilter === priority
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {priority === 'all' ? 'All priorities' : `${priority[0].toUpperCase()}${priority.slice(1)} priority`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {!loading && filteredRows.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center text-gray-500">
            No notifications found.
          </div>
        )}

        {filteredRows.map((item) => {
          const Icon = typeIconMap[item.type];
          return (
            <article key={item.id} className={`border rounded-xl p-4 ${priorityClassMap[item.priority]}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-9 w-9 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-700" />
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800">{item.title}</p>
                    <p className="text-sm text-gray-700 mt-1">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate(item.actionView)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Open
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

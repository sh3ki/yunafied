import React, { useEffect, useState } from 'react';
import { Video, Clock, User, Calendar, ChevronRight, History } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleItem } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

interface MeetingsProps {
  schedules: ScheduleItem[];
  userId: string;
  onStartMeeting: (roomToken: string) => void;
}

type Tab = 'today' | 'upcoming' | 'past';

/** "HH:MM" string → total minutes since midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** "HH:MM" → "9:00 AM" */
function fmtTime(time: string): string {
  try {
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return time;
  }
}

/** "YYYY-MM-DD" → "Mon, May 4" */
function fmtDate(date: string): string {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch {
    return date;
  }
}

/** Returns today's date as YYYY-MM-DD in Asia/Manila (UTC+8) timezone */
function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/** Returns the current time in Asia/Manila as total minutes since midnight */
function nowMinutesPHT(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return h * 60 + m;
}

/** Within today: active window = 10 min before start → end */
function isActiveNow(item: ScheduleItem, nowMin: number): boolean {
  return nowMin >= toMinutes(item.startTime) - 10 && nowMin <= toMinutes(item.endTime);
}

/** Within today: start window hasn't opened yet */
function isLaterToday(item: ScheduleItem, nowMin: number): boolean {
  return nowMin < toMinutes(item.startTime) - 10;
}

interface CardProps {
  item: ScheduleItem;
  isActive?: boolean;
  isPast?: boolean;
  showDate?: boolean;
  startingId: string | null;
  onStart: (item: ScheduleItem) => void;
}

function MeetingCard({ item, isActive, isPast, showDate, startingId, onStart }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all',
        isActive
          ? 'bg-emerald-50 border-emerald-400 shadow-md shadow-emerald-100 ring-1 ring-emerald-300'
          : isPast
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200 shadow-sm hover:border-emerald-300',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">
              ● NOW
            </span>
          )}
          <p className={['font-semibold truncate', isPast ? 'text-gray-500' : 'text-gray-900'].join(' ')}>
            {item.title}
          </p>
        </div>
        {item.description && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
          {showDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(item.date)}
            </span>
          )}
          {item.studentName && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {item.studentName}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {fmtTime(item.startTime)} – {fmtTime(item.endTime)}
          </span>
        </div>
      </div>

      <button
          onClick={() => onStart(item)}
          disabled={startingId === item.id}
          className={[
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap shrink-0 disabled:opacity-50',
            isActive
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white',
          ].join(' ')}
        >
          <Video className="h-4 w-4" />
          {startingId === item.id ? 'Starting…' : 'Start Video Call'}
          {startingId !== item.id && <ChevronRight className="h-4 w-4" />}
        </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <Video className="h-10 w-10 mx-auto mb-3 opacity-25" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Meetings({ schedules, userId, onStartMeeting }: MeetingsProps) {
  const [startingId, setStartingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [now, setNow] = useState(() => new Date());

  // Re-evaluate every 30 seconds
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const today = todayIso();
  const nowMin = nowMinutesPHT();

  const accepted = schedules
    .filter((s) => s.status === 'accepted' && s.teacherId === userId)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
    });

  // Today = date matches today, split by time
  const todayAll   = accepted.filter((s) => s.date === today);
  const activeNow  = todayAll.filter((s) => isActiveNow(s, nowMin));
  const laterToday = todayAll.filter((s) => isLaterToday(s, nowMin));
  const passedToday = todayAll.filter((s) => !isActiveNow(s, nowMin) && !isLaterToday(s, nowMin));

  // Upcoming = date strictly after today
  const upcoming = accepted.filter((s) => s.date > today);

  // Past = date strictly before today (newest first)
  const past = accepted
    .filter((s) => s.date < today)
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : b.startTime.localeCompare(a.startTime);
    });

  const startMeeting = async (item: ScheduleItem) => {
    if (startingId) return;
    setStartingId(item.id);
    try {
      const meeting = await apiClient.createMeeting({
        scheduleId: item.id,
        studentId: item.studentId,
        studentName: item.studentName,
        scheduleTitle: item.title,
        scheduleDescription: item.description || null,
      });
      onStartMeeting(meeting.roomToken);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start meeting.');
      setStartingId(null);
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'today',    label: 'Today',         count: todayAll.length },
    { id: 'upcoming', label: 'Upcoming',       count: upcoming.length },
    { id: 'past',     label: 'Past Schedules', count: past.length },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-emerald-100 rounded-xl">
          <Video className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Meetings</h1>
          <p className="text-sm text-gray-500">
            {fmtDate(today)} · {now.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <p className="font-semibold mb-1">How it works</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>Meeting window opens <strong>10 minutes before</strong> the scheduled start</li>
          <li>Click <strong>Start Video Call</strong> — the student gets a ringing notification</li>
          <li>Once the student accepts, you're connected live</li>
        </ol>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.id === 'past' && <History className="h-3.5 w-3.5" />}
            {t.label}
            {t.count > 0 && (
              <span className={[
                'text-xs rounded-full px-1.5 py-0.5 font-bold',
                tab === t.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500',
              ].join(' ')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TODAY tab ─────────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-8">
          {todayAll.length === 0 ? (
            <EmptyState message="No scheduled meetings for today." />
          ) : (
            <>
              {activeNow.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">● Active Now</h2>
                  <div className="space-y-3">
                    {activeNow.map((item) => (
                      <MeetingCard key={item.id} item={item} isActive startingId={startingId} onStart={startMeeting} />
                    ))}
                  </div>
                </section>
              )}

              {laterToday.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Later Today</h2>
                  <div className="space-y-3">
                    {laterToday.map((item) => (
                      <MeetingCard key={item.id} item={item} startingId={startingId} onStart={startMeeting} />
                    ))}
                  </div>
                </section>
              )}

              {passedToday.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Earlier Today</h2>
                  <div className="space-y-3">
                    {passedToday.map((item) => (
                      <MeetingCard key={item.id} item={item} isPast startingId={startingId} onStart={startMeeting} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ── UPCOMING tab ──────────────────────────────────────── */}
      {tab === 'upcoming' && (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState message="No upcoming meetings scheduled." />
          ) : (
            upcoming.map((item) => (
              <MeetingCard key={item.id} item={item} showDate startingId={startingId} onStart={startMeeting} />
            ))
          )}
        </div>
      )}

      {/* ── PAST tab ──────────────────────────────────────────── */}
      {tab === 'past' && (
        <div className="space-y-3">
          {past.length === 0 ? (
            <EmptyState message="No past schedules yet." />
          ) : (
            past.map((item) => (
              <MeetingCard key={item.id} item={item} isPast showDate startingId={startingId} onStart={startMeeting} />
            ))
          )}
        </div>
      )}
    </div>
  );
}



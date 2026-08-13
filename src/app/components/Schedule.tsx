import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AuthUser, MeetingRoom, ScheduleItem, TeacherAvailabilityItem, UserRole } from '@/app/types/models';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { apiClient } from '@/app/services/apiClient';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

interface ScheduleProps {
  schedules: ScheduleItem[];
  users: AuthUser[];
  role: UserRole;
  userId: string;
  onCreate: (payload: {
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId?: string;
    studentId?: string | null;
    requestNote?: string;
  }) => Promise<void>;
  onRespond: (
    id: string,
    payload: {
      decision: 'accepted' | 'declined';
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      responseNote?: string;
    },
  ) => Promise<void>;
  onMove: (
    id: string,
    payload: {
      date: string;
      startTime: string;
      endTime: string;
      title?: string;
      description?: string;
    },
  ) => Promise<void>;
  onCancel: (id: string, responseNote: string) => Promise<void>;
  onAdminEdit: (
    id: string,
    payload: {
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      teacherId?: string;
      studentId?: string | null;
      status?: 'pending' | 'accepted' | 'declined' | 'cancelled';
      requestNote?: string | null;
      responseNote?: string | null;
    },
  ) => Promise<void>;
  onStartMeeting: (roomToken: string) => void;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function manilaTodayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function timeToMinutes(t: string): number {
  const [hh, mm] = t.split(':').map((s) => Number(s || 0));
  return hh * 60 + mm;
}

function minutesToTime(m: number): string {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const hhStr = String(Math.min(23, hh)).padStart(2, '0');
  const mmStr = String(Math.min(59, mm)).padStart(2, '0');
  return `${hhStr}:${mmStr}`;
}

function endMaxFromStart(start: string): string {
  const startM = timeToMinutes(start);
  const maxM = Math.min(23 * 60 + 59, startM + 6 * 60);
  return minutesToTime(maxM);
}

function isoFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthTitle(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildMonthGrid(referenceMonth: Date): Date[] {
  const firstOfMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const nextDate = new Date(gridStart);
    nextDate.setDate(gridStart.getDate() + index);
    return nextDate;
  });
}

function statusClass(status: ScheduleItem['status']): string {
  if (status === 'accepted') return 'bg-green-100 text-green-800';
  if (status === 'pending') return 'bg-amber-100 text-amber-800';
  if (status === 'declined') return 'bg-red-100 text-red-800';
  return 'bg-gray-200 text-gray-700';
}

export function Schedule({ schedules, users, role, userId, onCreate, onRespond, onMove, onCancel, onAdminEdit, onStartMeeting }: ScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [studentId, setStudentId] = useState('');

  const [requestOpen, setRequestOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [teacherRequestsOpen, setTeacherRequestsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingMeeting, setStartingMeeting] = useState<string | null>(null);

  // Accept modal
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptItem, setAcceptItem] = useState<ScheduleItem | null>(null);
  const [acceptForm, setAcceptForm] = useState({ title: '', description: '', date: '', startTime: '', endTime: '', responseNote: '' });

  // Decline modal
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineItem, setDeclineItem] = useState<ScheduleItem | null>(null);
  const [declineNote, setDeclineNote] = useState('');

  // Move modal
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<ScheduleItem | null>(null);
  const [moveForm, setMoveForm] = useState({ date: '', startTime: '', endTime: '' });

  // Cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelItem, setCancelItem] = useState<ScheduleItem | null>(null);
  const [cancelNote, setCancelNote] = useState('');

  // Admin edit modal
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminEditItem, setAdminEditItem] = useState<ScheduleItem | null>(null);
  const [adminEditForm, setAdminEditForm] = useState({ title: '', description: '', date: '', startTime: '', endTime: '', status: 'pending' as 'pending' | 'accepted' | 'declined' | 'cancelled', responseNote: '' });

  // Teacher availability
  const [availabilityBlocks, setAvailabilityBlocks] = useState<TeacherAvailabilityItem[]>([]);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availForm, setAvailForm] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' });
  const [savingAvail, setSavingAvail] = useState(false);

  useEffect(() => {
    if (role === 'teacher') {
      apiClient.listTeacherAvailability().then(setAvailabilityBlocks).catch(() => {});
    }
  }, [role]);

  const [requestForm, setRequestForm] = useState({
    title: 'English',
    description: ENGLISH_LEVELS[0],
    date: todayIso(),
    startTime: '09:00',
    endTime: '10:00',
    requestNote: '',
  });

  const [listTab, setListTab] = useState<'today' | 'pending' | 'accepted' | 'declined'>('today');

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    date: todayIso(),
    startTime: '09:00',
    endTime: '10:00',
  });

  const teachers = useMemo(() => users.filter((u) => u.role === 'teacher' && u.status === 'active'), [users]);
  const students = useMemo(() => users.filter((u) => u.role === 'student' && u.status === 'active'), [users]);

  useEffect(() => {
    if (role === 'teacher') {
      setSelectedTeacherId(userId);
      return;
    }

    if (!selectedTeacherId && teachers[0]) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [role, userId, selectedTeacherId, teachers]);

  const teacherSchedules = useMemo(() => {
    if (role === 'teacher') {
      return schedules.filter((item) => item.teacherId === userId);
    }

    if (!selectedTeacherId) {
      return [];
    }

    return schedules.filter((item) => item.teacherId === selectedTeacherId);
  }, [role, schedules, selectedTeacherId, userId]);

  const selectedDateIso = isoFromDate(selectedDate);
  const selectedDaySchedules = useMemo(
    () => teacherSchedules
      .filter((item) => item.date === selectedDateIso)
      .sort((a, b) => `${a.startTime}-${a.endTime}`.localeCompare(`${b.startTime}-${b.endTime}`)),
    [selectedDateIso, teacherSchedules],
  );

  const pendingTeacherRequests = useMemo(
    () => teacherSchedules.filter((item) => item.status === 'pending').sort((a, b) => `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`)),
    [teacherSchedules],
  );

  const monthGridDates = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  const schedulesByDate = useMemo(() => {
    const grouped: Record<string, ScheduleItem[]> = {};

    teacherSchedules.forEach((item) => {
      if (!grouped[item.date]) {
        grouped[item.date] = [];
      }
      grouped[item.date].push(item);
    });

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => `${a.startTime}-${a.endTime}`.localeCompare(`${b.startTime}-${b.endTime}`));
    });

    return grouped;
  }, [teacherSchedules]);

  const openRequestModal = () => {
    const manilaMin = manilaTodayIso();
    const selected = selectedDateIso < manilaMin ? manilaMin : selectedDateIso;
    setRequestForm((prev) => ({ ...prev, date: selected }));
    setRequestOpen(true);
  };

  const openCreateModal = () => {
    setCreateForm((prev) => ({ ...prev, date: selectedDateIso }));
    setCreateOpen(true);
  };

  const jumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1));
      return next;
    });
  };

  const submitStudentRequest = async () => {
    if (!selectedTeacherId) {
      toast.error('Please select a teacher first.');
      return;
    }

    if (!requestForm.description.trim()) {
      toast.error('Please select a level/module.');
      return;
    }

    // validate times: end later than start and max 6 hours
    const reqStart = timeToMinutes(requestForm.startTime);
    const reqEnd = timeToMinutes(requestForm.endTime);
    if (reqEnd <= reqStart) { toast.error('End time must be later than start time.'); return; }
    if (reqEnd - reqStart > 6 * 60) { toast.error('Maximum session duration is 6 hours.'); return; }

    try {
      setSaving(true);
      await onCreate({
        title: requestForm.title.trim(),
        description: requestForm.description.trim(),
        date: requestForm.date,
        startTime: requestForm.startTime,
        endTime: requestForm.endTime,
        teacherId: selectedTeacherId,
        requestNote: requestForm.requestNote.trim() || undefined,
      });
      toast.success('Schedule request sent.');
      setRequestOpen(false);
      setRequestForm({
        title: 'English',
        description: ENGLISH_LEVELS[0],
        date: selectedDateIso,
        startTime: '09:00',
        endTime: '10:00',
        requestNote: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send request.');
    } finally {
      setSaving(false);
    }
  };

  const submitManagedCreate = async () => {
    if (!createForm.title.trim() || !createForm.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    if (role === 'admin' && !selectedTeacherId) {
      toast.error('Please select a teacher first.');
      return;
    }

    // validate times: end later than start and max 6 hours
    const cStart = timeToMinutes(createForm.startTime);
    const cEnd = timeToMinutes(createForm.endTime);
    if (cEnd <= cStart) { toast.error('End time must be later than start time.'); return; }
    if (cEnd - cStart > 6 * 60) { toast.error('Maximum session duration is 6 hours.'); return; }

    try {
      setSaving(true);
      await onCreate({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        teacherId: role === 'admin' ? selectedTeacherId : undefined,
        studentId: role === 'admin' ? studentId || null : undefined,
      });
      toast.success('Schedule created.');
      setCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        date: selectedDateIso,
        startTime: '09:00',
        endTime: '10:00',
      });
      setStudentId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create schedule.');
    } finally {
      setSaving(false);
    }
  };

  const acceptRequest = (item: ScheduleItem) => {
    setAcceptItem(item);
    setAcceptForm({
      title: item.title,
      description: item.description,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      responseNote: item.responseNote || '',
    });
    setAcceptOpen(true);
  };

  const submitAccept = async () => {
    if (!acceptItem) return;
    if (!acceptForm.title.trim()) { toast.error('Title is required.'); return; }
    // validate times
    const aStart = timeToMinutes(acceptForm.startTime);
    const aEnd = timeToMinutes(acceptForm.endTime);
    if (aEnd <= aStart) { toast.error('End time must be later than start time.'); return; }
    if (aEnd - aStart > 6 * 60) { toast.error('Maximum session duration is 6 hours.'); return; }
    try {
      setSaving(true);
      await onRespond(acceptItem.id, {
        decision: 'accepted',
        title: acceptForm.title.trim(),
        description: acceptForm.description.trim(),
        date: acceptForm.date,
        startTime: acceptForm.startTime,
        endTime: acceptForm.endTime,
        responseNote: acceptForm.responseNote.trim() || undefined,
      });
      toast.success('Schedule request accepted.');
      setAcceptOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept schedule request.');
    } finally {
      setSaving(false);
    }
  };

  const declineRequest = (item: ScheduleItem) => {
    setDeclineItem(item);
    setDeclineNote(item.responseNote || '');
    setDeclineOpen(true);
  };

  const submitDecline = async () => {
    if (!declineItem) return;
    if (!declineNote.trim()) { toast.error('Decline note is required.'); return; }
    try {
      setSaving(true);
      await onRespond(declineItem.id, { decision: 'declined', responseNote: declineNote.trim() });
      toast.success('Schedule request declined.');
      setDeclineOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline schedule request.');
    } finally {
      setSaving(false);
    }
  };

  const moveSchedule = (item: ScheduleItem) => {
    setMoveItem(item);
    setMoveForm({ date: item.date, startTime: item.startTime, endTime: item.endTime });
    setMoveOpen(true);
  };

  const submitMove = async () => {
    if (!moveItem) return;
    // validate times
    const mStart = timeToMinutes(moveForm.startTime);
    const mEnd = timeToMinutes(moveForm.endTime);
    if (mEnd <= mStart) { toast.error('End time must be later than start time.'); return; }
    if (mEnd - mStart > 6 * 60) { toast.error('Maximum session duration is 6 hours.'); return; }
    try {
      setSaving(true);
      await onMove(moveItem.id, { date: moveForm.date, startTime: moveForm.startTime, endTime: moveForm.endTime, title: moveItem.title, description: moveItem.description });
      toast.success('Schedule moved successfully.');
      setMoveOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to move schedule.');
    } finally {
      setSaving(false);
    }
  };

  const cancelSchedule = (item: ScheduleItem) => {
    setCancelItem(item);
    setCancelNote(item.responseNote || '');
    setCancelOpen(true);
  };

  const submitCancel = async () => {
    if (!cancelItem) return;
    if (!cancelNote.trim()) { toast.error('Cancellation note is required.'); return; }
    try {
      setSaving(true);
      await onCancel(cancelItem.id, cancelNote.trim());
      toast.success('Schedule cancelled.');
      setCancelOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel schedule.');
    } finally {
      setSaving(false);
    }
  };

  const editByAdmin = (item: ScheduleItem) => {
    setAdminEditItem(item);
    setAdminEditForm({
      title: item.title,
      description: item.description,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status as 'pending' | 'accepted' | 'declined' | 'cancelled',
      responseNote: item.responseNote || '',
    });
    setAdminEditOpen(true);
  };

  const submitAdminEdit = async () => {
    if (!adminEditItem) return;
    if (!adminEditForm.title.trim()) { toast.error('Title is required.'); return; }
    // validate times
    const adStart = timeToMinutes(adminEditForm.startTime);
    const adEnd = timeToMinutes(adminEditForm.endTime);
    if (adEnd <= adStart) { toast.error('End time must be later than start time.'); return; }
    if (adEnd - adStart > 6 * 60) { toast.error('Maximum session duration is 6 hours.'); return; }
    try {
      setSaving(true);
      await onAdminEdit(adminEditItem.id, {
        title: adminEditForm.title.trim(),
        description: adminEditForm.description.trim(),
        date: adminEditForm.date,
        startTime: adminEditForm.startTime,
        endTime: adminEditForm.endTime,
        status: adminEditForm.status,
        responseNote: adminEditForm.responseNote.trim() || null,
      });
      toast.success('Schedule updated by admin.');
      setAdminEditOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update schedule.');
    } finally {
      setSaving(false);
    }
  };

  const showTeacherPicker = role === 'admin' || role === 'student';

  const startMeeting = async (item: ScheduleItem) => {
    if (startingMeeting) return;
    setStartingMeeting(item.id);
    try {
      const meeting: MeetingRoom = await apiClient.createMeeting({
        scheduleId: item.id,
        studentId: item.studentId,
        studentName: item.studentName,
        scheduleTitle: item.title,
      });
      onStartMeeting(meeting.roomToken);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start meeting.');
    } finally {
      setStartingMeeting(null);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 space-y-6">
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Teacher Schedule Calendar</h2>
          <p className="text-sm text-gray-500">
            {role === 'student'
              ? 'Pick a teacher, view the calendar, then send a schedule request.'
              : 'View schedules in calendar format and manage requests.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {role === 'student' ? (
            <Button onClick={openRequestModal} disabled={!selectedTeacherId}>Request Schedule</Button>
          ) : null}
          {role === 'teacher' ? (
            <Button variant="outline" onClick={() => setTeacherRequestsOpen(true)}>
              Pending Requests ({pendingTeacherRequests.length})
            </Button>
          ) : null}
          {role === 'admin' ? (
            <Button onClick={openCreateModal} disabled={!selectedTeacherId}>Create Schedule</Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        {showTeacherPicker ? (
          <div className="w-full md:w-[360px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Teacher</label>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Teacher</label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {teachers.find((teacher) => teacher.id === userId)?.fullName || 'Assigned Teacher'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-gray-600"><span className="size-2 rounded-full bg-green-500" /> Accepted</span>
          <span className="inline-flex items-center gap-1 text-gray-600"><span className="size-2 rounded-full bg-amber-500" /> Pending</span>
        </div>
      </div>

      {!selectedTeacherId && role !== 'teacher' ? (
        <p className="text-sm text-gray-500 border rounded-lg p-4 bg-gray-50">Select a teacher to load the calendar.</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  aria-label="Previous month"
                >
                  {'<'}
                </button>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  aria-label="Next month"
                >
                  {'>'}
                </button>
                <h3 className="text-xl font-bold text-gray-800 ml-2">{monthTitle(currentMonth)}</h3>
              </div>

              <Button variant="outline" onClick={jumpToToday}>Today</Button>
            </div>

            <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 bg-gray-50">
                  {label}
                </div>
              ))}

              {monthGridDates.map((dateValue) => {
                const dateIso = isoFromDate(dateValue);
                const daySchedules = schedulesByDate[dateIso] || [];
                const isCurrentMonth =
                  dateValue.getMonth() === currentMonth.getMonth() && dateValue.getFullYear() === currentMonth.getFullYear();
                const isSelected = dateIso === selectedDateIso;

                return (
                  <button
                    type="button"
                    key={dateIso}
                    onClick={() => {
                      setSelectedDate(dateValue);
                      setCurrentMonth(new Date(dateValue.getFullYear(), dateValue.getMonth(), 1));
                    }}
                    className={`min-h-[120px] border-b border-r border-gray-200 p-2 text-left align-top transition ${
                      isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'bg-white hover:bg-gray-50'
                    } ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{dateValue.getDate()}</span>
                      {daySchedules.length > 0 ? <span className="text-[10px] text-gray-500">{daySchedules.length}</span> : null}
                    </div>

                    <div className="mt-2 space-y-1">
                      {daySchedules.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className={`truncate rounded px-1.5 py-1 text-[10px] font-medium ${statusClass(item.status)}`}
                          title={`${item.startTime} - ${item.endTime} ${item.title}`}
                        >
                          {item.startTime} {item.title}
                        </div>
                      ))}
                      {daySchedules.length > 3 ? (
                        <p className="text-[10px] text-gray-500">+{daySchedules.length - 3} more</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {/* Tab bar */}
            <div className="flex gap-2 flex-wrap items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {(['today', 'pending', 'accepted', 'declined'] as const).map((tab) => {
                  const todayIsoStr = isoFromDate(new Date());
                  const count = tab === 'today'
                    ? teacherSchedules.filter((s) => s.date === todayIsoStr).length
                    : teacherSchedules.filter((s) => s.status === tab).length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setListTab(tab)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize ${
                        listTab === tab
                          ? tab === 'today'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : tab === 'pending'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : tab === 'accepted'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-red-600 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tab === 'today' ? 'Today' : tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-gray-400">Showing {listTab} schedules</span>
            </div>

            {(() => {
              const todayIsoStr = isoFromDate(new Date());
              const tabSchedules = teacherSchedules
                .filter((item) => listTab === 'today' ? item.date === todayIsoStr : item.status === listTab)
                .sort((a, b) => `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`));

              if (tabSchedules.length === 0) {
                return (
                  <p className="text-sm text-gray-500 border rounded-lg p-4 bg-gray-50">
                    No {listTab === 'today' ? "schedules for today" : `${listTab} schedules`}.
                  </p>
                );
              }

              return tabSchedules.map((item) => {
                const isTeacherOwner = role === 'teacher' && item.teacherId === userId;
                const canRespond = isTeacherOwner && item.status === 'pending';
                const canMoveOrCancel = (isTeacherOwner || role === 'admin') && item.status !== 'cancelled' && item.status !== 'declined';

                return (
                  <div key={item.id} className="border rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex flex-wrap gap-2 justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(item.status)}`}>{item.status}</span>
                    </div>

                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <p>{item.date} · {item.startTime} – {item.endTime}</p>
                      <p>Teacher: {item.teacherName}</p>
                      <p>Student: {item.studentName || 'Unassigned'}</p>
                      {item.requestNote ? <p>Request Note: {item.requestNote}</p> : null}
                      {item.responseNote ? <p className="text-indigo-700">Note: {item.responseNote}</p> : null}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {canRespond ? (
                        <>
                          <button onClick={() => acceptRequest(item)} className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md">
                            Accept + Edit
                          </button>
                          <button onClick={() => declineRequest(item)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md">
                            Decline
                          </button>
                        </>
                      ) : null}

                      {canMoveOrCancel ? (
                        <>
                          <button onClick={() => moveSchedule(item)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md">
                            Move
                          </button>
                          <button onClick={() => cancelSchedule(item)} className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-md">
                            Cancel
                          </button>
                        </>
                      ) : null}

                      {role === 'teacher' && item.status === 'accepted' && item.teacherId === userId ? (
                        <button
                          onClick={() => startMeeting(item)}
                          disabled={startingMeeting === item.id}
                          className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-md flex items-center gap-1 font-semibold"
                        >
                          📹 {startingMeeting === item.id ? 'Starting…' : 'Start Video Call'}
                        </button>
                      ) : null}

                      {role === 'admin' ? (
                        <button onClick={() => editByAdmin(item)} className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded-md">
                          Admin Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Schedule</DialogTitle>
            <DialogDescription>Send your preferred date and time to the selected teacher.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Subject</label>
              <div className="mt-1 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-semibold text-indigo-700">
                English
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Level / Module</label>
              <select
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={requestForm.description}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, description: e.target.value }))}
              >
                {ENGLISH_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={requestForm.date}
                  min={manilaTodayIso()}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="time"
                  value={requestForm.startTime}
                  onChange={(e) => {
                    const start = e.target.value;
                    setRequestForm((prev) => {
                      const max = endMaxFromStart(start);
                      const endClamped = timeToMinutes(prev.endTime) > timeToMinutes(max) ? max : prev.endTime;
                      return { ...prev, startTime: start, endTime: endClamped };
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="time"
                  value={requestForm.endTime}
                  max={endMaxFromStart(requestForm.startTime)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = endMaxFromStart(requestForm.startTime);
                    const clamped = timeToMinutes(val) > timeToMinutes(max) ? max : val;
                    setRequestForm((prev) => ({ ...prev, endTime: clamped }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Request Note (optional)</label>
              <Textarea
                value={requestForm.requestNote}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, requestNote: e.target.value }))}
                placeholder="Optional note for teacher"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={submitStudentRequest} disabled={saving}>{saving ? 'Sending...' : 'Send Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
            <DialogDescription>Create a teacher schedule directly from calendar context.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Subject or lesson"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Lesson description"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="time"
                  value={createForm.startTime}
                  onChange={(e) => {
                    const start = e.target.value;
                    setCreateForm((prev) => {
                      const max = endMaxFromStart(start);
                      const endClamped = timeToMinutes(prev.endTime) > timeToMinutes(max) ? max : prev.endTime;
                      return { ...prev, startTime: start, endTime: endClamped };
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="time"
                  value={createForm.endTime}
                  max={endMaxFromStart(createForm.startTime)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = endMaxFromStart(createForm.startTime);
                    const clamped = timeToMinutes(val) > timeToMinutes(max) ? max : val;
                    setCreateForm((prev) => ({ ...prev, endTime: clamped }));
                  }}
                />
              </div>
            </div>

            {role === 'admin' ? (
              <div>
                <label className="text-sm font-medium">Optional Student</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.fullName}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitManagedCreate} disabled={saving}>{saving ? 'Saving...' : 'Create Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teacherRequestsOpen} onOpenChange={setTeacherRequestsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pending Requests</DialogTitle>
            <DialogDescription>Review incoming student requests and respond.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {pendingTeacherRequests.length === 0 ? (
              <p className="text-sm text-gray-500 border rounded-lg p-4 bg-gray-50">No pending requests right now.</p>
            ) : null}

            {pendingTeacherRequests.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.date} | {item.startTime} - {item.endTime}</p>
                    <p className="text-xs text-gray-500">Student: {item.studentName || 'Unknown'}</p>
                    {item.requestNote ? <p className="text-xs text-gray-500">Note: {item.requestNote}</p> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setTeacherRequestsOpen(false); acceptRequest(item); }}>Accept + Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => { setTeacherRequestsOpen(false); declineRequest(item); }}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Accept + Edit modal */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Accept &amp; Edit Schedule</DialogTitle>
            <DialogDescription>
              Review and adjust the details before accepting{acceptItem?.studentName ? ` for ${acceptItem.studentName}` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={acceptForm.title} onChange={(e) => setAcceptForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={acceptForm.description} onChange={(e) => setAcceptForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={acceptForm.date} onChange={(e) => setAcceptForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="time"
                  value={acceptForm.startTime}
                  onChange={(e) => {
                    const start = e.target.value;
                    setAcceptForm((p) => {
                      const max = endMaxFromStart(start);
                      const endClamped = timeToMinutes(p.endTime) > timeToMinutes(max) ? max : p.endTime;
                      return { ...p, startTime: start, endTime: endClamped };
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="time"
                  value={acceptForm.endTime}
                  max={endMaxFromStart(acceptForm.startTime)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = endMaxFromStart(acceptForm.startTime);
                    const clamped = timeToMinutes(val) > timeToMinutes(max) ? max : val;
                    setAcceptForm((p) => ({ ...p, endTime: clamped }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Note to student (optional)</label>
              <Textarea value={acceptForm.responseNote} onChange={(e) => setAcceptForm((p) => ({ ...p, responseNote: e.target.value }))} placeholder="Any message for the student…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitAccept} disabled={saving}>{saving ? 'Saving…' : 'Accept Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline modal */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Provide a reason for declining{declineItem?.studentName ? ` ${declineItem.studentName}'s` : ' this'} request.
            </DialogDescription>
          </DialogHeader>
          {declineItem && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border">
              <p className="font-medium text-gray-800">{declineItem.title}</p>
              <p className="text-xs mt-0.5">{declineItem.date} | {declineItem.startTime} – {declineItem.endTime}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Decline note <span className="text-red-500">*</span></label>
            <Textarea value={declineNote} onChange={(e) => setDeclineNote(e.target.value)} placeholder="Reason for declining…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDecline} disabled={saving}>{saving ? 'Declining…' : 'Decline'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move modal */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move Schedule</DialogTitle>
            <DialogDescription>Choose a new date and time for this session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={moveForm.date} onChange={(e) => setMoveForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="time"
                  value={moveForm.startTime}
                  onChange={(e) => {
                    const start = e.target.value;
                    setMoveForm((p) => {
                      const max = endMaxFromStart(start);
                      const endClamped = timeToMinutes(p.endTime) > timeToMinutes(max) ? max : p.endTime;
                      return { ...p, startTime: start, endTime: endClamped };
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="time"
                  value={moveForm.endTime}
                  max={endMaxFromStart(moveForm.startTime)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = endMaxFromStart(moveForm.startTime);
                    const clamped = timeToMinutes(val) > timeToMinutes(max) ? max : val;
                    setMoveForm((p) => ({ ...p, endTime: clamped }));
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button>
            <Button onClick={submitMove} disabled={saving}>{saving ? 'Saving…' : 'Move Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel modal */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Schedule</DialogTitle>
            <DialogDescription>Provide a cancellation reason for the student.</DialogDescription>
          </DialogHeader>
          {cancelItem && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border">
              <p className="font-medium text-gray-800">{cancelItem.title}</p>
              <p className="text-xs mt-0.5">{cancelItem.date} | {cancelItem.startTime} – {cancelItem.endTime}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Cancellation note <span className="text-red-500">*</span></label>
            <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="Reason for cancellation…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitCancel} disabled={saving}>{saving ? 'Cancelling…' : 'Cancel Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin edit modal */}
      <Dialog open={adminEditOpen} onOpenChange={setAdminEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Admin Edit Schedule</DialogTitle>
            <DialogDescription>Edit any field including status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" value={adminEditForm.status} onChange={(e) => setAdminEditForm((p) => ({ ...p, status: e.target.value as any }))}>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={adminEditForm.title} onChange={(e) => setAdminEditForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={adminEditForm.description} onChange={(e) => setAdminEditForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={adminEditForm.date} onChange={(e) => setAdminEditForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="time"
                  value={adminEditForm.startTime}
                  onChange={(e) => {
                    const start = e.target.value;
                    setAdminEditForm((p) => {
                      const max = endMaxFromStart(start);
                      const endClamped = timeToMinutes(p.endTime) > timeToMinutes(max) ? max : p.endTime;
                      return { ...p, startTime: start, endTime: endClamped };
                    });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="time"
                  value={adminEditForm.endTime}
                  max={endMaxFromStart(adminEditForm.startTime)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = endMaxFromStart(adminEditForm.startTime);
                    const clamped = timeToMinutes(val) > timeToMinutes(max) ? max : val;
                    setAdminEditForm((p) => ({ ...p, endTime: clamped }));
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Response note (optional)</label>
              <Textarea value={adminEditForm.responseNote} onChange={(e) => setAdminEditForm((p) => ({ ...p, responseNote: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminEditOpen(false)}>Cancel</Button>
            <Button onClick={submitAdminEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Availability Panel */}
      {role === 'teacher' && (
        <div className="mx-auto max-w-7xl px-4 pb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              onClick={() => setAvailabilityOpen((v) => !v)}
            >
              <span className="font-semibold text-gray-800">My Weekly Availability</span>
              <span className="text-sm text-gray-400">{availabilityOpen ? 'Hide' : 'Show'}</span>
            </button>
            {availabilityOpen && (
              <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Day</label>
                    <select
                      value={availForm.dayOfWeek}
                      onChange={(e) => setAvailForm((p) => ({ ...p, dayOfWeek: Number(e.target.value) }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {WEEKDAY_LABELS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                    <Input type="time" value={availForm.startTime} onChange={(e) => setAvailForm((p) => ({ ...p, startTime: e.target.value }))} className="w-32" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                    <Input type="time" value={availForm.endTime} onChange={(e) => setAvailForm((p) => ({ ...p, endTime: e.target.value }))} className="w-32" />
                  </div>
                  <Button
                    disabled={savingAvail}
                    onClick={async () => {
                      try {
                        setSavingAvail(true);
                        const block = await apiClient.createTeacherAvailability(availForm);
                        setAvailabilityBlocks((prev) => [...prev, block]);
                        toast.success('Availability block added.');
                      } catch {
                        toast.error('Failed to add availability block.');
                      } finally {
                        setSavingAvail(false);
                      }
                    }}
                  >
                    {savingAvail ? 'Adding…' : 'Add Block'}
                  </Button>
                </div>
                {availabilityBlocks.length === 0 ? (
                  <p className="text-sm text-gray-500">No availability blocks added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {availabilityBlocks.map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                        <span className="font-medium">{WEEKDAY_LABELS[b.dayOfWeek]}</span>
                        <span className="text-gray-600">{b.startTime} – {b.endTime}</span>
                        <button
                          className="text-xs text-red-500 hover:text-red-700 transition"
                          onClick={async () => {
                            try {
                              await apiClient.deleteTeacherAvailability(b.id);
                              setAvailabilityBlocks((prev) => prev.filter((x) => x.id !== b.id));
                            } catch {
                              toast.error('Failed to delete block.');
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

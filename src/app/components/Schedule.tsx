import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AuthUser, ScheduleItem, UserRole } from '@/app/types/models';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

export function Schedule({ schedules, users, role, userId, onCreate, onRespond, onMove, onCancel, onAdminEdit }: ScheduleProps) {
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

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    date: todayIso(),
    startTime: '09:00',
    endTime: '10:00',
    requestNote: '',
  });

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
    setRequestForm((prev) => ({ ...prev, date: selectedDateIso }));
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

    if (!requestForm.title.trim() || !requestForm.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

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
        title: '',
        description: '',
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

  const acceptRequest = async (item: ScheduleItem) => {
    const nextTitle = window.prompt('Edit title before accepting', item.title);
    if (nextTitle === null) return;
    const nextDescription = window.prompt('Edit description before accepting', item.description);
    if (nextDescription === null) return;
    const nextDate = window.prompt('Edit date (YYYY-MM-DD)', item.date);
    if (!nextDate) return;
    const nextStart = window.prompt('Edit start time (HH:MM)', item.startTime);
    if (!nextStart) return;
    const nextEnd = window.prompt('Edit end time (HH:MM)', item.endTime);
    if (!nextEnd) return;
    const note = window.prompt('Optional acceptance note for student', item.responseNote || '') || undefined;

    try {
      await onRespond(item.id, {
        decision: 'accepted',
        title: nextTitle.trim(),
        description: nextDescription.trim(),
        date: nextDate.trim(),
        startTime: nextStart.trim(),
        endTime: nextEnd.trim(),
        responseNote: note,
      });
      toast.success('Schedule request accepted.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept schedule request.');
    }
  };

  const declineRequest = async (item: ScheduleItem) => {
    const note = window.prompt('Decline note (required)', item.responseNote || '');
    if (!note || !note.trim()) {
      toast.error('Decline note is required.');
      return;
    }

    try {
      await onRespond(item.id, { decision: 'declined', responseNote: note.trim() });
      toast.success('Schedule request declined.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline schedule request.');
    }
  };

  const moveSchedule = async (item: ScheduleItem) => {
    const nextDate = window.prompt('New date (YYYY-MM-DD)', item.date);
    if (!nextDate) return;
    const nextStart = window.prompt('New start time (HH:MM)', item.startTime);
    if (!nextStart) return;
    const nextEnd = window.prompt('New end time (HH:MM)', item.endTime);
    if (!nextEnd) return;

    try {
      await onMove(item.id, {
        date: nextDate.trim(),
        startTime: nextStart.trim(),
        endTime: nextEnd.trim(),
        title: item.title,
        description: item.description,
      });
      toast.success('Schedule moved successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to move schedule.');
    }
  };

  const cancelSchedule = async (item: ScheduleItem) => {
    const note = window.prompt('Cancellation note (required)', item.responseNote || '');
    if (!note || !note.trim()) {
      toast.error('Cancellation note is required.');
      return;
    }

    try {
      await onCancel(item.id, note.trim());
      toast.success('Schedule cancelled.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel schedule.');
    }
  };

  const editByAdmin = async (item: ScheduleItem) => {
    const nextStatus = window.prompt('Status (pending/accepted/declined/cancelled)', item.status) as
      | 'pending'
      | 'accepted'
      | 'declined'
      | 'cancelled'
      | null;
    if (!nextStatus) return;

    const nextTitle = window.prompt('Title', item.title);
    if (nextTitle === null) return;
    const nextDescription = window.prompt('Description', item.description);
    if (nextDescription === null) return;
    const nextDate = window.prompt('Date (YYYY-MM-DD)', item.date);
    if (!nextDate) return;
    const nextStart = window.prompt('Start Time (HH:MM)', item.startTime);
    if (!nextStart) return;
    const nextEnd = window.prompt('End Time (HH:MM)', item.endTime);
    if (!nextEnd) return;

    try {
      await onAdminEdit(item.id, {
        title: nextTitle.trim(),
        description: nextDescription.trim(),
        date: nextDate.trim(),
        startTime: nextStart.trim(),
        endTime: nextEnd.trim(),
        status: nextStatus,
      });
      toast.success('Schedule updated by admin.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update schedule.');
    }
  };

  const showTeacherPicker = role === 'admin' || role === 'student';

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
          {role === 'teacher' ? (
            <Button onClick={openCreateModal}>Create Schedule</Button>
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
            <h3 className="font-semibold text-gray-800">Schedules on {selectedDateIso}</h3>
            {selectedDaySchedules.length === 0 ? (
              <p className="text-sm text-gray-500 border rounded-lg p-4 bg-gray-50">No schedules on this date.</p>
            ) : null}

            {selectedDaySchedules.map((item) => {
              const isTeacherOwner = role === 'teacher' && item.teacherId === userId;
              const canRespond = isTeacherOwner && item.status === 'pending';
              const canMoveOrCancel = (isTeacherOwner || role === 'admin') && item.status !== 'cancelled';

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
                    <p>{item.startTime} - {item.endTime}</p>
                    <p>Teacher: {item.teacherName}</p>
                    <p>Student: {item.studentName || 'Unassigned'}</p>
                    {item.requestNote ? <p>Request Note: {item.requestNote}</p> : null}
                    {item.responseNote ? <p>Teacher/Admin Note: {item.responseNote}</p> : null}
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

                    {role === 'admin' ? (
                      <button onClick={() => editByAdmin(item)} className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded-md">
                        Admin Edit
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
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
              <label className="text-sm font-medium">Title</label>
              <Input
                value={requestForm.title}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Subject or lesson"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={requestForm.description}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What do you need help with?"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={requestForm.date}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input
                  type="time"
                  value={requestForm.startTime}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="time"
                  value={requestForm.endTime}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, endTime: e.target.value }))}
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
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input
                  type="time"
                  value={createForm.endTime}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, endTime: e.target.value }))}
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
                  <Button size="sm" onClick={() => acceptRequest(item)}>Accept + Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => declineRequest(item)}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { AuthUser, EnrollmentRecordItem, EnrollmentStatus, UserRole } from '@/app/types/models';
import { UsersView } from './Users';
import { PrintButton, TableFilter, TablePagination, TableSearch, printTableReport, DEFAULT_TABLE_PAGE_SIZE } from './ui/table-tools';
interface EnrollmentRecordsProps {
  role: UserRole;
  onAddUser?: (input: any) => Promise<void>;
  onEditUser?: (id: string, input: any) => Promise<void>;
  onDeleteUser?: (id: string) => Promise<void>;
  onUploadProfileImage?: (file: File) => Promise<{ secureUrl: string; publicId: string }>;
  onChangeUserStatus?: (id: string, input: { status: any; reason?: string; dropDate?: string; actionTaken?: string; pullOutReason?: string; notes?: string }) => Promise<void>;
}
function DropDetailsModal({ title, form, setForm, onCancel, onSave }: { title: string; form: { reason: string; dropDate: string; actionTaken: string; pullOutReason: string; notes: string }; setForm: React.Dispatch<React.SetStateAction<typeof form>>; onCancel: () => void; onSave: () => void }) {
  const field = (key: keyof typeof form, label: string, required = false) => <label className="block text-sm text-gray-700"><span className="font-medium">{label}{required && <span className="text-red-500"> *</span>}</span>{key === 'dropDate' ? <input type="date" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2" /> : <textarea value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2 resize-none" rows={key === 'reason' ? 2 : 3} />}</label>;
  return <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-5"><div className="flex justify-between items-start gap-4 mb-4"><div><h2 className="text-lg font-bold text-gray-800">{title}</h2><p className="text-sm text-gray-500 mt-1">Record the reason and action taken for this status change.</p></div><button onClick={onCancel} className="text-gray-400 hover:text-gray-700"><X /></button></div><div className="space-y-3">{field('reason', 'Reason for dropping', true)}{field('dropDate', 'Date of drop', true)}{field('actionTaken', 'Action taken')}{field('pullOutReason', 'Pull-out reason')}{field('notes', 'Other relevant notes')}</div><div className="flex justify-end gap-2 mt-5"><button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={onSave} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white">Save Dropped Status</button></div></div></div>;
}
const isMinor = (birthdate: string) => {
  if (!birthdate) return false;
  const today = new Date();
  const date = new Date(`${birthdate}T00:00:00`);
  let age = today.getFullYear() - date.getFullYear();
  if (today < new Date(today.getFullYear(), date.getMonth(), date.getDate())) age -= 1;
  return age < 18;
};
function ParentGuidancePolicyModal({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-gray-900">Parent/Guardian Guidance Policy</h2><p className="mt-1 text-sm text-gray-500">For students under 18 years old</p></div><button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close policy"><X /></button></div><p className="mt-5 text-sm leading-6 text-gray-700">Students under 18 should be guided and supervised by a parent or legal guardian while navigating and using the YUNAfied system. Parents or guardians should help students understand system activities, communications, schedules, and learning content, and should be available when support or consent is needed.</p><div className="mt-5 flex justify-end"><button onClick={onClose} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">I understand</button></div></div></div>;
}
function AvailabilityEditor({ blocks, setBlocks }: { blocks: { dayOfWeek: number; startTime: string; endTime: string }[]; setBlocks: React.Dispatch<React.SetStateAction<{ dayOfWeek: number; startTime: string; endTime: string }[]>> }) {
  const add = () => setBlocks((items) => [...items, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }]);
  return <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 md:col-span-2 lg:col-span-3"><div className="flex items-center justify-between"><div><p className="font-semibold text-gray-700">Weekly Availability</p><p className="text-xs text-gray-500">Choose any days and time ranges.</p></div><button type="button" onClick={add} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white">Add day/time</button></div><div className="mt-2 space-y-2">{blocks.map((block, index) => <div key={`${block.dayOfWeek}-${index}`} className="flex flex-wrap gap-2"><select value={block.dayOfWeek} onChange={(e) => setBlocks((items) => items.map((item, i) => i === index ? { ...item, dayOfWeek: Number(e.target.value) } : item))} className="rounded-lg border px-2 py-2 text-sm">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, value) => <option key={day} value={value}>{day}</option>)}</select><input type="time" value={block.startTime} onChange={(e) => setBlocks((items) => items.map((item, i) => i === index ? { ...item, startTime: e.target.value } : item))} className="rounded-lg border px-2 py-2 text-sm" /><span className="self-center text-gray-400">to</span><input type="time" value={block.endTime} onChange={(e) => setBlocks((items) => items.map((item, i) => i === index ? { ...item, endTime: e.target.value } : item))} className="rounded-lg border px-2 py-2 text-sm" /><button type="button" onClick={() => setBlocks((items) => items.filter((_, i) => i !== index))} className="px-2 text-sm text-red-500">Remove</button></div>)}</div></div>;
}
function ClassScheduleEditor({ slots, setSlots }: { slots: { dayOfWeek: number; startTime: string; endTime: string }[]; setSlots: React.Dispatch<React.SetStateAction<{ dayOfWeek: number; startTime: string; endTime: string }[]>> }) {
  const add = () => setSlots((items) => [...items, { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }]);
  return <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 md:col-span-2"><div className="flex items-center justify-between"><div><p className="font-semibold text-gray-700">Class Schedule</p><p className="text-xs text-gray-500">Add one or more recurring class time slots.</p></div><button type="button" onClick={add} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Add schedule slot</button></div><div className="mt-3 space-y-2">{slots.map((slot, index) => <div key={`${slot.dayOfWeek}-${index}`} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"><select value={slot.dayOfWeek} onChange={(e) => setSlots((items) => items.map((item, i) => i === index ? { ...item, dayOfWeek: Number(e.target.value) } : item))} className="rounded-lg border px-2 py-2 text-sm">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, value) => <option key={day} value={value}>{day}</option>)}</select><input type="time" value={slot.startTime} onChange={(e) => setSlots((items) => items.map((item, i) => i === index ? { ...item, startTime: e.target.value } : item))} className="rounded-lg border px-2 py-2 text-sm" /><span className="text-gray-400">to</span><div className="flex gap-2"><input type="time" value={slot.endTime} onChange={(e) => setSlots((items) => items.map((item, i) => i === index ? { ...item, endTime: e.target.value } : item))} className="w-full rounded-lg border px-2 py-2 text-sm" /><button type="button" onClick={() => setSlots((items) => items.filter((_, i) => i !== index))} className="px-1 text-sm text-red-500">Remove</button></div></div>)}</div></div>;
}
function EditAssignmentModal({ target, form, setForm, teachers, students, saving, onCancel, onSave }: { target: EnrollmentRecordItem; form: { studentId: string; teacherId: string; subject: string; tutorialGroup: string; gradeLevel: string; note: string; status: EnrollmentStatus; classSchedule: { dayOfWeek: number; startTime: string; endTime: string }[] }; setForm: React.Dispatch<React.SetStateAction<typeof form>>; teachers: AuthUser[]; students: AuthUser[]; saving: boolean; onCancel: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-gray-800">Edit Class/Tutorial Assignment</h2><p className="text-sm text-gray-500">Update the assignment record for {target.studentName}.</p></div><button onClick={onCancel}><X /></button></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"><select value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))} className="rounded-lg border px-3 py-2">{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select><select value={form.teacherId} onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))} className="rounded-lg border px-3 py-2">{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}</select><input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="rounded-lg border px-3 py-2" /><input value={form.tutorialGroup} onChange={(e) => setForm((p) => ({ ...p, tutorialGroup: e.target.value }))} placeholder="Tutorial group" className="rounded-lg border px-3 py-2" /><input value={form.gradeLevel} onChange={(e) => setForm((p) => ({ ...p, gradeLevel: e.target.value }))} placeholder="Grade level" className="rounded-lg border px-3 py-2" /><select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EnrollmentStatus }))} className="rounded-lg border px-3 py-2"><option value="active">Active</option><option value="completed">Completed</option><option value="dropped">Dropped</option><option value="archived">Archived</option></select><textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Note" className="rounded-lg border px-3 py-2 md:col-span-2" /><ClassScheduleEditor slots={form.classSchedule} setSlots={(value) => setForm((p) => ({ ...p, classSchedule: typeof value === 'function' ? value(p.classSchedule) : value }))} /></div><div className="mt-5 flex justify-end gap-2"><button onClick={onCancel} className="rounded-lg px-4 py-2 text-gray-600">Cancel</button><button disabled={saving} onClick={onSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">Save Changes</button></div></div></div>;
}
export function EnrollmentRecords({ role, onAddUser, onEditUser, onDeleteUser, onUploadProfileImage, onChangeUserStatus }: EnrollmentRecordsProps) {
  const isAdmin = role === 'admin';
  const [rows, setRows] = useState<EnrollmentRecordItem[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [addAssignment, setAddAssignment] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'assignments'>('users');
  const [policyOpen, setPolicyOpen] = useState(false);
  const [minorPolicyAgreed, setMinorPolicyAgreed] = useState(false);
  const [accountForm, setAccountForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', role: 'student' as 'student' | 'teacher', studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '', mobileNumber: '', birthdate: '', professionalTitle: '', employmentStatus: '', education: '', certifications: '', yearsExperience: '', specializations: '', availability: [] as { dayOfWeek: number; startTime: string; endTime: string }[], classSchedule: [] as { dayOfWeek: number; startTime: string; endTime: string }[] });
  const [form, setForm] = useState({
    studentId: '',
    teacherId: '',
    subject: '',
    tutorialGroup: '',
    gradeLevel: '',
    note: '',
    status: 'active' as EnrollmentStatus,
  });
  const [classSchedule, setClassSchedule] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusTarget, setStatusTarget] = useState<EnrollmentRecordItem | null>(null);
  const [dropForm, setDropForm] = useState({ reason: '', dropDate: new Date().toISOString().slice(0, 10), actionTaken: '', pullOutReason: '', notes: '' });
  const [editingAssignment, setEditingAssignment] = useState<EnrollmentRecordItem | null>(null);
  const [editForm, setEditForm] = useState({ studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '', status: 'active' as EnrollmentStatus, classSchedule: [] as { dayOfWeek: number; startTime: string; endTime: string }[] });
  const minorStudent = accountForm.role === 'student' && isMinor(accountForm.birthdate);

  const students = useMemo(() => users.filter((u) => u.role === 'student' && u.status === 'active'), [users]);
  const teachers = useMemo(() => users.filter((u) => u.role === 'teacher' && u.status === 'active'), [users]);

  const load = async () => {
    try {
      setLoading(true);
      const enrollments = await apiClient.listEnrollments();
      setRows(enrollments);
      if (isAdmin) {
        const allUsers = await apiClient.listUsers();
        setUsers(allUsers);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load enrollment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const createEnrollment = async () => {
    if (!form.studentId || !form.teacherId || !form.subject.trim()) {
      toast.error('Student, teacher, and subject are required.');
      return;
    }

    try {
      setSaving(true);
      const created = await apiClient.createEnrollment({ studentId: form.studentId, teacherId: form.teacherId, subject: form.subject.trim(), tutorialGroup: form.tutorialGroup.trim() || undefined, gradeLevel: form.gradeLevel.trim() || undefined, note: form.note.trim() || undefined, status: form.status, classSchedule });
      setRows((prev) => [created, ...prev]);
      setForm({ studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '', status: 'active' }); setClassSchedule([]);
      setIsAssignmentModalOpen(false);
      toast.success('Enrollment record created.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create enrollment record.');
    } finally {
      setSaving(false);
    }
  };

  const enrollAccount = async () => {
    if (!accountForm.firstName.trim() || !accountForm.lastName.trim() || !accountForm.email.trim()) { toast.error('First name, last name, and email are required.'); return; }
    if (minorStudent && !minorPolicyAgreed) { toast.error('Please acknowledge the parent/guardian guidance policy for students under 18.'); return; }
    const hasAssignment = addAssignment;
    const missingCounterpart = accountForm.role === 'student' ? !accountForm.teacherId : !accountForm.studentId;
    if (hasAssignment && (missingCounterpart || !accountForm.subject.trim())) { toast.error('Complete the class/tutorial assignment fields or leave them blank.'); return; }
    try {
      setSaving(true);
      await apiClient.enrollAccount({ ...accountForm, middleName: accountForm.middleName || undefined, studentId: addAssignment ? accountForm.studentId || undefined : undefined, teacherId: addAssignment ? accountForm.teacherId || undefined : undefined, subject: addAssignment ? accountForm.subject || undefined : undefined, tutorialGroup: addAssignment ? accountForm.tutorialGroup || undefined : undefined, gradeLevel: addAssignment ? accountForm.gradeLevel || undefined : undefined, note: addAssignment ? accountForm.note || undefined : undefined, yearsExperience: accountForm.yearsExperience ? Number(accountForm.yearsExperience) : undefined, specializations: accountForm.specializations.split(',').map((item) => item.trim()).filter(Boolean), availability: accountForm.role === 'teacher' ? accountForm.availability : undefined, classSchedule: addAssignment ? accountForm.classSchedule : undefined });
      toast.success('Account enrolled. Verification link sent.');
      setAccountForm({ firstName: '', middleName: '', lastName: '', email: '', role: 'student', studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '', mobileNumber: '', birthdate: '', professionalTitle: '', employmentStatus: '', education: '', certifications: '', yearsExperience: '', specializations: '', availability: [], classSchedule: [] });
      setMinorPolicyAgreed(false);
      setAddAssignment(false);
      setIsAccountModalOpen(false);
      await load();
    } catch (error: any) { toast.error(error.message || 'Failed to enroll account.'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: EnrollmentStatus, details?: typeof dropForm) => {
    try {
      const updated = await apiClient.updateEnrollment(id, { status, ...(status === 'dropped' && details ? { dropReason: details.reason, dropDate: details.dropDate, actionTaken: details.actionTaken, pullOutReason: details.pullOutReason, statusNotes: details.notes } : {}) });
      setRows((prev) => prev.map((row) => (row.id === id ? updated : row)));
      setStatusTarget(null);
      toast.success('Enrollment status updated.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update enrollment status.');
    }
  };

  const requestStatus = (row: EnrollmentRecordItem, status: EnrollmentStatus) => {
    if (status === 'dropped') { setDropForm({ reason: '', dropDate: new Date().toISOString().slice(0, 10), actionTaken: '', pullOutReason: '', notes: '' }); setStatusTarget(row); return; }
    void updateStatus(row.id, status);
  };

  const statusClass = (value: EnrollmentStatus) => value === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' : value === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : value === 'dropped' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200';

  const remove = async (id: string) => {
    try {
      await apiClient.deleteEnrollment(id);
      setRows((prev) => prev.map((row) => row.id === id ? { ...row, status: 'archived' } : row));
      toast.success('Class/tutorial assignment archived.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove enrollment record.');
    }
  };
  const openAssignmentEdit = (row: EnrollmentRecordItem) => { setEditingAssignment(row); setEditForm({ studentId: row.studentId, teacherId: row.teacherId, subject: row.subject, tutorialGroup: row.tutorialGroup || '', gradeLevel: row.gradeLevel || '', note: row.note || '', status: row.status, classSchedule: row.classSchedule || [] }); };
  const saveAssignmentEdit = async () => { if (!editingAssignment || !editForm.subject.trim()) { toast.error('Subject is required.'); return; } try { setSaving(true); const updated = await apiClient.updateEnrollment(editingAssignment.id, editForm); setRows((prev) => prev.map((row) => row.id === updated.id ? updated : row)); setEditingAssignment(null); toast.success('Class/tutorial assignment updated.'); } catch (error: any) { toast.error(error.message || 'Failed to update assignment.'); } finally { setSaving(false); } };

  // Stat counts
  const total = rows.length;
  const activeCount = rows.filter((r) => r.status === 'active').length;
  const completedCount = rows.filter((r) => r.status === 'completed').length;
  const droppedCount = rows.filter((r) => r.status === 'dropped').length;

  // Filtered rows
  const filteredRows = useMemo(() => rows.filter((r) => {
    const search = searchTerm.trim().toLowerCase();
    if (search && ![r.studentName, r.teacherName, r.subject, r.tutorialGroup || '', r.gradeLevel || ''].some((value) => value.toLowerCase().includes(search))) return false;
    if (filterSubject && !r.subject.toLowerCase().includes(filterSubject.toLowerCase())) return false;
    if (filterTeacher && r.teacherName && !r.teacherName.toLowerCase().includes(filterTeacher.toLowerCase())) return false;
    if (filterGroup && r.tutorialGroup !== filterGroup) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterGradeLevel && (r as any).gradeLevel && !(r as any).gradeLevel.toLowerCase().includes(filterGradeLevel.toLowerCase())) return false;
    const createdDate = r.createdAt?.slice(0, 10) || '';
    if (dateFrom && createdDate < dateFrom) return false;
    if (dateTo && createdDate > dateTo) return false;
    return true;
  }), [rows, searchTerm, filterSubject, filterTeacher, filterGroup, filterStatus, filterGradeLevel, dateFrom, dateTo]);

  const teacherOptions = Array.from(new Set(rows.map((row) => row.teacherName).filter(Boolean))).sort();
  const subjectOptions = Array.from(new Set(rows.map((row) => row.subject).filter(Boolean))).sort();
  const groupOptions = Array.from(new Set(rows.map((row) => row.tutorialGroup || '').filter(Boolean))).sort();
  const gradeLevelOptions = Array.from(new Set(rows.map((row) => row.gradeLevel || '').filter(Boolean))).sort();
  useEffect(() => { setPage(1); }, [searchTerm, filterSubject, filterTeacher, filterGroup, filterStatus, filterGradeLevel, dateFrom, dateTo]);
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const scheduleLabel = (r: EnrollmentRecordItem) => (r.classSchedule || []).map((slot) => `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.dayOfWeek]} ${slot.startTime.slice(0, 5)}-${slot.endTime.slice(0, 5)}`).join(', ') || '—';
  const printEnrollments = () => printTableReport({ title: 'Enrollment Records', subtitle: `Filters: ${filterStatus || 'All statuses'} · ${filterTeacher || 'All teachers'} · ${filterSubject || 'All subjects'} · ${dateFrom || 'Any date'} to ${dateTo || 'Any date'} · ${searchTerm || 'No search'}`, columns: ['Student', 'Teacher', 'Subject', 'Group', 'Grade Level', 'Class Schedule', 'Status', 'Created'], rows: filteredRows.map((r) => [r.studentName, r.teacherName, r.subject, r.tutorialGroup || '—', r.gradeLevel || '—', scheduleLabel(r), r.status, new Date(r.createdAt).toLocaleString()]) });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-600" />
            Enrollment Records
          </h1>
          <p className="text-gray-500 mt-1">Track student-teacher tutorial assignments and status.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <button onClick={() => setIsAccountModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"><Plus className="h-4 w-4" />Enroll New User</button>}
        </div>
      </div>

      {isAdmin && <div className="flex gap-2 border-b border-gray-200 mb-5">
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-medium border-b-2 ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>User Management</button>
        <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 font-medium border-b-2 ${activeTab === 'assignments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>Class/Tutorial Assignment</button>
      </div>}

      {/* Stat cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 ${isAdmin && activeTab === 'users' ? 'hidden' : ''}`}>
        {[
          { label: 'Total', value: total, color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Active', value: activeCount, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Completed', value: completedCount, color: 'bg-blue-50 text-blue-700' },
          { label: 'Dropped', value: droppedCount, color: 'bg-rose-50 text-rose-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className={`flex flex-wrap gap-2 mb-4 items-center ${isAdmin && activeTab === 'users' ? 'hidden' : ''}`}>
        <TableSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search students, teachers, subjects..." />
        <TableFilter label="Teachers" value={filterTeacher} options={teacherOptions} onChange={setFilterTeacher} />
        <TableFilter label="Subjects" value={filterSubject} options={subjectOptions} onChange={setFilterSubject} />
        <TableFilter label="Grade levels" value={filterGradeLevel} options={gradeLevelOptions} onChange={setFilterGradeLevel} />
        <TableFilter label="Groups" value={filterGroup} options={groupOptions} onChange={setFilterGroup} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="dropped">Dropped</option>
          <option value="archived">Archived</option>
        </select>
        <input aria-label="Created from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input aria-label="Created to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <PrintButton onClick={printEnrollments} />
        
        {(searchTerm || filterSubject || filterTeacher || filterGroup || filterStatus || filterGradeLevel) && (
          <button
            onClick={() => { setSearchTerm(''); setFilterSubject(''); setFilterTeacher(''); setFilterGroup(''); setFilterStatus(''); setFilterGradeLevel(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Clear
          </button>
        )}
        {isAdmin && <button onClick={() => setIsAssignmentModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 ml-auto"><Plus className="h-4 w-4" />Assign Students to Class</button>}
      </div>

      {isAdmin && (
        <>
        {activeTab === 'users' && onEditUser && onDeleteUser && onUploadProfileImage && <UsersView users={users} onAddUser={onAddUser || (async () => undefined)} onEditUser={onEditUser} onDeleteUser={onDeleteUser} onUploadProfileImage={onUploadProfileImage} onChangeUserStatus={onChangeUserStatus} />}
        {isAccountModalOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAccountModalOpen(false); }}>
        <div className="bg-white border border-indigo-100 rounded-2xl shadow-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4"><div><h2 className="font-bold text-lg text-gray-800">Enroll New User</h2><p className="text-sm text-gray-500">Create a Student or Teacher account. A secure verification link will be emailed to them.</p></div><button onClick={() => setIsAccountModalOpen(false)} className="text-gray-400 hover:text-gray-700" aria-label="Close"><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={accountForm.firstName} onChange={(e) => setAccountForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name *" className="border rounded-lg px-3 py-2" />
            <input value={accountForm.middleName} onChange={(e) => setAccountForm((p) => ({ ...p, middleName: e.target.value }))} placeholder="Middle name (optional)" className="border rounded-lg px-3 py-2" />
            <input value={accountForm.lastName} onChange={(e) => setAccountForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name *" className="border rounded-lg px-3 py-2" />
            <input type="email" value={accountForm.email} onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))} placeholder="Personal email *" className="border rounded-lg px-3 py-2" />
            <select value={accountForm.role} onChange={(e) => setAccountForm((p) => ({ ...p, role: e.target.value as 'student' | 'teacher' }))} className="border rounded-lg px-3 py-2"><option value="student">Student</option><option value="teacher">Teacher</option></select>
          </div>
          {accountForm.role === 'student' && <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><input value={accountForm.mobileNumber} onChange={(e) => setAccountForm((p) => ({ ...p, mobileNumber: e.target.value }))} placeholder="Mobile number (optional)" className="border rounded-lg px-3 py-2" /><input type="date" value={accountForm.birthdate} onChange={(e) => setAccountForm((p) => ({ ...p, birthdate: e.target.value }))} className="border rounded-lg px-3 py-2" /></div>}
          {minorStudent && <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><input type="checkbox" checked={minorPolicyAgreed} onChange={(e) => setMinorPolicyAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" /><span>I acknowledge that this student should be guided by a parent or legal guardian while navigating the system. <button type="button" onClick={() => setPolicyOpen(true)} className="font-semibold text-indigo-700 underline">Read the policy</button>.</span></label>}
          {accountForm.role === 'teacher' && <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><input value={accountForm.mobileNumber} onChange={(e) => setAccountForm((p) => ({ ...p, mobileNumber: e.target.value }))} placeholder="Mobile number (optional)" className="border rounded-lg px-3 py-2" /><input value={accountForm.professionalTitle} onChange={(e) => setAccountForm((p) => ({ ...p, professionalTitle: e.target.value }))} placeholder="Professional title / position" className="border rounded-lg px-3 py-2" /><input value={accountForm.employmentStatus} onChange={(e) => setAccountForm((p) => ({ ...p, employmentStatus: e.target.value }))} placeholder="Employment status" className="border rounded-lg px-3 py-2" /><input type="number" min="0" value={accountForm.yearsExperience} onChange={(e) => setAccountForm((p) => ({ ...p, yearsExperience: e.target.value }))} placeholder="Years of experience" className="border rounded-lg px-3 py-2" /><input value={accountForm.specializations} onChange={(e) => setAccountForm((p) => ({ ...p, specializations: e.target.value }))} placeholder="Subjects / specializations (comma separated)" className="border rounded-lg px-3 py-2 md:col-span-2" /><textarea value={accountForm.education} onChange={(e) => setAccountForm((p) => ({ ...p, education: e.target.value }))} placeholder="Education" className="border rounded-lg px-3 py-2" /><textarea value={accountForm.certifications} onChange={(e) => setAccountForm((p) => ({ ...p, certifications: e.target.value }))} placeholder="Certifications" className="border rounded-lg px-3 py-2" /><AvailabilityEditor blocks={accountForm.availability} setBlocks={(value) => setAccountForm((p) => ({ ...p, availability: typeof value === 'function' ? value(p.availability) : value }))} /></div>}
          <label className="flex items-center gap-2 mt-5 pt-4 border-t text-sm font-medium text-gray-700"><input type="checkbox" checked={addAssignment} onChange={(e) => setAddAssignment(e.target.checked)} className="h-4 w-4 accent-indigo-600" /> Add Class/Tutorial Assignment</label>
          {addAssignment && <div className="mt-3"><h3 className="font-semibold text-gray-700 mb-2">Class/Tutorial Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {accountForm.role === 'teacher' ? <select value={accountForm.studentId} onChange={(e) => setAccountForm((p) => ({ ...p, studentId: e.target.value }))} className="border rounded-lg px-3 py-2"><option value="">Select student</option>{students.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select> : <select value={accountForm.teacherId} onChange={(e) => setAccountForm((p) => ({ ...p, teacherId: e.target.value }))} className="border rounded-lg px-3 py-2"><option value="">Select teacher</option>{teachers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select>}
              <input value={accountForm.subject} onChange={(e) => setAccountForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject (optional)" className="border rounded-lg px-3 py-2" />
              <input value={accountForm.tutorialGroup} onChange={(e) => setAccountForm((p) => ({ ...p, tutorialGroup: e.target.value }))} placeholder="Tutorial group (optional)" className="border rounded-lg px-3 py-2" />
              <input value={accountForm.gradeLevel} onChange={(e) => setAccountForm((p) => ({ ...p, gradeLevel: e.target.value }))} placeholder="Grade level (optional)" className="border rounded-lg px-3 py-2" />
              <textarea value={accountForm.note} onChange={(e) => setAccountForm((p) => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="border rounded-lg px-3 py-2 resize-none" />
            </div>
            <ClassScheduleEditor slots={accountForm.classSchedule} setSlots={(value) => setAccountForm((p) => ({ ...p, classSchedule: typeof value === 'function' ? value(p.classSchedule) : value }))} />
          </div>}
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setIsAccountModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={enrollAccount} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 disabled:opacity-60">Enroll Account &amp; Send Verification</button></div>
        </div>
        </div>}
        {isAssignmentModalOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAssignmentModalOpen(false); }}>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold text-gray-800">Assign Student to Class</h2><p className="text-sm text-gray-500">Connect one student to one teacher, subject, and class schedule.</p></div><button onClick={() => setIsAssignmentModalOpen(false)} className="text-gray-400 hover:text-gray-700" aria-label="Close"><X className="h-5 w-5" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))} className="border rounded-lg px-3 py-2">
            <option value="">Select student</option>
            {students.map((user) => (
              <option key={user.id} value={user.id}>{user.fullName}</option>
            ))}
          </select>

          <select value={form.teacherId} onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))} className="border rounded-lg px-3 py-2">
            <option value="">Select teacher</option>
            {teachers.map((user) => (
              <option key={user.id} value={user.id}>{user.fullName}</option>
            ))}
          </select>

          <ClassScheduleEditor slots={classSchedule} setSlots={setClassSchedule} />

          <input
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder="Subject"
            className="border rounded-lg px-3 py-2"
          />

          <input
            value={form.tutorialGroup}
            onChange={(e) => setForm((p) => ({ ...p, tutorialGroup: e.target.value }))}
            placeholder="Tutorial group (optional)"
            className="border rounded-lg px-3 py-2"
          />

          <input
            value={form.gradeLevel}
            onChange={(e) => setForm((p) => ({ ...p, gradeLevel: e.target.value }))}
            placeholder="Grade level (optional)"
            className="border rounded-lg px-3 py-2"
          />

          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EnrollmentStatus }))} className="border rounded-lg px-3 py-2">
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          <textarea
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Note (optional)"
            className="md:col-span-2 lg:col-span-3 border rounded-lg px-3 py-2 h-20 resize-none"
          />
          </div>
          <div className="flex justify-end gap-2 mt-4"><button onClick={() => setIsAssignmentModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={createEnrollment} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 inline-flex items-center justify-center gap-2 disabled:opacity-60"><Plus className="h-4 w-4" />Assign Student to Class</button></div>
        </div>
        </div>}
        </>
      )}

      <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ${isAdmin && activeTab === 'users' ? 'hidden' : ''}`}>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Grade Level</th>
              <th className="px-4 py-3">Class Schedule</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                <td className="px-4 py-3">{row.studentName}</td>
                <td className="px-4 py-3">{row.teacherName}</td>
                <td className="px-4 py-3">{row.subject}</td>
                <td className="px-4 py-3">{row.tutorialGroup || '-'}</td>
                <td className="px-4 py-3">{(row as any).gradeLevel || '-'}</td>
                <td className="px-4 py-3 text-sm">{scheduleLabel(row)}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select value={row.status} onChange={(e) => requestStatus(row, e.target.value as EnrollmentStatus)} className={`border rounded px-2 py-1 text-sm font-medium ${statusClass(row.status)}`}>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  ) : (
                    <span className={`capitalize text-sm font-medium border rounded-full px-2 py-1 ${statusClass(row.status)}`}>{row.status}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openAssignmentEdit(row)} className="mr-3 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm">
                      Edit
                    </button>
                    <button onClick={() => remove(row.id)} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-sm">
                      <Trash2 className="h-4 w-4" />
                      Archive
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {paginatedRows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={isAdmin ? 9 : 8}>
                  No enrollment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination page={page} pageSize={pageSize} total={filteredRows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </div>
      {statusTarget && <DropDetailsModal title={`Drop ${statusTarget.studentName} from ${statusTarget.subject}?`} form={dropForm} setForm={setDropForm} onCancel={() => setStatusTarget(null)} onSave={() => { if (!dropForm.reason.trim()) { toast.error('A reason is required.'); return; } void updateStatus(statusTarget.id, 'dropped', dropForm); }} />}
      {editingAssignment && <EditAssignmentModal target={editingAssignment} form={editForm} setForm={setEditForm} teachers={teachers} students={students} saving={saving} onCancel={() => setEditingAssignment(null)} onSave={() => void saveAssignmentEdit()} />}
      {policyOpen && <ParentGuidancePolicyModal onClose={() => setPolicyOpen(false)} />}
    </div>
  );
}



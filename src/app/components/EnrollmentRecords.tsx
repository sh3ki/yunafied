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
  const [accountForm, setAccountForm] = useState({ firstName: '', middleName: '', lastName: '', email: '', role: 'student' as 'student' | 'teacher', studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '' });
  const [form, setForm] = useState({
    studentId: '',
    teacherId: '',
    subject: '',
    tutorialGroup: '',
    gradeLevel: '',
    note: '',
    status: 'active' as EnrollmentStatus,
  });

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
      const created = await apiClient.createEnrollment({
        studentId: form.studentId,
        teacherId: form.teacherId,
        subject: form.subject.trim(),
        tutorialGroup: form.tutorialGroup.trim() || undefined,
        gradeLevel: form.gradeLevel.trim() || undefined,
        note: form.note.trim() || undefined,
        status: form.status,
      });
      setRows((prev) => [created, ...prev]);
      setForm({ studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '', status: 'active' });
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
    const hasAssignment = addAssignment;
    const missingCounterpart = accountForm.role === 'student' ? !accountForm.teacherId : !accountForm.studentId;
    if (hasAssignment && (missingCounterpart || !accountForm.subject.trim())) { toast.error('Complete the class/tutorial assignment fields or leave them blank.'); return; }
    try {
      setSaving(true);
      await apiClient.enrollAccount({ ...accountForm, middleName: accountForm.middleName || undefined, studentId: addAssignment ? accountForm.studentId || undefined : undefined, teacherId: addAssignment ? accountForm.teacherId || undefined : undefined, subject: addAssignment ? accountForm.subject || undefined : undefined, tutorialGroup: addAssignment ? accountForm.tutorialGroup || undefined : undefined, gradeLevel: addAssignment ? accountForm.gradeLevel || undefined : undefined, note: addAssignment ? accountForm.note || undefined : undefined });
      toast.success('Account enrolled. Verification link sent.');
      setAccountForm({ firstName: '', middleName: '', lastName: '', email: '', role: 'student', studentId: '', teacherId: '', subject: '', tutorialGroup: '', gradeLevel: '', note: '' });
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
  const printEnrollments = () => printTableReport({ title: 'Enrollment Records', subtitle: `Filters: ${filterStatus || 'All statuses'} · ${filterTeacher || 'All teachers'} · ${filterSubject || 'All subjects'} · ${dateFrom || 'Any date'} to ${dateTo || 'Any date'} · ${searchTerm || 'No search'}`, columns: ['Student', 'Teacher', 'Subject', 'Group', 'Grade Level', 'Status', 'Created'], rows: filteredRows.map((r) => [r.studentName, r.teacherName, r.subject, r.tutorialGroup || '—', r.gradeLevel || '—', r.status, new Date(r.createdAt).toLocaleString()]) });

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
          <label className="flex items-center gap-2 mt-5 pt-4 border-t text-sm font-medium text-gray-700"><input type="checkbox" checked={addAssignment} onChange={(e) => setAddAssignment(e.target.checked)} className="h-4 w-4 accent-indigo-600" /> Add Class/Tutorial Assignment</label>
          {addAssignment && <div className="mt-3"><h3 className="font-semibold text-gray-700 mb-2">Class/Tutorial Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {accountForm.role === 'teacher' ? <select value={accountForm.studentId} onChange={(e) => setAccountForm((p) => ({ ...p, studentId: e.target.value }))} className="border rounded-lg px-3 py-2"><option value="">Select student</option>{students.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select> : <select value={accountForm.teacherId} onChange={(e) => setAccountForm((p) => ({ ...p, teacherId: e.target.value }))} className="border rounded-lg px-3 py-2"><option value="">Select teacher</option>{teachers.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select>}
              <input value={accountForm.subject} onChange={(e) => setAccountForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Subject (optional)" className="border rounded-lg px-3 py-2" />
              <input value={accountForm.tutorialGroup} onChange={(e) => setAccountForm((p) => ({ ...p, tutorialGroup: e.target.value }))} placeholder="Tutorial group (optional)" className="border rounded-lg px-3 py-2" />
              <input value={accountForm.gradeLevel} onChange={(e) => setAccountForm((p) => ({ ...p, gradeLevel: e.target.value }))} placeholder="Grade level (optional)" className="border rounded-lg px-3 py-2" />
              <textarea value={accountForm.note} onChange={(e) => setAccountForm((p) => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="border rounded-lg px-3 py-2 resize-none" />
            </div>
          </div>}
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setIsAccountModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={enrollAccount} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 disabled:opacity-60">Enroll Account &amp; Send Verification</button></div>
        </div>
        </div>}
        {isAssignmentModalOpen && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAssignmentModalOpen(false); }}>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold text-gray-800">Assign Students to Class</h2><p className="text-sm text-gray-500">Connect a student to a teacher, subject, and tutorial group.</p></div><button onClick={() => setIsAssignmentModalOpen(false)} className="text-gray-400 hover:text-gray-700" aria-label="Close"><X className="h-5 w-5" /></button></div>
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
          <div className="flex justify-end gap-2 mt-4"><button onClick={() => setIsAssignmentModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={createEnrollment} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 inline-flex items-center justify-center gap-2 disabled:opacity-60"><Plus className="h-4 w-4" />Assign Students to Class</button></div>
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
                <td className="px-4 py-8 text-center text-gray-500" colSpan={isAdmin ? 8 : 7}>
                  No enrollment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination page={page} pageSize={pageSize} total={filteredRows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </div>
      {statusTarget && <DropDetailsModal title={`Drop ${statusTarget.studentName} from ${statusTarget.subject}?`} form={dropForm} setForm={setDropForm} onCancel={() => setStatusTarget(null)} onSave={() => { if (!dropForm.reason.trim()) { toast.error('A reason is required.'); return; } void updateStatus(statusTarget.id, 'dropped', dropForm); }} />}
    </div>
  );
}



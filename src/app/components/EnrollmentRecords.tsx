import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { AuthUser, EnrollmentRecordItem, EnrollmentStatus, UserRole } from '@/app/types/models';

interface EnrollmentRecordsProps {
  role: UserRole;
}

export function EnrollmentRecords({ role }: EnrollmentRecordsProps) {
  const isAdmin = role === 'admin';
  const [rows, setRows] = useState<EnrollmentRecordItem[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    teacherId: '',
    subject: '',
    tutorialGroup: '',
    note: '',
    status: 'active' as EnrollmentStatus,
  });

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
        note: form.note.trim() || undefined,
        status: form.status,
      });
      setRows((prev) => [created, ...prev]);
      setForm({ studentId: '', teacherId: '', subject: '', tutorialGroup: '', note: '', status: 'active' });
      toast.success('Enrollment record created.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create enrollment record.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: EnrollmentStatus) => {
    try {
      const updated = await apiClient.updateEnrollment(id, { status });
      setRows((prev) => prev.map((row) => (row.id === id ? updated : row)));
    } catch (error: any) {
      toast.error(error.message || 'Failed to update enrollment status.');
    }
  };

  const remove = async (id: string) => {
    try {
      await apiClient.deleteEnrollment(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.success('Enrollment record removed.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove enrollment record.');
    }
  };

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
        <button onClick={load} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EnrollmentStatus }))} className="border rounded-lg px-3 py-2">
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>

          <button
            onClick={createEnrollment}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-2 inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Add Enrollment
          </button>

          <textarea
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Note (optional)"
            className="md:col-span-2 lg:col-span-3 border rounded-lg px-3 py-2 h-20 resize-none"
          />
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                <td className="px-4 py-3">{row.studentName}</td>
                <td className="px-4 py-3">{row.teacherName}</td>
                <td className="px-4 py-3">{row.subject}</td>
                <td className="px-4 py-3">{row.tutorialGroup || '-'}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select value={row.status} onChange={(e) => updateStatus(row.id, e.target.value as EnrollmentStatus)} className="border rounded px-2 py-1 text-sm">
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  ) : (
                    <span className="capitalize text-sm font-medium">{row.status}</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(row.id)} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-sm">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={isAdmin ? 6 : 5}>
                  No enrollment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

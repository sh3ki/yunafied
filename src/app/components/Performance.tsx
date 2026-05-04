import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { AssignmentItem, AuthUser, ScheduleItem, SubmissionItem } from '@/app/types/models';

interface PerformanceProps {
  submissions: SubmissionItem[];
  assignments?: AssignmentItem[];
  users?: AuthUser[];
  schedules?: ScheduleItem[];
  role?: string;
  userId?: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981', B: '#6366f1', C: '#f59e0b', D: '#f97316', F: '#ef4444',
};
function gradeCategory(grade: string | null): string {
  if (!grade) return 'N/A';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'A';
  if (g.startsWith('B')) return 'B';
  if (g.startsWith('C')) return 'C';
  if (g.startsWith('D')) return 'D';
  if (g.startsWith('F') || g === 'FAIL' || g === 'FAILED') return 'F';
  const num = parseFloat(g);
  if (!isNaN(num)) {
    if (num >= 90) return 'A';
    if (num >= 80) return 'B';
    if (num >= 70) return 'C';
    if (num >= 60) return 'D';
    return 'F';
  }
  return grade;
}

export function Performance({ submissions, assignments = [], users = [], schedules = [], role, userId }: PerformanceProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');

  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);

  // For teacher: only their assignments
  const myAssignments = useMemo(() =>
    role === 'teacher' && userId
      ? assignments.filter((a) => a.teacherId === userId)
      : assignments,
    [assignments, role, userId]
  );

  const mySubmissions = useMemo(() =>
    role === 'teacher' && userId
      ? submissions.filter((s) => myAssignments.some((a) => a.id === s.assignmentId))
      : submissions,
    [submissions, myAssignments, role, userId]
  );

  const filteredSubs = useMemo(() =>
    selectedStudentId === 'all' ? mySubmissions : mySubmissions.filter((s) => s.studentId === selectedStudentId),
    [mySubmissions, selectedStudentId]
  );

  const graded = filteredSubs.filter((s) => s.grade);
  const pending = filteredSubs.filter((s) => !s.grade);

  // Grade distribution
  const gradeDist = useMemo(() => {
    const map: Record<string, number> = {};
    graded.forEach((s) => {
      const cat = gradeCategory(s.grade);
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [graded]);

  // Per-assignment submission rates
  const assignmentStats = useMemo(() =>
    myAssignments.map((a) => {
      const subs = mySubmissions.filter((s) => s.assignmentId === a.id);
      const gradedCount = subs.filter((s) => s.grade).length;
      return {
        name: a.title.length > 14 ? a.title.slice(0, 14) + '…' : a.title,
        fullName: a.title,
        submitted: subs.length,
        graded: gradedCount,
        pending: subs.length - gradedCount,
      };
    }),
    [myAssignments, mySubmissions]
  );

  // Per-student summary
  const studentSummary = useMemo(() =>
    students.map((st) => {
      const subs = mySubmissions.filter((s) => s.studentId === st.id);
      const gradedSubs = subs.filter((s) => s.grade);
      const avgNum = gradedSubs.reduce((sum, s) => {
        const n = parseFloat(s.grade || '');
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
      const avg = gradedSubs.length > 0 ? (avgNum / gradedSubs.length).toFixed(1) : '—';
      const letterGrades = gradedSubs.map((s) => gradeCategory(s.grade)).filter((g) => g !== 'N/A');
      const best = letterGrades.length > 0 ? letterGrades.sort()[0] : '—';
      return {
        id: st.id,
        name: st.fullName,
        submitted: subs.length,
        graded: gradedSubs.length,
        total: myAssignments.length,
        avg,
        best,
      };
    }),
    [students, mySubmissions, myAssignments]
  );

  // Schedule stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const mySchedules = useMemo(() =>
    role === 'teacher' && userId
      ? schedules.filter((s) => s.teacherId === userId)
      : schedules,
    [schedules, role, userId]
  );
  const completedSessions = mySchedules.filter((s) => s.status === 'accepted').length;
  const cancelledSessions = mySchedules.filter((s) => s.status === 'cancelled').length;
  const todaySessions = mySchedules.filter((s) => s.date === todayStr).length;

  const PIE_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Performance Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Student progress, grades, and session data</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: mySubmissions.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Graded', value: graded.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Needs Grading', value: pending.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: "Today's Sessions", value: todaySessions, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white shadow-sm`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{s.label}</p>
            <p className={`text-3xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Grade Distribution</h3>
          {gradeDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeDist}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {gradeDist.map((entry) => (
                    <Cell key={entry.name} fill={GRADE_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No graded submissions yet</div>
          )}
        </div>

        {/* Submission Status Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Submission Status</h3>
          {mySubmissions.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={[{ name: 'Graded', value: graded.length }, { name: 'Pending', value: pending.length }]}
                    dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No submissions yet</div>
          )}
        </div>
      </div>

      {/* Per-Assignment Submission Chart */}
      {assignmentStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Submissions per Assignment</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={assignmentStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: number, name: string) => [val, name]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="submitted" fill="#6366f1" name="Submitted" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="graded" fill="#10b981" name="Graded" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} barSize={20} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sessions Overview */}
      {mySchedules.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Session Overview</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { name: 'Accepted', value: completedSessions },
              { name: 'Cancelled', value: cancelledSessions },
              { name: 'Pending', value: mySchedules.filter((s) => s.status === 'pending').length },
              { name: 'Declined', value: mySchedules.filter((s) => s.status === 'declined').length },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32}>
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#f97316" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Student Leaderboard Table */}
      {studentSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Student Progress</h3>
            <select
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="all">All Students</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Student', 'Submitted', 'Graded', 'Total Assignments', 'Avg Score', 'Best Grade'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(selectedStudentId === 'all' ? studentSummary : studentSummary.filter((s) => s.id === selectedStudentId)).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.submitted}</td>
                    <td className="px-4 py-3 text-gray-600">{s.graded}</td>
                    <td className="px-4 py-3 text-gray-600">{s.total}</td>
                    <td className="px-4 py-3 text-gray-600">{s.avg}</td>
                    <td className="px-4 py-3">
                      {s.best !== '—' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: GRADE_COLORS[s.best] + '22', color: GRADE_COLORS[s.best] }}>
                          {s.best}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


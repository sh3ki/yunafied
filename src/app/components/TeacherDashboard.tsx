import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { BarChart3, Bell, CalendarDays, CheckCircle2, ClipboardCheck, Printer, RefreshCw, Users } from 'lucide-react';
import { AssignmentItem, AnnouncementItem, AuthUser, ScheduleItem, SubmissionItem } from '@/app/types/models';

interface TeacherDashboardProps {
  teacher: AuthUser;
  users: AuthUser[];
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  schedules: ScheduleItem[];
  announcements: AnnouncementItem[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function gradeNumber(grade: string | null) {
  if (!grade) return null;
  const numeric = Number.parseFloat(grade);
  if (!Number.isNaN(numeric)) return numeric;
  return ({ A: 95, B: 85, C: 75, D: 65, F: 50 } as Record<string, number>)[grade.trim().charAt(0).toUpperCase()] ?? null;
}

function formatMeetingDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function aiText(label: string, values: number[], empty = 'There is not enough activity yet to produce a meaningful interpretation.') {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total || !values.length) return empty;
  const average = total / values.length;
  if (label === 'grades') return `The assigned student group has an average recorded score of ${average.toFixed(1)}. Continue targeted feedback for students below the group average and reinforce the strategies reflected in the strongest submissions.`;
  if (label === 'submissions') return `${values[0]} of ${values[0] + values[1]} assigned submissions are graded. Prioritizing the ${values[1]} pending submission${values[1] === 1 ? '' : 's'} will give the clearest next view of student progress.`;
  return `The dashboard currently reflects ${total} upcoming or active planning item${total === 1 ? '' : 's'} for this teacher. Review the listed items regularly to keep student support aligned with the current schedule.`;
}

export function TeacherDashboard({ teacher, users, assignments, submissions, schedules, announcements }: TeacherDashboardProps) {
  const myAssignments = useMemo(() => assignments.filter((assignment) => assignment.teacherId === teacher.id), [assignments, teacher.id]);
  const assignmentIds = useMemo(() => new Set(myAssignments.map((assignment) => assignment.id)), [myAssignments]);
  const mySubmissions = useMemo(() => submissions.filter((submission) => assignmentIds.has(submission.assignmentId)), [submissions, assignmentIds]);
  const assignedStudentIds = useMemo(() => new Set([
    ...mySubmissions.map((submission) => submission.studentId),
    ...schedules.filter((schedule) => schedule.teacherId === teacher.id && schedule.studentId).map((schedule) => schedule.studentId as string),
  ]), [mySubmissions, schedules, teacher.id]);
  const students = useMemo(() => users.filter((user) => user.role === 'student' && assignedStudentIds.has(user.id)), [users, assignedStudentIds]);
  const graded = mySubmissions.filter((submission) => Boolean(submission.grade));
  const pending = mySubmissions.length - graded.length;
  const numericGrades = graded.map((submission) => gradeNumber(submission.grade)).filter((value): value is number => value !== null);
  const averageGrade = numericGrades.length ? numericGrades.reduce((sum, value) => sum + value, 0) / numericGrades.length : 0;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => schedules
    .filter((schedule) => schedule.teacherId === teacher.id && schedule.date >= today && schedule.status !== 'cancelled' && schedule.status !== 'declined')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 5), [schedules, teacher.id, today]);

  const gradeDistribution = ['A', 'B', 'C', 'D', 'F'].map((grade) => ({ name: grade, value: graded.filter((submission) => {
    const number = gradeNumber(submission.grade);
    return number !== null && (grade === 'A' ? number >= 90 : grade === 'B' ? number >= 80 : grade === 'C' ? number >= 70 : grade === 'D' ? number >= 60 : number < 60);
  }).length })).filter((item) => item.value > 0);
  const assignmentStats = myAssignments.map((assignment) => {
    const rows = mySubmissions.filter((submission) => submission.assignmentId === assignment.id);
    return { name: assignment.title.length > 16 ? `${assignment.title.slice(0, 16)}…` : assignment.title, submitted: rows.length, graded: rows.filter((row) => row.grade).length };
  });
  const studentProgress = students.map((student) => {
    const rows = mySubmissions.filter((submission) => submission.studentId === student.id).map((submission) => gradeNumber(submission.grade)).filter((value): value is number => value !== null);
    return { name: student.fullName.split(' ')[0], average: rows.length ? Number((rows.reduce((sum, value) => sum + value, 0) / rows.length).toFixed(1)) : 0 };
  });
  const interpretations = {
    grades: aiText('grades', [averageGrade]),
    submissions: aiText('submissions', [graded.length, pending]),
    progress: studentProgress.length ? `Performance is available for ${studentProgress.filter((student) => student.average > 0).length} of ${students.length} assigned student${students.length === 1 ? '' : 's'}. Use the student-level view to identify who needs enrichment or additional support.` : aiText('progress', []),
  };

  return <div className="p-6 max-w-7xl mx-auto print:p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
      <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-indigo-600" />Teacher Dashboard</h2><p className="text-gray-500">Performance analytics for your assigned students</p></div>
      <div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm"><Printer className="h-4 w-4" />Print report</button><button onClick={() => window.location.reload()} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm"><RefreshCw className="h-4 w-4" />Refresh</button></div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:hidden">
      {[
        ['Assigned Students', students.length, Users, 'bg-indigo-50 text-indigo-700'],
        ['Average Grade', averageGrade ? `${averageGrade.toFixed(1)}%` : '—', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
        ['Pending Grading', pending, ClipboardCheck, 'bg-amber-50 text-amber-700'],
        ['Upcoming Meetings', upcoming.length, CalendarDays, 'bg-blue-50 text-blue-700'],
      ].map(([label, value, Icon, color]) => <div key={String(label)} className={`rounded-2xl p-5 ${color} border border-white shadow-sm`}><Icon className="h-5 w-5 mb-2" /><p className="text-xs uppercase tracking-wide font-semibold opacity-80">{label}</p><p className="text-3xl font-extrabold mt-1">{value}</p></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Grade distribution" interpretation={interpretations.grades}><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={gradeDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} label>{gradeDistribution.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Submission status" interpretation={interpretations.submissions}><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={[{ name: 'Graded', value: graded.length }, { name: 'Pending', value: pending }]} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} label><Cell fill="#10b981" /><Cell fill="#f59e0b" /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Submissions by assignment" interpretation="Compare submitted and graded work to identify assignments that need follow-up or feedback."><ResponsiveContainer width="100%" height={230}><BarChart data={assignmentStats}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="submitted" fill="#6366f1" name="Submitted" /><Bar dataKey="graded" fill="#10b981" name="Graded" /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Student performance" interpretation={interpretations.progress}><ResponsiveContainer width="100%" height={230}><LineChart data={studentProgress}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="average" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} name="Average score" /></LineChart></ResponsiveContainer></ChartCard>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 print:hidden">
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"><h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><CalendarDays className="h-5 w-5 text-blue-600" />Upcoming meetings</h3>{upcoming.length ? <div className="space-y-3">{upcoming.map((meeting) => <div key={meeting.id} className="rounded-lg bg-blue-50/60 p-3"><div className="flex justify-between gap-3"><p className="font-semibold text-gray-800">{meeting.title}</p><span className="text-xs font-semibold text-blue-700 capitalize">{meeting.status}</span></div><p className="text-sm text-gray-600 mt-1">{formatMeetingDate(meeting.date)} · {meeting.startTime}–{meeting.endTime}</p><p className="text-xs text-gray-500 mt-1">Student: {meeting.studentName || 'Group session'}</p></div>)}</div> : <p className="text-sm text-gray-400 py-8 text-center">No upcoming meetings scheduled.</p>}</section>
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"><h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4"><Bell className="h-5 w-5 text-indigo-600" />Latest announcements</h3>{announcements.length ? <div className="space-y-3">{announcements.slice(0, 4).map((announcement) => <div key={announcement.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0"><p className="font-semibold text-gray-800">{announcement.title}</p><p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p><p className="text-xs text-gray-400 mt-1">{announcement.postedByName} · {new Date(announcement.createdAt).toLocaleDateString()}</p></div>)}</div> : <p className="text-sm text-gray-400 py-8 text-center">No announcements available.</p>}</section>
    </div>
    <div className="teacher-print-report" aria-hidden="true"><div className="border-b-2 border-indigo-600 pb-4 mb-6"><h1 className="text-2xl font-bold text-gray-900">YUNAfied Teacher Dashboard Report</h1><p className="text-sm text-gray-500 mt-1">{teacher.fullName} · Assigned Student Performance · Generated {new Date().toLocaleString()}</p></div><PrintChart title="Grade Distribution" data={gradeDistribution} dataKey="value" categoryKey="name" interpretation={interpretations.grades} /><PrintChart title="Submission Status" data={[{ name: 'Graded', value: graded.length }, { name: 'Pending', value: pending }]} dataKey="value" categoryKey="name" interpretation={interpretations.submissions} /><PrintChart title="Submissions by Assignment" data={assignmentStats.map((row) => ({ name: row.name, value: row.submitted }))} dataKey="value" categoryKey="name" interpretation="The chart shows the volume of submitted work for each assignment in this teacher's assigned student group." /><PrintChart title="Student Performance" data={studentProgress} dataKey="average" categoryKey="name" interpretation={interpretations.progress} /><h2 className="text-lg font-bold text-indigo-700 border-b pb-2 mb-4 mt-8">Upcoming Meetings</h2>{upcoming.length ? upcoming.map((meeting) => <p key={meeting.id} className="text-sm border-b py-2"><strong>{meeting.title}</strong> — {formatMeetingDate(meeting.date)}, {meeting.startTime}–{meeting.endTime} · {meeting.studentName || 'Group session'}</p>) : <p className="text-sm text-gray-500">No upcoming meetings scheduled.</p>}</div>
  </div>;
}

function ChartCard({ title, interpretation, children }: { title: string; interpretation: string; children: React.ReactNode }) { return <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"><h3 className="font-semibold text-gray-700 mb-3">{title}</h3>{children}<p className="mt-3 text-sm text-gray-600 bg-indigo-50 rounded-lg p-3"><span className="font-semibold text-indigo-700">AI interpretation:</span> {interpretation}</p></section>; }
function PrintChart({ title, data, dataKey, categoryKey, interpretation }: { title: string; data: { [key: string]: any }[]; dataKey: string; categoryKey: string; interpretation: string }) { return <section className="teacher-print-chart border border-gray-200 rounded-lg p-4"><h3 className="font-bold text-gray-800 mb-3">{title}</h3>{data.length ? <div style={{ width: '100%', height: 250 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={categoryKey} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey={dataKey} fill="#4f46e5" label /></BarChart></ResponsiveContainer></div> : <p className="py-10 text-center text-gray-400">No data available</p>}<p className="mt-3 text-sm text-gray-700"><strong className="text-indigo-700">AI interpretation:</strong> {interpretation}</p></section>; }

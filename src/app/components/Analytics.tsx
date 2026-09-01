import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, Printer, RefreshCw, Users, UserRound, ClipboardCheck, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { AdminAnalyticsItem } from '@/app/types/models';
import { AssignmentItem, AuthUser, ScheduleItem, SubmissionItem } from '@/app/types/models';
import { Performance } from './Performance';
import { AssessmentAnalytics } from './AssessmentAnalytics';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
type Filters = { dateFrom: string; dateTo: string; status: string };

export function Analytics({ onNavigateView, submissions = [], assignments = [], users = [], schedules = [] }: { onNavigateView?: (view: string) => void; submissions?: SubmissionItem[]; assignments?: AssignmentItem[]; users?: AuthUser[]; schedules?: ScheduleItem[] }) {
  const [data, setData] = useState<AdminAnalyticsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance'>('overview');
  const [filters, setFilters] = useState<Filters>({ dateFrom: '', dateTo: '', status: '' });
  const load = async (refresh = false) => { try { setLoading(true); setData(await apiClient.getAdminAnalytics(filters, refresh)); if (refresh) toast.success('New AI interpretations generated.'); } catch (err: any) { toast.error(err.message || 'Failed to load admin dashboard.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const cards = data ? [
    ['Total Students', data.totalStudents, Users, 'bg-indigo-50 text-indigo-700', 'enrollments'],
    ['Total Teachers', data.totalTeachers, UserRound, 'bg-violet-50 text-violet-700', 'enrollments'],
    ['Sessions', data.totalSessions, CalendarDays, 'bg-blue-50 text-blue-700', 'meeting-history'],
    ['Submissions', data.totalSubmissions, ClipboardCheck, 'bg-emerald-50 text-emerald-700', 'grades'],
    ['Enrollments', data.totalEnrollments, Users, 'bg-rose-50 text-rose-700', 'enrollments'],
  ] as const : [];
  const progress = (data?.studentProgress || data?.topStudents || []).map(s => ({ period: s.studentName, count: 'latestAverage' in s ? s.latestAverage ?? 0 : s.avgGrade }));
  // The API uses `month` for session trends and may omit optional trend series
  // when there is no matching status. Keep the charts useful by normalizing
  // those responses and falling back to the already-loaded bootstrap data.
  const sessionTrends = data?.monthlySessionCounts?.length
    ? data.monthlySessionCounts
    : schedules.reduce<{ month: string; count: number }[]>((rows, schedule) => {
        const month = new Date(`${schedule.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        const row = rows.find((item) => item.month === month);
        if (row) row.count += 1; else rows.push({ month, count: 1 });
        return rows;
      }, []);
  const enrollmentTrends = data?.enrollmentTrends?.length
    ? data.enrollmentTrends
    : sessionTrends.map((item) => ({ period: item.month, count: item.count }));
  const teacherActivity = data?.teacherActivity?.length
    ? data.teacherActivity.map((item) => ({ period: item.teacherName, count: item.sessions }))
    : users.filter((user) => user.role === 'teacher').map((teacher) => ({ period: teacher.fullName, count: schedules.filter((schedule) => schedule.teacherId === teacher.id).length }));
  const interpretation = (key: string) => {
    const saved = data?.interpretations?.[key]?.text;
    if (saved && !/^No data is available/i.test(saved)) return saved;
    if (key === 'enrollmentTrends') return enrollmentTrends.length ? `Activity is present across ${enrollmentTrends.length} period${enrollmentTrends.length === 1 ? '' : 's'}. Review the most recent period and compare it with earlier activity to identify enrollment or scheduling momentum.` : 'No enrollment activity is available for this period.';
    if (key === 'monthlySessions') return sessionTrends.length ? `${sessionTrends.reduce((sum, item) => sum + item.count, 0)} session${sessionTrends.reduce((sum, item) => sum + item.count, 0) === 1 ? '' : 's'} are represented in the current trend. Use this view to plan staffing and identify periods that need additional support.` : 'No session activity is available for this period.';
    if (key === 'teacherActivity') return teacherActivity.length ? `${teacherActivity.length} teacher${teacherActivity.length === 1 ? '' : 's'} have activity in the current dataset. Compare workload across teachers to keep student assignments and support balanced.` : 'No teacher activity is available for this period.';
    return saved || 'Interpretation will be available when data is present.';
  };
  const printSubmissionStatus = [{ name: 'Graded', value: submissions.filter(s => Boolean(s.grade)).length }, { name: 'Pending', value: submissions.filter(s => !s.grade).length }];
  const printAssignmentStats = assignments.map(a => { const rows = submissions.filter(s => s.assignmentId === a.id); return { name: a.title.length > 18 ? `${a.title.slice(0, 18)}…` : a.title, submitted: rows.length, graded: rows.filter(s => Boolean(s.grade)).length, pending: rows.filter(s => !s.grade).length }; });
  const printSessionStatus = ['accepted', 'cancelled', 'pending', 'declined'].map(name => ({ name: name[0].toUpperCase() + name.slice(1), value: schedules.filter(s => s.status === name).length })).filter(row => row.value > 0);
  return <div className="p-6 max-w-7xl mx-auto print:p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden"><div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart2 className="h-6 w-6 text-indigo-600" />Admin Dashboard</h2><p className="text-gray-500">Quick overview and decision-making center</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm"><Printer className="h-4 w-4" />Print report</button><button onClick={() => load(true)} disabled={loading} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Generating...' : 'Refresh AI'}</button></div></div>
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 print:hidden"><input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" /><input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" /><select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="dropped">Dropped</option><option value="archived">Archived</option></select><button onClick={load} className="bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm">Apply filters</button></div>
    <div className="flex gap-2 mb-6 border-b border-gray-200 print:hidden"><button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>Overview</button><button onClick={() => setActiveTab('performance')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'performance' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>Performance Analytics</button></div>
    {loading && !data ? <div className="py-24 text-center text-gray-400">Loading dashboard…</div> : data && <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 print:hidden">{cards.map(([label, value, Icon, color, view]) => <button key={label} onClick={() => onNavigateView?.(view)} className={`text-left rounded-xl px-4 py-4 ${color} hover:shadow-md transition`}><Icon className="h-5 w-5 mb-2" /><div className="text-2xl font-bold">{value}</div><div className="text-sm font-medium">{label}</div><div className="text-xs mt-2 opacity-70">View details →</div></button>)}</div>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${activeTab === 'overview' ? '' : 'hidden print:block'}`}>
        <Graph title="Enrollment trends" data={enrollmentTrends} x="period" interpretation={interpretation('enrollmentTrends')} onNavigate={() => onNavigateView?.('enrollments')} />
        <PieGraph title="Grade distribution" data={data.gradeDistribution} interpretation={interpretation('gradeDistribution')} onNavigate={() => onNavigateView?.('grades')} />
        <Graph title="Session overview" data={sessionTrends} x="month" interpretation={interpretation('monthlySessions')} onNavigate={() => onNavigateView?.('meeting-history')} />
        <Graph title="Teacher activity" data={teacherActivity} x="period" interpretation={interpretation('teacherActivity')} onNavigate={() => onNavigateView?.('enrollments')} />
        <Graph title="Student performance" data={progress} x="period" interpretation={interpretation('studentProgress')} onNavigate={() => onNavigateView?.('grades')} />
      </div>
      <div className={`mt-8 border-t border-gray-200 pt-8 ${activeTab === 'performance' ? '' : 'hidden print:block'}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Detailed Performance Analytics</h2>
        <p className="text-sm text-gray-500 mb-4">Assignment-level submissions, grading status, session status, and student progress.</p>
        <Performance interpretations={Object.fromEntries(['performanceGradeDistribution', 'performanceSubmissionStatus', 'performanceAssignmentStats', 'performanceSessionOverview'].map(key => [key, interpretation(key)]))} submissions={submissions} assignments={assignments} users={users} schedules={schedules} role="admin" showHeader={false} />
        <AssessmentAnalytics assignments={assignments} submissions={submissions} onOpen={() => onNavigateView?.('assessments')} />
      </div>
    </>}
    <div className="admin-print-report" aria-hidden="true">
      <div className="border-b-2 border-indigo-600 pb-4 mb-6"><h1 className="text-2xl font-bold text-gray-900">YUNAfied Admin Dashboard Report</h1><p className="text-sm text-gray-500 mt-1">Overview and Performance Analytics · Generated {new Date().toLocaleString()}</p></div>
      <h2 className="text-lg font-bold text-indigo-700 border-b pb-2 mb-4">Overview</h2>
      <PrintGraph title="Enrollment Trends" data={data?.enrollmentTrends || data?.monthlySessionCounts || []} x="period" interpretation={interpretation('enrollmentTrends')} />
      <PrintPie title="Grade Distribution" data={data?.gradeDistribution || []} interpretation={interpretation('gradeDistribution')} />
      <PrintGraph title="Session Overview" data={data?.monthlySessionCounts || []} x="month" interpretation={interpretation('monthlySessions')} />
      <PrintGraph title="Teacher Activity" data={(data?.teacherActivity || []).map(t => ({ period: t.teacherName, count: t.sessions }))} x="period" interpretation={interpretation('teacherActivity')} />
      <PrintGraph title="Student Performance" data={progress} x="period" interpretation={interpretation('studentProgress')} />
      <h2 className="text-lg font-bold text-indigo-700 border-b pb-2 mb-4 mt-8">Performance Analytics</h2>
      <PrintPie title="Performance Grade Distribution" data={data?.gradeDistribution || []} interpretation={interpretation('performanceGradeDistribution')} />
      <PrintPie title="Submission Status" data={printSubmissionStatus.map(r => ({ grade: r.name, count: r.value }))} interpretation={interpretation('performanceSubmissionStatus')} />
      <PrintGraph title="Submissions per Assignment" data={printAssignmentStats.map(r => ({ period: r.name, count: r.submitted }))} x="period" interpretation={interpretation('performanceAssignmentStats')} />
      <PrintPie title="Session Status" data={printSessionStatus.map(r => ({ grade: r.name, count: r.value }))} interpretation={interpretation('performanceSessionOverview')} />
    </div>
  </div>;
}

function Graph({ title, data, x, interpretation, onNavigate }: { title: string; data: { [key: string]: any }[]; x: string; interpretation: string; onNavigate: () => void }) { return <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><button onClick={onNavigate} className="text-left w-full"><h3 className="font-semibold text-gray-700 mb-4">{title} <span className="text-xs text-indigo-600">View details →</span></h3>{data.length ? <div className="h-64"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={x} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>}</button><p className="mt-4 text-sm text-gray-600 bg-indigo-50 rounded-lg p-3"><span className="font-semibold text-indigo-700">Interpretation:</span> {interpretation}</p></section>; }
function PieGraph({ title, data, interpretation, onNavigate }: { title: string; data: { grade: string; count: number }[]; interpretation: string; onNavigate: () => void }) { return <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><button onClick={onNavigate} className="text-left w-full"><h3 className="font-semibold text-gray-700 mb-4">{title} <span className="text-xs text-indigo-600">View details →</span></h3>{data.length ? <div className="h-64"><ResponsiveContainer><PieChart><Pie data={data} dataKey="count" nameKey="grade" innerRadius={55} outerRadius={85}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>}</button><p className="mt-4 text-sm text-gray-600 bg-indigo-50 rounded-lg p-3"><span className="font-semibold text-indigo-700">Interpretation:</span> {interpretation}</p></section>; }

function PrintGraph({ title, data, x, interpretation }: { title: string; data: { [key: string]: any }[]; x: string; interpretation: string }) { return <section className="admin-print-chart border border-gray-200 rounded-lg p-4"><h3 className="font-bold text-gray-800 mb-3">{title}</h3>{data.length ? <div style={{ width: '100%', height: 250 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={x} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="py-10 text-center text-gray-400">No data available</p>}<p className="mt-3 text-sm text-gray-700"><strong className="text-indigo-700">Interpretation:</strong> {interpretation}</p></section>; }
function PrintPie({ title, data, interpretation }: { title: string; data: { grade: string; count: number }[]; interpretation: string }) { return <section className="admin-print-chart border border-gray-200 rounded-lg p-4"><h3 className="font-bold text-gray-800 mb-3">{title}</h3>{data.length ? <div style={{ width: '100%', height: 250 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="count" nameKey="grade" innerRadius={55} outerRadius={85} label>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <p className="py-10 text-center text-gray-400">No data available</p>}<p className="mt-3 text-sm text-gray-700"><strong className="text-indigo-700">Interpretation:</strong> {interpretation}</p></section>; }

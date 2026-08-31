import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, Printer, RefreshCw, Users, UserRound, ClipboardCheck, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { AdminAnalyticsItem } from '@/app/types/models';
import { AssignmentItem, AuthUser, ScheduleItem, SubmissionItem } from '@/app/types/models';
import { Performance } from './Performance';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
type Filters = { dateFrom: string; dateTo: string; status: string };

export function Analytics({ onNavigateView, submissions = [], assignments = [], users = [], schedules = [] }: { onNavigateView?: (view: string) => void; submissions?: SubmissionItem[]; assignments?: AssignmentItem[]; users?: AuthUser[]; schedules?: ScheduleItem[] }) {
  const [data, setData] = useState<AdminAnalyticsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance'>('overview');
  const [filters, setFilters] = useState<Filters>({ dateFrom: '', dateTo: '', status: '' });
  const load = async () => { try { setLoading(true); setData(await apiClient.getAdminAnalytics(filters)); } catch (err: any) { toast.error(err.message || 'Failed to load admin dashboard.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const interpretation = (key: string) => data?.interpretations?.[key]?.text || 'Interpretation will be available when data is present.';
  const cards = data ? [
    ['Total Students', data.totalStudents, Users, 'bg-indigo-50 text-indigo-700', 'enrollments'],
    ['Total Teachers', data.totalTeachers, UserRound, 'bg-violet-50 text-violet-700', 'enrollments'],
    ['Sessions', data.totalSessions, CalendarDays, 'bg-blue-50 text-blue-700', 'meeting-history'],
    ['Submissions', data.totalSubmissions, ClipboardCheck, 'bg-emerald-50 text-emerald-700', 'grades'],
    ['Enrollments', data.totalEnrollments, Users, 'bg-rose-50 text-rose-700', 'enrollments'],
  ] as const : [];
  const progress = (data?.studentProgress || data?.topStudents || []).map(s => ({ period: s.studentName, count: 'latestAverage' in s ? s.latestAverage ?? 0 : s.avgGrade }));
  return <div className="p-6 max-w-7xl mx-auto print:p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden"><div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart2 className="h-6 w-6 text-indigo-600" />Admin Dashboard</h2><p className="text-gray-500">Quick overview and decision-making center</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm"><Printer className="h-4 w-4" />Print report</button><button onClick={load} disabled={loading} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div></div>
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 print:hidden"><input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" /><input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" /><select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="dropped">Dropped</option><option value="archived">Archived</option></select><button onClick={load} className="bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm">Apply filters</button></div>
    <div className="flex gap-2 mb-6 border-b border-gray-200 print:hidden"><button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>Overview</button><button onClick={() => setActiveTab('performance')} className={`px-4 py-2 text-sm font-semibold border-b-2 ${activeTab === 'performance' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>Performance Analytics</button></div>
    {loading && !data ? <div className="py-24 text-center text-gray-400">Loading dashboard…</div> : data && <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 print:hidden">{cards.map(([label, value, Icon, color, view]) => <button key={label} onClick={() => onNavigateView?.(view)} className={`text-left rounded-xl px-4 py-4 ${color} hover:shadow-md transition`}><Icon className="h-5 w-5 mb-2" /><div className="text-2xl font-bold">{value}</div><div className="text-sm font-medium">{label}</div><div className="text-xs mt-2 opacity-70">View details →</div></button>)}</div>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${activeTab === 'overview' ? '' : 'hidden print:block'}`}>
        <Graph title="Enrollment trends" data={data.enrollmentTrends || data.monthlySessionCounts} x="period" interpretation={interpretation('enrollmentTrends')} onNavigate={() => onNavigateView?.('enrollments')} />
        <PieGraph title="Grade distribution" data={data.gradeDistribution} interpretation={interpretation('gradeDistribution')} onNavigate={() => onNavigateView?.('grades')} />
        <Graph title="Session overview" data={data.monthlySessionCounts} x="month" interpretation={interpretation('monthlySessions')} onNavigate={() => onNavigateView?.('meeting-history')} />
        <Graph title="Teacher activity" data={(data.teacherActivity || []).map(t => ({ period: t.teacherName, count: t.sessions }))} x="period" interpretation={interpretation('teacherActivity')} onNavigate={() => onNavigateView?.('enrollments')} />
        <Graph title="Student performance" data={progress} x="period" interpretation={interpretation('studentProgress')} onNavigate={() => onNavigateView?.('grades')} />
      </div>
      <div className={`mt-8 border-t border-gray-200 pt-8 ${activeTab === 'performance' ? '' : 'hidden print:block'}`}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Detailed Performance Analytics</h2>
        <p className="text-sm text-gray-500 mb-4">Assignment-level submissions, grading status, session status, and student progress.</p>
        <Performance interpretations={Object.fromEntries(['performanceGradeDistribution', 'performanceSubmissionStatus', 'performanceAssignmentStats', 'performanceSessionOverview'].map(key => [key, interpretation(key)]))} submissions={submissions} assignments={assignments} users={users} schedules={schedules} role="admin" showHeader={false} />
      </div>
    </>}
  </div>;
}

function Graph({ title, data, x, interpretation, onNavigate }: { title: string; data: { [key: string]: any }[]; x: string; interpretation: string; onNavigate: () => void }) { return <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><button onClick={onNavigate} className="text-left w-full"><h3 className="font-semibold text-gray-700 mb-4">{title} <span className="text-xs text-indigo-600">View details →</span></h3>{data.length ? <div className="h-64"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={x} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>}</button><p className="mt-4 text-sm text-gray-600 bg-indigo-50 rounded-lg p-3"><span className="font-semibold text-indigo-700">Interpretation:</span> {interpretation}</p></section>; }
function PieGraph({ title, data, interpretation, onNavigate }: { title: string; data: { grade: string; count: number }[]; interpretation: string; onNavigate: () => void }) { return <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><button onClick={onNavigate} className="text-left w-full"><h3 className="font-semibold text-gray-700 mb-4">{title} <span className="text-xs text-indigo-600">View details →</span></h3>{data.length ? <div className="h-64"><ResponsiveContainer><PieChart><Pie data={data} dataKey="count" nameKey="grade" innerRadius={55} outerRadius={85}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>}</button><p className="mt-4 text-sm text-gray-600 bg-indigo-50 rounded-lg p-3"><span className="font-semibold text-indigo-700">Interpretation:</span> {interpretation}</p></section>; }

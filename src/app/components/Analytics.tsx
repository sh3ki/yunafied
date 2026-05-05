import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import { AdminAnalyticsItem } from '@/app/types/models';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

export function Analytics() {
  const [data, setData] = useState<AdminAnalyticsItem | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const result = await apiClient.getAdminAnalytics();
      setData(result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statCards = data
    ? [
        { label: 'Students', value: data.totalStudents, color: 'bg-indigo-50 text-indigo-700' },
        { label: 'Teachers', value: data.totalTeachers, color: 'bg-violet-50 text-violet-700' },
        { label: 'Sessions', value: data.totalSessions, color: 'bg-blue-50 text-blue-700' },
        { label: 'Submissions', value: data.totalSubmissions, color: 'bg-emerald-50 text-emerald-700' },
        { label: 'Announcements', value: data.totalAnnouncements, color: 'bg-amber-50 text-amber-700' },
        { label: 'Enrollments', value: data.totalEnrollments, color: 'bg-rose-50 text-rose-700' },
      ]
    : [];

  const gradeDistData: { grade: string; count: number }[] = data?.gradeDistribution ?? [];
  const monthlyData: { month: string; count: number }[] = data?.monthlySessionCounts ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-indigo-600" />
            Admin Analytics
          </h2>
          <p className="text-gray-500">Platform-wide overview</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-gray-400">Loading analytics…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {statCards.map((s) => (
              <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly sessions bar chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-base font-semibold mb-4 text-gray-700">Monthly Sessions</h3>
              {monthlyData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No session data yet</div>
              )}
            </div>

            {/* Grade distribution pie */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-base font-semibold mb-4 text-gray-700">Grade Distribution</h3>
              {gradeDistData.length > 0 ? (
                <>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={gradeDistData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="count" nameKey="grade">
                          {gradeDistData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {gradeDistData.map((d, i) => (
                      <div key={d.grade} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {d.grade}: {d.count}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No grade data yet</div>
              )}
            </div>
          </div>

          {/* Top students table */}
          {data && data.topStudents && data.topStudents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-700">Top Students</h3>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-gray-500">#</th>
                    <th className="px-4 py-2 text-gray-500">Student</th>
                    <th className="px-4 py-2 text-gray-500">Avg Grade</th>
                    <th className="px-4 py-2 text-gray-500">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.topStudents as { studentId: string; studentName: string; avgGrade: number; submissionCount: number }[]).map((s, i) => (
                    <tr key={s.studentId ?? i} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{s.studentName}</td>
                      <td className="px-4 py-2 text-indigo-700 font-semibold">{s.avgGrade != null ? Number(s.avgGrade).toFixed(1) : '—'}</td>
                      <td className="px-4 py-2">{s.submissionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}


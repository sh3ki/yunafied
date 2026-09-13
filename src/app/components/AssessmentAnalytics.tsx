import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClipboardCheck } from 'lucide-react';
import { AssignmentItem, SubmissionItem, AssessmentAnalyticsItem, UserRole } from '@/app/types/models';
import { apiClient } from '@/app/services/apiClient';

export function AssessmentAnalytics({ assignments, submissions, onOpen, role = 'admin' }: { assignments: AssignmentItem[]; submissions: SubmissionItem[]; onOpen?: () => void; role?: UserRole }) {
  const [data, setData] = useState<AssessmentAnalyticsItem | null>(null);
  useEffect(() => { apiClient.getAssessmentAnalytics().then(setData).catch(() => setData(null)); }, [role]);
  const fallbackAssignments = assignments.filter((a) => /assessment|quiz/i.test(a.title));
  const fallbackRows = submissions.filter((s) => fallbackAssignments.some((a) => a.id === s.assignmentId));
  const assigned = data?.assignedCount ?? fallbackAssignments.length; const completed = data?.completedCount ?? fallbackRows.length; const average = data?.averageScore ?? null;
  return <section className="mt-8 border-t border-gray-200 pt-7"><div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-xl font-bold text-gray-800"><ClipboardCheck className="h-5 w-5 text-indigo-600" />Assessment Overview</h2><p className="mt-1 text-sm text-gray-500">Diagnostic results · {role === 'admin' ? 'all students' : 'your assigned students'} · does not affect grades.</p></div>{onOpen && <button onClick={onOpen} className="text-sm font-semibold text-indigo-600">Open assessments →</button>}</div><div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5"><Metric label="Assigned" value={assigned}/><Metric label="Completed" value={completed}/><Metric label="Average score" value={average === null ? '—' : `${average}%`}/><Metric label="Pre assessments" value={data?.preCount ?? '—'}/><Metric label="Avg improvement" value={data?.averageImprovement === null || data?.averageImprovement === undefined ? '—' : `${data.averageImprovement} pts`}/></div><div className="rounded-xl border border-gray-100 bg-white p-5"><h3 className="mb-2 font-semibold text-gray-700">Pre- and post-assessment volume</h3><ResponsiveContainer width="100%" height={190}><BarChart data={[{ name: 'Pre', value: data?.preCount ?? 0 }, { name: 'Post', value: data?.postCount ?? 0 }]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" fill="#6366f1" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-indigo-600">{value}</p></div>; }

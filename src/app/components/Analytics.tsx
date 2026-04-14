import React from 'react';
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
  Cell
} from 'recharts';

interface Submission {
  id: string;
  grade?: string;
}

interface AnalyticsProps {
  submissions: Submission[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function Analytics({ submissions }: AnalyticsProps) {
  // Mock aggregation logic
  // In a real app, this would be more robust to handle different grade types
  const gradedSubmissions = submissions.filter(s => s.grade);
  
  const gradeDistribution = gradedSubmissions.reduce((acc, curr) => {
    const grade = curr.grade || 'Unknown';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(gradeDistribution).map(key => ({
    name: key,
    count: gradeDistribution[key]
  }));

  const total = submissions.length;
  const graded = gradedSubmissions.length;
  const pending = total - graded;

  const statusData = [
    { name: 'Graded', value: graded },
    { name: 'Pending', value: pending },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Performance Analytics</h2>
        <p className="text-gray-500">Evaluation Module</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Submission Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b'][index % 2]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-gray-600">Graded: {graded}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-600">Pending: {pending}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Grade Distribution</h3>
          {data.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No grades recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

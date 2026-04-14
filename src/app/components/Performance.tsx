import React from 'react';
import { Analytics } from './Analytics';

interface PerformanceProps {
  submissions: any[];
}

export function Performance({ submissions }: PerformanceProps) {
  return (
    <div>
      <div className="p-6 pb-0">
        <h1 className="text-3xl font-bold text-gray-800">Student Performance Monitoring</h1>
        <p className="text-gray-500 mt-1">Track grades and completion rates</p>
      </div>
      <Analytics submissions={submissions} />
    </div>
  );
}

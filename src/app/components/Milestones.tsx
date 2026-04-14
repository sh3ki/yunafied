import React from 'react';
import { Flag, CheckCircle, Circle, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export function Milestones() {
  const milestones = [
    { id: 1, title: 'Complete Grammar Basics', status: 'completed', date: 'Oct 12' },
    { id: 2, title: 'Submit First Essay', status: 'completed', date: 'Oct 15' },
    { id: 3, title: 'Mid-term Quiz', status: 'current', date: 'Due Tomorrow' },
    { id: 4, title: 'Oral Presentation', status: 'locked', date: 'Nov 01' },
    { id: 5, title: 'Final Project', status: 'locked', date: 'Nov 20' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full">
      <h3 className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-4 flex items-center gap-2">
        <Flag className="h-4 w-4" /> Learning Path
      </h3>
      
      <div className="space-y-0 relative">
        {/* Vertical Line */}
        <div className="absolute left-3 top-2 bottom-4 w-0.5 bg-gray-100" />

        {milestones.map((milestone, index) => {
          const isCompleted = milestone.status === 'completed';
          const isCurrent = milestone.status === 'current';
          const isLocked = milestone.status === 'locked';

          return (
            <motion.div 
              key={milestone.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-center gap-4 py-3 group"
            >
              <div className={`
                relative z-10 h-6 w-6 rounded-full flex items-center justify-center border-2 
                ${isCompleted ? 'bg-green-100 border-green-500 text-green-600' : ''}
                ${isCurrent ? 'bg-indigo-100 border-indigo-500 text-indigo-600 ring-4 ring-indigo-50' : ''}
                ${isLocked ? 'bg-gray-50 border-gray-300 text-gray-400' : ''}
              `}>
                {isCompleted && <CheckCircle className="h-3 w-3" />}
                {isCurrent && <div className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse" />}
                {isLocked && <Lock className="h-3 w-3" />}
              </div>
              
              <div className="flex-1">
                <div className={`text-sm font-semibold ${isCompleted || isCurrent ? 'text-gray-800' : 'text-gray-400'}`}>
                  {milestone.title}
                </div>
                <div className="text-xs text-gray-400">{milestone.date}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

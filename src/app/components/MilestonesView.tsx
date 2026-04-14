import React from 'react';
import { Flag, CheckCircle, Lock, Trophy, Star } from 'lucide-react';
import { motion } from 'motion/react';

export function MilestonesView() {
  const milestones = [
    { id: 1, title: 'Complete Grammar Basics', status: 'completed', date: 'Oct 12', description: 'Master subject-verb agreement and basic tenses.' },
    { id: 2, title: 'Submit First Essay', status: 'completed', date: 'Oct 15', description: 'Write a 500-word essay on your favorite book.' },
    { id: 3, title: 'Mid-term Quiz', status: 'current', date: 'Due Tomorrow', description: 'Comprehensive quiz covering Modules 1-4.' },
    { id: 4, title: 'Oral Presentation', status: 'locked', date: 'Nov 01', description: 'Present your project to the class (5 mins).' },
    { id: 5, title: 'Final Project', status: 'locked', date: 'Nov 20', description: 'Group project submission.' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Milestone Achievements
          </h1>
          <p className="text-gray-500 mt-1">Track your progress and unlock rewards</p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold flex items-center gap-2">
           <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
           Level 5 Student
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Flag className="h-5 w-5 text-indigo-600" />
            Current Path
          </h2>
          
          <div className="relative space-y-8 pl-4">
             {/* Line */}
             <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-100 -z-10" />

             {milestones.map((milestone, index) => {
               const isCompleted = milestone.status === 'completed';
               const isCurrent = milestone.status === 'current';
               const isLocked = milestone.status === 'locked';

               return (
                 <motion.div 
                   key={milestone.id}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: index * 0.1 }}
                   className="flex gap-6 group"
                 >
                   <div className={`
                     flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border-4 bg-white
                     ${isCompleted ? 'border-green-500 text-green-500' : ''}
                     ${isCurrent ? 'border-indigo-500 text-indigo-500 ring-4 ring-indigo-100' : ''}
                     ${isLocked ? 'border-gray-200 text-gray-300' : ''}
                   `}>
                     {isCompleted && <CheckCircle className="h-5 w-5" />}
                     {isCurrent && <div className="h-3 w-3 bg-indigo-500 rounded-full animate-pulse" />}
                     {isLocked && <Lock className="h-4 w-4" />}
                   </div>
                   
                   <div className={`flex-1 p-4 rounded-xl border transition-all ${
                     isCurrent ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
                   }`}>
                     <div className="flex justify-between items-start mb-1">
                       <h3 className={`font-bold ${isCompleted || isCurrent ? 'text-gray-800' : 'text-gray-400'}`}>
                         {milestone.title}
                       </h3>
                       <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                         {milestone.date}
                       </span>
                     </div>
                     <p className={`text-sm ${isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'}`}>
                       {milestone.description}
                     </p>
                   </div>
                 </motion.div>
               );
             })}
          </div>
        </div>

        <div className="space-y-6">
           {/* Summary Card */}
           <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-lg">
             <h3 className="text-lg font-medium opacity-90 mb-4">Total Progress</h3>
             <div className="flex items-end gap-2 mb-2">
               <span className="text-5xl font-bold">40%</span>
               <span className="text-indigo-200 mb-2">completed</span>
             </div>
             <div className="w-full bg-black/20 rounded-full h-3 mb-6">
               <div className="bg-white/90 h-3 rounded-full w-[40%]" />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">2</div>
                  <div className="text-xs text-indigo-200">Completed</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-xs text-indigo-200">Remaining</div>
                </div>
             </div>
           </div>

           {/* Achievements Badge Grid */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
             <h2 className="text-xl font-bold text-gray-800 mb-6">Badges</h2>
             <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-yellow-50 rounded-xl flex flex-col items-center justify-center p-2 border border-yellow-100 text-center">
                    <Trophy className="h-8 w-8 text-yellow-500 mb-2" />
                    <span className="text-xs font-bold text-yellow-700">Early Bird</span>
                  </div>
                ))}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-gray-50 rounded-xl flex flex-col items-center justify-center p-2 border border-gray-100 text-center opacity-50 grayscale">
                    <Trophy className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-xs font-bold text-gray-500">Locked</span>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

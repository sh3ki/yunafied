import React from 'react';
import { Trophy, Star, Target, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface GamifiedChallengeProps {
  xp: number;
  streak: number;
  dailyGoal: number;
}

export function GamifiedChallenge({ xp = 1250, streak = 5, dailyGoal = 3 }: GamifiedChallengeProps) {
  const progress = Math.min((streak / 7) * 100, 100);

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
        <Trophy className="h-32 w-32" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-300 fill-yellow-300" />
              Daily Challenge
            </h3>
            <p className="text-emerald-100 text-sm mt-1">Complete 3 tasks to keep your streak!</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/30">
            <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
            <span className="font-bold">{xp} XP</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end text-sm font-medium">
            <span>Current Streak</span>
            <span className="text-emerald-100">{streak} / 7 Days</span>
          </div>
          
          <div className="h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
              <Target className="h-5 w-5 mx-auto mb-1 text-emerald-200" />
              <div className="text-xs text-emerald-100">Focus</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-300" />
              <div className="text-xs text-emerald-100">Rank #4</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
              <Zap className="h-5 w-5 mx-auto mb-1 text-orange-300" />
              <div className="text-xs text-emerald-100">Power Up</div>
            </div>
          </div>
        </div>
        
        <button className="w-full mt-6 bg-white text-emerald-600 font-bold py-2 rounded-xl shadow-md hover:bg-emerald-50 active:scale-95 transition-all">
          View Leaderboard
        </button>
      </div>
    </div>
  );
}

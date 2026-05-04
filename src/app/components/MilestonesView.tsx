import React, { useEffect, useMemo, useState } from 'react';
import { Flag, CheckCircle, Lock, Trophy, Star, Zap, Target, BookOpen, Award, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { apiClient } from '@/app/services/apiClient';
import { AssignmentItem, GamifiedLeaderboardItem, SubmissionItem } from '@/app/types/models';

interface MilestonesViewProps {
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  userId: string;
}

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  color: string;
}

function computeBadges(
  mySubmissions: SubmissionItem[],
  assignments: AssignmentItem[],
  leaderboardEntries: GamifiedLeaderboardItem[],
  userId: string,
): Badge[] {
  const submitted = mySubmissions.length;
  const graded = mySubmissions.filter((s) => s.grade).length;
  const highGrades = mySubmissions.filter((s) => s.grade && (s.grade.startsWith('A') || s.grade === '100' || s.grade === '100/100')).length;
  const myLeaderboard = leaderboardEntries.filter((e) => e.studentId === userId);
  const quizAttempts = myLeaderboard.reduce((sum, e) => sum + e.attemptCount, 0);
  const perfectScores = myLeaderboard.filter((e) => e.bestCorrectAnswers === e.totalQuestions && e.totalQuestions > 0).length;
  const totalAssignments = assignments.length;
  const allSubmitted = totalAssignments > 0 && submitted >= totalAssignments;

  return [
    {
      id: 'first_step',
      title: 'First Step',
      description: 'Submit your first assignment',
      icon: <BookOpen className="h-7 w-7" />,
      unlocked: submitted >= 1,
      color: 'amber',
    },
    {
      id: 'dedicated',
      title: 'Dedicated Learner',
      description: 'Submit 3 or more assignments',
      icon: <Flag className="h-7 w-7" />,
      unlocked: submitted >= 3,
      color: 'blue',
    },
    {
      id: 'all_done',
      title: 'Mission Complete',
      description: 'Submit all assigned work',
      icon: <CheckCircle className="h-7 w-7" />,
      unlocked: allSubmitted,
      color: 'emerald',
    },
    {
      id: 'high_achiever',
      title: 'High Achiever',
      description: 'Earn an A grade on any assignment',
      icon: <Star className="h-7 w-7" />,
      unlocked: highGrades >= 1,
      color: 'yellow',
    },
    {
      id: 'quiz_starter',
      title: 'Quiz Starter',
      description: 'Complete your first gamified quiz',
      icon: <Zap className="h-7 w-7" />,
      unlocked: quizAttempts >= 1,
      color: 'violet',
    },
    {
      id: 'quiz_master',
      title: 'Quiz Master',
      description: 'Complete 5 or more quiz attempts',
      icon: <Brain className="h-7 w-7" />,
      unlocked: quizAttempts >= 5,
      color: 'indigo',
    },
    {
      id: 'perfect',
      title: 'Perfect Score',
      description: 'Get all questions right in a quiz',
      icon: <Trophy className="h-7 w-7" />,
      unlocked: perfectScores >= 1,
      color: 'orange',
    },
    {
      id: 'all_rounder',
      title: 'All-Rounder',
      description: 'Have 3+ graded assignments AND 3+ quiz attempts',
      icon: <Award className="h-7 w-7" />,
      unlocked: graded >= 3 && quizAttempts >= 3,
      color: 'pink',
    },
    {
      id: 'champion',
      title: 'English Champion',
      description: 'Earn A grades on 3+ assignments and complete 5+ quizzes',
      icon: <Target className="h-7 w-7" />,
      unlocked: highGrades >= 3 && quizAttempts >= 5,
      color: 'red',
    },
  ];
}

const colorClasses: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   ring: 'ring-amber-400' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    ring: 'ring-blue-400' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-400' },
  yellow:  { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200',  ring: 'ring-yellow-400' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  ring: 'ring-violet-400' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  ring: 'ring-indigo-400' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  ring: 'ring-orange-400' },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    ring: 'ring-pink-400' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     ring: 'ring-red-400' },
};

export function MilestonesView({ assignments, submissions, userId }: MilestonesViewProps) {
  const [leaderboard, setLeaderboard] = useState<GamifiedLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGamified = async () => {
      try {
        const categories = await apiClient.listGamifiedCategories();
        const allLeaderboard: GamifiedLeaderboardItem[] = [];
        await Promise.allSettled(
          categories.map(async (cat) => {
            try {
              const rows = await apiClient.listGamifiedLeaderboard({ categoryId: cat.id, limit: 50 });
              allLeaderboard.push(...rows);
            } catch {
              // skip categories that fail
            }
          }),
        );
        setLeaderboard(allLeaderboard);
      } catch {
        // silently continue - badges derived from assignments still work
      } finally {
        setLoading(false);
      }
    };
    loadGamified();
  }, []);

  const mySubmissions = useMemo(() => submissions.filter((s) => s.studentId === userId), [submissions, userId]);
  const submittedCount = mySubmissions.length;
  const gradedCount = mySubmissions.filter((s) => s.grade).length;
  const totalAssignments = assignments.length;

  const myLeaderboardEntries = useMemo(() => leaderboard.filter((e) => e.studentId === userId), [leaderboard, userId]);
  const totalQuizAttempts = myLeaderboardEntries.reduce((sum, e) => sum + e.attemptCount, 0);
  const bestScore = myLeaderboardEntries.reduce((max, e) => Math.max(max, e.bestScore), 0);

  const badges = useMemo(
    () => computeBadges(mySubmissions, assignments, leaderboard, userId),
    [mySubmissions, assignments, leaderboard, userId],
  );

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const progressPct = totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0;

  // Milestones path derived from assignments + gamified
  const milestones = useMemo(() => {
    const path = [
      {
        id: 'enroll',
        title: 'Enrolled in English Program',
        description: 'You have access to assignments and quizzes.',
        status: 'completed' as const,
        date: 'Completed',
      },
      ...assignments.slice(0, 5).map((a) => {
        const mySub = mySubmissions.find((s) => s.assignmentId === a.id);
        return {
          id: a.id,
          title: a.title,
          description: `Due: ${a.dueDate}`,
          status: mySub?.grade ? ('completed' as const) : mySub ? ('current' as const) : ('locked' as const),
          date: mySub?.grade ? `Grade: ${mySub.grade}` : mySub ? 'Submitted' : a.dueDate,
        };
      }),
      {
        id: 'quiz_goal',
        title: 'Complete a Gamified Quiz',
        description: 'Participate in English knowledge quizzes.',
        status: totalQuizAttempts > 0 ? ('completed' as const) : ('locked' as const),
        date: totalQuizAttempts > 0 ? `${totalQuizAttempts} attempt${totalQuizAttempts > 1 ? 's' : ''}` : 'Not started',
      },
    ];
    return path;
  }, [assignments, mySubmissions, totalQuizAttempts]);

  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64 text-gray-400">Loading milestones…</div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Milestone Achievements
          </h1>
          <p className="text-gray-500 mt-1">Track your progress and unlock rewards</p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
          {unlockedCount} / {badges.length} Badges Earned
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Milestones Path */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Flag className="h-5 w-5 text-indigo-600" />
            Learning Path
          </h2>

          <div className="relative space-y-6 pl-4">
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
                  transition={{ delay: index * 0.08 }}
                  className="flex gap-5 group"
                >
                  <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border-4 bg-white
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
                      <h3 className={`font-bold text-sm ${isCompleted || isCurrent ? 'text-gray-800' : 'text-gray-400'}`}>
                        {milestone.title}
                      </h3>
                      <span className="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded ml-2 shrink-0">
                        {milestone.date}
                      </span>
                    </div>
                    <p className={`text-xs ${isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'}`}>
                      {milestone.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-lg">
            <h3 className="text-base font-medium opacity-90 mb-4">Overall Progress</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-bold">{progressPct}%</span>
              <span className="text-indigo-200 mb-2">assignments done</span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-3 mb-6">
              <div className="bg-white/90 h-3 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{submittedCount}/{totalAssignments}</div>
                <div className="text-xs text-indigo-200">Assignments Submitted</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{gradedCount}</div>
                <div className="text-xs text-indigo-200">Graded</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{totalQuizAttempts}</div>
                <div className="text-xs text-indigo-200">Quiz Attempts</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{bestScore}</div>
                <div className="text-xs text-indigo-200">Best Quiz Score</div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Badges ({unlockedCount}/{badges.length})
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {badges.map((badge, i) => {
                const c = colorClasses[badge.color] || colorClasses.amber;
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    title={badge.description}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center p-2 border text-center cursor-default transition ${
                      badge.unlocked
                        ? `${c.bg} ${c.border} ${c.text} ring-2 ${c.ring} ring-offset-1`
                        : 'bg-gray-50 border-gray-100 opacity-40 grayscale'
                    }`}
                  >
                    <div className={badge.unlocked ? c.text : 'text-gray-400'}>{badge.icon}</div>
                    <span className={`text-[10px] font-bold mt-1 leading-tight ${badge.unlocked ? c.text : 'text-gray-400'}`}>
                      {badge.title}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


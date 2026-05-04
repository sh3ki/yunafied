import React, { useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle, Clock, MessageSquare, Star } from 'lucide-react';
import { clsx } from 'clsx';
import { AssignmentItem, SubmissionItem } from '@/app/types/models';

interface GradesFeedbackProps {
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  role: 'admin' | 'teacher' | 'student';
  userId: string;
  onGradeSubmission: (submissionId: string, grade: string, feedback: string) => Promise<void>;
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  B: 'bg-blue-100 text-blue-800 border-blue-200',
  C: 'bg-amber-100 text-amber-800 border-amber-200',
  D: 'bg-orange-100 text-orange-800 border-orange-200',
  F: 'bg-red-100 text-red-800 border-red-200',
};

function gradeColor(grade: string | null): string {
  if (!grade) return 'bg-gray-100 text-gray-500 border-gray-200';
  const letter = grade.charAt(0).toUpperCase();
  return GRADE_COLORS[letter] || 'bg-indigo-100 text-indigo-800 border-indigo-200';
}

export function GradesFeedback({ assignments, submissions, role, userId, onGradeSubmission }: GradesFeedbackProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'graded' | 'pending'>('all');

  // Student: their own submissions grouped by assignment
  const mySubmissions = useMemo(
    () => (role === 'student' ? submissions.filter((s) => s.studentId === userId) : submissions),
    [submissions, role, userId],
  );

  const filteredSubmissions = useMemo(() => {
    if (activeFilter === 'graded') return mySubmissions.filter((s) => s.grade);
    if (activeFilter === 'pending') return mySubmissions.filter((s) => !s.grade);
    return mySubmissions;
  }, [mySubmissions, activeFilter]);

  const gradedCount = mySubmissions.filter((s) => s.grade).length;
  const pendingCount = mySubmissions.filter((s) => !s.grade).length;

  const openGradeModal = (submissionId: string, existingGrade?: string | null, existingFeedback?: string | null) => {
    setSelectedSubmissionId(submissionId);
    setGradeInput(existingGrade || '');
    setFeedbackInput(existingFeedback || '');
    setGradingModalOpen(true);
  };

  const handleGrade = async () => {
    if (!selectedSubmissionId || !gradeInput.trim() || !feedbackInput.trim()) {
      return;
    }
    try {
      setSaving(true);
      await onGradeSubmission(selectedSubmissionId, gradeInput.trim(), feedbackInput.trim());
      setGradingModalOpen(false);
      setSelectedSubmissionId(null);
    } catch (error: any) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (role === 'student') {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Award className="h-8 w-8 text-indigo-600" />
            Grades &amp; Feedback
          </h1>
          <p className="text-gray-500 mt-1">Review your assignment results and teacher feedback.</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-indigo-600">{mySubmissions.length}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Submitted</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-emerald-600">{gradedCount}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Graded</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Awaiting Grade</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5">
          {(['all', 'graded', 'pending'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-sm font-medium transition capitalize',
                activeFilter === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {tab === 'all' ? 'All' : tab === 'graded' ? `Graded (${gradedCount})` : `Pending (${pendingCount})`}
            </button>
          ))}
        </div>

        {/* Submission Cards */}
        <div className="space-y-4">
          {filteredSubmissions.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No submissions found.</p>
            </div>
          )}
          {filteredSubmissions.map((submission) => {
            const assignment = assignments.find((a) => a.id === submission.assignmentId);
            return (
              <div
                key={submission.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg">{submission.assignmentTitle}</h3>
                    {assignment && (
                      <p className="text-sm text-gray-500 mt-0.5">Due: {assignment.dueDate} · Teacher: {assignment.teacherName}</p>
                    )}
                    {submission.contentText && (
                      <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 line-clamp-3">{submission.contentText}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="text-right shrink-0">
                    {submission.grade ? (
                      <span className={clsx('text-2xl font-extrabold px-4 py-2 rounded-xl border inline-block', gradeColor(submission.grade))}>
                        {submission.grade}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {submission.grade && submission.feedback && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-indigo-700 mb-1">Teacher Feedback</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{submission.feedback}</p>
                      </div>
                    </div>
                    {submission.gradedAt && (
                      <p className="text-xs text-gray-400 mt-2 ml-6">Graded: {new Date(submission.gradedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Teacher / Admin view
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Star className="h-8 w-8 text-amber-500" />
          Grades &amp; Feedback
        </h1>
        <p className="text-gray-500 mt-1">Review and manage all student grades and feedback.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-indigo-600">{submissions.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total Submissions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-emerald-600">{submissions.filter((s) => s.grade).length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Graded</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-amber-600">{submissions.filter((s) => !s.grade).length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Needs Grading</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'graded', 'pending'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition capitalize',
              activeFilter === tab
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            {tab === 'all' ? 'All' : tab === 'graded' ? `Graded (${submissions.filter((s) => s.grade).length})` : `Needs Grading (${submissions.filter((s) => !s.grade).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredSubmissions.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No submissions found.</p>
          </div>
        )}
        {filteredSubmissions.map((submission) => {
          const assignment = assignments.find((a) => a.id === submission.assignmentId);
          return (
            <div key={submission.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{submission.assignmentTitle}</h3>
                    <span className="text-gray-400">·</span>
                    <span className="text-sm text-gray-600 font-medium">{submission.studentName}</span>
                  </div>
                  {assignment && (
                    <p className="text-xs text-gray-500">Due: {assignment.dueDate}</p>
                  )}
                  {submission.contentText && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 line-clamp-2">{submission.contentText}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(submission.submittedAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                  {submission.grade ? (
                    <>
                      <span className={clsx('text-xl font-extrabold px-3 py-1.5 rounded-xl border inline-block', gradeColor(submission.grade))}>
                        {submission.grade}
                      </span>
                      <button
                        onClick={() => openGradeModal(submission.id, submission.grade, submission.feedback)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Edit Grade
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openGradeModal(submission.id)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                    >
                      Grade
                    </button>
                  )}
                </div>
              </div>

              {submission.grade && submission.feedback && (
                <div className="mt-4 border-t border-gray-100 pt-4 flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-700">{submission.feedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grading Modal */}
      {gradingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Grade Submission
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. A, B+, 85/100, Excellent"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-28 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Provide detailed feedback for the student..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setGradingModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                Cancel
              </button>
              <button
                disabled={saving || !gradeInput.trim() || !feedbackInput.trim()}
                onClick={handleGrade}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {saving ? 'Saving...' : 'Save Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Plus, FileText, CheckCircle, Clock, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { AssignmentItem, SubmissionItem } from '@/app/types/models';

interface AssignmentsProps {
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  role: 'admin' | 'teacher' | 'student';
  userId: string;
  onCreateAssignment: (input: { title: string; description: string; dueDate: string }) => Promise<void>;
  onSubmitAssignment: (assignmentId: string, input: { file?: File | null; contentText?: string }) => Promise<void>;
  onGradeSubmission: (submissionId: string, grade: string, feedback: string) => Promise<void>;
  backendBaseUrl?: string;
}

export function Assignments({
  assignments,
  submissions,
  role,
  userId,
  onCreateAssignment,
  onSubmitAssignment,
  onGradeSubmission,
  backendBaseUrl = 'http://localhost:4000',
}: AssignmentsProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId],
  );

  const assignmentSubmissions = useMemo(
    () => submissions.filter((s) => s.assignmentId === selectedAssignmentId),
    [submissions, selectedAssignmentId],
  );

  const mySubmission = useMemo(
    () => assignmentSubmissions.find((s) => s.studentId === userId) || null,
    [assignmentSubmissions, userId],
  );

  const openGradeModal = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setGradeInput('');
    setFeedbackInput('');
    setIsGradingModalOpen(true);
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title || !newAssignment.description || !newAssignment.dueDate) {
      toast.error('Please complete all assignment fields.');
      return;
    }

    try {
      setSaving(true);
      await onCreateAssignment(newAssignment);
      setIsCreateModalOpen(false);
      setNewAssignment({ title: '', description: '', dueDate: '' });
      toast.success('Assignment posted successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create assignment.');
    } finally {
      setSaving(false);
    }
  };

  const handleStudentSubmit = async () => {
    if (!selectedAssignmentId) {
      return;
    }

    if (!submissionText.trim() && !submissionFile) {
      toast.error('Please attach a file or add submission text.');
      return;
    }

    try {
      setSaving(true);
      await onSubmitAssignment(selectedAssignmentId, {
        file: submissionFile,
        contentText: submissionText.trim() || undefined,
      });
      setSubmissionText('');
      setSubmissionFile(null);
      toast.success('Submission saved successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit assignment.');
    } finally {
      setSaving(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedSubmissionId || !gradeInput.trim() || !feedbackInput.trim()) {
      toast.error('Please provide both grade and feedback.');
      return;
    }

    try {
      setSaving(true);
      await onGradeSubmission(selectedSubmissionId, gradeInput.trim(), feedbackInput.trim());
      setIsGradingModalOpen(false);
      setSelectedSubmissionId(null);
      toast.success('Grade and feedback saved.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to grade submission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Assignment Management</h2>
          <p className="text-gray-500">Post, submit, grade, and view feedback</p>
        </div>
        {(role === 'teacher' || role === 'admin') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="h-4 w-4" />
            Create Assignment
          </button>
        )}
      </div>

      <div className="flex gap-6 h-full min-h-[520px]">
        <div className="w-1/3 border-r border-gray-200 pr-6 overflow-y-auto">
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const count = submissions.filter((s) => s.assignmentId === assignment.id).length;
              return (
                <div
                  key={assignment.id}
                  onClick={() => setSelectedAssignmentId(assignment.id)}
                  className={clsx(
                    'p-4 rounded-xl border cursor-pointer transition group hover:shadow-md',
                    selectedAssignmentId === assignment.id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-gray-100 hover:border-gray-200',
                  )}
                >
                  <div className="font-semibold text-gray-800">{assignment.title}</div>
                  <div className="text-sm text-gray-500 mt-2 line-clamp-2">{assignment.description}</div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {assignment.dueDate}
                    </span>
                    {(role === 'teacher' || role === 'admin') && (
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-500">{count} subs</span>
                    )}
                  </div>
                </div>
              );
            })}
            {assignments.length === 0 && <div className="text-sm text-gray-500">No assignments yet.</div>}
          </div>
        </div>

        <div className="flex-1">
          {!selectedAssignment && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
              <FileText className="h-12 w-12 mb-2 opacity-20" />
              <p>Select an assignment to view details</p>
            </div>
          )}

          {selectedAssignment && (
            <div className="h-full flex flex-col gap-5">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedAssignment.title}</h3>
                <p className="text-gray-600 leading-relaxed">{selectedAssignment.description}</p>
                <div className="mt-4 text-sm text-indigo-600 font-medium">Due date: {selectedAssignment.dueDate}</div>
              </div>

              {role === 'student' && (
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex-1">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Your Submission
                  </h4>

                  {mySubmission ? (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-6 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <h5 className="font-bold text-green-800 text-lg">Submitted</h5>
                      <p className="text-green-700 mt-1">Your work has been uploaded.</p>
                      {mySubmission.fileName && (
                        <a
                          className="inline-flex items-center gap-2 mt-3 text-indigo-600 hover:text-indigo-700"
                          href={`${backendBaseUrl}${mySubmission.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download className="h-4 w-4" />
                          {mySubmission.fileName}
                        </a>
                      )}
                      <div className="mt-4 border-t border-green-200 pt-4">
                        {mySubmission.grade ? (
                          <>
                            <div className="text-xl font-bold text-indigo-600">Grade: {mySubmission.grade}</div>
                            <p className="mt-2 text-sm text-gray-700">Feedback: {mySubmission.feedback}</p>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border">Pending grading</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <textarea
                        className="w-full h-28 border border-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Optional notes about your submission"
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                      />
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Attach file (PDF, DOC, DOCX, TXT)</label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2"
                        />
                      </div>
                      <button
                        disabled={saving}
                        onClick={handleStudentSubmit}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                      >
                        Submit Assignment
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(role === 'teacher' || role === 'admin') && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700 flex justify-between">
                    <span>Student Submissions</span>
                    <span className="text-sm font-normal text-gray-500">{assignmentSubmissions.length} total</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {assignmentSubmissions.length === 0 && <div className="text-center text-gray-400 py-10">No submissions yet</div>}
                    {assignmentSubmissions.map((submission) => (
                      <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-gray-800">{submission.studentName}</div>
                            {submission.contentText && <div className="text-sm text-gray-500 mt-1">{submission.contentText}</div>}
                            {submission.fileName && (
                              <a
                                className="inline-flex items-center gap-2 mt-2 text-indigo-600 hover:text-indigo-700 text-sm"
                                href={`${backendBaseUrl}${submission.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="h-4 w-4" />
                                {submission.fileName}
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            {submission.grade ? (
                              <div className="space-y-1">
                                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold inline-block">{submission.grade}</div>
                                <div className="text-xs text-gray-500">{submission.feedback}</div>
                              </div>
                            ) : (
                              <button
                                onClick={() => openGradeModal(submission.id)}
                                className="bg-white border border-indigo-200 text-indigo-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-indigo-50 transition"
                              >
                                Grade + Feedback
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Create New Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-32 resize-none"
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button disabled={saving} onClick={handleCreateAssignment} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {isGradingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Grade Submission</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade (e.g., 95 or Pass)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 h-28 resize-none"
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsGradingModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button disabled={saving} onClick={handleGrade} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                Save Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

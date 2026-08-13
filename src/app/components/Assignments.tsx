import React, { useMemo, useRef, useState } from 'react';
import { Plus, FileText, CheckCircle, Clock, Paperclip, Download, X, BookOpen, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { AssignmentItem, SubmissionItem } from '@/app/types/models';

/** Resolve a file URL: absolute URLs (Cloudinary) are used as-is; relative paths get backendBaseUrl prepended. */
function resolveFileUrl(url: string, backendBaseUrl: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${backendBaseUrl}${url}`;
}

/** Force download from Cloudinary by injecting fl_attachment transformation flag. */
function toDownloadUrl(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  return url.replace(/\/upload\/(?!fl_attachment)/, '/upload/fl_attachment/');
}

interface AssignmentsProps {
  assignments: AssignmentItem[];
  submissions: SubmissionItem[];
  role: 'admin' | 'teacher' | 'student';
  userId: string;
  students?: { id: string; name: string }[];
  onCreateAssignment: (input: { title: string; description: string; dueDate: string; attachmentFile?: File | null; rubricFile?: File | null; assignedStudentIds?: string[] }) => Promise<void>;
  onSubmitAssignment: (assignmentId: string, input: { file?: File | null; contentText?: string }) => Promise<void>;
  onGradeSubmission: (submissionId: string, grade: string, feedback: string) => Promise<void>;
  onToggleClose?: (assignmentId: string, isClosed: boolean) => Promise<void>;
  backendBaseUrl?: string;
}

export function Assignments({
  assignments,
  submissions,
  role,
  userId,
  students = [],
  onCreateAssignment,
  onSubmitAssignment,
  onGradeSubmission,
  onToggleClose,
  backendBaseUrl = 'http://localhost:4000',
}: AssignmentsProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ALLOWED_ACCEPT = ALLOWED_EXTENSIONS.join(',');

  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
  });
  const [newAssignmentFile, setNewAssignmentFile] = useState<File | null>(null);
  const assignmentFileRef = useRef<HTMLInputElement>(null);
  const [newRubricFile, setNewRubricFile] = useState<File | null>(null);
  const rubricFileRef = useRef<HTMLInputElement>(null);

  const [assignToAll, setAssignToAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const fuzzyMatch = (name: string, query: string): { match: boolean; indices: number[] } => {
    if (!query.trim()) return { match: true, indices: [] };
    const lName = name.toLowerCase();
    const lQuery = query.toLowerCase().trim();
    const indices: number[] = [];
    let qi = 0;
    for (let i = 0; i < lName.length && qi < lQuery.length; i++) {
      if (lName[i] === lQuery[qi]) {
        indices.push(i);
        qi++;
      }
    }
    return { match: qi === lQuery.length, indices };
  };

  const renderHighlighted = (name: string, indices: number[]) => {
    if (indices.length === 0) return <span>{name}</span>;
    const parts: React.ReactNode[] = [];
    let last = 0;
    indices.forEach((idx, i) => {
      if (idx > last) parts.push(<span key={`t${i}`}>{name.slice(last, idx)}</span>);
      parts.push(<span key={`h${i}`} className="text-indigo-600 font-semibold">{name[idx]}</span>);
      last = idx + 1;
    });
    if (last < name.length) parts.push(<span key="end">{name.slice(last)}</span>);
    return <>{parts}</>;
  };

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

    if (!assignToAll && selectedStudentIds.length === 0) {
      toast.error('Please select at least one student or assign to all.');
      return;
    }

    try {
      setSaving(true);
      await onCreateAssignment({
        ...newAssignment,
        attachmentFile: newAssignmentFile,
        rubricFile: newRubricFile,
        assignedStudentIds: assignToAll ? undefined : selectedStudentIds,
      });
      setIsCreateModalOpen(false);
      setNewAssignment({ title: '', description: '', dueDate: '' });
      setNewAssignmentFile(null);
      setNewRubricFile(null);
      if (assignmentFileRef.current) assignmentFileRef.current.value = '';
      if (rubricFileRef.current) rubricFileRef.current.value = '';
      setAssignToAll(true);
      setSelectedStudentIds([]);
      setStudentSearch('');
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
      toast.error('Please write your answer or attach a document file.');
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
        <div className="w-1/3 border-r border-gray-200 pr-6 overflow-y-auto h-full">
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
                    <div className="flex items-center gap-2">
                      {assignment.isClosed && (
                        <span className="bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-medium">Closed</span>
                      )}
                      {(role === 'teacher' || role === 'admin') && (
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-500">{count} subs</span>
                      )}
                    </div>
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedAssignment.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{selectedAssignment.description}</p>
                  </div>
                  {(role === 'teacher' || role === 'admin') && onToggleClose && (
                    <button
                      onClick={() => onToggleClose(selectedAssignment.id, !selectedAssignment.isClosed)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedAssignment.isClosed
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {selectedAssignment.isClosed ? '🔓 Re-open' : '🔒 Close Submissions'}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm items-center">
                  <span className="text-indigo-600 font-medium">Due: {selectedAssignment.dueDate}</span>
                  {selectedAssignment.isClosed && (
                    <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">Closed</span>
                  )}
                  {selectedAssignment.attachmentFileName && selectedAssignment.attachmentUrl && (
                    <a
                      href={toDownloadUrl(resolveFileUrl(selectedAssignment.attachmentUrl, backendBaseUrl))}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedAssignment.attachmentFileName}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {selectedAssignment.attachmentFileName}
                    </a>
                  )}
                  {selectedAssignment.rubricFileName && selectedAssignment.rubricUrl && (
                    <a
                      href={toDownloadUrl(selectedAssignment.rubricUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedAssignment.rubricFileName}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Rubric: {selectedAssignment.rubricFileName}
                    </a>
                  )}
                </div>
              </div>

              {role === 'student' && (
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex-1">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-indigo-500" />
                    Your Submission
                  </h4>

                  {selectedAssignment.isClosed && !mySubmission ? (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-6 text-center">
                      <p className="text-red-700 font-semibold text-lg">🔒 Submissions Closed</p>
                      <p className="text-red-500 text-sm mt-1">The teacher has closed this assignment.</p>
                    </div>
                  ) : mySubmission ? (
                    <>
                      <div className="bg-green-50 border border-green-100 rounded-lg p-6 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <h5 className="font-bold text-green-800 text-lg">Submitted</h5>
                        <p className="text-green-700 mt-1">Your work has been received.</p>
                        {mySubmission.contentText && (
                          <p className="mt-3 text-sm text-gray-600 bg-white border border-green-200 rounded-lg p-3 text-left">{mySubmission.contentText}</p>
                        )}
                        {mySubmission.fileName && mySubmission.fileUrl && (
                          <a
                            href={toDownloadUrl(resolveFileUrl(mySubmission.fileUrl, backendBaseUrl))}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={mySubmission.fileName}
                            className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 underline"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            {mySubmission.fileName}
                          </a>
                        )}
                      </div>

                      {(mySubmission.grade || mySubmission.feedback) ? (
                        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-bold text-blue-800">Grade and Feedback</h5>
                          </div>
                          {mySubmission.grade && (
                            <div className="text-sm font-semibold">Grade: <span className="text-blue-600">{mySubmission.grade}</span></div>
                          )}
                          {mySubmission.feedback && (
                            <div className="mt-2 text-sm text-gray-700 bg-white border border-gray-100 rounded-lg p-3">{mySubmission.feedback}</div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-gray-500">View your grade and feedback in <span className="font-semibold text-indigo-600">Grades &amp; Feedback</span>.</p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Answer / Response</label>
                        <textarea
                          className="w-full h-28 border border-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          placeholder="Type your answer, response, or notes here..."
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Attach Document (optional)</label>
                        <div className="flex items-center gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept={ALLOWED_ACCEPT}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              if (f) {
                                const ext = '.' + f.name.split('.').pop()!.toLowerCase();
                                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                                  toast.error('Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX files are allowed.');
                                  e.target.value = '';
                                  return;
                                }
                              }
                              setSubmissionFile(f);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                          >
                            <Paperclip className="h-4 w-4" />
                            {submissionFile ? submissionFile.name : 'Choose File'}
                          </button>
                          {submissionFile && (
                            <button type="button" onClick={() => { setSubmissionFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-red-500">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Accepted: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, PNG, GIF, WEBP</p>
                      </div>
                      <button
                        disabled={saving}
                        onClick={handleStudentSubmit}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                      >
                        {saving ? 'Submitting...' : 'Submit Assignment'}
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
                            {submission.contentText && <div className="text-sm text-gray-500 mt-1 line-clamp-2">{submission.contentText}</div>}
                            {submission.fileName && submission.fileUrl && (
                              <a
                                href={toDownloadUrl(resolveFileUrl(submission.fileUrl, backendBaseUrl))}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={submission.fileName}
                                className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                              >
                                <Download className="h-3 w-3" />
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-bold">Create New Assignment</h3>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attach File for Students (optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={assignmentFileRef}
                    type="file"
                    accept={ALLOWED_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        const ext = '.' + f.name.split('.').pop()!.toLowerCase();
                        if (!ALLOWED_EXTENSIONS.includes(ext)) {
                          toast.error('Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX files are allowed.');
                          e.target.value = '';
                          return;
                        }
                      }
                      setNewAssignmentFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => assignmentFileRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    <Paperclip className="h-4 w-4" />
                    {newAssignmentFile ? newAssignmentFile.name : 'Choose File'}
                  </button>
                  {newAssignmentFile && (
                    <button type="button" onClick={() => { setNewAssignmentFile(null); if (assignmentFileRef.current) assignmentFileRef.current.value = ''; }} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Students will see a download link.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rubric / Grading Criteria (optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={rubricFileRef}
                    type="file"
                    accept={ALLOWED_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        const ext = '.' + f.name.split('.').pop()!.toLowerCase();
                        if (!ALLOWED_EXTENSIONS.includes(ext)) {
                          toast.error('Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX files are allowed.');
                          e.target.value = '';
                          return;
                        }
                      }
                      setNewRubricFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => rubricFileRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-emerald-200 rounded-lg text-sm text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    <BookOpen className="h-4 w-4" />
                    {newRubricFile ? newRubricFile.name : 'Choose Rubric'}
                  </button>
                  {newRubricFile && (
                    <button type="button" onClick={() => { setNewRubricFile(null); if (rubricFileRef.current) rubricFileRef.current.value = ''; }} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Students can download this to understand grading criteria.</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Users className="h-4 w-4" />
                  Assign To
                </label>
                <div className="flex gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setAssignToAll(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                      assignToAll
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    All Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignToAll(false)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                      !assignToAll
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Specific Students
                  </button>
                </div>
                {!assignToAll && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                      <Search className="h-4 w-4 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        className="flex-1 text-sm outline-none bg-transparent"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                      {selectedStudentIds.length > 0 && (
                        <span className="text-xs text-indigo-600 font-medium shrink-0">{selectedStudentIds.length} selected</span>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                      {(() => {
                        const filtered = students
                          .map((s) => ({ ...s, ...fuzzyMatch(s.name, studentSearch) }))
                          .filter((s) => s.match);
                        if (filtered.length === 0) {
                          return <div className="text-center text-gray-400 text-sm py-4">No students found</div>;
                        }
                        return filtered.map((student) => {
                          const checked = selectedStudentIds.includes(student.id);
                          return (
                            <label
                              key={student.id}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition select-none ${
                                checked ? 'bg-indigo-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedStudentIds((prev) =>
                                    checked ? prev.filter((id) => id !== student.id) : [...prev, student.id],
                                  )
                                }
                                className="accent-indigo-600 w-4 h-4 shrink-0"
                              />
                              <span className="text-sm text-gray-700">
                                {renderHighlighted(student.name, student.indices)}
                              </span>
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
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

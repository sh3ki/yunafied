import React, { useState } from 'react';
import { ClipboardCheck, Copy, Eye, Pencil, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AuthUser, UserRole } from '@/app/types/models';

type QuestionType = 'multiple-choice' | 'true-false' | 'identification';
type AssessmentType = 'Pre-assessment' | 'Post-assessment';
type Question = { id: string; type: QuestionType; prompt: string; options: string[]; answer: string; points: number };
type Template = { id: string; title: string; subject: string; level: string; type: AssessmentType; date: string; questions: Question[]; status: 'Published' | 'Draft' };
type Assignment = { id: string; templateId: string; title: string; teacherId: string; studentIds: string[]; dueDate: string; questions: Question[]; completed: string[]; scores: Record<string, number> };

const seedQuestions: Question[] = [
  { id: 'q1', type: 'multiple-choice', prompt: 'Which word is a noun?', options: ['Quickly', 'Teacher', 'Run', 'Beautiful'], answer: 'Teacher', points: 1 },
  { id: 'q2', type: 'true-false', prompt: 'A sentence begins with a capital letter.', options: ['True', 'False'], answer: 'True', points: 1 },
  { id: 'q3', type: 'identification', prompt: 'Complete the sentence: She ___ to school every day.', options: [], answer: 'goes', points: 1 },
];

const seedTemplates: Template[] = [
  { id: 't1', title: 'English Beginner Pre-Assessment', subject: 'English', level: 'Beginner', type: 'Pre-assessment', date: '2026-09-01', questions: seedQuestions, status: 'Published' },
  { id: 't2', title: 'English Beginner Post-Assessment', subject: 'English', level: 'Beginner', type: 'Post-assessment', date: '2026-09-01', questions: seedQuestions.map((q, i) => ({ ...q, id: `post-${i}`, prompt: i === 0 ? 'Which word describes a person, place, or thing?' : i === 1 ? 'A verb shows an action or state of being.' : 'Complete the sentence: They ___ English together.', answer: i === 0 ? 'Teacher' : i === 1 ? 'True' : 'study' })), status: 'Published' },
];

function scoreAttempt(questions: Question[], answers: Record<string, string>) {
  const earned = questions.reduce((sum, q) => sum + (answers[q.id]?.trim().toLowerCase() === q.answer.trim().toLowerCase() ? q.points : 0), 0);
  const total = questions.reduce((sum, q) => sum + q.points, 0);
  return { earned, total, percent: total ? Math.round((earned / total) * 100) : 0 };
}

export function Assessments({ role, userId, users }: { role: UserRole; userId: string; users: AuthUser[] }) {
  const [templates, setTemplates] = useState(seedTemplates);
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: 'a1', templateId: 't1', title: 'English Beginner Pre-Assessment', teacherId: 'teacher-1', studentIds: users.filter(u => u.role === 'student').map(u => u.id), dueDate: '2026-09-15', questions: seedQuestions, completed: [], scores: {} },
  ]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<'templates' | 'assignments'>('templates');
  const students = users.filter(u => u.role === 'student');

  const activeAssignment = assignments.find(a => a.id === activeId);
  const myAssignments = assignments.filter(a => role !== 'teacher' || a.teacherId === userId);
  const completed = activeAssignment?.completed.includes(userId);

  const createTemplate = () => {
    const next: Template = { id: `t${Date.now()}`, title: 'New English Assessment', subject: 'English', level: 'Beginner', type: 'Pre-assessment', date: new Date().toISOString().slice(0, 10), questions: [{ id: `q${Date.now()}`, type: 'multiple-choice', prompt: 'New question', options: ['Option A', 'Option B'], answer: 'Option A', points: 1 }], status: 'Draft' };
    setTemplates(prev => [next, ...prev]);
    toast.success('Assessment template created');
  };

  const assignTemplate = (template: Template) => {
    const selected = students.map(s => s.id);
    setAssignments(prev => [{ id: `a${Date.now()}`, templateId: template.id, title: template.title, teacherId: userId, studentIds: selected, dueDate: template.date, questions: template.questions, completed: [], scores: {} }, ...prev]);
    setTab('assignments');
    toast.success('Assessment assigned to all assigned students');
  };

  const submit = () => {
    if (!activeAssignment) return;
    const result = scoreAttempt(activeAssignment.questions, answers);
    setAssignments(prev => prev.map(a => a.id === activeAssignment.id ? { ...a, completed: [...new Set([...a.completed, userId])], scores: { ...a.scores, [userId]: result.percent } } : a));
    setActiveId(null); setAnswers({});
    toast.success(`Assessment submitted — ${result.percent}%`);
  };

  const updateQuestion = (templateId: string, questionId: string, field: 'prompt' | 'answer', value: string) => setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, questions: t.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q) } : t));
  const updateTemplate = (templateId: string, field: 'title' | 'subject' | 'level' | 'type' | 'date', value: string) => setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, [field]: value } as Template : t));
  const updateAssignmentQuestion = (assignmentId: string, questionId: string, field: 'prompt' | 'answer', value: string) => setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, questions: a.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q) } : a));

  if (activeAssignment && role === 'student') return <div className="p-4 md:p-8 max-w-3xl mx-auto"><button className="text-sm text-violet-600 mb-5" onClick={() => setActiveId(null)}>← Back to assessments</button><div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"><div className="flex justify-between items-start mb-7"><div><p className="text-xs uppercase tracking-wide text-violet-600 font-bold">{activeAssignment.questions.length} questions</p><h1 className="text-2xl font-bold text-gray-800 mt-1">{activeAssignment.title}</h1><p className="text-sm text-gray-500 mt-1">Automatic scoring · Due {activeAssignment.dueDate}</p></div><ClipboardCheck className="text-violet-500" /></div>{activeAssignment.questions.map((q, i) => <div key={q.id} className="border-t border-gray-100 py-5"><p className="font-semibold text-gray-800 mb-3">{i + 1}. {q.prompt}</p>{q.type === 'identification' ? <input className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Type your answer" value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} /> : <div className="space-y-2">{q.options.map(option => <label key={option} className={`flex items-center gap-3 border rounded-lg px-3 py-3 cursor-pointer ${answers[q.id] === option ? 'border-violet-500 bg-violet-50' : 'border-gray-200'}`}><input type="radio" name={q.id} checked={answers[q.id] === option} onChange={() => setAnswers({ ...answers, [q.id]: option })} />{option}</label>)}</div>}</div>)}<button onClick={submit} className="w-full bg-violet-600 text-white rounded-lg py-3 font-semibold mt-3">Submit assessment</button></div></div>;

  return <div className="p-4 md:p-8"><div className="flex flex-wrap items-start justify-between gap-4 mb-7"><div><p className="text-sm text-violet-600 font-semibold">Assessment Center</p><h1 className="text-2xl md:text-3xl font-bold text-gray-800">{role === 'admin' ? 'Assessment Templates' : role === 'teacher' ? 'Assessments' : 'My Assessments'}</h1><p className="text-gray-500 mt-1">{role === 'admin' ? 'Create standardized English assessments for every learning level.' : role === 'teacher' ? 'Assign assessments and monitor student performance.' : 'Complete your assessments and track your progress.'}</p></div>{role === 'admin' && <button onClick={createTemplate} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg font-semibold"><Plus size={18} /> New template</button>}</div>
    <div className="flex gap-2 border-b border-gray-200 mb-6"><button onClick={() => setTab('templates')} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === 'templates' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500'}`}>{role === 'student' ? 'Available assessments' : 'Templates'}</button>{role !== 'admin' && <button onClick={() => setTab('assignments')} className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === 'assignments' ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500'}`}>Performance</button>}</div>
    {tab === 'templates' && role !== 'student' && <div className="grid md:grid-cols-2 gap-4">{templates.map(t => <div key={t.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5"><div className="flex justify-between"><div className="flex-1"><span className={`text-xs font-bold px-2 py-1 rounded-full ${t.type === 'Pre-assessment' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>{t.type}</span>{role === 'admin' ? <div className="grid gap-2 mt-3"><input className="font-bold text-gray-800 border-b border-gray-200 py-1 outline-none" value={t.title} onChange={e => updateTemplate(t.id, 'title', e.target.value)} /><div className="grid grid-cols-2 gap-2"><input className="text-sm border rounded px-2 py-1" value={t.subject} onChange={e => updateTemplate(t.id, 'subject', e.target.value)} placeholder="Subject" /><input className="text-sm border rounded px-2 py-1" value={t.level} onChange={e => updateTemplate(t.id, 'level', e.target.value)} placeholder="Level" /></div><div className="grid grid-cols-2 gap-2"><select className="text-sm border rounded px-2 py-1" value={t.type} onChange={e => updateTemplate(t.id, 'type', e.target.value)}><option>Pre-assessment</option><option>Post-assessment</option></select><input type="date" className="text-sm border rounded px-2 py-1" value={t.date} onChange={e => updateTemplate(t.id, 'date', e.target.value)} /></div></div> : <><h3 className="font-bold text-gray-800 mt-3">{t.title}</h3><p className="text-sm text-gray-500">{t.subject} · {t.level} · {t.questions.length} questions</p></>}</div><span className="text-xs text-gray-500">{t.status}</span></div>{role === 'admin' && <div className="mt-5 space-y-3">{t.questions.map(q => <div key={q.id} className="bg-gray-50 rounded-lg p-3"><div className="text-[10px] uppercase text-gray-400 mb-1">{q.type} · {q.points} point</div><input className="w-full bg-transparent text-sm font-medium outline-none" value={q.prompt} onChange={e => updateQuestion(t.id, q.id, 'prompt', e.target.value)} /><input className="w-full bg-transparent text-xs text-violet-600 outline-none mt-1" value={q.answer} onChange={e => updateQuestion(t.id, q.id, 'answer', e.target.value)} placeholder="Correct answer" /></div>)}</div>}<div className="flex gap-2 mt-5"><button onClick={() => role === 'teacher' ? assignTemplate(t) : undefined} className="flex-1 flex justify-center items-center gap-2 bg-violet-600 text-white rounded-lg py-2 text-sm font-semibold">{role === 'teacher' ? <><Copy size={16} /> Use & assign</> : <><Pencil size={16} /> Save template</>}</button><button className="px-3 border border-gray-200 rounded-lg text-gray-500"><Eye size={16} /></button></div></div>)}</div>}
    {tab === 'templates' && role === 'student' && <div className="grid md:grid-cols-2 gap-4">{myAssignments.filter(a => a.studentIds.includes(userId)).map(a => <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3"><div className="bg-violet-100 text-violet-600 p-3 rounded-xl"><ClipboardCheck /></div><div><h3 className="font-bold text-gray-800">{a.title}</h3><p className="text-sm text-gray-500">{a.questions.length} questions · Due {a.dueDate}</p></div></div><button disabled={a.completed.includes(userId)} onClick={() => setActiveId(a.id)} className="w-full mt-5 rounded-lg py-2.5 bg-violet-600 disabled:bg-emerald-100 disabled:text-emerald-700 text-white font-semibold">{a.completed.includes(userId) ? `Completed · ${a.scores[userId]}%` : 'Start assessment'}</button></div>)}</div>}
    {tab === 'assignments' && role !== 'admin' && <div className="grid md:grid-cols-3 gap-4 mb-6"><div className="bg-white rounded-2xl p-5 border border-gray-100"><p className="text-sm text-gray-500">Assigned assessments</p><p className="text-3xl font-bold text-violet-600 mt-1">{myAssignments.length}</p></div><div className="bg-white rounded-2xl p-5 border border-gray-100"><p className="text-sm text-gray-500">Completed</p><p className="text-3xl font-bold text-emerald-600 mt-1">{myAssignments.filter(a => a.completed.length > 0).length}</p></div><div className="bg-white rounded-2xl p-5 border border-gray-100"><p className="text-sm text-gray-500">Average performance</p><p className="text-3xl font-bold text-sky-600 mt-1">{(() => { const values = myAssignments.flatMap(a => Object.values(a.scores)); return values.length ? `${Math.round(values.reduce((x, y) => x + y, 0) / values.length)}%` : '—'; })()}</p></div></div>}
    {tab === 'assignments' && role === 'teacher' && <><div className="grid md:grid-cols-2 gap-4 mb-6">{myAssignments.map(a => <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><div className="flex items-center justify-between mb-3"><div><p className="font-bold text-gray-800">{a.title}</p><p className="text-xs text-gray-500">{a.studentIds.length} students · Due {a.dueDate}</p></div><Pencil size={17} className="text-violet-500" /></div><p className="text-xs text-gray-400 mb-2">Assignment copy — edit questions and answer key</p>{a.questions.map(q => <div key={q.id} className="bg-gray-50 rounded-lg p-2 mb-2"><input className="w-full bg-transparent text-sm outline-none" value={q.prompt} onChange={e => updateAssignmentQuestion(a.id, q.id, 'prompt', e.target.value)} /><input className="w-full bg-transparent text-xs text-violet-600 outline-none mt-1" value={q.answer} onChange={e => updateAssignmentQuestion(a.id, q.id, 'answer', e.target.value)} placeholder="Correct answer" /></div>)}</div>)}</div><div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="p-5 border-b border-gray-100 flex items-center gap-2"><Users size={18} className="text-violet-600" /><h3 className="font-bold text-gray-800">Student performance</h3></div>{students.map(s => { const rows = assignments.filter(a => a.studentIds.includes(s.id)); const scores = rows.flatMap(a => a.scores[s.id] === undefined ? [] : [a.scores[s.id]]); return <div key={s.id} className="flex items-center justify-between px-5 py-4 border-b border-gray-50"><div><p className="font-semibold text-gray-800">{s.fullName}</p><p className="text-xs text-gray-500">{scores.length} completed assessment{scores.length === 1 ? '' : 's'}</p></div><p className="font-bold text-violet-600">{scores.length ? `${Math.round(scores.reduce((x, y) => x + y, 0) / scores.length)}% avg.` : 'Not started'}</p></div>})}</div></>}
  </div>;
}

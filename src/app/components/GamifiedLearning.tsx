import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, Play, Plus, Sparkles, Target, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/app/services/apiClient';
import {
  GamifiedAttemptResultItem,
  GamifiedCategoryItem,
  GamifiedLeaderboardItem,
  GamifiedQuestionItem,
  GamifiedQuizDetailItem,
  GamifiedQuizItem,
  UserRole,
} from '@/app/types/models';

interface GamifiedLearningProps {
  role: UserRole;
  userId: string;
}

interface DraftChoice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface DraftQuestion {
  id: string;
  prompt: string;
  points: number;
  choices: DraftChoice[];
}

interface DraftQuizForm {
  categoryId: string;
  title: string;
  description: string;
  timePerQuestionSeconds: number;
  isPublished: boolean;
  questions: DraftQuestion[];
}

interface AnswerFeedbackState {
  isCorrect: boolean;
  pointsEarned: number;
  speedBonus: number;
  correctChoiceText: string;
}

function makeLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDraftQuestion(): DraftQuestion {
  return {
    id: makeLocalId(),
    prompt: '',
    points: 1000,
    choices: [
      { id: makeLocalId(), text: '', isCorrect: true },
      { id: makeLocalId(), text: '', isCorrect: false },
      { id: makeLocalId(), text: '', isCorrect: false },
      { id: makeLocalId(), text: '', isCorrect: false },
    ],
  };
}

function createDefaultQuizForm(categoryId = ''): DraftQuizForm {
  return {
    categoryId,
    title: '',
    description: '',
    timePerQuestionSeconds: 20,
    isPublished: true,
    questions: [createDraftQuestion()],
  };
}

function shuffleQuestions(questions: GamifiedQuestionItem[]): GamifiedQuestionItem[] {
  const next = [...questions];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function playCountdownTone(secondsLeft: number): void {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.value = 420 + secondsLeft * 40;

  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
  oscillator.onended = () => {
    context.close().catch(() => undefined);
  };
}

export function GamifiedLearning({ role, userId }: GamifiedLearningProps) {
  const canManage = role === 'admin' || role === 'teacher';
  const canPlay = role === 'student';

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<GamifiedCategoryItem[]>([]);
  const [quizzes, setQuizzes] = useState<GamifiedQuizItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<GamifiedLeaderboardItem[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<GamifiedQuizDetailItem | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [quizForm, setQuizForm] = useState<DraftQuizForm>(createDefaultQuizForm());
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playQuestions, setPlayQuestions] = useState<GamifiedQuestionItem[]>([]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [attemptResult, setAttemptResult] = useState<GamifiedAttemptResultItem | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<
    Array<{ questionId: string; selectedChoiceId: string | null; timeRemainingSeconds: number }>
  >([]);
  const [runningScore, setRunningScore] = useState(0);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<AnswerFeedbackState | null>(null);

  const lastCountdownSecondRef = useRef<number | null>(null);

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const categoryRows = await apiClient.listGamifiedCategories();
      setCategories(categoryRows);

      const nextCategoryId = categoryRows[0]?.id || '';
      setSelectedCategoryId((prev) => prev || nextCategoryId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load gamified learning data.');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryScopedData = async (categoryId: string) => {
    if (!categoryId) {
      setQuizzes([]);
      setLeaderboard([]);
      setSelectedQuizId('');
      setActiveQuiz(null);
      return;
    }

    try {
      const [quizRows, leaderboardRows] = await Promise.all([
        apiClient.listGamifiedQuizzes({ categoryId }),
        apiClient.listGamifiedLeaderboard({ categoryId, limit: 10 }),
      ]);

      setQuizzes(quizRows);
      setLeaderboard(leaderboardRows);
      setSelectedQuizId((prev) => {
        if (prev && quizRows.some((quiz) => quiz.id === prev)) {
          return prev;
        }
        return quizRows[0]?.id || '';
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load quizzes and leaderboard.');
    }
  };

  const loadQuizDetail = async (quizId: string) => {
    if (!quizId) {
      setActiveQuiz(null);
      return;
    }

    try {
      const detail = await apiClient.getGamifiedQuiz(quizId);
      setActiveQuiz(detail);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load quiz details.');
      setActiveQuiz(null);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (!quizForm.categoryId && categories[0]) {
      setQuizForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, quizForm.categoryId]);

  useEffect(() => {
    loadCategoryScopedData(selectedCategoryId);
  }, [selectedCategoryId]);

  useEffect(() => {
    loadQuizDetail(selectedQuizId);
  }, [selectedQuizId]);

  const activeQuestion = useMemo(() => {
    if (!quizStarted) {
      return null;
    }
    return playQuestions[currentQuestionIndex] || null;
  }, [playQuestions, currentQuestionIndex, quizStarted]);

  useEffect(() => {
    if (!quizStarted || !timerActive || answered) {
      return;
    }

    if (timeLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [quizStarted, timerActive, answered, timeLeft]);

  useEffect(() => {
    if (!quizStarted || !timerActive || answered) {
      lastCountdownSecondRef.current = null;
      return;
    }

    if (timeLeft <= 0) {
      return;
    }

    if (timeLeft <= 5 && lastCountdownSecondRef.current !== timeLeft) {
      playCountdownTone(timeLeft);
      lastCountdownSecondRef.current = timeLeft;
    }
  }, [quizStarted, timerActive, answered, timeLeft]);

  useEffect(() => {
    if (quizStarted && timerActive && !answered && timeLeft === 0) {
      void handleAnswer(null);
    }
  }, [quizStarted, timerActive, answered, timeLeft]);

  const resetPlayerState = () => {
    setQuizStarted(false);
    setQuizCompleted(false);
    setIsSubmittingAttempt(false);
    setCurrentQuestionIndex(0);
    setPlayQuestions([]);
    setSelectedChoiceId(null);
    setAnswered(false);
    setTimeLeft(activeQuiz?.timePerQuestionSeconds || 20);
    setTimerActive(false);
    setAttemptResult(null);
    setAttemptAnswers([]);
    setRunningScore(0);
    setLastAnswerFeedback(null);
  };

  const startQuiz = () => {
    if (!activeQuiz || !activeQuiz.questions.length) {
      toast.error('This quiz has no questions.');
      return;
    }

    setQuizStarted(true);
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setPlayQuestions(shuffleQuestions(activeQuiz.questions));
    setSelectedChoiceId(null);
    setAnswered(false);
    setAttemptResult(null);
    setAttemptAnswers([]);
    setRunningScore(0);
    setLastAnswerFeedback(null);
    setTimeLeft(activeQuiz.timePerQuestionSeconds);
    setTimerActive(true);
  };

  const finishQuiz = async (
    finalAnswers: Array<{ questionId: string; selectedChoiceId: string | null; timeRemainingSeconds: number }>,
  ) => {
    if (!activeQuiz) {
      return;
    }

    try {
      setIsSubmittingAttempt(true);
      const result = await apiClient.submitGamifiedAttempt(activeQuiz.id, {
        answers: finalAnswers.map((answer) => ({
          questionId: answer.questionId,
          selectedChoiceId: answer.selectedChoiceId,
          timeRemainingSeconds: answer.timeRemainingSeconds,
        })),
      });

      setAttemptResult(result);
      setQuizStarted(false);
      setQuizCompleted(true);
      setTimerActive(false);
      setRunningScore(result.totalScore);
      setLastAnswerFeedback(null);
      setIsSubmittingAttempt(false);

      if (selectedCategoryId) {
        const rows = await apiClient.listGamifiedLeaderboard({ categoryId: selectedCategoryId, limit: 10 });
        setLeaderboard(rows);
      }
      toast.success('Score saved to leaderboard.');
    } catch (error: any) {
      setIsSubmittingAttempt(false);
      toast.error(error.message || 'Failed to submit quiz attempt.');
    }
  };

  const handleAnswer = async (choiceId: string | null) => {
    if (!activeQuestion || answered || !activeQuiz) {
      return;
    }

    const correctChoice = activeQuestion.choices.find((choice) => !!choice.isCorrect);
    const normalizedTimeRemaining = Math.max(0, Math.min(timeLeft, activeQuiz.timePerQuestionSeconds));
    const isCorrect = Boolean(choiceId && correctChoice && choiceId === correctChoice.id);
    const speedRatio = activeQuiz.timePerQuestionSeconds > 0
      ? normalizedTimeRemaining / activeQuiz.timePerQuestionSeconds
      : 0;
    const speedBonus = isCorrect ? Math.round(activeQuestion.points * 0.5 * speedRatio) : 0;
    const pointsEarned = isCorrect ? activeQuestion.points + speedBonus : 0;

    setAnswered(true);
    setSelectedChoiceId(choiceId);
    setTimerActive(false);
    setRunningScore((prev) => prev + pointsEarned);
    setLastAnswerFeedback({
      isCorrect,
      pointsEarned,
      speedBonus,
      correctChoiceText: correctChoice?.text || 'No correct answer configured.',
    });

    const answerPayload = {
      questionId: activeQuestion.id,
      selectedChoiceId: choiceId,
      timeRemainingSeconds: normalizedTimeRemaining,
    };

    const mergedAnswers = [...attemptAnswers.filter((item) => item.questionId !== activeQuestion.id), answerPayload];
    setAttemptAnswers(mergedAnswers);

    window.setTimeout(() => {
      if (currentQuestionIndex < activeQuiz.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setAnswered(false);
        setSelectedChoiceId(null);
        setLastAnswerFeedback(null);
        setTimeLeft(activeQuiz.timePerQuestionSeconds);
        setTimerActive(true);
      } else {
        void finishQuiz(mergedAnswers);
      }
    }, 1200);
  };

  const addCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    try {
      setSavingCategory(true);
      const created = await apiClient.createGamifiedCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
      });

      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCategoryId(created.id);
      setCategoryForm({ name: '', description: '' });
      toast.success('Category created.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category.');
    } finally {
      setSavingCategory(false);
    }
  };

  const setCorrectChoice = (questionId: string, choiceId: string) => {
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        return {
          ...question,
          choices: question.choices.map((choice) => ({
            ...choice,
            isCorrect: choice.id === choiceId,
          })),
        };
      }),
    }));
  };

  const submitQuiz = async () => {
    if (!quizForm.categoryId) {
      toast.error('Please select a category.');
      return;
    }

    if (!quizForm.title.trim()) {
      toast.error('Quiz title is required.');
      return;
    }

    const payload = {
      categoryId: quizForm.categoryId,
      title: quizForm.title.trim(),
      description: quizForm.description.trim(),
      timePerQuestionSeconds: quizForm.timePerQuestionSeconds,
      isPublished: quizForm.isPublished,
      questions: quizForm.questions.map((question) => ({
        prompt: question.prompt.trim(),
        points: question.points,
        choices: question.choices.map((choice) => ({
          text: choice.text.trim(),
          isCorrect: choice.isCorrect,
        })),
      })),
    };

    try {
      setSavingQuiz(true);
      const saved = editingQuizId
        ? await apiClient.updateGamifiedQuiz(editingQuizId, payload)
        : await apiClient.createGamifiedQuiz(payload);

      toast.success(editingQuizId ? 'Quiz updated.' : 'Quiz created.');
      setEditingQuizId(null);
      setQuizForm(createDefaultQuizForm(saved.categoryId));
      setSelectedCategoryId(saved.categoryId);

      const [quizRows, leaderboardRows] = await Promise.all([
        apiClient.listGamifiedQuizzes({ categoryId: saved.categoryId }),
        apiClient.listGamifiedLeaderboard({ categoryId: saved.categoryId, limit: 10 }),
      ]);

      setQuizzes(quizRows);
      setLeaderboard(leaderboardRows);
      setSelectedQuizId(saved.id);
      setActiveQuiz(saved);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save quiz.');
    } finally {
      setSavingQuiz(false);
    }
  };

  const beginEditQuiz = async (quizId: string) => {
    try {
      const detail = await apiClient.getGamifiedQuiz(quizId);
      setEditingQuizId(quizId);
      setSelectedQuizId(quizId);
      setQuizForm({
        categoryId: detail.categoryId,
        title: detail.title,
        description: detail.description,
        timePerQuestionSeconds: detail.timePerQuestionSeconds,
        isPublished: detail.isPublished,
        questions: detail.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          points: question.points,
          choices: question.choices.map((choice) => ({
            id: choice.id,
            text: choice.text,
            isCorrect: Boolean(choice.isCorrect),
          })),
        })),
      });
      setActiveQuiz(detail);
      toast.success('Loaded quiz into editor.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to load quiz for editing.');
    }
  };

  const myLeaderboardEntry = leaderboard.find((item) => item.studentId === userId);

  const optionColorClasses = [
    'bg-indigo-600 hover:bg-indigo-700',
    'bg-violet-600 hover:bg-violet-700',
    'bg-amber-500 hover:bg-amber-600',
    'bg-cyan-600 hover:bg-cyan-700',
    'bg-fuchsia-600 hover:bg-fuchsia-700',
    'bg-slate-600 hover:bg-slate-700',
  ];

  if (loading) {
    return <div className="p-6 text-indigo-600 animate-pulse">Loading gamified learning...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Target className="h-7 w-7 text-green-600" />
          Gamified Learning
        </h1>
        <p className="text-gray-500 mt-1">
          {canManage
            ? 'Create and manage category-based quiz challenges for your learners.'
            : 'Play timed category quizzes and climb the leaderboard.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                resetPlayerState();
              }}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.quizCount} quizzes)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quiz</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={selectedQuizId}
              onChange={(e) => {
                setSelectedQuizId(e.target.value);
                resetPlayerState();
              }}
              disabled={!selectedCategoryId || quizzes.length === 0}
            >
              <option value="">Select quiz</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title} ({quiz.questionCount} items)
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCategoryId ? (
          <p className="text-xs text-gray-500">
            Category leaderboard updates every time students finish a quiz in this subject.
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Create Subject Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Category name (e.g. English Grammar)"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Short description (optional)"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <button
                type="button"
                onClick={addCategory}
                disabled={savingCategory}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingCategory ? 'Saving...' : 'Add Category'}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-800">{editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h2>
                {editingQuizId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuizId(null);
                      setQuizForm(createDefaultQuizForm(selectedCategoryId || categories[0]?.id || ''));
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  className="border rounded-lg px-3 py-2"
                  value={quizForm.categoryId}
                  onChange={(e) => setQuizForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input
                  className="border rounded-lg px-3 py-2"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Quiz title"
                />
              </div>

              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                value={quizForm.description}
                onChange={(e) => setQuizForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Quiz description"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  Timer per question (seconds)
                  <input
                    type="number"
                    className="w-24 border rounded-lg px-2 py-1"
                    min={5}
                    max={120}
                    value={quizForm.timePerQuestionSeconds}
                    onChange={(e) =>
                      setQuizForm((prev) => ({
                        ...prev,
                        timePerQuestionSeconds: Number(e.target.value) || 20,
                      }))
                    }
                  />
                </label>

                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={quizForm.isPublished}
                    onChange={(e) => setQuizForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  />
                  Published (students can play)
                </label>
              </div>

              <div className="space-y-4">
                {quizForm.questions.map((question, questionIndex) => (
                  <div key={question.id} className="border rounded-xl p-4 bg-gray-50/60 space-y-3">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <p className="font-semibold text-gray-800">Question {questionIndex + 1}</p>
                      {quizForm.questions.length > 1 ? (
                        <button
                          type="button"
                          className="text-sm text-red-600 hover:text-red-700"
                          onClick={() =>
                            setQuizForm((prev) => ({
                              ...prev,
                              questions: prev.questions.filter((item) => item.id !== question.id),
                            }))
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Question prompt"
                      value={question.prompt}
                      onChange={(e) =>
                        setQuizForm((prev) => ({
                          ...prev,
                          questions: prev.questions.map((item) =>
                            item.id === question.id ? { ...item, prompt: e.target.value } : item,
                          ),
                        }))
                      }
                    />

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      Points
                      <input
                        type="number"
                        className="w-24 border rounded-lg px-2 py-1"
                        min={100}
                        step={100}
                        value={question.points}
                        onChange={(e) =>
                          setQuizForm((prev) => ({
                            ...prev,
                            questions: prev.questions.map((item) =>
                              item.id === question.id ? { ...item, points: Number(e.target.value) || 1000 } : item,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {question.choices.map((choice, choiceIndex) => (
                        <div key={choice.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={choice.isCorrect}
                            onChange={() => setCorrectChoice(question.id, choice.id)}
                            name={`question-${question.id}-correct`}
                          />
                          <input
                            className="flex-1 border rounded-lg px-3 py-2"
                            placeholder={`Choice ${String.fromCharCode(65 + choiceIndex)}`}
                            value={choice.text}
                            onChange={(e) =>
                              setQuizForm((prev) => ({
                                ...prev,
                                questions: prev.questions.map((item) => {
                                  if (item.id !== question.id) return item;
                                  return {
                                    ...item,
                                    choices: item.choices.map((candidate) =>
                                      candidate.id === choice.id ? { ...candidate, text: e.target.value } : candidate,
                                    ),
                                  };
                                }),
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                      onClick={() =>
                        setQuizForm((prev) => ({
                          ...prev,
                          questions: prev.questions.map((item) => {
                            if (item.id !== question.id) return item;
                            if (item.choices.length >= 6) return item;
                            return {
                              ...item,
                              choices: [...item.choices, { id: makeLocalId(), text: '', isCorrect: false }],
                            };
                          }),
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" /> Add Choice
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                  onClick={() =>
                    setQuizForm((prev) => ({
                      ...prev,
                      questions: [...prev.questions, createDraftQuestion()],
                    }))
                  }
                >
                  <Plus className="h-4 w-4" /> Add Question
                </button>

                <button
                  type="button"
                  disabled={savingQuiz}
                  onClick={submitQuiz}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  {savingQuiz ? 'Saving...' : editingQuizId ? 'Update Quiz' : 'Save Quiz'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Quizzes In Category</h2>
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {quizzes.length === 0 ? (
                  <p className="text-sm text-gray-500">No quizzes yet for this category.</p>
                ) : null}

                {quizzes.map((quiz) => (
                  <div key={quiz.id} className="border rounded-lg p-3 bg-gray-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{quiz.title}</p>
                        <p className="text-xs text-gray-500">{quiz.questionCount} questions • {quiz.timePerQuestionSeconds}s each</p>
                        <p className="text-xs text-gray-500">By {quiz.createdByName}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${quiz.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {quiz.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                      onClick={() => void beginEditQuiz(quiz.id)}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Category Leaderboard</h2>
              <div className="space-y-2">
                {leaderboard.length === 0 ? <p className="text-sm text-gray-500">No scores yet.</p> : null}
                {leaderboard.map((entry, index) => (
                  <div key={entry.studentId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">#{index + 1} {entry.studentName}</p>
                      <p className="text-xs text-gray-500">{entry.bestCorrectAnswers}/{entry.totalQuestions} correct • {entry.attemptCount} attempts</p>
                    </div>
                    <p className="font-bold text-indigo-600">{entry.bestScore}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {canPlay ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[520px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Gimme 5</h2>
                <p className="text-sm text-gray-500">Interactive Quiz Challenge</p>
              </div>
            </div>

            {!activeQuiz ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">
                Select a category and quiz to start playing.
              </div>
            ) : null}

            {activeQuiz && !quizStarted && !quizCompleted ? (
              <div className="text-center py-10">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-10 border-2 border-green-100 max-w-3xl mx-auto"
                >
                  <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg">
                    <Target className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{activeQuiz.title}</h3>
                  <p className="text-gray-600 mb-2">{activeQuiz.questionCount} Questions • {activeQuiz.timePerQuestionSeconds} seconds each</p>
                  <p className="text-sm text-gray-500 mb-8">{activeQuiz.description || 'Answer fast to get higher scores.'}</p>
                  <button
                    onClick={startQuiz}
                    className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition active:scale-95 inline-flex items-center gap-3"
                  >
                    <Play className="h-6 w-6" /> Start Challenge
                  </button>
                </motion.div>
              </div>
            ) : null}

            {activeQuiz && quizStarted && activeQuestion ? (
              <motion.div
                key={activeQuestion.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-4 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-sm">
                        <span className="font-medium text-gray-600">Question {currentQuestionIndex + 1} of {playQuestions.length || activeQuiz.questions.length}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-bold text-indigo-600">Answered: {attemptAnswers.length}</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-bold text-green-700">Score: {runningScore}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / Math.max(playQuestions.length, 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                    timeLeft <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    <Clock className="h-4 w-4" />
                    {timeLeft}s
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-indigo-100 text-center">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
                    {activeQuestion.prompt}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeQuestion.choices.map((choice, index) => {
                    const isSelected = choice.id === selectedChoiceId;
                    const baseColor = optionColorClasses[index % optionColorClasses.length];
                    const isCorrectChoice = Boolean(choice.isCorrect);
                    const isWrongSelected = answered && isSelected && !isCorrectChoice;
                    const answeredClass = isCorrectChoice
                      ? 'bg-green-600 border-green-700'
                      : isWrongSelected
                        ? 'bg-red-600 border-red-700'
                        : 'bg-gray-300 border-gray-300 opacity-70 cursor-not-allowed';

                    return (
                      <button
                        key={choice.id}
                        onClick={() => void handleAnswer(choice.id)}
                        disabled={answered}
                        className={`px-6 py-5 rounded-xl font-bold text-lg transition-all duration-300 text-white border-2 border-transparent shadow-md ${
                          answered
                            ? answeredClass
                            : `${baseColor} hover:scale-[1.01]`
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-left flex-1">{choice.text}</span>
                          {answered && isCorrectChoice ? <Check className="h-6 w-6" /> : null}
                          {isWrongSelected ? <X className="h-6 w-6" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {answered && lastAnswerFeedback ? (
                  <div
                    className={`text-center p-3 rounded-xl font-medium ${
                      lastAnswerFeedback.isCorrect
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {lastAnswerFeedback.isCorrect
                      ? `Correct! +${lastAnswerFeedback.pointsEarned} points (base ${activeQuestion.points} + speed ${lastAnswerFeedback.speedBonus}).`
                      : `Wrong answer. Correct answer: ${lastAnswerFeedback.correctChoiceText}. +0 points.`}
                    <div className="text-xs mt-1 opacity-80">Loading next question...</div>
                  </div>
                ) : null}
              </motion.div>
            ) : null}

            {quizCompleted && attemptResult ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-10 border-2 border-yellow-100 max-w-3xl mx-auto">
                  <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg">
                    <Trophy className="h-12 w-12 text-yellow-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-3">Challenge Complete!</h3>
                  <p className="text-5xl font-bold text-indigo-600 mb-2">{attemptResult.totalScore}</p>
                  <p className="text-gray-600 mb-6">Total Score Saved</p>

                  <div className="flex justify-center gap-4 mb-8">
                    <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                      <p className="text-sm text-gray-500">Correct</p>
                      <p className="text-2xl font-bold text-gray-800">{attemptResult.correctAnswers}/{attemptResult.totalQuestions}</p>
                    </div>
                    <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                      <p className="text-sm text-gray-500">Accuracy</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {Math.round((attemptResult.correctAnswers / attemptResult.totalQuestions) * 100)}%
                      </p>
                    </div>
                  </div>

                  {attemptResult.answers.length ? (
                    <div className="mb-8 text-left">
                      <h4 className="font-bold text-gray-800 mb-3">Answer Review</h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {attemptResult.answers.map((answer, index) => (
                          <div
                            key={answer.questionId}
                            className={`rounded-lg border px-3 py-2 ${
                              answer.isCorrect
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800">
                                {index + 1}. {answer.questionPrompt}
                              </p>
                              <p className={`text-sm font-bold ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                +{answer.pointsEarned}
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Your answer: {answer.selectedChoiceText || 'No answer'}
                            </p>
                            {!answer.isCorrect ? (
                              <p className="text-xs text-gray-700">Correct answer: {answer.correctChoiceText}</p>
                            ) : null}
                            <p className="text-xs text-gray-600 mt-1">
                              Base: {answer.maxPoints} • Speed bonus: +{answer.speedBonus} • Time left: {answer.timeRemainingSeconds}s
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    onClick={startQuiz}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition active:scale-95 inline-flex items-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Play Again
                  </button>
                </div>
              </motion.div>
            ) : null}

            {isSubmittingAttempt ? (
              <p className="text-center text-sm text-gray-500 mt-4">Saving your score...</p>
            ) : null}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Leaderboard</h3>
            {leaderboard.length === 0 ? <p className="text-sm text-gray-500">No scores yet in this category.</p> : null}
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div key={entry.studentId} className="rounded-lg border px-3 py-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">#{index + 1} {entry.studentName}</p>
                    <p className="text-xs text-gray-500">{entry.bestCorrectAnswers}/{entry.totalQuestions} correct • {entry.attemptCount} attempts</p>
                  </div>
                  <p className="font-bold text-indigo-600">{entry.bestScore}</p>
                </div>
              ))}
            </div>

            {myLeaderboardEntry ? (
              <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                <p className="text-xs text-indigo-700 font-semibold">Your Best Score</p>
                <p className="text-lg font-bold text-indigo-800">{myLeaderboardEntry.bestScore}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

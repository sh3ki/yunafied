import React, { useState, useEffect } from 'react';
import { Target, Sparkles, Play, Check, Trophy, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export function GamifiedLearning() {
  // Gimme 5 (formerly Kahoot) State
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Sample Quiz Data
  const quizQuestions = [
    {
      question: "Which sentence uses the present perfect tense correctly?",
      options: [
        "I have went to the store yesterday",
        "I have gone to the store yesterday",
        "I have been to the store three times this week",
        "I have going to the store now"
      ],
      correctAnswer: 2,
      points: 1000
    },
    {
      question: "What is the correct form of the verb in this sentence: 'She ___ to the party last night.'",
      options: ["go", "goes", "went", "going"],
      correctAnswer: 2,
      points: 1000
    },
    {
      question: "Which word is a synonym for 'ubiquitous'?",
      options: ["Rare", "Everywhere", "Ancient", "Colorful"],
      correctAnswer: 1,
      points: 1000
    },
    {
      question: "Identify the subject in the sentence: 'The quick brown fox jumps over the lazy dog.'",
      options: ["The quick brown fox", "jumps", "the lazy dog", "over"],
      correctAnswer: 0,
      points: 1000
    },
    {
      question: "What is the passive voice of: 'The chef cooked the meal'?",
      options: [
        "The meal is cooked by the chef",
        "The meal was cooked by the chef",
        "The meal has been cooked by the chef",
        "The chef has cooked the meal"
      ],
      correctAnswer: 1,
      points: 1000
    }
  ];

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0 && !answered) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !answered) {
      handleAnswer(null);
    }
    return () => clearTimeout(timer);
  }, [isTimerActive, timeLeft, answered]);

  const startQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setScore(0);
    setQuizCompleted(false);
    setAnswered(false);
    setSelectedAnswer(null);
    setTimeLeft(20);
    setIsTimerActive(true);
  };

  const handleAnswer = (answerIndex: number | null) => {
    setAnswered(true);
    setSelectedAnswer(answerIndex);
    setIsTimerActive(false);
    
    if (answerIndex !== null && answerIndex === quizQuestions[currentQuestion].correctAnswer) {
      const timeBonus = Math.floor(timeLeft * 10);
      setScore(score + quizQuestions[currentQuestion].points + timeBonus);
    }

    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setAnswered(false);
        setSelectedAnswer(null);
        setTimeLeft(20);
        setIsTimerActive(true);
      } else {
        setQuizCompleted(true);
        setIsTimerActive(false);
      }
    }, 2000);
  };

  const restartQuiz = () => {
    setQuizStarted(false);
    setQuizCompleted(false);
    setCurrentQuestion(0);
    setScore(0);
    setAnswered(false);
    setSelectedAnswer(null);
    setTimeLeft(20);
    setIsTimerActive(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Target className="h-8 w-8 text-green-600" />
          Gamified Learning
        </h1>
        <p className="text-gray-500 mt-1">Challenge yourself and learn while playing!</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 p-3 rounded-full">
            <Sparkles className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Gimme 5</h2>
            <p className="text-sm text-gray-500">Interactive Quiz Challenge</p>
          </div>
        </div>

        <div className="space-y-6">
          {!quizStarted && !quizCompleted && (
            <div className="text-center py-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-12 border-2 border-green-100 max-w-2xl mx-auto"
              >
                <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg">
                  <Target className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Gimme 5 Challenge</h3>
                <p className="text-gray-600 mb-2">5 Questions • 20 seconds each</p>
                <p className="text-sm text-gray-500 mb-8">Ready to test your knowledge? Get 5/5 correct to win!</p>
                <button
                  onClick={startQuiz}
                  className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition active:scale-95 inline-flex items-center gap-3"
                >
                  <Play className="h-6 w-6" />
                  Start Gimme 5
                </button>
              </motion.div>
            </div>
          )}

          {quizStarted && !quizCompleted && (
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              {/* Progress and Timer Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Question {currentQuestion + 1} of {quizQuestions.length}
                    </span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm font-bold text-indigo-600">Score: {score}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="ml-6">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                    timeLeft <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    <Clock className="h-4 w-4" />
                    {timeLeft}s
                  </div>
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border-2 border-indigo-100 text-center">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
                  {quizQuestions[currentQuestion].question}
                </h3>
              </div>

              {/* Answer Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizQuestions[currentQuestion].options.map((option, index) => {
                  const colors = [
                    { base: 'bg-red-500', hover: 'hover:bg-red-600' },
                    { base: 'bg-blue-500', hover: 'hover:bg-blue-600' },
                    { base: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
                    { base: 'bg-green-500', hover: 'hover:bg-green-600' }
                  ];
                  
                  const isCorrect = index === quizQuestions[currentQuestion].correctAnswer;
                  const isSelected = index === selectedAnswer;
                  
                  let buttonClass = '';
                  if (answered) {
                    if (isCorrect) {
                      buttonClass = 'bg-green-600 text-white border-green-600 shadow-lg scale-105';
                    } else if (isSelected) {
                      buttonClass = 'bg-red-600 text-white border-red-600 shake';
                    } else {
                      buttonClass = 'bg-gray-100 text-gray-400 border-gray-200 opacity-50';
                    }
                  } else {
                    buttonClass = `${colors[index].base} ${colors[index].hover} text-white border-2 border-transparent shadow-md hover:shadow-lg hover:scale-105`;
                  }

                  return (
                    <motion.button
                      key={index}
                      onClick={() => !answered && handleAnswer(index)}
                      disabled={answered}
                      whileHover={!answered ? { scale: 1.02 } : {}}
                      whileTap={!answered ? { scale: 0.98 } : {}}
                      className={`px-6 py-5 rounded-xl font-bold text-lg transition-all duration-300 ${buttonClass} disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-left flex-1">{option}</span>
                        {answered && isCorrect && (
                          <Check className="h-6 w-6" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback Message */}
              {answered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-center p-4 rounded-xl ${
                    selectedAnswer === quizQuestions[currentQuestion].correctAnswer
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <p className="font-bold text-lg">
                    {selectedAnswer === quizQuestions[currentQuestion].correctAnswer
                      ? '🎉 Correct! +' + (quizQuestions[currentQuestion].points + Math.floor(timeLeft * 10)) + ' points'
                      : '❌ Incorrect. The correct answer was: ' + quizQuestions[currentQuestion].options[quizQuestions[currentQuestion].correctAnswer]
                    }
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {quizCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-12 border-2 border-yellow-100 max-w-2xl mx-auto">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg"
                >
                  <Trophy className="h-12 w-12 text-yellow-600" />
                </motion.div>
                <h3 className="text-3xl font-bold text-gray-800 mb-3">Quiz Complete!</h3>
                <div className="mb-6">
                  <p className="text-5xl font-bold text-indigo-600 mb-2">{score}</p>
                  <p className="text-gray-600">Total Points</p>
                </div>
                <div className="flex justify-center gap-4 mb-8">
                  <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                    <p className="text-sm text-gray-500">Answered</p>
                    <p className="text-2xl font-bold text-gray-800">{quizQuestions.length}/{quizQuestions.length}</p>
                  </div>
                  <div className="bg-white rounded-xl px-6 py-3 shadow-sm">
                    <p className="text-sm text-gray-500">Accuracy</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {Math.round((score / (quizQuestions.length * 1200)) * 100)}%
                    </p>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={restartQuiz}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition active:scale-95 inline-flex items-center gap-2"
                  >
                    <Play className="h-5 w-5" />
                    Try Again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

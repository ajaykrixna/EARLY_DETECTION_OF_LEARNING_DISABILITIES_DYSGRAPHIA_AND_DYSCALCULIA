import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Send, Download, RefreshCw, Loader, Volume2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { generateMedicalReport } from '../utils/ReportEngine';

const API_URL = 'http://localhost:8000';

// ----- New Question Set: 9 Tasks Aligned with Syllabus -----
// Q1-Q4: Number Sense
// Q5-Q6: Arithmetic
// Q7-Q8: Working Memory
// Q9: Speeded Response

const QUIZ_QUESTIONS = [
  // SECTION 1: NUMBER SENSE
  { id: 1, question: 'How many dots do you see? (●●●●●)', options: ['4', '5', '6', '7'], correct: '5', difficulty: 'easy', type: 'dots' },
  { id: 2, question: 'Which group has MORE dots? A(●●●●) or B(●●●●●●●)', options: ['A', 'B'], correct: 'B', difficulty: 'easy', type: 'comparison' },
  // SECTION 2: SYMBOLIC COMPARISON
  { id: 3, question: 'Which number is LARGER?', options: ['48', '52'], correct: '52', difficulty: 'medium', type: 'comparison' },
  { id: 4, question: 'Arrange from smallest to largest: 8, 3, 6', options: ['3, 6, 8', '3, 8, 6', '6, 3, 8', '8, 6, 3'], correct: '3, 6, 8', difficulty: 'medium', type: 'ordering' },
  // SECTION 3: ARITHMETIC
  { id: 5, question: 'What is 7 + 5?', options: ['11', '12', '13', '10'], correct: '12', difficulty: 'medium', type: 'arithmetic' },
  { id: 6, question: 'What is 14 − 6?', options: ['7', '8', '9', '6'], correct: '8', difficulty: 'medium', type: 'arithmetic' },
  // SECTION 4: WORKING MEMORY
  { id: 7, question: 'Memorize these numbers: 4 - 9 - 2. (Click to hide and answer)', options: ['4-9-2', '2-9-4', '4-2-9', '9-4-2'], correct: '4-9-2', difficulty: 'hard', type: 'memory_recall' },
  { id: 8, question: 'What comes next? 2, 4, 6, __', options: ['7', '8', '9', '10'], correct: '8', difficulty: 'hard', type: 'sequence' },
  // SECTION 5: SPEED RESPONSE
  { id: 9, question: 'Is 15 greater than 10? (Answer Fast!)', options: ['Yes', 'No'], correct: 'Yes', difficulty: 'easy', type: 'speeded' }
];

export function DyscalculiaTest() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  // startTimes will hold per-question start timestamp (ms)
  const [startTimes, setStartTimes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { t } = useLanguage();
  const { user, token } = useAuth();

  // set start time for first question when component mounts
  useEffect(() => {
    setStartTimes({ 0: Date.now() });
  }, []);

  // when user navigates to a question, ensure its start time is recorded
  useEffect(() => {
    setStartTimes(prev => (prev[currentQuestion] ? prev : { ...prev, [currentQuestion]: Date.now() }));

    // Accessibility: Auto-read question if TTS is enabled
    if (user?.accessibility?.tts) {
      window.speechSynthesis.cancel(); // Stop current speech
      const q = QUIZ_QUESTIONS[currentQuestion];
      const textToSpeak = `Question: ${q.question}. Options are: ${q.options.join(', ')}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      window.speechSynthesis.speak(utterance);
    }
  }, [currentQuestion, user]);

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) setCurrentQuestion(currentQuestion + 1);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
  };

  // compute time taken for a given question index
  const timeTakenFor = (idx: number) => {
    const start = startTimes[idx] ?? startTimes[0] ?? Date.now();
    const end = Date.now();
    return Math.max(0.0, (end - start) / 1000.0);
  };

  const buildResponses = () => {
    return QUIZ_QUESTIONS.map((q, idx) => {
      const ans = answers[idx] ?? '';
      const correct = ans.toString().trim() === q.correct.toString();
      // if we recorded a start time for this index, compute time used; else 0
      const tstart = startTimes[idx] ?? null;
      const tt = tstart ? ((idx === currentQuestion) ? timeTakenFor(idx) : ((startTimes[idx + 1] ?? Date.now()) - tstart) / 1000) : 0;
      return {
        question_id: q.id,
        question: q.question,
        answer: ans,
        correct_answer: q.correct,
        is_correct: correct,
        time_taken: Number((tt || 0).toFixed(2)),
        difficulty: q.difficulty,
        score: correct ? 1 : 0
      };
    });
  };

  const handleSubmit = async () => {
    // ensure all answers present
    if (Object.keys(answers).length < QUIZ_QUESTIONS.length) {
      alert('Please answer all questions before submitting');
      return;
    }

    setLoading(true);
    try {
      const responses = buildResponses();
      const total_questions = responses.length;
      const correct_answers = responses.filter(r => r.is_correct).length;
      const accuracy = (correct_answers / total_questions) * 100;

      const payload = {
        user_id: user?.id ?? 'anonymous',
        timestamp: new Date().toISOString(),
        responses,
        quiz_statistics: {
          total_questions,
          correct_answers,
          accuracy
        }
      };

      const res = await fetch(`${API_URL}/api/dyscalculia/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Server returned ' + res.status);
      const data = await res.json();
      setResult(data);

      // 🔹 Save to Local History (Fallback)
      try {
        if (user?.id) {
          const historyKey = `dyscalculia_history_${user.id}`;
          const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          const newItem = {
            ...data,
            id: data.test_id || `local-${Date.now()}`,
            created_at: new Date().toISOString()
          };
          const updatedHistory = [newItem, ...existingHistory].slice(0, 20);
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        }
      } catch (err) {
        console.warn("Failed to save local dyscalculia history", err);
      }
    } catch (err: any) {
      console.error('Error submitting quiz:', err);
      alert('Error submitting quiz. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setStartTimes({ 0: Date.now() });
    setResult(null);
  };

  const getRiskColor = (className: string) => {
    if (className === 'Normal') return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
    if (className === 'Low') return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (className === 'High') return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-300';
  };

  const progress = ((Object.keys(answers).length / QUIZ_QUESTIONS.length) * 100) || 0;

  const handleDownloadReport = async () => {
    if (!result) return;

    try {
      generateMedicalReport({
        test_id: result.test_id || `DSC-${Date.now()}`,
        test_type: 'Dyscalculia Number Sense Assessment',
        prediction_class: result.prediction_class || 'Unknown',
        confidence_score: result.confidence_score || 0,
        model_version: result.model_version || '1.1',
        created_at: new Date().toISOString(),
        patient_name: user?.full_name || 'Anonymous Patient',
        extra_details: result.quiz_statistics
      });
    } catch (e) {
      console.error("Report generation failed:", e);
      alert("Failed to generate report. Please try again.");
    }
  };

  if (result) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Result view unchanged - uses result.prediction_class and result.confidence_score */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6 animate-scale-in">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t.dyscalculia.result}</h2>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t.dyscalculia.prediction}</h3>
              <div className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold text-lg ${getRiskColor(result.prediction_class)}`}>
                {result.prediction_class}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.dyscalculia.confidence}</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div className="bg-green-600 h-4 rounded-full transition-all" style={{ width: `${result.confidence_score * 100}%` }} />
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{(result.confidence_score * 100).toFixed(1)}%</span>
              </div>
            </div>

            {result.quiz_statistics && (
              <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{result.quiz_statistics.total_questions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Correct Answers</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.quiz_statistics.correct_answers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t.dyscalculia.accuracy}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.quiz_statistics.accuracy.toFixed(1)}%</p>
                </div>
              </div>
            )}

            {result.all_probabilities && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">All Probabilities</h4>
                <div className="space-y-2">
                  {Object.entries(result.all_probabilities).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                      <span className="text-sm">{key}:</span>
                      <span className="text-sm font-medium">{(value * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={handleReset} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              {t.dyscalculia.takeAnother}
            </button>
            <button
              onClick={handleDownloadReport}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center disabled:opacity-50 text-gray-700 dark:text-gray-200"
            >
              <Download className="h-5 w-5 mr-2" />
              {t.dyscalculia.downloadReport}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <p className="text-sm text-blue-900 dark:text-blue-200 text-center">{t.results.disclaimer}</p>
        </div>
      </div>
    );
  }

  const question = QUIZ_QUESTIONS[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-scale-in">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t.dyscalculia.title}</h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">{currentQuestion + 1} / {QUIZ_QUESTIONS.length}</span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="space-y-6">
          <div key={currentQuestion} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{question.question}</h3>
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  const textToSpeak = `Question: ${question.question}. Options are: ${question.options.join(', ')}`;
                  const utterance = new SpeechSynthesisUtterance(textToSpeak);
                  window.speechSynthesis.speak(utterance);
                }}
                className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors bg-gray-100/50 dark:bg-gray-800 rounded-full"
                title="Read Out Loud"
              >
                <Volume2 size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {question.options.map((option) => (
                <button key={option} onClick={() => handleAnswer(option)} className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQuestion] === option ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-500 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 text-gray-900 dark:text-gray-200'}`}>
                  <span className="font-medium">{option}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={handlePrevious} disabled={currentQuestion === 0} className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-gray-700 dark:text-gray-200">
              <ChevronLeft className="h-5 w-5 mr-2" />
              {t.dyscalculia.prevQuestion}
            </button>

            {currentQuestion === QUIZ_QUESTIONS.length - 1 ? (
              <button onClick={handleSubmit} disabled={loading || Object.keys(answers).length < QUIZ_QUESTIONS.length} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center">
                {loading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    {t.dyscalculia.analyzing}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    {t.dyscalculia.submit}
                  </>
                )}
              </button>
            ) : (
              <button onClick={handleNext} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center">
                {t.dyscalculia.nextQuestion}
                <ChevronRight className="h-5 w-5 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <p className="text-sm text-blue-900 dark:text-blue-200"><strong>{t.dyscalculia.instructions}</strong> {t.results.disclaimer}</p>
      </div>
    </div>
  );
}

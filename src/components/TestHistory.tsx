import { useEffect, useState } from 'react';
import { Calendar, TrendingUp, FileText, Brain, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { generateMedicalReport } from '../utils/ReportEngine';

const API_URL = 'http://localhost:8000';

interface TestHistoryProps {
  userId?: string;
}

export function TestHistory({ userId }: TestHistoryProps) {
  const [dysgraphiaTests, setDysgraphiaTests] = useState<any[]>([]);
  const [dyscalculiaTests, setDyscalculiaTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { t } = useLanguage();
  const { user, token } = useAuth();

  const loadTests = async () => {
    try {
      const targetId = userId || user?.id;
      if (!targetId) return;

      // 1. Load Local History (Fallback) - Only for current user
      const isCurrentUser = !userId || userId === user?.id;
      const historyKeyG = user?.id ? `dysgraphia_history_${user.id}` : '';
      const historyKeyC = user?.id ? `dyscalculia_history_${user.id}` : '';

      const localDysgraphia = (isCurrentUser && historyKeyG) ? JSON.parse(localStorage.getItem(historyKeyG) || '[]') : [];
      const localDyscalculia = (isCurrentUser && historyKeyC) ? JSON.parse(localStorage.getItem(historyKeyC) || '[]') : [];

      // 2. Load Server History
      let serverDysgraphia: any[] = [];
      let serverDyscalculia: any[] = [];

      try {
        if (token) {
          const response = await fetch(`${API_URL}/api/user/${targetId}/tests`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.dysgraphia) serverDysgraphia = data.dysgraphia;
            if (data.dyscalculia) serverDyscalculia = data.dyscalculia;
          }
        }
      } catch (apiError) {
        console.warn('Failed to fetch server history, relying on local:', apiError);
      }

      // 3. Merge (Local + Server)
      const mergeArrays = (local: any[], server: any[]) => {
        const serverIds = new Set(server.map(item => item.id).filter(id => id));
        const uniqueLocal = local.filter(l => !l.id || !serverIds.has(l.id));
        return [...uniqueLocal, ...server].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      };

      setDysgraphiaTests(mergeArrays(localDysgraphia, serverDysgraphia));
      setDyscalculiaTests(mergeArrays(localDyscalculia, serverDyscalculia));

    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [user, userId]);

  const handleDownloadReport = async (testId: string, type: 'dysgraphia' | 'dyscalculia') => {
    if (!testId) return;
    try {
      const dataSet = type === 'dysgraphia' ? dysgraphiaTests : dyscalculiaTests;
      const testData = dataSet.find(t => t.id === testId);

      if (!testData) {
        alert("Report data not found locally.");
        return;
      }

      generateMedicalReport({
        test_id: testData.id,
        test_type: type === 'dysgraphia' ? 'Dysgraphia' : 'Dyscalculia',
        prediction_class: testData.prediction_class || 'Unknown',
        confidence_score: testData.confidence_score || 0,
        model_version: testData.model_version || '1.0',
        created_at: testData.created_at || new Date().toISOString(),
        history: dataSet,
        patient_name: user?.full_name || 'Anonymous Patient'
      });

    } catch (e) {
      console.error("Download error", e);
    }
  };

  const getRiskColor = (className: string) => {
    if (className === 'Normal') return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30';
    if (className === 'Low') return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30';
    if (className === 'High') return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
    return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    // Check if result is "bad" (Dysgraphia or High Risk)
    const isRisk = payload.prediction_class?.includes('Dysgraphia') || payload.prediction_class?.includes('High') || payload.prediction_class?.includes('Risk');

    if (isRisk) {
      return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
    }
    return <circle cx={cx} cy={cy} r={6} fill="#22c55e" stroke="#fff" strokeWidth={2} />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t.history.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View your past test results and track progress
        </p>
      </div>

      {/* Trend Analysis */}
      {(dysgraphiaTests.length > 1) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-slide-up">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            "Trend Analysis"
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...dysgraphiaTests].reverse().map(d => ({ ...d, score: d.confidence_score * 100 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="created_at"
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                          <p className="font-bold text-gray-900 dark:text-white">{label ? new Date(label).toLocaleDateString() : ''}</p>
                          <p className={`font-semibold ${data.prediction_class?.includes('Normal') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            Result: {data.prediction_class}
                          </p>
                          <p className="text-blue-600 dark:text-blue-400">
                            Confidence: {(data.confidence_score * 100).toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Confidence Score"
                  stroke="#4ade80"
                  strokeWidth={3}
                  dot={<CustomDot />}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
            Visualizing Dysgraphia detection confidence over time.
          </p>
        </div>
      )}

      {/* Dysgraphia Tests */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-slide-up delay-100">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.history.dysgraphiaTests}
          </h2>
        </div>

        {dysgraphiaTests.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t.history.noTests}
          </p>
        ) : (
          <div className="space-y-4">
            {dysgraphiaTests.map((test, idx) => (
              <div
                key={test.id || `local-${idx}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(test.prediction_class)}`}>
                        {test.prediction_class}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(test.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {t.history.confidence}: {(test.confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-gray-400">v{test.model_version}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {test.image_url && (
                      <img
                        src={test.image_url}
                        alt="Sample"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    {test.id && (
                      <button
                        onClick={() => handleDownloadReport(test.id, 'dysgraphia')}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                        title="Download Report"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dyscalculia Tests */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 animate-slide-up delay-200">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-6 w-6 text-green-600 dark:text-green-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.history.dyscalculiaTests}
          </h2>
        </div>

        {dyscalculiaTests.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t.history.noTests}
          </p>
        ) : (
          <div className="space-y-4">
            {dyscalculiaTests.map((test, idx) => (
              <div
                key={test.id || `local-${idx}`}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(test.prediction_class)}`}>
                        {test.prediction_class}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(test.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {t.history.confidence}: {(test.confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-gray-400">v{test.model_version}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {test.id && (
                      <button
                        onClick={() => handleDownloadReport(test.id, 'dyscalculia')}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                        title="Download Report"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


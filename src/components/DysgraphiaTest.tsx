import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Download, RefreshCw, Loader, Volume2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { generateMedicalReport } from '../utils/ReportEngine';

const API_URL = 'http://localhost:8000';

export function DysgraphiaTest() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLanguage();
  const { user, token } = useAuth();

  // Accessibility: Auto-read dysgraphia instructions on load if TTS is enabled
  useEffect(() => {
    if (user?.accessibility?.tts) {
      window.speechSynthesis.cancel(); // Stop current speech
      const textToSpeak = `Welcome to the Dysgraphia handwriting assessment. Please upload or drag and drop your handwriting sample images into the box provided to begin the analysis.`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      window.speechSynthesis.speak(utterance);
    }
  }, [user]);

  // -----------------------------------------------------------------------
  // 🔹 Handle file selection (multiple)
  // -----------------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... same ...
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      setSelectedFiles(files);
      setResults([]);

      const filePreviews = files.map((file) => URL.createObjectURL(file));
      setPreviews(filePreviews);
    }
  };

  // ... (handleDrop is fine) ...
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      setSelectedFiles(files);
      setResults([]);
      const filePreviews = files.map((file) => URL.createObjectURL(file));
      setPreviews(filePreviews);
    }
  };

  // -----------------------------------------------------------------------
  // 🔹 Send all images to batch endpoint
  // -----------------------------------------------------------------------
  const handleAnalyzeBatch = async () => {
    // renamed from uploadImages to match usage
    if (selectedFiles.length === 0) return;
    const files = selectedFiles; // use state directly

    setLoading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      let endpoint = '';

      if (files.length === 1) {
        uploadFormData.append('file', files[0]);
        endpoint = `${API_URL}/api/dysgraphia/predict`;
      } else {
        files.forEach(file => {
          uploadFormData.append('files', file);
        });
        endpoint = `${API_URL}/api/dysgraphia/predict_batch`;
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Backend returns a single object for single predict, or { predictions: [] } for batch
      const predictions = data.predictions || [data];
      setResults(predictions);

      // 🔹 Save to Local History (Fallback or session cache)
      try {
        if (user?.id) {
          const historyKey = `dysgraphia_history_${user.id}`;
          const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
          const newItems = predictions.map((p: any, idx: number) => ({
            ...p,
            id: p.test_id || `local-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
            image_url: previews[idx] || ''
          }));

          const updatedHistory = [...newItems, ...existingHistory].slice(0, 20);
          localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        }
      } catch (err) {
        console.warn("Failed to save local history", err);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // 🔹 Reset everything
  // -----------------------------------------------------------------------
  const handleReset = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setResults([]);
  };

  // -----------------------------------------------------------------------
  // 🔹 Risk color helper
  // -----------------------------------------------------------------------
  const getRiskColor = (className: string) => {
    if (className === 'Normal') return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
    if (className === 'Low') return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (className === 'High') return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-300';
  };

  // -----------------------------------------------------------------------
  // 🔹 Helper for Instant Report Download
  // -----------------------------------------------------------------------
  const downloadInstantReport = async (data: any) => {
    try {
      generateMedicalReport({
        test_id: data.test_id || `DYS-${Date.now()}`,
        test_type: 'Dysgraphia Handwriting Assessment',
        prediction_class: data.prediction_class || 'Unknown',
        confidence_score: data.confidence_score || 0,
        model_version: data.model_version || '1.1',
        created_at: new Date().toISOString(),
        patient_name: user?.full_name || 'Anonymous Patient'
      });
    } catch (e) {
      console.error("Report generation failed:", e);
      alert("Failed to generate report. Please try again.");
    }
  };

  // -----------------------------------------------------------------------
  // 🔹 UI
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6 animate-scale-in">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t.dysgraphia.title}</h2>
          <button
            onClick={() => {
              window.speechSynthesis.cancel();
              const textToSpeak = `Welcome to the Dysgraphia handwriting assessment. Please upload or drag and drop your handwriting sample images into the box provided to begin the analysis.`;
              const utterance = new SpeechSynthesisUtterance(textToSpeak);
              window.speechSynthesis.speak(utterance);
            }}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-100/50 dark:bg-gray-800 rounded-full"
            title="Read Instructions Out Loud"
          >
            <Volume2 size={24} />
          </button>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Upload / Drag area */}
        {selectedFiles.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors animate-scale-in delay-100"
          >
            <Upload className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">{t.dysgraphia.dragDrop}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">PNG, JPG — you can select multiple images</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Image previews */}
        {selectedFiles.length > 0 && results.length === 0 && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {previews.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={`Preview ${idx + 1}`}
                  className="rounded-lg border bg-gray-50 dark:bg-gray-700 dark:border-gray-600 object-contain w-full h-48"
                />
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleAnalyzeBatch}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-2" />
                    {t.dysgraphia.analyzing}
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5 mr-2" />
                    Analyze All Images
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Batch Results</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
              {results.map((res, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <img
                    src={previews[idx]}
                    alt={`Result ${idx + 1}`}
                    className="rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 object-contain w-full h-40"
                  />

                  {res.gradcam_url && (
                    <img
                      src={res.gradcam_url}
                      alt={`Grad-CAM ${idx + 1}`}
                      className="rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 object-contain w-full h-40"
                    />
                  )}

                  <div className="space-y-2">
                    <div className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold text-lg ${getRiskColor(res.prediction_class)}`}>
                      {res.prediction_class}
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Confidence: {(res.confidence_score * 100).toFixed(1)}%
                    </div>

                    <div className="space-y-1">
                      {res.all_probabilities &&
                        Object.entries(res.all_probabilities).map(([label, val]: [string, any]) => (
                          <div key={label} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>{label}</span>
                            <span>{(val * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                    </div>

                    <button
                      onClick={() => downloadInstantReport(res)}
                      className="w-full mt-2 py-2 text-sm flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download Report
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                {t.dysgraphia.takeAnother}
              </button>
              <button
                onClick={() => downloadInstantReport(results[0])}
                disabled={results.length === 0}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center disabled:opacity-50"
              >
                <Download className="h-5 w-5 mr-2" />
                {t.dysgraphia.downloadReport}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <p className="text-sm text-blue-900 dark:text-blue-200 text-center">{t.results.disclaimer}</p>
      </div>
    </div>
  );
}

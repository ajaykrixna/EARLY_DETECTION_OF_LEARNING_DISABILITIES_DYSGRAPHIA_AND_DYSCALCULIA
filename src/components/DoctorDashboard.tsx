import { useEffect, useState } from 'react';
import { Stethoscope, Search, FilePlus, Save, X, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TestHistory } from './TestHistory';
import { ChatBot } from './ChatBot';
import { useServerTime } from '../hooks/useServerTime';


const API_URL = 'http://localhost:8000';

interface DoctorDashboardProps {
    onNavigate: (page: string, params?: any) => void;
}

export function DoctorDashboard({ onNavigate }: DoctorDashboardProps) {
    const { token } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [viewingHistoryStudent, setViewingHistoryStudent] = useState<any | null>(null);
    const [recommendation, setRecommendation] = useState('');
    const [recLoading, setRecLoading] = useState(false);
    const [pastRecommendations, setPastRecommendations] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const serverNow = useServerTime();
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'info' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const validAppointments = appointments.filter(a => {
        const startTime = new Date(a.start_time.endsWith('Z') ? a.start_time : `${a.start_time}Z`);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        const endedDelay = new Date(endTime.getTime() + 5 * 60 * 1000);
        if (serverNow > endedDelay) return false;
        return true;
    });

    const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
    const [planContent, setPlanContent] = useState('');

    useEffect(() => {
        fetchStudents();
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const res = await fetch(`${API_URL}/api/appointments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    useEffect(() => {
        if (selectedStudent) {
            fetchRecommendations(selectedStudent.id);
            fetchTreatmentPlans(selectedStudent.id);
        } else {
            setPastRecommendations([]);
            setTreatmentPlans([]);
        }
    }, [selectedStudent]);

    const fetchRecommendations = async (studentId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/recommendations/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPastRecommendations(data);
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_URL}/api/doctor/students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTreatmentPlans = async (studentId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/doctor/treatment-plans/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setTreatmentPlans(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleAddTreatmentPlan = async () => {
        if (!selectedStudent || !planContent.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/doctor/treatment-plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    student_id: selectedStudent.id,
                    content: { notes: planContent, goals: ["Recovery", "Progress"] }
                })
            });
            if (res.ok) {
                setPlanContent('');
                fetchTreatmentPlans(selectedStudent.id);
            }
        } catch (e) { console.error(e); }
    };

    const handleAddRecommendation = async () => {
        if (!selectedStudent || !recommendation.trim()) return;

        setRecLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    student_id: selectedStudent.id,
                    content: recommendation
                })
            });

            if (res.ok) {
                showToast('Clinical recommendation saved to record', 'success');
                setRecommendation('');
                // Keep selected student to show updated history
                fetchRecommendations(selectedStudent.id);
            } else {
                showToast('Failed to commit recommendation to medical record', 'info');
            }
        } catch (error) {
            console.error('Error adding recommendation:', error);
        } finally {
            setRecLoading(false);
        }
    };

    const filteredStudents = students.filter((s) =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {viewingHistoryStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Patient Reports
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{viewingHistoryStudent.full_name} ({viewingHistoryStudent.email})</p>
                            </div>
                            <button
                                onClick={() => setViewingHistoryStudent(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                            <TestHistory userId={viewingHistoryStudent.id} />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Doctor Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-300">Manage patient assessments and recommendations</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Column 1: Patient List and Active View */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex gap-4 items-center">
                            <Stethoscope className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Patients</h2>
                            <div className="ml-auto flex gap-2">
                                <div className="relative">
                                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search yours..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Patient</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Age</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Risk Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                Loading patients...
                                            </td>
                                        </tr>
                                    ) : filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No patients linked. Relationships are created automatically through confirmed clinical appointments.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((student) => (
                                            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-white">{student.full_name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{student.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{student.age || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${student.dysgraphia_risk === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            }`}>Dysgraphia: {student.dysgraphia_risk || 'Unknown'}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${student.dyscalculia_risk === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            }`}>Dyscalculia: {student.dyscalculia_risk || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => setViewingHistoryStudent(student)}
                                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
                                                        >
                                                            <BookOpen className="h-4 w-4 mr-1" />
                                                            View Reports
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedStudent(student)}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center"
                                                        >
                                                            <FilePlus className="h-4 w-4 mr-1" />
                                                            Clinical View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedStudent && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Shield className="h-6 w-6 text-indigo-600" />
                                Treatment Plans - {selectedStudent.full_name}
                            </h2>
                            <div className="space-y-6">
                                <div className="grid gap-4">
                                    {treatmentPlans.length > 0 ? treatmentPlans.map((plan) => (
                                        <div key={plan.id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-indigo-600 uppercase">Plan #{plan.id.slice(0, 8)}</span>
                                                <span className="text-[10px] text-gray-400">{new Date(plan.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{plan.content.notes}</p>
                                            <div className="mt-3 flex gap-2">
                                                {plan.content.goals?.map((g: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{g}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-center py-4 text-gray-400 text-sm">No treatment plans established yet.</p>
                                    )}
                                </div>
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <textarea
                                        value={planContent}
                                        onChange={(e) => setPlanContent(e.target.value)}
                                        placeholder="Outline new treatment goals and clinical notes..."
                                        className="w-full h-32 p-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 shadow-inner"
                                    />
                                    <button
                                        onClick={handleAddTreatmentPlan}
                                        disabled={!planContent.trim()}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50"
                                    >
                                        Establish Treatment Plan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Column 2: Recommendation and Appointments */}
                <div className="space-y-6">
                    {/* Add Recommendation */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <FilePlus className="h-5 w-5 mr-2 text-blue-600" />
                            Add Recommendation
                        </h2>
                        {selectedStudent ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Writing for: <strong>{selectedStudent.full_name}</strong>
                                    </p>
                                </div>

                                {pastRecommendations.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Previous Recommendations:</h3>
                                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                                            {pastRecommendations.map((rec) => (
                                                <div key={rec.id} className="text-xs p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-100 dark:border-gray-700">
                                                    <p className="text-gray-600 dark:text-gray-300 mb-1">{rec.content}</p>
                                                    {rec.reply_text && (
                                                        <div className="mt-2 mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-indigo-400 rounded-r">
                                                            <p className="text-indigo-700 dark:text-indigo-300 italic"><span className="font-semibold text-xs">Student Reply:</span> {rec.reply_text}</p>
                                                        </div>
                                                    )}
                                                    <p className="text-gray-400 dark:text-gray-500 italic text-[10px]">
                                                        {new Date(rec.created_at).toLocaleDateString()} by {rec.doctor_name || 'You'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    value={recommendation}
                                    onChange={(e) => setRecommendation(e.target.value)}
                                    placeholder="Write your clinical recommendation here..."
                                    className="w-full h-40 p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleAddRecommendation}
                                        disabled={recLoading || !recommendation.trim()}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4 mr-2" />
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedStudent(null);
                                            setRecommendation('');
                                        }}
                                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <p>Select a patient to view history and add recommendations.</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Appointments */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Stethoscope className="h-5 w-5 mr-2 text-indigo-600" />
                            Upcoming Appointments
                        </h2>
                        <div className="space-y-4">
                            {validAppointments.length > 0 ? validAppointments.map((apt) => {
                                const startTime = new Date(apt.start_time.endsWith('Z') ? apt.start_time : `${apt.start_time}Z`);
                                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                                const isStarted = serverNow >= startTime;
                                const isEnded = serverNow > endTime;
                                const isCancelled = apt.status === 'cancelled';
                                const canJoin = isStarted && !isEnded && !isCancelled;

                                return (
                                    <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
                                        <div className="text-center min-w-[4rem]">
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                                {startTime.toLocaleDateString(undefined, { weekday: 'short' })}
                                            </div>
                                            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                {startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">{apt.student_name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Status: {apt.status}</div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {canJoin ? (
                                                <button
                                                    onClick={() => onNavigate('consultation', { apptId: apt.id })}
                                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                                                >
                                                    Join
                                                </button>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <button disabled className="px-3 py-1 bg-gray-200 text-gray-500 text-xs rounded transition-colors cursor-not-allowed dark:bg-gray-600 dark:text-gray-400">
                                                        {isCancelled ? 'Cancelled' : isEnded ? 'Ended' : 'Join later'}
                                                    </button>
                                                    {apt.status === 'Pending' && !isEnded && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetch(`${API_URL}/api/appointments/${apt.id}/status?status=Confirmed`, {
                                                                        method: 'PUT',
                                                                        headers: { Authorization: `Bearer ${token}` }
                                                                    });
                                                                    if (res.ok) {
                                                                        showToast('Domain mapping successful: Appointment confirmed', 'success');
                                                                        fetchAppointments();
                                                                        fetchStudents();
                                                                    } else {
                                                                        showToast('Failed to validate clinical link', 'info');
                                                                    }
                                                                } catch (e) { console.error(e); }
                                                            }}
                                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-all shadow-sm"
                                                        >
                                                            Accept & Link
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {!isCancelled && !isEnded && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`${API_URL}/api/appointments/${apt.id}/status?status=cancelled`, {
                                                                method: 'PUT',
                                                                headers: { Authorization: `Bearer ${token}` }
                                                            });
                                                            if (res.ok) {
                                                                showToast('Appointment strike-off successful', 'info');
                                                                fetchAppointments();
                                                            }
                                                        } catch (e) { console.error(e); }
                                                    }}
                                                    className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs rounded transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 text-sm">No upcoming appointments.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ChatBot />

            {/* Global Toast Notification */}
            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-fade-in">
                    <div className={`px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border ${notification.type === 'success' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
                        <div className="p-1.5 bg-white/20 rounded-full">
                            {notification.type === 'success' ? <Stethoscope size={16} /> : <Shield size={16} />}
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">{notification.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Users, Search, BookOpen, X, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

import { TestHistory } from './TestHistory';
import { ChatBot } from './ChatBot';

const API_URL = 'http://localhost:8000';

interface TeacherDashboardProps {
    onNavigate: (page: string, params?: any) => void;
}

export function TeacherDashboard({ onNavigate }: TeacherDashboardProps) {
    const { token, user: authUser } = useAuth();
    const token_user_id = authUser?.id;
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [showClassModal, setShowClassModal] = useState(false);
    const [newClass, setNewClass] = useState({ title: '', start_time: '', end_time: '', description: '' });
    const [classes, setClasses] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkEmail, setLinkEmail] = useState('');
    const [recommendations, setRecommendations] = useState<any[]>([]);

    // Chat / Messaging State
    const [showChatModal, setShowChatModal] = useState(false);
    const [familyList, setFamilyList] = useState<any[]>([]);
    const [chatMsg, setChatMsg] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

    const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({ title, message, onConfirm });
    };

    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        fetchStudents();
        fetchAnalytics();
        fetchClasses();
        fetchMessages();
    }, []);

    useEffect(() => {
        if (selectedStudent) {
            fetchRecommendations(selectedStudent.id);
        } else {
            setRecommendations([]);
        }
    }, [selectedStudent]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/api/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleOpenChat = async (student: any) => {
        setSelectedStudent(student);
        try {
            const res = await fetch(`${API_URL}/api/teacher/students/${student.id}/family`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFamilyList(data);
                setShowChatModal(true);
            }
        } catch (e) {
            console.error(e);
            showToast("Failed to retrieve student's registered family contacts", "info");
        }
    };

    const handleSendMessage = async (receiverId: string) => {
        if (!chatMsg || !selectedStudent) return;
        setChatLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiver_id: receiverId,
                    student_id: selectedStudent.id,
                    content: chatMsg
                })
            });
            if (res.ok) {
                showToast("Secure message dispatched to parent/guardian", "success");
                setChatMsg('');
                setShowChatModal(false);
                fetchMessages();
            } else {
                showToast("Failed to transmit message through secure relay", "info");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setChatLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await fetch(`${API_URL}/api/classrooms`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const handleLinkStudent = async () => {
        const trimmedEmail = linkEmail.trim();
        if (!trimmedEmail) return;
        try {
            // First find student by email
            const findRes = await fetch(`${API_URL}/api/users/students?email=${encodeURIComponent(trimmedEmail)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const studentsFound = await findRes.json();
            if (studentsFound.length === 0) {
                showToast('Target domain not found with this email', 'info');
                return;
            }
            const studentId = studentsFound[0].id;

            const res = await fetch(`${API_URL}/api/teacher/students/${studentId}/link`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Social linkage established: Student added to roster', 'success');
                setShowLinkModal(false);
                setLinkEmail('');
                fetchStudents();
                fetchAnalytics();
            } else {
                showToast('Operational failure: Linkage rejected', 'info');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateClass = async () => {
        try {
            const res = await fetch(`${API_URL}/api/classrooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newClass,
                    start_time: new Date(newClass.start_time).toISOString(),
                    end_time: new Date(newClass.end_time).toISOString()
                })
            });
            if (res.ok) {
                showToast('Logistical event recorded: Class scheduled', 'success');
                setShowClassModal(false);
                fetchClasses();
                setNewClass({ title: '', start_time: '', end_time: '', description: '' });
            } else {
                showToast('Scheduling conflict or registry error', 'info');
            }
        } catch (error) {
            console.error('Error creating class:', error);
        }
    };

    const handleStartClass = async (classId: string, currentStatus: string) => {
        if (currentStatus !== 'live') {
            try {
                const res = await fetch(`${API_URL}/api/classrooms/${classId}/status?status=live`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) {
                    const error = await res.json();
                    showToast(error.detail || 'Failed to initialize session', 'info');
                    return;
                }
            } catch (e) {
                console.error('Failed to update class status to live', e);
                return;
            }
        }
        onNavigate('live-class', { classId });
    };

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_URL}/api/analytics/class`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const fetchRecommendations = async (studentId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/recommendations/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setRecommendations(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users/students`, {
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

    const filteredStudents = students.filter((s) =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const unreadCount = messages.filter(m => !m.is_read && m.sender_role === 'parent').length;

    return (
        <div className="space-y-8 pb-12">
            {selectedStudent && !showChatModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Student Reports
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedStudent.full_name} ({selectedStudent.email})</p>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 space-y-6">
                            {recommendations.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">Clinical Recommendations</h3>
                                    <div className="grid gap-4">
                                        {recommendations.map(rec => (
                                            <div key={rec.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900 shadow-sm relative overflow-hidden group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black text-blue-600 uppercase">Provider: {rec.doctor_name}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(rec.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{rec.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">Test History</h3>
                                <TestHistory userId={selectedStudent.id} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Secure Chat Modal */}
            {showChatModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/10 animate-scale-in">
                        <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <BookOpen className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl tracking-tight">Parental Relay</h3>
                                    <p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Target student: {selectedStudent.full_name}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowChatModal(false); setSelectedStudent(null); }} className="p-2 hover:bg-white/20 rounded-xl transition-colors active:scale-90"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="p-10 space-y-8">
                            {familyList.length === 0 ? (
                                <div className="text-center py-12 px-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                    <p className="text-sm text-gray-400 font-bold italic leading-relaxed">System Reconnaissance: No verified parent/guardian accounts identified for this relational domain.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Verified Recipient Nodes</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {familyList.map(parent => (
                                                <div key={parent.id} className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border-2 border-blue-500/10 hover:border-blue-500/40 transition-all flex items-center gap-5 group cursor-default">
                                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">{parent.full_name.charAt(0)}</div>
                                                    <div className="flex-1">
                                                        <p className="text-base font-black text-gray-900 dark:text-white leading-none">{parent.full_name}</p>
                                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                            Active Guardian Protocol
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Communication Payload</label>
                                        <textarea
                                            value={chatMsg}
                                            onChange={(e) => setChatMsg(e.target.value)}
                                            placeholder="Broadcast operational updates or clinical observations..."
                                            className="w-full h-40 p-6 border-2 border-gray-100 dark:border-gray-700 rounded-3xl bg-gray-50/50 dark:bg-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium resize-none shadow-inner text-sm leading-relaxed"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSendMessage(familyList[0].id)}
                                        disabled={chatLoading || !chatMsg}
                                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/30 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group"
                                    >
                                        {chatLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span>Initialize Relay</span>
                                                <BookOpen className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showClassModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Schedule Live Class</h2>
                        <div className="space-y-4">
                            <input
                                type="text" placeholder="Class Title"
                                value={newClass.title} onChange={e => setNewClass({ ...newClass, title: e.target.value })}
                                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <input
                                type="text" placeholder="Description"
                                value={newClass.description} onChange={e => setNewClass({ ...newClass, description: e.target.value })}
                                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={newClass.start_time} onChange={e => setNewClass({ ...newClass, start_time: e.target.value })}
                                        className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={newClass.end_time} onChange={e => setNewClass({ ...newClass, end_time: e.target.value })}
                                        className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-4">
                                <button onClick={() => setShowClassModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancel</button>
                                <button onClick={handleCreateClass} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-shadow hover:shadow-lg">Schedule</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showLinkModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center underline decoration-blue-500 underline-offset-4">Add Student to Roster</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">Establish a relational link to view reports and include in analytics.</p>
                        <div className="space-y-4">
                            <input
                                type="email" placeholder="Student Email Address"
                                value={linkEmail} onChange={e => setLinkEmail(e.target.value)}
                                className="w-full border rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <div className="flex gap-2 justify-end mt-6">
                                <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors font-medium">Cancel</button>
                                <button onClick={handleLinkStudent} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold tracking-wide">Link Student</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/10 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Teacher Console</h1>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Strategic overview of student development & class management</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowLinkModal(true)}
                        className="flex-1 md:flex-none border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/30 px-5 py-2.5 rounded-xl font-bold transition-all"
                    >
                        Link Student
                    </button>
                    <button
                        onClick={() => setShowClassModal(true)}
                        className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all transform hover:-translate-y-0.5"
                    >
                        Schedule Class
                    </button>
                </div>
            </div>

            {/* MESSAGES & ANALYTICS TOP SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* Inbox Panel */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-500" />
                            Parent Inbox
                        </h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                                {unreadCount} NEW
                            </span>
                        )}
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {messages.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-10">No messages yet</p>
                        ) : (
                            messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`p-3 rounded-xl border group transition-all hover:scale-[1.02] cursor-pointer ${msg.is_read ? 'bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-600' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800'}`}
                                    onClick={() => {
                                        const student = students.find(s => s.id === msg.student_id);
                                        if (student) handleOpenChat(student);
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-black text-gray-900 dark:text-white truncate w-32">{msg.sender_name}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{msg.content}</p>
                                    <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-bold text-blue-500 uppercase">Context: {students.find(s => s.id === msg.student_id)?.full_name || 'Generic'}</span>
                                        {!msg.is_read && msg.receiver_id === token_user_id && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await fetch(`${API_URL}/api/messages/${msg.id}/read`, {
                                                        method: 'PUT',
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    });
                                                    fetchMessages();
                                                }}
                                                className="text-[9px] bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                            >
                                                Mark Read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End of Feed</p>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                            <div className="w-1 h-1 rounded-full bg-blue-500/50"></div>
                            <div className="w-1 h-1 rounded-full bg-blue-500/20"></div>
                        </div>
                    </div>
                </div>

                {/* QUICK STATS - RIGHT 3 COLS */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[482px]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                        </div>
                        <div className="space-y-4 flex-1">
                            <button
                                onClick={() => setShowLinkModal(true)}
                                className="w-full text-left p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all group bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Add Student</p>
                                    <p className="text-xs text-gray-500 mt-1">Link a new student to your roster</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                    <span className="text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">+</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setShowClassModal(true)}
                                className="w-full text-left p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Schedule Session</p>
                                    <p className="text-xs text-gray-500 mt-1">Plan a new live class</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                                    <BookOpen className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[482px]">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-purple-100 rounded-xl text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                <Search className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">No Recent Activity</p>
                            <p className="text-xs text-gray-500 max-w-[200px]">System events and student updates will appear here</p>
                        </div>
                    </div>
                </div>
            </div>

            {analytics && (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-green-500 rounded-full"></div>
                            Clinical Distribution: Dysgraphia
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Normal', value: analytics.dysgraphia?.Normal || 0, fill: '#10b981' },
                                    { name: 'Low Risk', value: analytics.dysgraphia?.Low || 0, fill: '#f59e0b' },
                                    { name: 'High Risk', value: analytics.dysgraphia?.High || 0, fill: '#ef4444' }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="bold" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#fff' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="value" name="Students" radius={[8, 8, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                            Analytical Insights: Dyscalculia
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Normal', value: analytics.dyscalculia?.Normal || 0, fill: '#10b981' },
                                    { name: 'Low Risk', value: analytics.dyscalculia?.Low || 0, fill: '#f59e0b' },
                                    { name: 'High Risk', value: analytics.dyscalculia?.High || 0, fill: '#ef4444' }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="bold" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', color: '#fff' }}
                                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="value" name="Students" radius={[8, 8, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduled Classes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Live Session Management</h3>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tighter bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Total: {classes.length}
                        </span>
                    </div>
                </div>
                {classes.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-4 py-4">Title / Context</th>
                                    <th className="px-4 py-4">Schedule (UTC)</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4 text-right">Operational Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {classes.map(cls => (
                                    <tr key={cls.id} className="border-b dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors group">
                                        <td className="px-4 py-4 font-bold text-gray-900 dark:text-white">
                                            {cls.title}
                                            <p className="text-[10px] font-normal text-gray-400 uppercase mt-0.5">{cls.description || 'No description provided'}</p>
                                        </td>
                                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400 tabular-nums font-medium">
                                            {new Date(cls.start_time.endsWith('Z') ? cls.start_time : `${cls.start_time}Z`).toLocaleDateString()}
                                            <br />
                                            <span className="text-xs">{new Date(cls.start_time.endsWith('Z') ? cls.start_time : `${cls.start_time}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cls.end_time.endsWith('Z') ? cls.end_time : `${cls.end_time}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${cls.status === 'live' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 animate-pulse' :
                                                cls.status === 'completed' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' :
                                                    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                                }`}>
                                                {cls.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                {cls.status !== 'completed' && (
                                                    <button
                                                        onClick={() => handleStartClass(cls.id, cls.status)}
                                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-lg transition-all"
                                                    >
                                                        {cls.status === 'live' ? 'Resume Session' : 'Start Session'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        askConfirmation(
                                                            'Delete Session',
                                                            'Are you sure you want to permanently delete this educational record? This action cannot be undone.',
                                                            async () => {
                                                                try {
                                                                    const res = await fetch(`${API_URL}/api/classrooms/${cls.id}`, {
                                                                        method: 'DELETE',
                                                                        headers: { Authorization: `Bearer ${token}` }
                                                                    });
                                                                    if (res.ok) {
                                                                        fetchClasses();
                                                                        showToast('Session record deleted successfully.', 'success');
                                                                    }
                                                                } catch (e) {
                                                                    console.error(e);
                                                                    showToast('Operational failure: Resource busy or network error.', 'error');
                                                                }
                                                            }
                                                        );
                                                    }}
                                                    className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-[11px] font-black rounded-lg transition-all border border-red-100"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                        <BookOpen className="h-10 w-10 text-gray-300 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-bold italic">Educational slate is currently empty.</p>
                        <button onClick={() => setShowClassModal(true)} className="mt-4 text-blue-600 font-bold hover:underline">Provision First Class</button>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all hover:shadow-blue-500/10">
                <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-6 items-start md:items-center bg-gray-50/30 dark:bg-gray-700/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Active Student Roster</h2>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Verified Relational Domains</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-96 ml-auto group">
                        <Search className="h-4 w-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Identify student by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-gray-800/80 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                                <th className="px-8 py-5 text-left">Academic Profile</th>
                                <th className="px-8 py-5 text-left">Clinical Thresholds</th>
                                <th className="px-8 py-5 text-right">Intellectual Governance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center text-gray-400 font-bold italic animate-pulse">
                                        Synchronizing educational data...
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <Search className="h-10 w-10 text-gray-200 mb-4" />
                                            <p className="text-gray-400 font-bold">No students matched the query.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                                    {student.full_name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <div className="text-base font-black text-gray-900 dark:text-white">{student.full_name || 'Anonymous User'}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium font-mono">{student.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Dysgraphia</span>
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase text-center border ${student.dysgraphia_risk === 'High' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                                        student.dysgraphia_risk === 'Low' ? 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                                                            'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                        }`}>
                                                        {student.dysgraphia_risk || 'Normal'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Dyscalculia</span>
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase text-center border ${student.dyscalculia_risk === 'High' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                                        student.dyscalculia_risk === 'Low' ? 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' :
                                                            'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                        }`}>
                                                        {student.dyscalculia_risk || 'Normal'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleOpenChat(student)}
                                                    className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all border border-transparent hover:border-blue-100"
                                                    title="Send Message to Parent"
                                                >
                                                    <MessageSquare className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-900/10 dark:shadow-white/5 hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    View Analytics
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
            <ChatBot />

            {/* Global Toast Notification */}
            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-fade-in">
                    <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border backdrop-blur-xl transition-all ${notification.type === 'success' ? 'bg-indigo-600/90 border-indigo-500 text-white' :
                        notification.type === 'error' ? 'bg-rose-600/90 border-rose-500 text-white' :
                            'bg-blue-600/90 border-blue-500 text-white'
                        }`}>
                        <div className="p-2.5 bg-white/20 rounded-full">
                            {notification.type === 'success' ? <Users size={20} /> :
                                notification.type === 'error' ? <X size={20} /> :
                                    <MessageSquare size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Roster Update</p>
                            <p className="font-bold text-sm tracking-wide">{notification.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-3xl w-full max-w-sm p-10 border-4 border-white dark:border-gray-700 animate-scale-in text-center">
                        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
                            <X size={36} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={() => {
                                    confirmDialog.onConfirm();
                                    setConfirmDialog(null);
                                }}
                                className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-200 dark:shadow-none transition-all active:scale-95"
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


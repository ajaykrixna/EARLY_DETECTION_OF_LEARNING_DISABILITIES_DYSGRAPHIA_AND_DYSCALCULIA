import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Activity, Calendar, Brain, Search, PlusCircle, X, ArrowRight, MessageSquare, BookOpen, Send } from 'lucide-react';
import { TestHistory } from './TestHistory';

const API_URL = 'http://localhost:8000';

interface ParentDashboardProps {
}

export function ParentDashboard({ }: ParentDashboardProps) {
    const { user, token } = useAuth();
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddChild, setShowAddChild] = useState(false);
    const [childEmail, setChildEmail] = useState('');
    const [adding, setAdding] = useState(false);
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [careTeam, setCareTeam] = useState<{ teachers: any[], doctors: any[] }>({ teachers: [], doctors: [] });
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [recommendations, setRecommendations] = useState<any[]>([]);

    // Booking State
    const [showBooking, setShowBooking] = useState(false);
    const [bookingTime, setBookingTime] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');

    // Messaging State
    const [showMessage, setShowMessage] = useState(false);
    const [selectedRecipientId, setSelectedRecipientId] = useState('');
    const [msgContent, setMsgContent] = useState('');

    // Reports State
    const [showReports, setShowReports] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' | 'security' } | null>(null);

    const showToast = (message: string, type: 'success' | 'info' | 'error' | 'security' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        fetchChildren();
        fetchPendingRequests();
        fetchAppointments();
        fetchMessages();
    }, []);

    useEffect(() => {
        if (selectedChild) {
            fetchCareTeam(selectedChild.id);
            fetchRecommendations(selectedChild.id);
        }
    }, [selectedChild]);

    const fetchChildren = async () => {
        try {
            const res = await fetch(`${API_URL}/api/parents/children`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setChildren(data);
                if (data.length > 0 && !selectedChild) setSelectedChild(data[0]);
            }
        } catch (error) {
            console.error("Error fetching children", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/api/parents/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setPendingRequests(await res.json());
            }
        } catch (e) { console.error(e); }
    };

    const fetchCareTeam = async (studentId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/parents/students/${studentId}/care-team`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setCareTeam(await res.json());
            }
        } catch (e) { console.error(e); }
    };

    const fetchAppointments = async () => {
        try {
            const res = await fetch(`${API_URL}/api/appointments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setAppointments(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/api/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setMessages(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchRecommendations = async (studentId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/recommendations/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setRecommendations(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleAddChild = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!childEmail) return;
        setAdding(true);
        try {
            const res = await fetch(`${API_URL}/api/parents/request-link?student_email=${encodeURIComponent(childEmail)}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || "Network link request broadcasted successfully!");
                setShowAddChild(false);
                setChildEmail('');
                fetchPendingRequests();
            } else {
                showToast(data.detail || "Operational failure: Link request rejected", "info");
            }
        } catch (error) {
            console.error("Error adding child", error);
        } finally {
            setAdding(false);
        }
    };

    const handleBookSession = async () => {
        if (!selectedDoctorId || !bookingTime || !selectedChild) return;
        setBookingLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_id: selectedDoctorId,
                    student_id: selectedChild.id,
                    start_time: new Date(bookingTime).toISOString(),
                    end_time: new Date(new Date(bookingTime).getTime() + 3600000).toISOString()
                })
            });
            if (res.ok) {
                showToast(`Clinical appointment secured following protocol for ${selectedChild.full_name}`);
                setShowBooking(false);
                setSelectedDoctorId('');
                setBookingTime('');
                fetchAppointments();
            } else {
                const err = await res.json();
                showToast('Conflict or Restriction: ' + (err.detail || 'Service unavailable'), 'info');
            }
        } catch (error) {
            console.error("Booking error", error);
        } finally {
            setBookingLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecipientId || !msgContent || !selectedChild) return;

        try {
            const res = await fetch(`${API_URL}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    receiver_id: selectedRecipientId,
                    student_id: selectedChild.id,
                    content: msgContent
                })
            });
            if (res.ok) {
                showToast(`Communication link established: Message transmitted to ${careTeam.teachers.find(t => t.id === selectedRecipientId)?.full_name || 'Care Team'}`);
                setShowMessage(false);
                setMsgContent('');
                setSelectedRecipientId('');
                fetchMessages();
            } else {
                const err = await res.json();
                showToast(err.detail || "Secure transmission failed: Network error", "info");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
                        <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Parent Command Center</h1>
                        <div className="text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase text-[10px] tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            Active Care Orchestration
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddChild(true)}
                    className="group relative flex items-center gap-3 px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-2xl"
                >
                    <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                    Connect Student
                    <div className="absolute inset-0 rounded-2xl bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>
            </div>

            {/* Modals */}
            {showAddChild && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white/20 animate-scale-in">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 underline decoration-blue-500 underline-offset-8">Link Account</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Initiate a secure verified relationship with a student account.</p>
                        </div>
                        <form onSubmit={handleAddChild}>
                            <div className="relative group mb-6">
                                <label className="absolute -top-2 left-4 bg-white dark:bg-gray-800 px-2 text-[10px] font-black text-blue-500 uppercase tracking-widest z-10 transition-all group-focus-within:text-blue-600">Student Identity (Email)</label>
                                <input
                                    type="email"
                                    value={childEmail}
                                    onChange={(e) => setChildEmail(e.target.value)}
                                    className="w-full p-4 border-2 border-gray-100 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 dark:text-white outline-none focus:border-blue-500 transition-colors font-semibold"
                                    placeholder="Enter verified student email..."
                                    required
                                />
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button type="button" onClick={() => setShowAddChild(false)} className="flex-1 px-6 py-4 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors">Abort</button>
                                <button type="submit" disabled={adding} className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all hover:translate-y-[-2px]">{adding ? 'Initiating...' : 'Send Request'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {showBooking && selectedChild && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg p-8 border border-white/10 animate-scale-in">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Clinical Schedule</h2>
                                <p className="text-sm text-gray-500">Service provision for: <span className="text-purple-500 font-bold">{selectedChild.full_name}</span></p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Assigned Specialist Domain</label>
                                <select
                                    value={selectedDoctorId}
                                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 dark:bg-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors font-bold appearance-none bg-no-repeat bg-[right_1rem_center]"
                                >
                                    <option value="" className="text-gray-400 italic">Identify care provider...</option>
                                    {careTeam.doctors.map(d => (
                                        <option key={d.id} value={d.id}>Dr. {d.full_name} ({d.specialization})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Temporal Window (UTC)</label>
                                <input
                                    type="datetime-local"
                                    value={bookingTime}
                                    onChange={(e) => setBookingTime(e.target.value)}
                                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 dark:bg-gray-900 dark:text-white outline-none focus:border-purple-500 transition-colors font-mono font-bold"
                                />
                            </div>
                            <div className="flex gap-4 mt-10">
                                <button onClick={() => setShowBooking(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors">Cancel</button>
                                <button
                                    onClick={handleBookSession}
                                    disabled={bookingLoading}
                                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 disabled:opacity-50 hover:translate-y-[-2px] transition-all"
                                >
                                    {bookingLoading ? 'Processing...' : 'Secure Appointment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Modal */}
            {showMessage && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-scale-in">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white underline decoration-blue-500 underline-offset-8">Secure Relay</h2>
                        </div>
                        <form onSubmit={handleSendMessage} className="space-y-6">
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Recipient Educator</label>
                                <select
                                    value={selectedRecipientId}
                                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                                    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 dark:bg-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors font-bold appearance-none"
                                    required
                                >
                                    <option value="">Identify faculty member...</option>
                                    {careTeam.teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative group">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Operational Context / Message</label>
                                <textarea
                                    value={msgContent}
                                    onChange={(e) => setMsgContent(e.target.value)}
                                    className="w-full h-40 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 dark:bg-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors font-medium resize-none"
                                    placeholder="Communicate relevant progress or clinical concerns..."
                                    required
                                />
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setShowMessage(false)} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors">Discard</button>
                                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 flex items-center justify-center gap-3 transition-all">
                                    <Send className="h-5 w-5" /> Send Secure Transmission
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reports Modal */}
            {showReports && selectedChild && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-white/10">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                                    <BookOpen className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Clinical Assessment Repository</h2>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Deep Analysis for {selectedChild.full_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReports(false)} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-500 rounded-2xl transition-all group">
                                <X className="h-8 w-8 text-gray-400 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-gray-900 custom-scrollbar">
                            <TestHistory userId={selectedChild.id} />
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full items-start">

                {/* Sidebar Navigation - Child Selection */}
                <div className="lg:col-span-3 space-y-6 sticky top-8">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="font-black text-gray-400 dark:text-gray-500 uppercase text-[10px] tracking-[0.3em]">Managed Students</h3>
                        <div className="h-px flex-1 mx-4 bg-gray-100 dark:bg-gray-800"></div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>)}
                            </div>
                        ) : (
                            <>
                                {children.map(child => (
                                    <button
                                        key={child.id}
                                        onClick={() => setSelectedChild(child)}
                                        className={`group w-full relative overflow-hidden text-left p-5 rounded-3xl border-2 transition-all duration-300 ${selectedChild?.id === child.id ? 'bg-white dark:bg-gray-800 border-blue-500 shadow-2xl scale-[1.02]' : 'bg-gray-50 dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-700 opacity-70 hover:opacity-100'}`}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all duration-300 ${selectedChild?.id === child.id ? 'bg-blue-600 text-white shadow-xl rotate-3' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 group-hover:rotate-0'}`}>
                                                {child.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className={`font-black text-sm tracking-tight ${selectedChild?.id === child.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{child.full_name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{child.age ? `${child.age} Years Old` : 'Age Unspecified'}</p>
                                            </div>
                                        </div>
                                        {selectedChild?.id === child.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                    </button>
                                ))}

                                {pendingRequests.map(req => (
                                    <div key={req.id} className="w-full p-5 rounded-3xl bg-gray-100/50 dark:bg-gray-800/30 border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center opacity-70">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                                            <Activity className="h-4 w-4 text-orange-600 animate-spin" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{req.student_email.split('@')[0]}</p>
                                        <span className="text-[9px] font-bold text-orange-500 uppercase mt-1">Pending Approval</span>
                                    </div>
                                ))}

                                {children.length === 0 && pendingRequests.length === 0 && (
                                    <div className="p-10 text-center space-y-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                        <User className="h-8 w-8 text-gray-300 mx-auto" />
                                        <p className="text-xs font-bold text-gray-400">Initialize your care network by connecting a student.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Profile detail display - Main Content */}
                <div className="lg:col-span-9 space-y-8 min-h-screen">
                    {selectedChild ? (
                        <div className="space-y-8 animate-slide-up">

                            {/* CHILD HEADER BRIEF */}
                            <div className="flex justify-between items-end px-4">
                                <div>
                                    <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{selectedChild.full_name}</h2>
                                    <p className="text-blue-500 font-black tracking-[0.2em] text-[10px] uppercase mt-2">Relational Domain Identity</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Risk</span>
                                        <span className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase mt-1 ${selectedChild.dysgraphia_risk === 'High' || selectedChild.dyscalculia_risk === 'High'
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                            : 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                            }`}>
                                            {selectedChild.dysgraphia_risk === 'High' || selectedChild.dyscalculia_risk === 'High' ? 'Critical' : 'Stable'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Analytics Focus Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-2xl hover:border-blue-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform"></div>
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                                            <Activity className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Clinical Velocity</h3>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-6xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter mb-1">
                                            {selectedChild.dysgraphia_tests + selectedChild.dyscalculia_tests}
                                        </p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aggregate Assessments</p>
                                    </div>
                                </div>

                                <div className="group bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-2xl hover:border-purple-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform"></div>
                                    <div className="flex items-center gap-4 mb-6 relative z-10">
                                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400">
                                            <Brain className="h-6 w-6" />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Spectrum Distribution</h3>
                                    </div>
                                    <div className="space-y-6 relative z-10">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dysgraphia Domain</span>
                                                <span className="text-sm font-black dark:text-white tabular-nums">{selectedChild.dysgraphia_tests} Sprints</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000" style={{ width: `${(selectedChild.dysgraphia_tests / (selectedChild.dysgraphia_tests + selectedChild.dyscalculia_tests || 1)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dyscalculia Domain</span>
                                                <span className="text-sm font-black dark:text-white tabular-nums">{selectedChild.dyscalculia_tests} Sprints</span>
                                            </div>
                                            <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-1000" style={{ width: `${(selectedChild.dyscalculia_tests / (selectedChild.dysgraphia_tests + selectedChild.dyscalculia_tests || 1)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Unified Clinical Operations Center */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Message Inbox Section */}
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                                                <MessageSquare className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Relay Ledger</h3>
                                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Verified Transmissions</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowMessage(true)}
                                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                                        >
                                            Record Pulse
                                        </button>
                                    </div>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                                        {messages.length === 0 ? (
                                            <div className="py-20 text-center bg-gray-50 dark:bg-gray-950/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                                <p className="text-sm text-gray-400 font-bold italic font-mono uppercase tracking-tighter">Ether is Silent</p>
                                            </div>
                                        ) : (
                                            messages.filter(m => m.student_id === selectedChild.id).map(msg => (
                                                <div key={msg.id} className={`p-5 rounded-2xl border ${msg.sender_id === user?.id ? 'bg-gray-50 border-gray-100 dark:bg-gray-900/50 dark:border-gray-700' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/40 dark:border-blue-800'} transition-all group`}>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${msg.sender_id === user?.id ? 'text-gray-400' : 'text-blue-500'}`}>
                                                            {msg.sender_id === user?.id ? 'Broadcast Outbound' : `Node ID: ${msg.sender_name}`}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-mono">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{msg.content}</p>
                                                    {!msg.is_read && msg.receiver_id === user?.id && (
                                                        <button
                                                            onClick={async () => {
                                                                await fetch(`${API_URL}/api/messages/${msg.id}/read`, {
                                                                    method: 'PUT',
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                });
                                                                fetchMessages();
                                                            }}
                                                            className="mt-4 text-[10px] font-black text-blue-600 hover:underline uppercase transition-all hover:tracking-widest"
                                                        >
                                                            Acknowledge Receipt
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Appointment Logistics Panel */}
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-500/20">
                                                <Calendar className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Clinical Manifest</h3>
                                                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">Specialist Trajectories</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowBooking(true)}
                                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                                        >
                                            Sync Review
                                        </button>
                                    </div>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                                        {appointments.length === 0 ? (
                                            <div className="py-20 text-center bg-gray-50 dark:bg-gray-950/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                                <p className="text-sm text-gray-400 font-bold italic font-mono uppercase tracking-tighter">No Events Mapped</p>
                                            </div>
                                        ) : (
                                            appointments.filter(a => a.student_id === selectedChild.id).map(appt => (
                                                <div key={appt.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col gap-4 group hover:border-purple-500/30 transition-all">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${appt.status === 'Confirmed' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status: {appt.status}</p>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-gray-400">{new Date(appt.start_time).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                                                            {appt.doctor_name?.charAt(0) || 'D'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 dark:text-white">Dr. {appt.doctor_name || 'Assigned Specialist'}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Clinical Integration Point</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Insights / Recommendations Section */}
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                                        <Activity className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Prescriptive Governance</h3>
                                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Authorized Specialist Advisory</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {recommendations.length === 0 ? (
                                        <div className="md:col-span-2 py-16 text-center bg-gray-50 dark:bg-gray-950/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                            <p className="text-sm text-gray-400 font-bold italic font-mono uppercase tracking-tighter">No Active Recommendations</p>
                                        </div>
                                    ) : (
                                        recommendations.map(rec => (
                                            <div key={rec.id} className="p-8 rounded-[2rem] bg-indigo-50/30 dark:bg-indigo-900/5 border border-indigo-100 dark:border-indigo-900/30 relative group overflow-hidden">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Medical Node: {rec.doctor_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">Registered: {new Date(rec.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    {rec.is_important && <div className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black uppercase rounded">High Priority</div>}
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium mb-6">
                                                    {rec.content}
                                                </p>
                                                {rec.reply_text && (
                                                    <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Protocol Response:</p>
                                                        <p className="text-xs italic text-indigo-600 dark:text-indigo-400 font-bold">"{rec.reply_text}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Reports Navigation Bar */}
                            <div
                                onClick={() => setShowReports(true)}
                                className="group bg-white dark:bg-gray-800 p-10 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer hover:border-blue-500/30 hover:bg-blue-50/10 transition-all transition-duration-500"
                            >
                                <div className="flex items-center gap-8 text-center md:text-left">
                                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl shadow-indigo-500/5">
                                        <BookOpen className="h-10 w-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Clinical Report Ledger</h3>
                                        <p className="text-gray-500 dark:text-gray-400 font-semibold mt-1">Holistic assessment breakdown & predictive AI trajectory analysis</p>
                                    </div>
                                </div>
                                <div className="h-16 w-16 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center group-hover:rotate-45 transition-transform shadow-2xl">
                                    <ArrowRight className="h-8 w-8 text-white dark:text-gray-900" />
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="h-[70vh] flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 p-20 bg-gray-50/30 dark:bg-gray-800/20 rounded-[4rem] border-4 border-dashed border-gray-100 dark:border-gray-800/50">
                            <div className="relative mb-8">
                                <User className="h-32 w-32 opacity-20" />
                                <Search className="h-10 w-10 absolute bottom-2 right-2 text-blue-500 animate-bounce" />
                            </div>
                            <h3 className="text-2xl font-black tracking-tight mb-2">Selection Required</h3>
                            <p className="text-sm font-bold uppercase tracking-widest text-center max-w-xs">Select a verified Student Domain from the roster to operationalize dashboard insights.</p>
                            <button onClick={() => setShowAddChild(true)} className="mt-10 px-8 py-4 bg-white dark:bg-gray-800 border-2 border-blue-500/30 text-blue-500 font-black rounded-3xl hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-blue-500/10">Provision New Network Link</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Toast Notification */}
            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-fade-in">
                    <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-5 border backdrop-blur-xl transition-all ${notification.type === 'success' ? 'bg-indigo-600/90 border-indigo-500 text-white' :
                        notification.type === 'error' ? 'bg-rose-600/90 border-rose-500 text-white' :
                            'bg-blue-600/90 border-blue-500 text-white'
                        }`}>
                        <div className="p-2.5 bg-white/20 rounded-full">
                            {notification.type === 'success' ? <Activity size={20} /> :
                                notification.type === 'error' ? <X size={20} /> :
                                    <MessageSquare size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Parent Link</p>
                            <p className="font-bold text-sm tracking-wide">{notification.message}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Mic, Video, PhoneOff, User, FileText, MicOff, VideoOff, Save, Paperclip, Trash2, Eye, Check } from 'lucide-react';

interface ConsultationRoomProps {
    apptId: string;
    onExit: () => void;
}

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

export function ConsultationRoom({ apptId, onExit }: ConsultationRoomProps) {
    const { user, token } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [notes, setNotes] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; type?: 'danger' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const askConfirmation = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'info') => {
        setConfirmDialog({ title, message, onConfirm, type });
    };

    const notesRef = useRef(notes);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // UI States
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);

    const ws = useRef<WebSocket | null>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Fetch Appointment Details
    useEffect(() => {
        const fetchAppointment = async () => {
            try {
                const res = await fetch(`${API_URL}/api/appointments`, { // Helper: assumes list has it or add GET /id
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const appt = data.find((a: any) => a.id === apptId);
                    if (appt) {
                        // Filter out backend rating payloads so the doctor only edits the raw qualitative notes
                        let cleanNotes = appt.notes || '';
                        cleanNotes = cleanNotes.replace(/\[RATING_HISTORY:.*?\].*?(?=\n\[|$)/g, '').replace(/\[RATING:.*?\].*?(?=\n\[|$)/g, '').trim();
                        setNotes(cleanNotes);
                        notesRef.current = cleanNotes;
                    }
                }
            } catch (error) {
                console.error("Error fetching appointment", error);
            }
        };
        fetchAppointment();
    }, [apptId, token]);

    const streamRef = useRef<MediaStream | null>(null);

    // Get Local Stream
    useEffect(() => {
        let localStream: MediaStream | null = null;

        const startStream = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStream = s;
                setStream(s);
                streamRef.current = s; // Sync ref
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = s;
                }
                // Default to mic/video on
                s.getAudioTracks().forEach(t => t.enabled = true);
                s.getVideoTracks().forEach(t => t.enabled = true);
            } catch (err) {
                console.error("Error accessing media devices:", err);
            }
        };

        startStream();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // WebRTC Setup
    useEffect(() => {
        if (!user) return; // Connect even if no stream yet (for chat)

        // Initialize WebSocket
        const socket = new WebSocket(`${WS_URL}/${apptId}/${user.id}`);
        ws.current = socket;

        socket.onopen = () => {
            console.log('Connected to signaling server');
        };

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            handleSignalMessage(data);
        };

        socket.onerror = (err) => console.error("WebSocket error:", err);

        return () => {
            if (peerRef.current) peerRef.current.close();
            if (ws.current) ws.current.close();
        };
    }, [apptId, user]); // Removed stream dependency

    // Handle Remote Stream Updates
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Notes Save Logic
    const saveNotesToAPI = useCallback(async (text: string) => {
        if (!apptId) return;
        setSaveStatus('saving');
        try {
            const res = await fetch(`${API_URL}/api/appointments/${apptId}/notes`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ notes: text })
            });
            if (res.ok) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } else {
                setSaveStatus('error');
            }
        } catch (e) {
            console.error(e);
            setSaveStatus('error');
        }
    }, [apptId, token]);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNotes(val);
        notesRef.current = val;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaveStatus('saving');
        saveTimeoutRef.current = setTimeout(() => {
            saveNotesToAPI(val);
        }, 1500);
    };

    const handleSaveNow = () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveNotesToAPI(notesRef.current);
    };

    const handleClearNotes = () => {
        askConfirmation(
            'Purge Clinical Notes',
            'Are you sure you want to permanently delete all notes for this session? This action cannot be undone.',
            () => {
                setNotes('');
                notesRef.current = '';
                handleSaveNow();
                showToast('Clinical notes purged', 'info');
            },
            'danger'
        );
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                // Attempt final save on unmount if timeout is pending
                fetch(`${API_URL}/api/appointments/${apptId}/notes`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ notes: notesRef.current }),
                    keepalive: true
                }).catch(() => { });
            }
        };
    }, [apptId, token]);


    const handleSignalMessage = async (data: any) => {
        const { type, userId, description, candidate } = data;

        if (userId === user?.id) return;

        if (type === 'user-joined') {
            console.log(`User ${userId} joined, initiating call...`);
            createPeerConnection(userId, true);
        }
        else if (type === 'offer') {
            console.log(`Received offer from ${userId}`);
            createPeerConnection(userId, false, description);
        }
        else if (type === 'answer') {
            console.log(`Received answer from ${userId}`);
            if (peerRef.current) {
                await peerRef.current.setRemoteDescription(new RTCSessionDescription(description));
            }
        }
        else if (type === 'ice-candidate') {
            if (peerRef.current && candidate) {
                await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }
        else if (type === 'chat') {
            setMessages(prev => [...prev, data.message]);
        }
    };

    const createPeerConnection = async (remoteUserId: string, isInitiator: boolean, remoteDescription?: RTCSessionDescriptionInit) => {
        // Close existing if checking 1-on-1 logic strictness, but let's assume one peer for now
        if (peerRef.current) peerRef.current.close();

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });
        peerRef.current = pc;

        // Add local tracks using ReF to avoid stale closure
        const currentStream = streamRef.current;
        if (currentStream) {
            currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && ws.current) {
                ws.current.send(JSON.stringify({
                    type: 'ice-candidate',
                    targetId: remoteUserId,
                    userId: user?.id,
                    candidate: event.candidate
                }));
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log(`Received remote track`);
            setRemoteStream(event.streams[0]);
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (ws.current) {
                ws.current.send(JSON.stringify({
                    type: 'offer',
                    targetId: remoteUserId,
                    userId: user?.id,
                    description: pc.localDescription
                }));
            }
        } else if (remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(remoteDescription));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (ws.current) {
                ws.current.send(JSON.stringify({
                    type: 'answer',
                    targetId: remoteUserId,
                    userId: user?.id,
                    description: pc.localDescription
                }));
            }
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !ws.current) return;

        const msg = {
            id: Date.now(),
            user: user?.full_name || 'User',
            text: newMessage,
            time: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, msg]);

        ws.current.send(JSON.stringify({
            type: 'chat',
            userId: user?.id,
            message: msg
        }));

        setNewMessage('');
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMicOn(!isMicOn);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOn(!isVideoOn);
        }
    };

    const handleComplete = async () => {
        if (user?.role !== 'doctor') return;
        try {
            const res = await fetch(`${API_URL}/api/appointments/${apptId}/status?status=completed`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Consultation protocol completed successfully', 'success');
                setTimeout(() => onExit(), 1500);
            }
        } catch (error) {
            console.error("Error completing appointment", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
                <div className="text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        Consultation Session
                    </h2>
                    <p className="text-xs text-gray-400">ID: {apptId}</p>
                </div>
                <div className="flex items-center gap-4">
                    {user?.role === 'doctor' && (
                        <button
                            onClick={handleComplete}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold text-sm text-white"
                        >
                            Complete Session
                        </button>
                    )}
                    <button onClick={onExit} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                        <XIcon className="text-white h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Area */}
                <div className="flex-1 bg-black relative flex items-center justify-center p-4">
                    <div className="grid grid-cols-2 gap-4 w-full max-w-4xl h-full max-h-[600px]">
                        {/* Remote Video */}
                        <div className="bg-gray-800 rounded-xl overflow-hidden relative border border-gray-700 flex items-center justify-center">
                            {remoteStream ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center">
                                    <User className="h-20 w-20 text-gray-600 mx-auto mb-4 animate-pulse" />
                                    <p className="text-gray-400">Waiting for {user?.role === 'doctor' ? 'Patient' : 'Doctor'}...</p>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-black/50 px-2 py-1 rounded text-xs text-white">Remote</div>
                        </div>

                        {/* Local Video */}
                        <div className="bg-gray-800 rounded-xl overflow-hidden relative border border-gray-700 flex items-center justify-center">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                            <div className="absolute top-4 right-4 bg-black/50 px-2 py-1 rounded text-xs text-white">You</div>
                        </div>
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 bg-gray-800/80 p-3 rounded-full backdrop-blur-sm">
                        <button
                            onClick={toggleMic}
                            className={`p-3 rounded-full text-white ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`p-3 rounded-full text-white ${isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        </button>
                        <button onClick={onExit} className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white">
                            <PhoneOff className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Sidebar / Chat & Notes */}
                <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="p-3 border-b border-gray-700 text-gray-300 font-semibold">
                        Chat
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
                        {messages.length === 0 && <p className="text-gray-500 text-sm text-center mt-10">No messages yet.</p>}
                        {messages.map((m) => (
                            <div key={m.id} className="text-sm">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span className="font-bold text-gray-300">{m.user}</span>
                                    <span>{m.time}</span>
                                </div>
                                <p className="text-gray-200 bg-gray-700 p-2 rounded-lg">{m.text}</p>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex gap-2 shrink-0">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white focus:outline-none">
                            <Send className="h-4 w-4" />
                        </button>
                    </form>

                    {user?.role === 'doctor' && (
                        <div className="p-4 border-t border-gray-700 flex flex-col shrink-0 h-[250px]">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex justify-between items-center z-10">
                                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Digital Notes</span>
                                <div className="flex gap-2 items-center">
                                    {saveStatus === 'saving' && <span className="text-[10px] text-yellow-500 italic">Saving...</span>}
                                    {saveStatus === 'saved' && <span className="text-[10px] text-green-500 flex items-center gap-1"><Check className="h-3 w-3" /> Saved</span>}
                                    {saveStatus === 'error' && <span className="text-[10px] text-red-500 italic">Error saving</span>}
                                    <button onClick={handleSaveNow} title="Save Notes" className="hover:text-blue-400 disabled:opacity-50 transition-colors focus:outline-none" disabled={saveStatus === 'saving'}><Save className="h-3 w-3" /></button>
                                    <button onClick={() => showToast('Attachment system ready', 'info')} title="Attachment" className="hover:text-blue-400 transition-colors focus:outline-none"><Paperclip className="h-3 w-3" /></button>
                                    <button onClick={() => askConfirmation('Clinical Record', notes || "No notes to view.", () => { }, 'info')} title="View Complete Notes" className="hover:text-indigo-400 transition-colors focus:outline-none"><Eye className="h-3 w-3" /></button>
                                    <button onClick={handleClearNotes} title="Delete Notes" className="hover:text-red-400 transition-colors focus:outline-none"><Trash2 className="h-3 w-3" /></button>
                                </div>
                            </h3>
                            <textarea
                                value={notes}
                                onChange={handleNotesChange}
                                className="w-full flex-1 bg-gray-900 text-gray-300 text-sm p-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none resize-none transition-colors relative z-0"
                                placeholder="Session notes..."
                            />
                        </div>
                    )}
                </div>
            </div>
            {/* Notification System */}
            {notification && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-fade-in">
                    <div className={`px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-5 border backdrop-blur-xl transition-all ${notification.type === 'success' ? 'bg-emerald-600/90 border-emerald-500 text-white' :
                        notification.type === 'error' ? 'bg-rose-600/90 border-rose-500 text-white' :
                            'bg-blue-600/90 border-blue-500 text-white'
                        }`}>
                        <div className="p-2.5 bg-white/20 rounded-full">
                            {notification.type === 'success' ? <Check size={20} /> :
                                notification.type === 'error' ? <XIcon className="h-5 w-5" /> :
                                    <FileText size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Session Relay</p>
                            <p className="font-bold text-sm tracking-wide">{notification.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-[2.5rem] shadow-3xl w-full max-w-sm p-10 border border-gray-700 animate-scale-in text-center">
                        <div className={`w-20 h-20 ${confirmDialog.type === 'danger' ? 'bg-rose-900/40 text-rose-500' : 'bg-blue-900/40 text-blue-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                            {confirmDialog.type === 'danger' ? <Trash2 size={36} /> : <Eye size={36} />}
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">{confirmDialog.title}</h3>
                        <p className="text-gray-400 text-sm font-medium mb-8 whitespace-pre-wrap">{confirmDialog.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 py-4 bg-gray-700 text-gray-300 font-black rounded-2xl hover:bg-gray-600 transition-all active:scale-95"
                            >
                                {confirmDialog.type === 'danger' ? 'Abort' : 'Close'}
                            </button>
                            {confirmDialog.type === 'danger' && (
                                <button
                                    onClick={() => {
                                        confirmDialog.onConfirm();
                                        setConfirmDialog(null);
                                    }}
                                    className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition-all active:scale-95 shadow-xl shadow-rose-900"
                                >
                                    Confirm
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    );
}

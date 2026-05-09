import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, Mic, Video, PhoneOff, MicOff, VideoOff, ScreenShare } from 'lucide-react';

interface LiveClassRoomProps {
    classId: string;
    onExit: () => void;
}

const WS_URL = 'ws://localhost:8000/ws';

export function LiveClassRoom({ classId, onExit }: LiveClassRoomProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream }>({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<{ [key: string]: MediaStream }>({});

    // UI States
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [mediaReady, setMediaReady] = useState(false);
    const [activeScreenShareUserId, setActiveScreenShareUserId] = useState<string | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({}); // Ref for direct access in callbacks
    const candidateQueueRef = useRef<{ [key: string]: RTCIceCandidateInit[] }>({});
    const streamRef = useRef<MediaStream | null>(null);
    const fullScreenContainerRef = useRef<HTMLDivElement>(null);
    const localScreenStreamRef = useRef<MediaStream | null>(null);
    const localScreenSenderRefs = useRef<{ [key: string]: RTCRtpSender }>({});

    // Auto-fullscreen the entire class view on screen share
    useEffect(() => {
        const container = fullScreenContainerRef.current;
        if (activeScreenShareUserId && container) {
            const attemptFullscreen = async () => {
                try {
                    if (!document.fullscreenElement && container.requestFullscreen) {
                        await container.requestFullscreen();
                    }
                } catch (e) {
                    console.log('Fullscreen failed:', e);
                }
            };
            setTimeout(attemptFullscreen, 500);
        } else if (!activeScreenShareUserId) {
            try {
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen();
                }
            } catch (e) { }
        }
    }, [activeScreenShareUserId]);

    // Get Local Stream
    useEffect(() => {
        let localStream: MediaStream | null = null;
        const startStream = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStream = s;
                setStream(s);
                streamRef.current = s;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = s;
                }
                // Default to mic/video on
                s.getAudioTracks().forEach(t => t.enabled = true);
                s.getVideoTracks().forEach(t => t.enabled = true);
            } catch (err) {
                console.error("Error accessing media devices:", err);
                setIsMicOn(false);
                setIsVideoOn(false);
            } finally {
                setMediaReady(true);
            }
        };
        startStream();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Sync local video stream properly across React DOM layout swaps
    useEffect(() => {
        if (localVideoRef.current && stream && localVideoRef.current.srcObject !== stream) {
            localVideoRef.current.srcObject = stream;
        }
    });

    useEffect(() => {
        if (!user || !mediaReady) return; // Wait until camera logic runs
        if (ws.current) return; // Only connect once

        // Initialize WebSocket
        const socket = new WebSocket(`${WS_URL}/${classId}/${user.id}`);
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
            if (ws.current) ws.current.close();
            ws.current = null;
            // Close all peer connections
            if (peersRef.current) {
                Object.values(peersRef.current).forEach(pc => pc.close());
            }
        };
    }, [classId, user, mediaReady]);

    // Handle Signaling Messages
    const handleSignalMessage = async (data: any) => {
        const { type, userId, description, candidate, users } = data;

        // Ignore self
        if (userId === user?.id) return;

        if (type === 'room-users') {
            users.forEach((existingUserId: string) => {
                if (existingUserId === user?.id) return;
                // Use predictable sorting so only one peer creates the offer
                if ((user?.id || '') > existingUserId) {
                    console.log(`Initiating call to existing user ${existingUserId}...`);
                    setTimeout(() => createPeerConnection(existingUserId, true), 1000);
                } else {
                    console.log(`Waiting for existing user ${existingUserId} to call me...`);
                }
            });
        }
        else if (type === 'user-joined') {
            if ((user?.id || '') > userId) {
                console.log(`User ${userId} joined, initiating call...`);
                setTimeout(() => createPeerConnection(userId, true), 1000);
            } else {
                console.log(`User ${userId} joined, waiting for them to initiate call...`);
            }

            // Tell the newly joined user if we are currently sharing our screen
            if (isScreenSharing && ws.current) {
                setTimeout(() => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({
                            type: 'screen-share-started',
                            userId: user?.id
                        }));
                    }
                }, 1500);
            }
        }
        else if (type === 'offer') {
            console.log(`Received offer from ${userId}`);
            if (peersRef.current[userId]) {
                const pc = peersRef.current[userId];

                // Handle glare/collision gracefully
                const isPolite = (user?.id || '') < userId;
                if (pc.signalingState !== 'stable') {
                    if (!isPolite) {
                        console.log("Ignoring colliding offer from", userId);
                        return;
                    }
                    try {
                        await pc.setLocalDescription({ type: 'rollback' });
                    } catch (e) {
                        console.error("Rollback failed", e);
                    }
                }

                await pc.setRemoteDescription(new RTCSessionDescription(description));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        type: 'answer',
                        targetId: userId,
                        userId: user?.id,
                        description: pc.localDescription
                    }));
                }
            } else {
                createPeerConnection(userId, false, description);
            }
        }
        else if (type === 'answer') {
            console.log(`Received answer from ${userId}`);
            const pc = peersRef.current[userId];
            if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(description));
                // Flush candidates
                if (candidateQueueRef.current[userId]) {
                    for (let c of candidateQueueRef.current[userId]) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
                    }
                    delete candidateQueueRef.current[userId];
                }
            }
        }
        else if (type === 'ice-candidate') {
            const pc = peersRef.current[userId];
            if (pc && candidate) {
                if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    if (!candidateQueueRef.current[userId]) candidateQueueRef.current[userId] = [];
                    candidateQueueRef.current[userId].push(candidate);
                }
            }
        }
        else if (type === 'screen-share-started') {
            setActiveScreenShareUserId(userId);
        }
        else if (type === 'screen-share-stopped') {
            setActiveScreenShareUserId(prev => prev === userId ? null : prev);
            setRemoteScreenStreams(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
            });
        }
        else if (type === 'user-left') {
            console.log(`User ${userId} left`);
            setActiveScreenShareUserId(prev => prev === userId ? null : prev);
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                if (newStreams[userId]) {
                    newStreams[userId].getTracks().forEach(track => track.stop());
                }
                delete newStreams[userId];
                return newStreams;
            });
            setRemoteScreenStreams(prev => {
                const newStreams = { ...prev };
                if (newStreams[userId]) {
                    newStreams[userId].getTracks().forEach(track => track.stop());
                }
                delete newStreams[userId];
                return newStreams;
            });
            if (peersRef.current[userId]) {
                peersRef.current[userId].close();
                delete peersRef.current[userId];
            }
        }
        else if (type === 'chat') {
            setMessages(prev => [...prev, data.message]);
        }
    };

    const createPeerConnection = async (remoteUserId: string, isInitiator: boolean, remoteDescription?: RTCSessionDescriptionInit) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' } // Free STUN server
            ]
        });

        peersRef.current[remoteUserId] = pc;

        // Add local tracks
        const currentStream = streamRef.current;
        if (currentStream) {
            currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));
        }

        const currentScreenStream = localScreenStreamRef.current;
        if (currentScreenStream) {
            currentScreenStream.getTracks().forEach(track => {
                const sender = pc.addTrack(track, currentScreenStream);
                localScreenSenderRefs.current[remoteUserId] = sender;
            });
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

        // Handle remote stream mapping logic
        pc.ontrack = (event) => {
            console.log(`Received remote track from ${remoteUserId}, kind: ${event.track.kind}`);

            setRemoteStreams(prev => {
                const existingCameraStream = prev[remoteUserId];

                // Reliable Screen Share track detection:
                // If the camera stream already has a video track, this NEW video track must be the screen share!
                if (existingCameraStream && event.track.kind === 'video') {
                    const hasVideoAlready = existingCameraStream.getVideoTracks().length > 0;
                    if (hasVideoAlready && !existingCameraStream.getVideoTracks().find(t => t.id === event.track.id)) {
                        setTimeout(() => {
                            setRemoteScreenStreams(screenPrev => {
                                const s = screenPrev[remoteUserId] || new MediaStream();
                                if (!s.getTracks().find(t => t.id === event.track.id)) {
                                    s.addTrack(event.track);
                                }
                                return { ...screenPrev, [remoteUserId]: s };
                            });
                        }, 0);
                        return prev;
                    }
                }

                // Otherwise, it's the primary camera/mic stream mapping
                if (existingCameraStream) {
                    if (!existingCameraStream.getTracks().find(t => t.id === event.track.id)) {
                        existingCameraStream.addTrack(event.track);
                    }
                    return { ...prev };
                }

                const newStream = new MediaStream();
                newStream.addTrack(event.track);
                return { ...prev, [remoteUserId]: newStream };
            });
        };

        // Negotiation support for multi-track (screenshare + camera injection dynamically)
        pc.onnegotiationneeded = async () => {
            try {
                if (pc.signalingState !== 'stable') return;
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        type: 'offer',
                        targetId: remoteUserId,
                        userId: user?.id,
                        description: pc.localDescription
                    }));
                }
            } catch (err) {
                console.log("Negotiation Error:", err);
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
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
            // Flush candidate queue
            if (candidateQueueRef.current[remoteUserId]) {
                for (let c of candidateQueueRef.current[remoteUserId]) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
                }
                delete candidateQueueRef.current[remoteUserId];
            }
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

        if (ws.current.readyState !== WebSocket.OPEN) {
            alert("Chat disconnected. Trying to reconnect...");
            return;
        }

        const msg = {
            id: Date.now(),
            user: user?.full_name || 'User',
            text: newMessage,
            time: new Date().toLocaleTimeString()
        };

        // Local display
        setMessages(prev => [...prev, msg]);

        // Send via WS
        ws.current.send(JSON.stringify({
            type: 'chat',
            userId: user?.id,
            message: msg
        }));

        setNewMessage('');
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsMicOn(prev => !prev);
        } else {
            alert("No microphone detected!");
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
            setIsVideoOn(prev => !prev);
        } else {
            alert("No camera detected!");
        }
    };

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                localScreenStreamRef.current = screenStream;

                Object.entries(peersRef.current).forEach(([id, pc]) => {
                    const sender = pc.addTrack(screenTrack, screenStream);
                    localScreenSenderRefs.current[id] = sender;
                });

                screenTrack.onended = () => {
                    stopScreenShare();
                };
                setIsScreenSharing(true);
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        type: 'screen-share-started',
                        userId: user?.id
                    }));
                }
            } catch (err) {
                console.error("Error sharing screen", err);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (localScreenStreamRef.current) {
            const screenTrack = localScreenStreamRef.current.getVideoTracks()[0];
            Object.entries(peersRef.current).forEach(([id, pc]) => {
                const sender = localScreenSenderRefs.current[id];
                if (sender) pc.removeTrack(sender);
            });
            screenTrack.stop();
            localScreenStreamRef.current = null;
            localScreenSenderRefs.current = {};
        }
        setIsScreenSharing(false);
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'screen-share-stopped',
                userId: user?.id
            }));
        }
    };

    // Calculate active screen share explicitly tracking using websocket status and distinct streams
    let activeScreenShare: [string, MediaStream] | null = null;
    if (activeScreenShareUserId && remoteScreenStreams[activeScreenShareUserId]) {
        activeScreenShare = [activeScreenShareUserId, remoteScreenStreams[activeScreenShareUserId]];
    } else if (isScreenSharing && localScreenStreamRef.current) {
        // Render local user's own screen share to them
        activeScreenShare = [user?.id || 'local', localScreenStreamRef.current];
    }

    return (
        <div ref={fullScreenContainerRef} className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
                <div className="text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        Live Class: {classId.substring(0, 8)}...
                    </h2>
                </div>
                <button onClick={onExit} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                    <XIcon className="text-white h-5 w-5" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Grid */}
                <div className="flex-1 bg-black p-4 relative overflow-hidden">
                    {activeScreenShare ? (
                        <>
                            {/* Full Height Screen Share Background */}
                            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
                                <VideoPlayer stream={activeScreenShare[1]} label={`Screen: User ${activeScreenShare[0].substring(0, 5)}`} isRaw />
                            </div>

                            {/* Floating Webcams Sidebar overlay */}
                            <div className="absolute right-4 top-4 bottom-24 w-48 flex flex-col gap-2 overflow-y-auto z-20 custom-scrollbar pr-1">
                                {/* Local Video Thumbnail */}
                                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-green-500 shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={`w-full h-full object-cover ${!isScreenSharing ? 'transform scale-x-[-1]' : ''}`}
                                    />
                                    <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-white text-[10px]">
                                        You {isScreenSharing ? "(Sharing)" : ""}
                                    </div>
                                </div>

                                {/* Remote Webcams Thumbnails */}
                                {Object.entries(remoteStreams)
                                    .filter(([peerId]) => peerId !== activeScreenShare[0])
                                    .map(([peerId, remoteStream]) => (
                                        <div key={`cam-${peerId}`} className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0">
                                            <VideoPlayer stream={remoteStream} label={`User ${peerId.substring(0, 5)}`} />
                                        </div>
                                    ))}
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 h-full content-start overflow-y-auto">
                            {/* Local Video */}
                            <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-green-500 max-h-[40vh]">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={`w-full h-full object-cover ${!isScreenSharing ? 'transform scale-x-[-1]' : ''}`}
                                />
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                                    You ({user?.full_name}) {isScreenSharing ? "(Sharing Screen)" : ""}
                                </div>
                            </div>

                            {/* Remote Webcams */}
                            {Object.entries(remoteStreams).map(([peerId, remoteStream]) => (
                                <div key={`cam-${peerId}`} className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 max-h-[40vh]">
                                    <VideoPlayer stream={remoteStream} label={`User ${peerId.substring(0, 5)}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar / Chat */}
                <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="p-3 border-b border-gray-700 text-gray-300 font-semibold">
                        Chat
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white">
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 bg-gray-800/80 p-3 rounded-full backdrop-blur-sm z-50">
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
                <button
                    onClick={toggleScreenShare}
                    className={`p-3 rounded-full text-white ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                    <ScreenShare className="h-5 w-5" />
                </button>
                <button onClick={onExit} className="p-3 bg-red-600 hover:bg-red-700 rounded-full text-white">
                    <PhoneOff className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}

function VideoPlayer({ stream, label, isRaw = false }: { stream: MediaStream, label: string, isRaw?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (isRaw) {
        return (
            <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs z-10">
                    {label}
                </div>
            </>
        )
    }

    return (
        <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs z-10">
                {label}
            </div>
        </div>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    )
}

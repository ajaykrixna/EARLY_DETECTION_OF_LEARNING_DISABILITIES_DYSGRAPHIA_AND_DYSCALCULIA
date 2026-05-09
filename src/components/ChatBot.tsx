import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Trash2, Mic, Phone } from 'lucide-react';

const QA_KNOWLEDGE = [
    {
        keywords: ['dysgraphia', 'writing'],
        answer: "Dysgraphia is a learning disability that affects writing abilities. It can manifest as difficulties with spelling, poor handwriting and trouble putting thoughts on paper."
    },
    {
        keywords: ['dyscalculia', 'math', 'numbers'],
        answer: "Dyscalculia is a specific learning disability that affects a person's ability to understand numbers and learn math facts."
    },
    {
        keywords: ['test', 'assessment', 'start'],
        answer: "You can start a test by navigating to the dashboard and clicking on 'Dysgraphia Test' or 'Dyscalculia Test'. Make sure you have a camera enabled."
    },
    {
        keywords: ['result', 'report', 'score'],
        answer: "Results are available immediately after the test. You can view detailed reports in the 'History' section or by clicking 'View Reports' on the dashboard."
    },
    {
        keywords: ['doctor', 'consultation', 'appointment'],
        answer: "You can book a consultation with a specialist directly from the dashboard. Look for the 'Book Consultation' card or the 'Appointments' section."
    },
    {
        keywords: ['class', 'live', 'session'],
        answer: "Live classes are scheduled by teachers. If a class is live, you will see a 'Join Live Now' button on your dashboard."
    },
    {
        keywords: ['support', 'help'],
        answer: "We are here to help! You can ask me about Dysgraphia, Dyscalculia, how to use the app, or connect with a specialist."
    }
];

interface ChatBotProps {
    stats?: any[];
}

export function ChatBot({ stats }: ChatBotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string, sender: 'user' | 'bot' }[]>([
        { text: "Hi! I'm NeuroBot. How can I help you today?", sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = inputValue.trim();
        setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
        setInputValue('');

        // Simple keyword matching for response
        setTimeout(() => {
            let response = "I'm not sure I understand. Can you rephrase that? You can ask about Dysgraphia, tests, or appointments.";
            const lowerMsg = userMsg.toLowerCase();

            // Stats / Progress Context
            if (stats && (lowerMsg.includes('progress') || lowerMsg.includes('how am i doing') || lowerMsg.includes('my stats'))) {
                if (stats.length === 0) {
                    response = "You haven't taken any tests yet. Take a test to see your progress!";
                } else {
                    const lastTest = stats[0];
                    response = `You have completed ${stats.length} tests. Your most recent test was for ${lastTest.type} on ${new Date(lastTest.created_at).toLocaleDateString()} with a result of ${lastTest.prediction_class}.`;
                }
            } else if (stats && (lowerMsg.includes('last test') || lowerMsg.includes('recent result'))) {
                if (stats.length > 0) {
                    const last = stats[0];
                    response = `Your last test was a ${last.type} assessment. The result was ${last.prediction_class} with ${(last.confidence_score * 100).toFixed(1)}% confidence.`;
                } else {
                    response = "No tests found in your history to report on.";
                }
            } else {
                for (const item of QA_KNOWLEDGE) {
                    if (item.keywords.some(k => lowerMsg.includes(k))) {
                        response = item.answer;
                        break;
                    }
                }

                // Greetings override
                if (['hi', 'hello', 'hey'].some(g => lowerMsg.includes(g))) {
                    response = "Hello there! How can I assist you with NeuroSense today?";
                }
            }

            setMessages(prev => [...prev, { text: response, sender: 'bot' }]);
        }, 500);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-slide-up">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <Bot className="h-6 w-6" />
                            <span className="font-bold">NeuroBot</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setMessages([{ text: "Hi! I'm NeuroBot. How can I help you today?", sender: 'bot' }])} title="Clear Chat" className="hover:bg-white/20 p-1 rounded">
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none shadow-sm'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-2 gap-2 flex overflow-x-auto text-xs bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 items-center hide-scrollbar whitespace-nowrap scrollbar-hide">
                        <button onClick={() => { setInputValue("Test results"); }} className="px-2 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600">📊 Progress</button>
                        <button onClick={() => { setInputValue("Book consultation"); }} className="px-2 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600">📅 Book Session</button>
                        <button onClick={() => { setMessages(prev => [...prev, { text: "Connecting...", sender: 'user' }, { text: "Connecting you to a human specialist... Please wait.", sender: 'bot' }]); }} className="px-2 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-full shadow-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600 flex items-center gap-1"><Phone className="h-3 w-3" /> Escalate</button>
                    </div>

                    <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 flex gap-2 w-full">
                        <button type="button" onClick={() => setInputValue("Listening...")} title="Voice Input" className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <Mic className="h-5 w-5" />
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shrink-0">
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </button>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Clipboard,
    Check,
    Trash2,
    Plus,
    MessageSquare,
    SendHorizonal,
    Bot,
    User,
    Sparkles,
    Terminal,
    RefreshCcw,
    Menu,
    X
} from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Session {
    id: number;
    title: string;
    updated_at: string;
}

const CopyButton = ({ text, label = "Salin" }: { text: string; label?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Modern API (Secure only)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(err => {
                console.error('Clipboard API Error:', err);
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (textStr: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = textStr;

            // Ensure it's not visible but part of the document
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            if (successful) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
            document.body.removeChild(textArea);
        } catch (err) {
            console.error('Final Fallback Error:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            type="button"
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all border shrink-0 ${copied
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
        >
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
            <span className="text-[10px] font-black uppercase tracking-tighter">{copied ? 'Tersalin!' : label}</span>
        </button>
    );
};

export default function ChatbotPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        if (currentSessionId) {
            fetchHistory(currentSessionId);
        } else {
            setMessages([]);
        }
        // Close sidebar on mobile after selecting a session
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, [currentSessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/chatbot/sessions');
            const data = await res.json();
            if (Array.isArray(data)) {
                setSessions(data);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    const fetchHistory = async (sessionId: number) => {
        try {
            const res = await fetch(`/api/chatbot/history/${sessionId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data.map(m => ({ role: m.role, content: m.content })));
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const createNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setInput('');
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    };

    const deleteSession = async (sessionId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Hapus chat ini permanen?')) return;

        try {
            await fetch('/api/chatbot/sessions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            setSessions(sessions.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                createNewChat();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userQuery = input;
        setInput('');
        setIsLoading(true);

        let sessionId = currentSessionId;

        try {
            if (!sessionId) {
                const resSet = await fetch('/api/chatbot/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: userQuery.length > 30 ? userQuery.substring(0, 30) + '...' : userQuery }),
                });
                const dataSet = await resSet.json();
                sessionId = dataSet.id;
                setCurrentSessionId(sessionId);
                fetchSessions();
            }

            setMessages(prev => [...prev, { role: 'user', content: userQuery }]);

            const res = await fetch('/api/chatbot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: userQuery }),
            });
            const data = await res.json();

            if (data.assistant) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.assistant }]);
            } else if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${data.error}` }]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-white font-sans relative">
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="fixed top-20 left-4 z-50 p-3 bg-blue-600 rounded-2xl lg:hidden shadow-2xl text-white border border-white/20 hover:scale-105 active:scale-95 transition-all"
            >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay for Mobile Sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sessions Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="p-4 pt-16 lg:pt-4">
                    <button
                        onClick={createNewChat}
                        className="w-full py-3.5 px-4 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-white/10 group shadow-lg shadow-blue-500/10"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        <span className="tracking-tight uppercase text-xs">Chat Baru</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
                    <div className="flex items-center gap-2 px-3 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 my-2">
                        <RefreshCcw size={12} className="animate-spin-slow" />
                        Riwayat Chat
                    </div>
                    {sessions.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Belum ada riwayat</p>
                        </div>
                    ) : sessions.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => setCurrentSessionId(s.id)}
                            className={`group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all ${currentSessionId === s.id
                                ? 'bg-blue-600/20 text-blue-100 border border-blue-500/40 shadow-xl'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                                }`}
                        >
                            <MessageSquare size={16} className={currentSessionId === s.id ? 'text-blue-400' : 'text-slate-500'} />
                            <span className="flex-1 truncate text-xs font-bold">{s.title}</span>
                            <button
                                onClick={(e) => deleteSession(s.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg border border-white/10 font-black text-white overflow-hidden">
                            {user?.profile_image ? (
                                <img
                                    src={user.profile_image}
                                    alt={user.username}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                user?.username?.[0]?.toUpperCase()
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-black text-xs truncate uppercase tracking-tight">{user?.username}</p>
                            <p className="text-[9px] text-blue-400 uppercase font-black tracking-widest">Premium System</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Chat Container */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                </div>

                {/* Scrollable Messages Area */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar relative z-10"
                >
                    <div className="max-w-[1200px] mx-auto p-4 md:p-8 lg:p-12 w-full min-h-full flex flex-col">
                        {messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 md:py-10 animate-fade-in-up">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-white/5">
                                        <Bot size={40} className="text-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-800 rounded-full border-2 border-slate-950 flex items-center justify-center text-lg shadow-lg ring-1 ring-blue-500/20">
                                        <span>⚡</span>
                                    </div>
                                </div>

                                <h1 className="text-3xl font-black mb-3 tracking-tight">
                                    Halo, <span className="bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-500 bg-clip-text text-transparent">{user?.username}</span>
                                </h1>
                                <p className="max-w-lg text-slate-400 leading-relaxed mb-8 font-bold text-sm md:text-base">
                                    Selamat datang di Chatbot Unlimited. <br />Tanyakan apapun untuk membantu produktivitas Anda hari ini.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl px-4">
                                    {[
                                        { icon: '📝', text: 'Buat draf laporan logbook hari ini' },
                                        { icon: '💻', text: 'Update query SQL untuk tabel logbook' },
                                        { icon: '📊', text: 'Analisis statistik order bulanan' },
                                        { icon: '✉️', text: 'Tulis email balasan untuk teknisi' }
                                    ].map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setInput(item.text)}
                                            className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-2xl text-left transition-all flex items-center gap-4 group shadow-lg"
                                        >
                                            <span className="text-xl bg-slate-800/80 w-12 h-12 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform shadow-inner ring-1 ring-white/5">
                                                {item.icon}
                                            </span>
                                            <span className="text-[11px] font-black text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight">
                                                {item.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12 pb-10">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex gap-3 md:gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10 mt-1 overflow-hidden ${m.role === 'user'
                                            ? 'bg-slate-800 text-slate-400'
                                            : 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white'
                                            }`}>
                                            {m.role === 'user' ? (
                                                user?.profile_image ? (
                                                    <img
                                                        src={user.profile_image}
                                                        alt="User"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User size={20} />
                                                )
                                            ) : (
                                                <Bot size={20} />
                                            )}
                                        </div>

                                        <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[80%] group min-w-0`}>
                                            <div className="flex items-center gap-3 mb-1.5 px-2 w-full justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                                    <div className={`w-1 h-1 rounded-full ${m.role === 'user' ? 'bg-slate-600' : 'bg-blue-500 animate-pulse'}`}></div>
                                                    {m.role === 'user' ? 'Anda' : 'Asisten AI'}
                                                </span>
                                                {m.role === 'assistant' && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <CopyButton text={m.content} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`p-4 md:p-5 rounded-2xl shadow-xl leading-relaxed text-sm md:text-base break-words overflow-hidden ${m.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-slate-900/90 backdrop-blur-xl border border-white/10 text-slate-200 rounded-tl-none ring-1 ring-white/5'
                                                }`}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ className, children, ...props }) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            const isInline = !className;
                                                            const codeString = String(children).replace(/\n$/, '');
                                                            return !isInline ? (
                                                                <div className="my-8 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-3xl w-full">
                                                                    <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10">
                                                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                                            <Terminal size={14} className="text-blue-500" />
                                                                            {match ? match[1] : 'Source Code'}
                                                                        </div>
                                                                        <CopyButton text={codeString} label="Salin Kode" />
                                                                    </div>
                                                                    <div className="p-6 md:p-8 overflow-x-auto custom-scrollbar font-mono text-[13px] leading-7 bg-black/20">
                                                                        <code>{children}</code>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <code className="px-2 py-0.5 rounded-lg bg-white/10 text-blue-300 font-bold whitespace-pre-wrap break-all" {...props}>
                                                                    {children}
                                                                </code>
                                                            )
                                                        },
                                                        p: ({ children }) => <p className="mb-6 last:mb-0 leading-[1.8]">{children}</p>,
                                                        ul: ({ children }) => <ul className="list-disc pl-8 mb-6 space-y-3">{children}</ul>,
                                                        ol: ({ children }) => <ol className="list-decimal pl-8 mb-6 space-y-3">{children}</ol>,
                                                        li: ({ children }) => <li className="marker:text-blue-500 font-medium">{children}</li>,
                                                        h1: ({ children }) => <h1 className="text-3xl font-black mb-8 mt-6 tracking-tight text-white">{children}</h1>,
                                                        h2: ({ children }) => <h2 className="text-2xl font-black mb-6 mt-4 text-white/90">{children}</h2>,
                                                        blockquote: ({ children }) => (
                                                            <blockquote className="border-l-4 border-blue-600 pl-8 italic text-slate-400 my-8 bg-blue-600/5 py-4 rounded-r-3xl">
                                                                {children}
                                                            </blockquote>
                                                        ),
                                                        a: ({ href, children }) => (
                                                            <a href={href} className="text-blue-400 hover:text-blue-300 transition-colors underline decoration-2 underline-offset-4 font-black break-all" target="_blank" rel="noopener noreferrer">{children}</a>
                                                        ),
                                                        table: ({ children }) => (
                                                            <div className="overflow-x-auto my-8 rounded-2xl border border-white/10 w-full shadow-2xl">
                                                                <table className="w-full text-sm text-left border-collapse">{children}</table>
                                                            </div>
                                                        ),
                                                        th: ({ children }) => <th className="px-6 py-4 bg-white/10 font-black uppercase tracking-widest text-[10px] border-b border-white/10">{children}</th>,
                                                        td: ({ children }) => <td className="px-6 py-4 border-b border-white/5 font-medium">{children}</td>
                                                    }}
                                                >
                                                    {m.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex gap-4 md:gap-8 animate-pulse pr-12">
                                        <div className="w-12 h-12 rounded-[1rem] bg-slate-800 flex items-center justify-center border border-white/10 shrink-0">
                                            <Bot size={24} className="text-slate-600" />
                                        </div>
                                        <div className="bg-slate-900/50 border border-white/10 rounded-[2rem] rounded-tl-none p-8 min-w-[120px] shadow-2xl">
                                            <div className="flex gap-2.5">
                                                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                                                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                                                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-20" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Improved Input Bar */}
                <div className="shrink-0 p-4 md:p-8 lg:p-12 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent border-t border-white/5 z-20">
                    <form
                        onSubmit={handleSendMessage}
                        className="max-w-5xl mx-auto relative group"
                    >
                        <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full opacity-0 group-focus-within:opacity-100 transition-all duration-700"></div>
                        <div className="relative flex items-center gap-4">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Tanyakan apapun pada asisten cerdas..."
                                className="flex-1 bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] py-6 px-10 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-600/30 focus:border-blue-500/50 transition-all shadow-3xl text-lg font-medium"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-500 hover:to-indigo-700 disabled:from-slate-800 disabled:to-slate-900 disabled:opacity-50 text-white rounded-[1.8rem] flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95 group shrink-0 border border-white/10"
                            >
                                <SendHorizonal size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </div>
                    </form>

                    <div className="hidden md:flex items-center justify-center gap-8 mt-8">
                        <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 shadow-inner">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
                            Neural Core Active
                        </div>
                        <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] shadow-inner">
                            GPT-4o Mini Premium
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .markdown-content pre {
            margin: 0 !important;
        }
        .shadow-3xl {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
      `}</style>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
    PageHeader,
    PremiumCard,
    PremiumButton,
    PremiumInput,
    PremiumBadge,
    PremiumAlert
} from '@/components/ui/PremiumComponents';

export default function TelegramPage() {
    return (
        <ProtectedRoute>
            <TelegramContent key="telegram-view" />
        </ProtectedRoute>
    );
}

function TelegramContent() {
    const { user } = useAuth();
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTED' | 'LOADING'>('LOADING');
    const [telegramUser, setTelegramUser] = useState<any>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMsg, setInputMsg] = useState('');
    const [mainKeyboard, setMainKeyboard] = useState<any[] | null>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    };

    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        checkStatus();
    }, []);

    useEffect(() => {
        let interval: any;
        if (status === 'CONNECTED') {
            fetchMessages();
            interval = setInterval(fetchMessages, 3000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [status]);

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/telegram?action=messages');
            const data = await res.json();
            if (data.messages) {
                const sorted = [...data.messages].sort((a, b) => a.id - b.id);
                setMessages(sorted);
                if (data.mainKeyboard) {
                    // console.log("[Telegram] Keyboard received:", data.mainKeyboard.length, "rows");
                    setMainKeyboard(data.mainKeyboard);
                } else {
                    setMainKeyboard(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    };

    const handleSendMessage = async (msg: string) => {
        if (!msg.trim()) return;
        try {
            await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', message: msg })
            });
            fetchMessages();
        } catch (error) {
            addLog("Failed to send message");
        }
    };

    const handleSendPhoto = async (photoData: string, caption: string = "") => {
        setLoading(true);
        addLog("Sending photo...");
        try {
            const res = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send-photo', photo: photoData, message: caption })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addLog("Photo sent!");
            fetchMessages();
        } catch (error: any) {
            addLog(`Failed to send photo: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleButtonClick = async (msgId: number, row: number, col: number, text: string, type: string) => {
        try {
            if (type === 'callback') {
                addLog(`[Clicking] ${text}`);
                await fetch('/api/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'click', msgId, row, col })
                });
            } else {
                handleSendMessage(text);
            }
            fetchMessages();
        } catch (error) {
            addLog(`Error clicking button: ${error}`);
        }
    };

    const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);

    const onPaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setAttachedPhoto(event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setAttachedPhoto(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (attachedPhoto) {
            handleSendPhoto(attachedPhoto, inputMsg);
            setAttachedPhoto(null);
        } else {
            handleSendMessage(inputMsg);
        }
        setInputMsg('');
    };

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/telegram');
            const data = await res.json();
            setStatus(data.status);
            setTelegramUser(data.user);
        } catch (error) {
            setStatus('DISCONNECTED');
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        addLog(`Connecting with ${phoneNumber}...`);
        try {
            const res = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect', phoneNumber })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setPhoneCodeHash(data.phoneCodeHash);
            setStep(2);
            addLog("Code sent!");
        } catch (error: any) {
            addLog(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', phoneNumber, phoneCodeHash, code, password })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addLog("Login successful!");
            await checkStatus();
            setStep(1);
        } catch (error: any) {
            addLog(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAutomate = async () => {
        setLoading(true);
        try {
            await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'automate' })
            });
            addLog("Automation started!");
        } catch (error: any) {
            addLog("Automation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Disconnect?")) return;
        try {
            await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect' })
            });
            setTelegramUser(null);
            setStatus('DISCONNECTED');
        } catch (error) {
            addLog("Failed to disconnect");
        }
    };

    const [isAtBottom, setIsAtBottom] = useState(true);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAtBottom(atBottom);
    };

    useEffect(() => {
        if (isAtBottom) scrollToBottom();
    }, [messages]);

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-fade-in-up">
            <PageHeader
                icon="✈️"
                title="Telegram Bridge"
                subtitle={status === 'CONNECTED' ? `Autentikasi Aktif: ${telegramUser?.firstName}` : 'Menunggu koneksi akun Telegram...'}
                actions={
                    status === 'CONNECTED' ? (
                        <PremiumButton variant="danger" size="sm" onClick={handleDisconnect}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            Disconnect
                        </PremiumButton>
                    ) : (
                        <PremiumBadge variant={status === 'LOADING' ? 'amber' : 'slate'}>
                            {status}
                        </PremiumBadge>
                    )
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Sidebar Panes */}
                <div className="lg:col-span-1 space-y-8 lg:sticky lg:top-8">
                    {/* Account Control Card */}
                    <PremiumCard className="p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 transition-all group-hover:bg-blue-100"></div>

                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Account Control
                        </h3>

                        {status === 'CONNECTED' ? (
                            <div className="space-y-6">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4 relative z-10">
                                    <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg shadow-blue-200">
                                        {telegramUser?.firstName?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800 text-base truncate">{telegramUser?.firstName}</p>
                                        <PremiumBadge variant="emerald" size="sm" className="mt-1">
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Active
                                            </span>
                                        </PremiumBadge>
                                    </div>
                                </div>
                                <PremiumButton
                                    variant="primary"
                                    className="w-full py-4 text-xs tracking-[0.2em]"
                                    onClick={handleAutomate}
                                    disabled={loading}
                                >
                                    🚀 JALANKAN UPDATE OTOMATIS
                                </PremiumButton>
                                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest opacity-60">
                                    Synchronizing with @Robtechbot
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <PremiumAlert variant="amber" icon="⚠️">
                                    Bot memerlukan koneksi untuk sinkronisasi data.
                                </PremiumAlert>

                                {step === 1 ? (
                                    <div className="space-y-5 pt-2">
                                        <PremiumInput
                                            label="Phone Number"
                                            placeholder="+628..."
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                        />
                                        <PremiumButton className="w-full" onClick={handleConnect} disabled={loading}>
                                            Lanjutkan ✈️
                                        </PremiumButton>
                                    </div>
                                ) : (
                                    <div className="space-y-5 pt-2">
                                        <div className="space-y-4">
                                            <PremiumInput
                                                label="Verification Code"
                                                placeholder="00000"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className="text-center font-black tracking-[0.5em]"
                                            />
                                            <PremiumInput
                                                label="2FA Password (Optional)"
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <PremiumButton variant="secondary" className="flex-1" onClick={() => setStep(1)}>Back</PremiumButton>
                                            <PremiumButton className="flex-[2]" onClick={handleVerify} disabled={loading}>Verify</PremiumButton>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </PremiumCard>

                    {/* macOS Style Terminal Logs */}
                    <div className="bg-slate-900/95 backdrop-blur-xl rounded-[1.5rem] shadow-2xl border border-white/10 overflow-hidden group flex flex-col h-[350px]">
                        {/* Terminal Header */}
                        <div className="bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] px-5 py-3 flex items-center relative border-b border-black/20">
                            {/* Traffic Lights */}
                            <div className="flex gap-2 z-10">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                            </div>
                            {/* Window Title */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-[11px] font-bold text-slate-300 tracking-tight opacity-80">
                                    zsh — telegram — 80×24
                                </span>
                            </div>
                        </div>

                        {/* Terminal Content */}
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-2.5 relative">
                            {/* Glow Effect */}
                            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 py-10">
                                    <p className="text-blue-500/30 animate-pulse text-xs">Waiting for events...</p>
                                    <div className="flex gap-1.5 opacity-20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    </div>
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex gap-3 items-start animate-fade-in-up duration-300 border-l-2 border-transparent hover:border-blue-500/30 pl-1 transition-all">
                                        <span className="text-emerald-500 font-bold opacity-80 select-none">➜</span>
                                        <div className="flex-1">
                                            <span className="text-blue-400 opacity-60 mr-2 font-bold">~</span>
                                            <span className="text-slate-300 break-all leading-relaxed font-medium">
                                                {log}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                            {/* Blinking Cursor */}
                            <div className="flex gap-3 items-center pl-1">
                                <span className="text-emerald-500 font-bold">➜</span>
                                <span className="text-blue-400 font-bold">~</span>
                                <div className="w-2 h-4 bg-slate-400 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Chat Interface */}
                <PremiumCard className="lg:col-span-2 p-0 flex flex-col h-[750px] relative overflow-hidden group/chat">
                    {/* Chat Header */}
                    <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-white/70 backdrop-blur-xl z-20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100 group-hover/chat:scale-110 transition-transform duration-500">
                                🤖
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-base tracking-tight">@Robtechbot</h3>
                                <div className="flex items-center gap-2">
                                    <PremiumBadge variant="emerald" size="sm" className="scale-75 origin-left">
                                        <span className="flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Live Stream
                                        </span>
                                    </PremiumBadge>
                                    <button
                                        onClick={() => fetchMessages()}
                                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                                    >
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        </div>

                        {!isAtBottom && (
                            <button
                                onClick={scrollToBottom}
                                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce shadow-xl shadow-blue-500/30 active:scale-95 transition-all"
                            >
                                ↓ Bottom
                            </button>
                        )}
                    </div>

                    {/* Chat Content */}
                    <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 custom-scrollbar scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                                <div className="text-6xl animate-pulse">💭</div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Ready for Communication</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.out ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                                    <div className={`relative max-w-[85%] p-5 rounded-3xl text-[14px] leading-relaxed shadow-lg whitespace-pre-wrap transition-all ${msg.out
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-blue-500/10'
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium'
                                        }`}>
                                        {msg.isPhoto && (
                                            <div className="mb-3 bg-black/5 rounded-xl overflow-hidden flex items-center justify-center p-4 border border-white/10 uppercase font-black text-[10px] tracking-widest gap-2">
                                                <span>🖼️ PHOTO SENT</span>
                                            </div>
                                        )}
                                        {msg.text}

                                        {msg.isInline && msg.buttons && (
                                            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-black/5">
                                                {msg.buttons.map((btn: any, bi: number) => (
                                                    <button
                                                        key={bi}
                                                        onClick={() => handleButtonClick(msg.id, btn.row, btn.col, btn.text, btn.type)}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${msg.out
                                                            ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                                                            }`}
                                                    >
                                                        {btn.text}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Bot Menu / Reply Keyboard - Moved ABOVE input for better visibility within fixed height container */}
                    {mainKeyboard && mainKeyboard.length > 0 && (
                        <div className="mx-8 mb-4 p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] animate-fade-in-up shadow-inner">
                            <div className="flex flex-col gap-2.5">
                                {mainKeyboard.map((row: any, ri: number) => (
                                    <div key={ri} className="flex gap-2.5">
                                        {row.map((btn: any, bi: number) => (
                                            <button
                                                key={bi}
                                                onClick={() => handleSendMessage(btn.text)}
                                                className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 group/kbd"
                                            >
                                                <span className="text-blue-500 opacity-40 group-hover/kbd:opacity-100 transition-all">⚡</span>
                                                {btn.text}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-8 bg-white border-t border-slate-100 z-20">
                        {attachedPhoto && (
                            <div className="mb-4 relative inline-block p-2 bg-slate-50 rounded-2xl border-2 border-blue-100 animate-fade-in-up">
                                <img src={attachedPhoto} alt="Preview" className="h-32 rounded-xl border border-slate-200 shadow-sm" />
                                <button
                                    onClick={() => setAttachedPhoto(null)}
                                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <form onSubmit={onFormSubmit} className="flex gap-4">
                            <input
                                type="file"
                                id="telegram-photo-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                onClick={() => document.getElementById('telegram-photo-upload')?.click()}
                                className="w-14 h-14 bg-slate-50 border-2 border-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:border-blue-500 hover:text-blue-500 transition-all active:scale-95"
                                title="Upload Photo"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                            </button>

                            <div className="flex-1 relative group/input">
                                <input
                                    type="text"
                                    placeholder={attachedPhoto ? "Add a caption..." : "Type instructions or paste photo..."}
                                    value={inputMsg}
                                    onPaste={onPaste}
                                    onChange={(e) => setInputMsg(e.target.value)}
                                    className="w-full px-8 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-full outline-none font-bold text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl opacity-20 group-focus-within/input:opacity-100 transition-all">✨</div>
                            </div>
                            <button
                                type="submit"
                                disabled={!inputMsg.trim() && !attachedPhoto}
                                className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 active:scale-90 hover:shadow-blue-500/50 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </div>
                </PremiumCard>
            </div>
        </div>
    );
}

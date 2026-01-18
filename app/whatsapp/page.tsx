'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useUI } from '@/context/UIContext';
import { CustomDropdown } from '@/components/ui/PremiumComponents';

interface SavedGroup {
    id: string;
    alias: string;
    description?: string;
}

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const WhatsAppContent = () => {
    const { user, isLoading: userLoading } = useAuth();
    const router = useRouter();
    const { showToast, confirm } = useUI();
    const [state, setState] = useState<any>(null);

    useEffect(() => {
        if (!userLoading && user && user.role !== 'admin' && user.role !== 'super') {
            router.push('/dashboard');
        }
    }, [user, userLoading, router]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'realtime' | 'upload'>('realtime');

    // Saved Groups State
    const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
    const [imageKey, setImageKey] = useState(Date.now()); // For forcing image refresh
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupForm, setGroupForm] = useState({ alias: '', id: '' });

    // Realtime Caption State
    const [useCustomCaption, setUseCustomCaption] = useState(false);
    const [realtimeCaption, setRealtimeCaption] = useState('');

    // Upload Caption State
    const [useCustomUploadCaption, setUseCustomUploadCaption] = useState(false);
    const [uploadCaption, setUploadCaption] = useState('');
    const [isChangingImage, setIsChangingImage] = useState(false);

    const [config, setConfig] = useState({
        groupId: '',
        schedule: 'STOP'
    });

    const fetchStatus = async (shouldUpdateConfig = false) => {
        try {
            const res = await fetch('/api/whatsapp/status');
            const data = await res.json();
            setState(data);

            // Only update config (inputs) on initial load to avoid overwriting user typing
            if (shouldUpdateConfig) {
                if (data.groupId) {
                    setConfig(prev => ({ ...prev, groupId: data.groupId }));
                }
                if (data.cronSchedule) {
                    setConfig(prev => ({ ...prev, schedule: data.cronSchedule }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch status', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSavedGroups = async () => {
        try {
            const res = await fetch('/api/whatsapp/groups');
            if (res.ok) {
                const data = await res.json();
                setSavedGroups(data);
            }
        } catch (err) {
            console.error('Failed to fetch saved groups', err);
        }
    };

    useEffect(() => {
        fetchStatus(true); // Initial load: Update config
        fetchSavedGroups();
        const interval = setInterval(() => fetchStatus(false), 5000); // Polling: Do NOT update config
        return () => clearInterval(interval);
    }, []);

    const handleClientScreenshot = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });

            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            // Wait for video to be ready and play a bit to avoid black frames
            await new Promise<void>((resolve) => {
                video.onloadeddata = () => {
                    resolve();
                };
            });
            await new Promise(r => setTimeout(r, 500));

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(async (blob) => {
                    // Stop sharing immediately after capture
                    stream.getTracks().forEach(track => track.stop());

                    if (!blob) {
                        showToast('Gagal memproses gambar screenshot', 'error');
                        return;
                    }

                    const formData = new FormData();
                    formData.append('image', blob, 'screenshot.png');
                    if (useCustomCaption) formData.append('caption', realtimeCaption);

                    setActionLoading(true);
                    try {
                        const res = await fetch('/api/whatsapp/send-image', {
                            method: 'POST',
                            body: formData
                        });
                        const data = await res.json();
                        if (res.ok) {
                            showToast('Screenshot berhasil dikirim!', 'success');
                            // Update last screenshot time locally for immediate feedback
                            setState((prev: any) => ({
                                ...prev,
                                lastScreenshot: new Date().toISOString()
                            }));
                        } else {
                            showToast(data.error || 'Gagal mengirim screenshot', 'error');
                        }
                    } catch (e: any) {
                        showToast(e.message, 'error');
                    } finally {
                        setActionLoading(false);
                    }
                }, 'image/png');
            } else {
                stream.getTracks().forEach(track => track.stop());
            }

        } catch (err) {
            console.error('Screen capture error:', err);
            // Don't show toast if user cancelled (NotAllowedError)
            if (err instanceof Error && err.name !== 'NotAllowedError') {
                showToast('Gagal mengambil screenshot device', 'error');
            }
        }
    };

    const handleAction = async (action: string, extraData: any = {}) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/whatsapp/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...config, ...extraData })
            });
            const data = await res.json();
            setState(data);
            if (res.ok) {
                if (action === 'SEND_MANUAL') showToast('Screenshot terkirim!', 'success');
                else showToast(`Action ${action} successful`, 'success');
            } else {
                showToast(data.error || 'Action failed', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/whatsapp/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupForm)
            });
            if (res.ok) {
                showToast('Group saved successfully', 'success');
                setIsGroupModalOpen(false);
                fetchSavedGroups();
                setGroupForm({ alias: '', id: '' });
                // Also update current config if it matches
                setConfig(prev => ({ ...prev, groupId: groupForm.id }));
            } else {
                showToast('Failed to save group', 'error');
            }
        } catch (err) {
            showToast('Error saving group', 'error');
        }
    };

    const handleDeleteGroup = async (id: string) => {
        confirm(
            'Hapus Grup?',
            'Apakah Anda yakin ingin menghapus grup tersimpan ini?',
            async () => {
                try {
                    const res = await fetch(`/api/whatsapp/groups?id=${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('Group deleted', 'success');
                        fetchSavedGroups();
                    }
                } catch (err) {
                    showToast('Error deleting group', 'error');
                }
            }
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-emerald-200 animate-pulse">
                        📱
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">
                            WhatsApp <span className="text-emerald-600">Bot Integration</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px] font-black opacity-60">
                            Automated & Manual Broadcasting System
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 bg-white/60 backdrop-blur-xl p-2.5 rounded-[2rem] border border-white/50 shadow-2xl shadow-slate-200/50">
                    {/* Status Badge helper function */}
                    {(() => {
                        const getStatusStyle = (status: string) => {
                            switch (status) {
                                case 'READY':
                                    return 'bg-emerald-500 bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-emerald-200 ring-2 ring-emerald-200/50';
                                case 'QR_CODE':
                                    return 'bg-amber-500 bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200 ring-2 ring-amber-200/50';
                                case 'LOADING':
                                case 'CONNECTING':
                                    return 'bg-blue-500 bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-blue-200 ring-2 ring-blue-200/50 animate-pulse';
                                case 'DISCONNECTED':
                                case 'OFFLINE':
                                case 'UNKNOWN':
                                    // Use solid Slate-600 fallback + gradient
                                    return 'bg-slate-600 bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-200 ring-2 ring-slate-200/50';
                                default:
                                    // Error state
                                    return 'bg-rose-500 bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-rose-200 ring-2 ring-rose-200/50';
                            }
                        };

                        const currentStatus = state?.status || 'OFFLINE';

                        return (
                            <div className={`flex items-center gap-3 px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-lg ${getStatusStyle(currentStatus)}`}>
                                <div className={`w-2.5 h-2.5 rounded-full bg-white ${currentStatus === 'READY' ? 'animate-pulse' : ''}`}></div>
                                {currentStatus}
                            </div>
                        );
                    })()}

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                    {state?.status === 'READY' ? (
                        <button
                            onClick={() => {
                                confirm(
                                    'Disconnect Bot?',
                                    'Apakah Anda yakin ingin memutus koneksi bot? Penjadwalan otomatis akan dihentikan.',
                                    () => handleAction('STOP')
                                );
                            }}
                            disabled={actionLoading}
                            className="group relative px-6 py-3 rounded-full bg-white border border-rose-100 text-rose-600 font-bold text-xs hover:bg-rose-50 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <span className="text-sm">🛑</span>
                                {actionLoading ? 'Stopping...' : 'Disconnect'}
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAction('START')}
                            disabled={actionLoading || state?.status === 'LOADING' || state?.status === 'CONNECTING'}
                            className="group relative px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative z-10 flex items-center gap-2">
                                <span className="text-sm">⚡</span>
                                {actionLoading || state?.status === 'LOADING' || state?.status === 'CONNECTING' ? 'Connecting...' : 'Connect Bot'}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            confirm(
                                'Logout Sesi?',
                                'Anda akan keluar dan sesi WhatsApp akan dihapus. Anda harus scan ulang nanti.',
                                () => handleAction('CLEAR_SESSION')
                            );
                        }}
                        disabled={actionLoading}
                        className="group relative px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span className="text-sm group-hover:rotate-180 transition-transform duration-500">🔄</span>
                        {actionLoading ? 'Processing...' : 'Reset Session'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Control Panel (Left - 2 Cols) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* QR Code Alert */}
                    {state?.status === 'QR_CODE' && state?.qrCode && (
                        <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-8 text-center animate-in zoom-in-95 duration-500">
                            <h3 className="text-xl font-black text-amber-800 mb-4">📢 Scan QR Code Required</h3>
                            <div className="bg-white p-4 rounded-2xl shadow-lg inline-block border-2 border-dashed border-amber-200 mb-4">
                                <img src={state.qrCode} alt="WA QR Code" className="w-64 h-64 rounded-lg" />
                            </div>
                            <p className="text-amber-700/80 font-medium text-sm">Buka WhatsApp di HP Anda &gt; Menu &gt; Linked Devices &gt; Link a Device</p>
                        </div>
                    )}

                    {/* Mode Selection Tabs */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden p-2 flex gap-2">
                        <button
                            onClick={() => setActiveTab('realtime')}
                            className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3
                                ${activeTab === 'realtime'
                                    ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100 shadow-lg'
                                    : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <span className="text-xl">📸</span> Realtime Screenshot
                        </button>
                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3
                                ${activeTab === 'upload'
                                    ? 'bg-purple-50 text-purple-600 ring-2 ring-purple-100 shadow-lg'
                                    : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <span className="text-xl">🖼️</span> Upload Image
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>

                        {activeTab === 'realtime' && (
                            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">Realtime Automation</h2>
                                        <p className="text-slate-400 text-sm font-medium mt-1">Jadwalkan atau ambil screenshot server secara langsung.</p>
                                    </div>
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 text-2xl">📸</div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Cron Schedule</label>
                                        <div className="space-y-3">
                                            <CustomDropdown
                                                label="Cron Schedule"
                                                value={['*/1 * * * *', '*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 */6 * * *', '0 0 * * *'].includes(config.schedule) ? config.schedule : 'custom'}
                                                onChange={(val) => {
                                                    if (val !== 'custom') {
                                                        setConfig({ ...config, schedule: val });
                                                    } else {
                                                        setConfig({ ...config, schedule: '* * * * *' });
                                                    }
                                                }}
                                                options={[
                                                    { value: '*/1 * * * *', label: 'Every 1 Minute' },
                                                    { value: '*/5 * * * *', label: 'Every 5 Minutes' },
                                                    { value: '*/15 * * * *', label: 'Every 15 Minutes' },
                                                    { value: '*/30 * * * *', label: 'Every 30 Minutes' },
                                                    { value: '0 * * * *', label: 'Every Hour' },
                                                    { value: '0 */6 * * *', label: 'Every 6 Hours' },
                                                    { value: '0 0 * * *', label: 'Midnight (00:00)' },
                                                    { value: 'custom', label: 'Custom Schedule' },
                                                ]}
                                            />

                                            {(!['*/1 * * * *', '*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 */6 * * *', '0 0 * * *'].includes(config.schedule)) && (
                                                <input
                                                    type="text"
                                                    value={config.schedule || ''}
                                                    onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white rounded-full border border-slate-200 font-mono text-sm outline-none focus:ring-4 focus:ring-emerald-100 transition-all"
                                                    placeholder="* * * * *"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status Penjadwalan</label>
                                            <p className={`text-sm font-bold ${state?.cronSchedule && state?.cronSchedule !== 'STOP' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {state?.cronSchedule && state?.cronSchedule !== 'STOP'
                                                    ? (state?.automationMode === 'IMAGE' ? '⚠️ Aktif (Runs in Upload Mode)' : '✅ Aktif (Screenshot Mode)')
                                                    : '⏸️ Tidak Aktif'}
                                            </p>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Terakhir dikirim</p>
                                                <p className="text-xs font-bold text-emerald-600">{state?.lastScreenshot ? new Date(state.lastScreenshot).toLocaleString() : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Jadwal Berikutnya</p>
                                                <p className="text-xs font-bold text-emerald-600">
                                                    {state?.nextRun ? (
                                                        !isNaN(Date.parse(state.nextRun)) ? new Date(state.nextRun).toLocaleString() : state.nextRun
                                                    ) : (
                                                        state?.cronSchedule && state?.cronSchedule !== 'STOP' ? 'Menghitung...' : '-'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Caption Toggle */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={useCustomCaption}
                                                onChange={(e) => setUseCustomCaption(e.target.checked)}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            />
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Use Custom Caption</span>
                                        </label>
                                    </div>
                                    {useCustomCaption && (
                                        <input
                                            type="text"
                                            value={realtimeCaption}
                                            onChange={(e) => setRealtimeCaption(e.target.value)}
                                            placeholder="Ketik pesan atau caption di sini..."
                                            className="w-full px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                        />
                                    )}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleAction('UPDATE_CONFIG', { mode: 'SCREENSHOT' })}
                                            disabled={actionLoading}
                                            className="w-full bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-900 transition shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            💾 Simpan Jadwal
                                        </button>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => {
                                                    setConfig({ ...config, schedule: 'STOP' });
                                                    handleAction('UPDATE_CONFIG', { schedule: 'STOP' });
                                                }}
                                                disabled={actionLoading}
                                                className="flex-1 bg-red-100 text-red-600 px-6 py-4 rounded-2xl font-bold hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                            >
                                                <span className="text-xl group-hover:scale-110 transition-transform">🛑</span> Stop Automation
                                            </button>
                                            <button
                                                onClick={handleClientScreenshot}
                                                disabled={actionLoading || state?.status !== 'READY'}
                                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-emerald-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                            >
                                                <span className="text-xl group-hover:rotate-12 transition-transform">📸</span> Ambil & Kirim
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'upload' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">Upload & Automation</h2>
                                        <p className="text-slate-400 text-sm font-medium mt-1">Kirim otomatis gambar promo atau poster ke grup.</p>
                                    </div>
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 text-2xl">🖼️</div>
                                </div>

                                {/* Automation Config (Mirrored from Realtime) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Cron Schedule</label>
                                        <div className="space-y-3">
                                            <CustomDropdown
                                                value={['*/1 * * * *', '*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 */6 * * *', '0 0 * * *'].includes(config.schedule) ? config.schedule : 'custom'}
                                                onChange={(val) => {
                                                    if (val !== 'custom') setConfig({ ...config, schedule: val });
                                                    else setConfig({ ...config, schedule: '* * * * *' });
                                                }}
                                                options={[
                                                    { value: '*/1 * * * *', label: 'Every 1 Minute' },
                                                    { value: '*/5 * * * *', label: 'Every 5 Minutes' },
                                                    { value: '*/15 * * * *', label: 'Every 15 Minutes' },
                                                    { value: '*/30 * * * *', label: 'Every 30 Minutes' },
                                                    { value: '0 * * * *', label: 'Every Hour' },
                                                    { value: '0 */6 * * *', label: 'Every 6 Hours' },
                                                    { value: '0 0 * * *', label: 'Midnight (00:00)' },
                                                    { value: 'custom', label: 'Custom Schedule' },
                                                ]}
                                            />

                                            {(!['*/1 * * * *', '*/5 * * * *', '*/15 * * * *', '*/30 * * * *', '0 * * * *', '0 */6 * * *', '0 0 * * *'].includes(config.schedule)) && (
                                                <input
                                                    type="text"
                                                    value={config.schedule || ''}
                                                    onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white rounded-full border border-slate-200 font-mono text-sm outline-none focus:ring-4 focus:ring-purple-100 transition-all"
                                                    placeholder="* * * * *"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status Penjadwalan</label>
                                            <p className={`text-sm font-bold ${state?.cronSchedule && state?.cronSchedule !== 'STOP' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {state?.cronSchedule && state?.cronSchedule !== 'STOP'
                                                    ? (state?.automationMode === 'IMAGE' ? '✅ Aktif (Manual Mode)' : '⚠️ Aktif (Runs in Screenshot Mode)')
                                                    : '⏸️ Tidak Aktif'}
                                            </p>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Terakhir dikirim</p>
                                                <p className="text-xs font-bold text-emerald-600">{state?.lastScreenshot ? new Date(state.lastScreenshot).toLocaleString() : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Jadwal Berikutnya</p>
                                                <p className={`text-xs font-bold ${state?.nextRun && state.nextRun.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {state?.nextRun ? (
                                                        !isNaN(Date.parse(state.nextRun)) ? new Date(state.nextRun).toLocaleString() : state.nextRun
                                                    ) : (
                                                        state?.cronSchedule && state?.cronSchedule !== 'STOP' ? 'Menghitung...' : '-'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {state?.autoImagePath && !isChangingImage ? (
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Gambar Saat Ini</h3>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsChangingImage(true)}
                                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition"
                                                >
                                                    🔄 Ganti
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        confirm(
                                                            'Hapus Gambar?',
                                                            'Apakah Anda yakin ingin menghapus gambar otomatisasi ini?',
                                                            () => handleAction('DELETE_AUTO_IMAGE')
                                                        );
                                                    }}
                                                    className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition"
                                                >
                                                    🗑️ Hapus
                                                </button>
                                            </div>
                                        </div>
                                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                                            <img
                                                key={`auto-image-${imageKey}`}
                                                src={`/api/uploads/auto_image.png?v=${imageKey}`}
                                                alt="Auto Image"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    // Fallback if image fails to load
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement?.classList.add('bg-rose-50');
                                                    e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<div class="absolute inset-0 flex items-center justify-center text-rose-500 font-bold text-xs p-4 text-center">Gagal memuat preview gambar.<br/>Coba refresh halaman.</div>');
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-bold text-xs uppercase tracking-widest">Preview Mode</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-emerald-200 transition-colors relative">
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                                                    {isChangingImage ? 'Pilih Gambar Baru untuk Otomatisasi' : 'Upload Gambar Otomatis'}
                                                </label>
                                                {isChangingImage && (
                                                    <button
                                                        onClick={() => setIsChangingImage(false)}
                                                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                                                    >
                                                        ✕ Batal Ganti
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id="imageUpload"
                                                className="block w-full text-sm text-slate-500
                                                        bg-white border border-slate-200 rounded-full p-3 pl-6
                                                        file:mr-4 file:py-2 file:px-6
                                                        file:rounded-full file:border-0
                                                        file:text-sm file:font-bold
                                                        file:bg-emerald-600 file:text-white
                                                        hover:file:bg-emerald-700
                                                        cursor-pointer transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={useCustomUploadCaption}
                                                onChange={(e) => setUseCustomUploadCaption(e.target.checked)}
                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            />
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Use Custom Caption</span>
                                        </label>
                                    </div>
                                    {useCustomUploadCaption && (
                                        <input
                                            type="text"
                                            value={uploadCaption}
                                            onChange={(e) => setUploadCaption(e.target.value)}
                                            placeholder="Ketik pesan atau caption di sini..."
                                            className="w-full px-6 py-4 bg-white rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-medium"
                                        />
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={async () => {
                                            const fileInput = document.getElementById('imageUpload') as HTMLInputElement;

                                            // Validation: Must have an image (uploaded or already stored)
                                            if (!fileInput?.files?.[0] && !state?.autoImagePath) {
                                                showToast('Pilih gambar terlebih dahulu untuk mode otomatisasi gambar', 'error');
                                                return;
                                            }

                                            let finalImagePath = null;
                                            setActionLoading(true);
                                            try {
                                                if (fileInput?.files?.[0]) {
                                                    const formData = new FormData();
                                                    formData.append('image', fileInput.files[0]);
                                                    formData.append('save_as_auto', 'true');
                                                    formData.append('skip_send', 'true');

                                                    const upRes = await fetch('/api/whatsapp/send-image', { method: 'POST', body: formData });
                                                    const upData = await upRes.json();
                                                    if (upRes.ok) {
                                                        finalImagePath = upData.path;
                                                        showToast('Gambar otomatis diperbarui', 'success');
                                                    } else {
                                                        showToast('Gagal menyimpan gambar untuk otomatisasi', 'error');
                                                        setActionLoading(false);
                                                        return;
                                                    }
                                                }

                                                await fetch('/api/whatsapp/control', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        action: 'UPDATE_CONFIG',
                                                        ...config,
                                                        mode: 'IMAGE',
                                                        ...(finalImagePath ? { imagePath: finalImagePath } : {})
                                                    })
                                                });

                                                fetchStatus();
                                                setIsChangingImage(false);
                                                setImageKey(Date.now()); // Force refresh image
                                                showToast('Jadwal & Mode Gambar berhasil disimpan', 'success');
                                            } catch (e: any) {
                                                showToast(e.message || 'Error saving automation', 'error');
                                            } finally {
                                                setActionLoading(false);
                                            }
                                        }}
                                        disabled={actionLoading}
                                        className="w-full bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-900 transition shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        💾 Simpan Jadwal & Gambar Otomatis
                                    </button>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => {
                                                setConfig({ ...config, schedule: 'STOP' });
                                                handleAction('UPDATE_CONFIG', { schedule: 'STOP' });
                                            }}
                                            disabled={actionLoading}
                                            className="flex-1 bg-red-100 text-red-600 px-6 py-4 rounded-2xl font-bold hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                        >
                                            <span className="text-xl group-hover:scale-110 transition-transform">🛑</span> Stop Automation
                                        </button>

                                        <button
                                            onClick={async () => {
                                                const fileInput = document.getElementById('imageUpload') as HTMLInputElement;

                                                if (!fileInput?.files?.[0] && !state?.autoImagePath) {
                                                    showToast('Pilih gambar atau gunakan gambar yang tersimpan', 'error');
                                                    return;
                                                }

                                                setActionLoading(true);
                                                try {
                                                    const formData = new FormData();
                                                    if (fileInput?.files?.[0]) {
                                                        formData.append('image', fileInput.files[0]);
                                                    } else {
                                                        formData.append('use_saved_auto', 'true');
                                                    }
                                                    formData.append('caption', useCustomUploadCaption ? uploadCaption : '');

                                                    const res = await fetch('/api/whatsapp/send-image', {
                                                        method: 'POST',
                                                        body: formData
                                                    });

                                                    const data = await res.json();

                                                    if (res.ok) {
                                                        showToast('Gambar berhasil dikirim!', 'success');
                                                        if (fileInput) fileInput.value = '';
                                                        setUploadCaption('');
                                                        setUseCustomUploadCaption(false);
                                                    } else {
                                                        showToast(data.error || 'Gagal mengirim gambar', 'error');
                                                    }
                                                } catch (err: any) {
                                                    showToast(err.message, 'error');
                                                } finally {
                                                    setActionLoading(false);
                                                }
                                            }}
                                            disabled={actionLoading || state?.status !== 'READY'}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-bold hover:shadow-xl hover:shadow-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            {actionLoading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Mengirim...
                                                </>
                                            ) : (
                                                <>🚀 Kirim Broadcast Manual</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Configuration Sidebar (Right) */}
                <div className="space-y-8">
                    {/* Target Config */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden group">
                        <h3 className="text-xl font-black text-slate-800 mb-6 relative z-10 flex items-center gap-3">
                            <span className="text-2xl">🎯</span> Target Group
                        </h3>

                        <div className="space-y-4 relative z-10">
                            <div>
                                <CustomDropdown
                                    label="Loaded Groups"
                                    value={config.groupId || ''}
                                    onChange={(val) => {
                                        if (val) {
                                            const group = savedGroups.find(g => g.id === val);
                                            if (group) setConfig({ ...config, groupId: group.id });
                                        }
                                    }}
                                    options={[
                                        { value: '', label: '-- Pilih Grup Tersimpan --' },
                                        ...savedGroups.map(group => ({
                                            value: group.id,
                                            label: `${group.alias} (${group.id.slice(0, 8)}...)`
                                        }))
                                    ]}
                                    placeholder="-- Pilih Grup Tersimpan --"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Group ID</label>
                                    <div className="flex gap-2">
                                        {config.groupId && savedGroups.some(g => g.id === config.groupId) && (
                                            <button
                                                onClick={() => handleDeleteGroup(config.groupId)}
                                                className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg hover:shadow-md transition flex items-center gap-1 border border-rose-100"
                                                title="Hapus grup"
                                            >
                                                <span>🗑️</span> Hapus
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setGroupForm({ alias: '', id: config.groupId || '' });
                                                setIsGroupModalOpen(true);
                                            }}
                                            className="text-[10px] font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 rounded-lg hover:shadow-md transition flex items-center gap-1 shadow-blue-200"
                                        >
                                            <span>+</span> Simpan ID
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={config.groupId}
                                    onChange={(e) => setConfig({ ...config, groupId: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 rounded-full border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-mono text-sm text-slate-600 font-bold shadow-sm"
                                    placeholder="e.g. 123456789@g.us"
                                />
                                <p className="mt-3 text-[10px] text-slate-400 font-medium leading-relaxed">
                                    ID unik grup WhatsApp. Pilih dari dropdown atau masukkan manual.
                                </p>
                            </div>
                            <button
                                onClick={() => handleAction('UPDATE_CONFIG')}
                                disabled={actionLoading}
                                className="w-full bg-blue-50 text-blue-600 px-4 py-4 rounded-full font-bold text-sm hover:bg-blue-100 transition shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                Update Group ID
                            </button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100">
                        <h3 className="text-lg font-black text-emerald-800 mb-4 flex items-center gap-2">
                            ℹ️ Quick Guide
                        </h3>
                        <ul className="space-y-3">
                            {[
                                'Pastikan status bot "READY" (Hijau).',
                                'Jika status "QR_CODE", scan ulang.',
                                'Simpan ID grup agar mudah diakses.',
                                'Gunakan tab "Realtime" untuk screenshot otomatis.',
                                'Group ID wajib diisi agar pesan terkirim.'
                            ].map((item, i) => (
                                <li key={i} className="flex gap-3 text-sm text-emerald-700 font-medium">
                                    <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-emerald-500 text-[10px] font-bold shadow-sm shrink-0">
                                        {i + 1}
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Save Group Modal */}
            {
                isGroupModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-800">Simpan Grup Baru</h3>
                                <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            <form onSubmit={handleSaveGroup} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nama Grup (Alias)</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={groupForm.alias}
                                        onChange={(e) => setGroupForm({ ...groupForm, alias: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700"
                                        placeholder="Contoh: Tim IT Support"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ID Grup</label>
                                    <input
                                        type="text"
                                        required
                                        value={groupForm.id}
                                        onChange={(e) => setGroupForm({ ...groupForm, id: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 rounded-full border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-mono text-sm shadow-sm"
                                        placeholder="123456789@g.us"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsGroupModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 text-white px-4 py-4 rounded-full font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-95 transition-all"
                                    >
                                        Simpan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default function WhatsAppSettingsPage() {
    return (
        <ProtectedRoute>
            <WhatsAppContent />
        </ProtectedRoute>
    );
}

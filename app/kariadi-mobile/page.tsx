'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    UserCheck,
    UserX,
    Search,
    RefreshCcw,
    Trash2,
    CheckCircle,
    Mail,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Check,
    Briefcase,
    Bell,
    User as UserIcon,
    Send,
    MapPin,
    Calendar,
    Hash,
    VenusAndMars
} from 'lucide-react';

interface KariadiUser {
    id: string;
    fullname: string;
    email: string;
    telephone: string;
    medical_record?: string;
    status_pelayanan?: string;
}

export default function KariadiMobilePage() {
    return (
        <ProtectedRoute>
            <KariadiMobileContent />
        </ProtectedRoute>
    );
}

function KariadiMobileContent() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'unverified' | 'verified'>('unverified');
    const [users, setUsers] = useState<KariadiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [length, setLength] = useState(10);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [detailContent, setDetailContent] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTab, setDetailTab] = useState<'profile' | 'patient' | 'notif'>('profile');
    const [notifTitle, setNotifTitle] = useState('');
    const [notifMessage, setNotifMessage] = useState('');
    const [isSendingNotif, setIsSendingNotif] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateFormData, setUpdateFormData] = useState({ medical_record: '', nik: '', id: '' });
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'unverified'
                ? '/api/kariadi-mobile/users/unverified'
                : '/api/kariadi-mobile/users/verified';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draw: 1,
                    start: page * length,
                    length: length,
                    search: { value: search, regex: false }
                })
            });

            if (response.status === 401 || response.status === 403) {
                setShowSettingsModal(true);
                return;
            }

            const data = await response.json();

            if (data.data) {
                setUsers(data.data);
                setTotal(data.recordsFiltered || data.recordsTotal || 0);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setToast({ message: 'Gagal memuat data pengguna', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, length, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAction = async (id: string, action: 'activate' | 'delete' | 'resend') => {
        if (action === 'delete' && !confirm('Apakah Anda yakin ingin menghapus akun ini?')) return;

        setIsActionLoading(`${id}-${action}`);
        try {
            const response = await fetch('/api/kariadi-mobile/users/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });
            const result = await response.json();

            if (response.ok || result.success || result.status === true) {
                setToast({
                    message: action === 'activate' ? 'Akun berhasil diaktifkan' :
                        action === 'delete' ? 'Akun berhasil dihapus' : 'Email konfirmasi berhasil dikirim',
                    type: 'success'
                });
                fetchUsers();
                if (selectedUser) {
                    if (action === 'delete') {
                        setSelectedUser(null);
                        setDetailContent(null);
                    } else {
                        // Refresh detail if it's the current user
                        setTimeout(() => fetchUserDetail(selectedUser), 1000);
                    }
                }
            } else {
                const errorDetail = result.details ? `: ${result.details}` : '';
                setToast({ message: (result.error || result.message || 'Gagal melakukan aksi') + errorDetail, type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Terjadi kesalahan sistem', type: 'error' });
        } finally {
            setIsActionLoading(null);
        }
    };

    const fetchUserDetail = async (u: any) => {
        setSelectedUser(u);
        setDetailLoading(true);
        setDetailContent(null);
        setDetailTab('profile');
        try {
            const response = await fetch(`/api/kariadi-mobile/users/detail?id=${u.id}`);
            const data = await response.json();
            if (response.ok && data.html) {
                // Parse HTML to extract information for tabs
                const parser = new DOMParser();
                const doc = parser.parseFromString(data.html, 'text/html');

                // Extract Profile Data
                const userDiv = doc.getElementById('user');
                const profileInfo: any = {};
                userDiv?.querySelectorAll('tr').forEach(tr => {
                    const label = tr.querySelector('th')?.textContent?.trim();
                    const value = tr.querySelector('td')?.textContent?.trim();
                    if (label && value) profileInfo[label] = value;
                });

                // Extract Patient Data
                const patientDiv = doc.getElementById('patients');
                const patientInfo: any = {};
                patientDiv?.querySelectorAll('tr').forEach(tr => {
                    const label = tr.querySelector('th')?.textContent?.trim();
                    const value = tr.querySelector('td')?.textContent?.trim();
                    if (label && value) patientInfo[label] = value;
                });

                // Extract Notifications
                const notifDiv = doc.getElementById('notif');
                const notifTable = notifDiv?.querySelector('table');
                const notifications: any[] = [];
                notifTable?.querySelectorAll('tbody tr').forEach(tr => {
                    const cols = tr.querySelectorAll('td');
                    if (cols.length >= 3) {
                        notifications.push({
                            title: cols[0].textContent?.trim(),
                            message: cols[1].textContent?.trim(),
                            date: cols[2].textContent?.trim()
                        });
                    }
                });

                // Extract Notification Form Action
                const notifForm = notifDiv?.querySelector('form');
                const notifAction = notifForm?.getAttribute('action');

                // Extract Hidden Inputs (UserID, PartyID)
                const hiddenInputs: any = {};
                doc.querySelectorAll('input[type="hidden"]').forEach((input: any) => {
                    const name = input.getAttribute('name');
                    const value = input.getAttribute('value');
                    if (name && value) hiddenInputs[name] = value;
                });

                setDetailContent({
                    profile: profileInfo,
                    patient: patientInfo,
                    notifications: notifications,
                    notifAction: notifAction,
                    hiddenInputs: hiddenInputs
                });
            } else {
                setToast({ message: 'Gagal memuat detail pengguna', type: 'error' });
            }
        } catch (error) {
            console.error('Error parsing detail:', error);
            setToast({ message: 'Gagal memproses data detail', type: 'error' });
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleSendNotification = async () => {
        if (!notifTitle || !notifMessage) {
            setToast({ message: 'Judul dan pesan harus diisi', type: 'error' });
            return;
        }

        setIsSendingNotif(true);
        try {
            const response = await fetch('/api/kariadi-mobile/users/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: detailContent?.hiddenInputs?.inputUserID || selectedUser.id,
                    actionUrl: detailContent?.notifAction,
                    title: notifTitle,
                    message: notifMessage
                })
            });

            const result = await response.json();
            // Kariadi send_notif might return a success message string or object
            if (response.ok && (result.success || result.status === true || typeof result === 'string')) {
                setToast({ message: 'Notifikasi berhasil dikirim', type: 'success' });
                setNotifTitle('');
                setNotifMessage('');
                // Refresh detail to see new notification in history
                setTimeout(() => fetchUserDetail(selectedUser), 1500);
            } else {
                setToast({ message: result.message || result.error || 'Gagal mengirim notifikasi', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Terjadi kesalahan sistem', type: 'error' });
        } finally {
            setIsSendingNotif(false);
        }
    };

    const openUpdateModal = () => {
        let nik = '';
        if (detailContent?.patient) {
            const nikKey = Object.keys(detailContent.patient).find(k =>
                k.toLowerCase().includes('nik') ||
                k.toLowerCase().includes('ktp') ||
                k.toLowerCase().includes('identitas')
            );
            if (nikKey) {
                nik = detailContent.patient[nikKey];
            }
        }

        setUpdateFormData({
            id: selectedUser.id,
            medical_record: selectedUser.medical_record || '',
            nik: nik
        });
        setShowUpdateModal(true);
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            const response = await fetch('/api/kariadi-mobile/users/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_patient',
                    id: detailContent?.hiddenInputs?.inputUserID || updateFormData.id,
                    medical_record: updateFormData.medical_record,
                    nik: updateFormData.nik,
                    party_id: detailContent?.hiddenInputs?.inputPartyID,
                    old_medical_record: detailContent?.hiddenInputs?.inputOldMedicalRecord
                })
            });

            const result = await response.json();
            if (response.ok && (result.success || result.status === true)) {
                setToast({ message: 'Data pasien berhasil diperbarui', type: 'success' });
                setShowUpdateModal(false);
                fetchUsers(); // Refresh list
                fetchUserDetail(selectedUser); // Refresh detail
            } else {
                setToast({ message: result.message || 'Gagal memperbarui data', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Terjadi kesalahan sistem', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-200">
                        📱
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Kariadi Mobile</h1>
                        <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px] font-black opacity-60">
                            Manajemen Akun Kariadi Mobile
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs & Search */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-6">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto">
                        <button
                            onClick={() => { setActiveTab('unverified'); setPage(0); }}
                            className={`flex-1 lg:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'unverified'
                                ? 'bg-white text-blue-600 shadow-md'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <UserX size={16} /> Belum Aktivasi
                        </button>
                        <button
                            onClick={() => { setActiveTab('verified'); setPage(0); }}
                            className={`flex-1 lg:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'verified'
                                ? 'bg-white text-emerald-600 shadow-md'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <UserCheck size={16} /> Terverifikasi
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="relative w-full sm:w-64 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Cari Nama/Email/Telp..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm"
                            />
                        </div>
                        <button
                            onClick={fetchUsers}
                            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 p-3 rounded-2xl transition-all active:scale-95"
                            title="Refresh Data"
                        >
                            <RefreshCcw className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} size={20} />
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                {activeTab === 'verified' && (
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No. RM</th>
                                )}
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telephone</th>
                                {activeTab === 'verified' && (
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status Admisi</th>
                                )}
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sticky right-0 bg-slate-50 z-20 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {activeTab === 'verified' && <td className="px-8 py-6"><div className="h-4 w-16 bg-slate-100 rounded"></div></td>}
                                        <td className="px-8 py-6"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                                        <td className="px-8 py-6"><div className="h-4 w-40 bg-slate-100 rounded"></div></td>
                                        <td className="px-8 py-6"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                                        {activeTab === 'verified' && <td className="px-8 py-6 text-center"><div className="h-4 w-20 bg-slate-100 rounded mx-auto"></div></td>}
                                        <td className="px-8 py-6"><div className="h-8 w-24 bg-slate-100 rounded mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : users.length > 0 ? (
                                users.map((u: any) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {activeTab === 'verified' && (
                                            <td className="px-8 py-6">
                                                <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                                    {u.medical_record || '-'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-8 py-6 font-black text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                                            {u.fullname}
                                        </td>
                                        <td className="px-8 py-6 text-xs text-slate-400 font-medium">
                                            {u.email}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-bold text-slate-600">
                                            {u.telephone}
                                        </td>
                                        {activeTab === 'verified' && (
                                            <td className="px-8 py-6 text-center">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${u.medical_record
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                    }`}>
                                                    {u.medical_record ? 'Terdaftar Pasien' : 'Belum Terdaftar'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-8 py-6 sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center justify-center gap-2">
                                                {activeTab === 'unverified' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleAction(u.id, 'activate')}
                                                            disabled={isActionLoading === `${u.id}-activate`}
                                                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all active:scale-90 disabled:opacity-50"
                                                            title="Aktivasi Akun"
                                                        >
                                                            {isActionLoading === `${u.id}-activate` ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(u.id, 'resend')}
                                                            disabled={isActionLoading === `${u.id}-resend`}
                                                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all active:scale-90 disabled:opacity-50"
                                                            title="Kirim Ulang Email"
                                                        >
                                                            {isActionLoading === `${u.id}-resend` ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(u.id, 'delete')}
                                                            disabled={isActionLoading === `${u.id}-delete`}
                                                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all active:scale-90 disabled:opacity-50"
                                                            title="Hapus Akun"
                                                        >
                                                            {isActionLoading === `${u.id}-delete` ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => fetchUserDetail(u)}
                                                        className="p-2 bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all active:scale-90 flex items-center gap-2 px-3"
                                                        title="Detail User"
                                                    >
                                                        <Eye size={18} />
                                                        <span className="text-xs font-black uppercase tracking-widest">Detail</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-400">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-5xl">🔭</div>
                                            <p className="font-bold">Tidak ada data ditemukan</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-8 pt-8 border-t border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Showing <span className="text-slate-900">{users.length}</span> of <span className="text-slate-900">{total}</span> entries
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            disabled={page === 0 || loading}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 border-2 border-slate-100 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30 active:scale-90"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            {Array.from({ length: Math.min(5, Math.ceil(total / length)) }).map((_, i) => {
                                const pageNum = i;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${page === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                    >
                                        {pageNum + 1}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            disabled={page >= Math.ceil(total / length) - 1 || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 border-2 border-slate-100 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30 active:scale-90"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-50 rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-900 p-8 text-white relative shrink-0">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center transition-all active:scale-90 z-20"
                            >
                                <span className="text-xl">✕</span>
                            </button>

                            <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                                <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center text-5xl backdrop-blur-xl border border-white/20 shadow-2xl">
                                    👤
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-3xl font-black">{selectedUser.fullname}</h3>
                                        <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                                            {selectedUser.medical_record || 'No RM'}
                                        </span>
                                    </div>
                                    <p className="text-blue-100/80 font-bold flex items-center gap-2">
                                        <Mail size={16} /> {selectedUser.email}
                                    </p>
                                    <p className="text-blue-100/60 text-xs font-black uppercase tracking-widest">
                                        ID Kariadi: {selectedUser.id}
                                    </p>
                                </div>
                            </div>

                            {/* Modal Tabs */}
                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setDetailTab('profile')}
                                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${detailTab === 'profile' ? 'bg-white text-indigo-900 shadow-xl' : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    <UserIcon size={14} /> Data Pengguna
                                </button>
                                <button
                                    onClick={() => setDetailTab('patient')}
                                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${detailTab === 'patient' ? 'bg-white text-indigo-900 shadow-xl' : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    <Briefcase size={14} /> Data Pasien
                                </button>
                                <button
                                    onClick={() => setDetailTab('notif')}
                                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${detailTab === 'notif' ? 'bg-white text-indigo-900 shadow-xl' : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    <Bell size={14} /> Notifikasi
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="animate-spin text-blue-600" size={48} />
                                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Menghubungkan ke Kariadi...</p>
                                </div>
                            ) : detailContent ? (
                                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                                    {detailTab === 'profile' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {Object.entries(detailContent.profile || {}).map(([label, value]: [any, any]) => (
                                                <div key={label} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                        {label}
                                                    </div>
                                                    <p className="text-slate-800 font-bold">{value || '-'}</p>
                                                </div>
                                            ))}
                                            <div className="md:col-span-2 pt-6">
                                                <button
                                                    onClick={() => handleAction(selectedUser.id, 'delete')}
                                                    disabled={isActionLoading === `${selectedUser.id}-delete`}
                                                    className="w-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-sm border border-red-100"
                                                >
                                                    {isActionLoading === `${selectedUser.id}-delete` ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                                    Hapus Akun Kariadi (Permanen)
                                                </button>
                                            </div>
                                            {selectedUser.medical_record && (
                                                <div className="md:col-span-2 pt-0">
                                                    <button
                                                        onClick={openUpdateModal}
                                                        className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm border border-blue-100"
                                                    >
                                                        <Briefcase size={18} />
                                                        Ubah Data Pasien
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {detailTab === 'patient' && (
                                        <div className="space-y-6">
                                            {Object.keys(detailContent.patient).length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-[2rem] border border-emerald-100 flex items-start gap-4 mb-2">
                                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
                                                            <Check size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-emerald-800 uppercase tracking-widest text-xs">Terverifikasi Sistem HIS</h4>
                                                            <p className="text-emerald-600 font-bold text-sm opacity-80 mt-1">Data di bawah ini disinkronkan langsung dari Rekam Medis RSUP Dr. Kariadi.</p>
                                                        </div>
                                                    </div>

                                                    {Object.entries(detailContent.patient).map(([label, value]: [any, any]) => {
                                                        const getIcon = (lbl: string) => {
                                                            if (lbl.includes('KTP') || lbl.includes('Identitas')) return <Hash size={16} />;
                                                            if (lbl.includes('Lahir')) return <Calendar size={16} />;
                                                            if (lbl.includes('Kelamin')) return <VenusAndMars size={16} />;
                                                            if (lbl.includes('Alamat')) return <MapPin size={16} />;
                                                            return <UserIcon size={16} />;
                                                        };

                                                        return (
                                                            <div key={label} className={`bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all ${label.includes('Alamat') ? 'md:col-span-2' : ''}`}>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    {getIcon(label)}
                                                                    {label}
                                                                </p>
                                                                <p className="text-slate-800 font-bold leading-relaxed">{value || '-'}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                                                    <div className="text-6xl grayscale">🚫</div>
                                                    <div>
                                                        <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">Data Pasien Tidak Ditemukan</h4>
                                                        <p className="text-slate-400 font-bold text-sm mt-1">Pengguna ini belum terdaftar atau belum sinkron dengan Rekam Medis.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {detailTab === 'notif' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            {/* Send Form */}
                                            <div className="lg:col-span-1 space-y-6">
                                                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg space-y-5">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                                            <Send size={20} />
                                                        </div>
                                                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Kirim Notif Baru</h4>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Notifikasi</p>
                                                            <input
                                                                type="text"
                                                                value={notifTitle}
                                                                onChange={(e) => setNotifTitle(e.target.value)}
                                                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm transition-all"
                                                                placeholder="Contoh: Info Antrian Pasien"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Isi Pesan</p>
                                                            <textarea
                                                                value={notifMessage}
                                                                onChange={(e) => setNotifMessage(e.target.value)}
                                                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold text-sm transition-all min-h-[120px]"
                                                                placeholder="Tulis pesan untuk pengguna..."
                                                            ></textarea>
                                                        </div>
                                                        <button
                                                            onClick={handleSendNotification}
                                                            disabled={isSendingNotif}
                                                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {isSendingNotif ? <Loader2 className="animate-spin" size={18} /> : '🚀'} Kirim Sekarang
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notif History */}
                                            <div className="lg:col-span-2 space-y-6">
                                                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden">
                                                    <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between px-8">
                                                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Riwayat Pesan Dikirim</h4>
                                                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-400">
                                                            {detailContent.notifications?.length || 0} TOTAL
                                                        </span>
                                                    </div>
                                                    <div className="max-h-[450px] overflow-y-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                                                <tr>
                                                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Konten Pesan</th>
                                                                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tanggal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {detailContent.notifications?.length > 0 ? (
                                                                    detailContent.notifications.map((n: any, i: number) => (
                                                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                            <td className="px-8 py-5">
                                                                                <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                                                                                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{n.message}</p>
                                                                            </td>
                                                                            <td className="px-8 py-5 text-right whitespace-nowrap">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
                                                                                    {n.date}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={2} className="px-8 py-10 text-center text-slate-400 font-bold text-sm italic">
                                                                            Belum ada riwayat notifikasi.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className={`${toast.type === 'success' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-red-600 to-rose-600'
                        } text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20`}>
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
                            {toast.type === 'success' ? <Check size={20} /> : '⚠️'}
                        </div>
                        <div>
                            <p className="font-black text-sm uppercase tracking-widest">{toast.type === 'success' ? 'Berhasil' : 'Gagal'}</p>
                            <p className="text-white/80 text-xs font-bold">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-4 text-white/60 hover:text-white text-xl"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
            {/* Settings Needed Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { }}></div>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 p-8 text-center">
                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-4">Pengaturan Diperlukan</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            Anda belum mengonfigurasi kredensial <strong>Kariadi Mobile</strong>. Silakan atur username dan password terlebih dahulu di halaman pengaturan.
                        </p>
                        <div className="flex flex-col gap-3">
                            <a
                                href="/settings"
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 block"
                            >
                                ⚙️ Ke Halaman Pengaturan
                            </a>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Update Data Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isUpdating && setShowUpdateModal(false)}></div>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-800">Ubah Data Pasien</h3>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                disabled={isUpdating}
                                className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSubmit} className="p-8 space-y-6 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Rekam Medis</label>
                                    <input
                                        type="text"
                                        value={updateFormData.medical_record}
                                        onChange={(e) => setUpdateFormData({ ...updateFormData, medical_record: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold text-sm transition-all text-slate-800"
                                        placeholder="Contoh: A123456"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Induk Kependudukan</label>
                                    <input
                                        type="text"
                                        value={updateFormData.nik}
                                        onChange={(e) => setUpdateFormData({ ...updateFormData, nik: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold text-sm transition-all text-slate-800"
                                        placeholder="16 digit NIK"
                                        required
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 italic">Perubahan NIK terhubung dengan data pasien di HMIS</p>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-50 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUpdateModal(false)}
                                    disabled={isUpdating}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                >
                                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : null}
                                    Simpan Data
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

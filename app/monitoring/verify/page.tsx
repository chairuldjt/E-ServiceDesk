'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useUI } from '@/context/UIContext';
import { PremiumAlert, PremiumButton, PremiumModal, PremiumInput, PremiumTextarea } from '@/components/ui/PremiumComponents';
import Link from 'next/link';
import { EXTERNAL_CATALOGS } from '@/lib/constants';

interface UnverifiedOrder {
    order_id: number;
    order_no: string;
    create_date: string;
    catatan: string;
    ext_phone: string;
    location_desc: string;
    order_by: string;
    status_desc: string;
    teknisi: string;
    detail?: OrderDetail;
    history?: OrderHistory[];
}

interface OrderDetail {
    order_id: number;
    order_no: string;
    create_date: string;
    service_catalog_id: number;
    service_name: string;
    ext_phone: string;
    location_desc: string;
    nama_teknisi: string;
    tgl_kunjungan: string;
    tgl_selesai: string;
    ket_penyelesaian: string;
    ket_pending: string;
    catatan: string;
    status_code: string;
    status_desc: string;
    order_by?: string;
}

interface OrderHistory {
    status_date: string;
    create_date: string;
    status_desc: string;
    nama_petugas: string;
    status_note: string;
}

const STATUS_LEVELS = [
    { code: 10, label: 'Open', icon: '🆕', color: 'blue', key: 'open', gradient: 'from-blue-600 to-blue-800', shadow: 'shadow-blue-200', text: 'text-blue-100', glow: 'bg-blue-600' },
    { code: 11, label: 'Follow Up', icon: '📞', color: 'indigo', key: 'follow_up', gradient: 'from-indigo-600 to-indigo-800', shadow: 'shadow-indigo-200', text: 'text-indigo-100', glow: 'bg-indigo-600' },
    { code: 12, label: 'Running', icon: '⚡', color: 'emerald', key: 'running', gradient: 'from-emerald-500 to-emerald-700', shadow: 'shadow-emerald-200', text: 'text-emerald-100', glow: 'bg-emerald-600' },
    { code: 13, label: 'Pending', icon: '⏳', color: 'amber', key: 'pending', gradient: 'from-amber-400 to-orange-600', shadow: 'shadow-amber-200', text: 'text-amber-100', glow: 'bg-amber-600' },
    { code: 15, label: 'Done', icon: '✅', color: 'purple', key: 'done', gradient: 'from-purple-600 to-fuchsia-800', shadow: 'shadow-purple-200', text: 'text-purple-100', glow: 'bg-purple-600' },
    { code: 30, label: 'Verified', icon: '✅', color: 'slate', key: 'verified', gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-200', text: 'text-slate-100', glow: 'bg-slate-600' },
];

const ITEMS_PER_PAGE = 100;

interface OrderSummary {
    open: number;
    follow_up: number;
    running: number;
    pending: number;
    done: number;
    verified: number;
}

export default function VerifyOrderPage() {
    return (
        <ProtectedRoute>
            <VerifyOrderContent />
        </ProtectedRoute>
    );
}

function VerifyOrderContent() {
    const { showToast, confirm } = useUI();
    const [orders, setOrders] = useState<UnverifiedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [configError, setConfigError] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState(11); // Default Follow Up
    const [currentPage, setCurrentPage] = useState(1);
    const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
    const [refreshingSummary, setRefreshingSummary] = useState(false);
    const [searchBy, setSearchBy] = useState('all');

    // Detail Modal State
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [fetchingDetail, setFetchingDetail] = useState(false);

    // Verify Form State
    const [verifyNote, setVerifyNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Order State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);

    // Delegasi State
    const [isDelegasiModalOpen, setIsDelegasiModalOpen] = useState(false);
    const [assignList, setAssignList] = useState<any[]>([]);
    const [loadingAssign, setLoadingAssign] = useState(false);
    const [selectedTeknisi, setSelectedTeknisi] = useState<any>(null);

    useEffect(() => {
        fetchOrders(currentStatus);
        fetchSummary();
    }, [currentStatus]);

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(fetchSummary, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchSummary = async () => {
        setRefreshingSummary(true);
        try {
            const response = await fetch('/api/monitoring/summary');
            const data = await response.json();
            if (response.ok) {
                setOrderSummary(data.result);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setRefreshingSummary(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchOrders = async (status: number) => {
        setLoading(true);
        setConfigError(null);
        try {
            const response = await fetch(`/api/monitoring/verify?status=${status}`);
            const data = await response.json();
            if (response.ok) {
                setOrders(data.result || []);
            } else {
                if (response.status === 400 && data.error?.includes('Kredensial')) {
                    setConfigError(data.error);
                } else {
                    showToast(data.error || 'Gagal mengambil daftar order', 'error');
                }
            }
        } catch (error) {
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (orderId: number) => {
        const preloaded = orders.find(o => o.order_id === orderId);

        if (preloaded?.detail) {
            setSelectedOrder(preloaded.detail);
            setOrderHistory(preloaded.history || []);
            setIsDetailModalOpen(true);
            setVerifyNote('');
            return;
        }

        // Fallback if not preloaded
        setFetchingDetail(true);
        setIsDetailModalOpen(true);
        setVerifyNote('');
        try {
            const response = await fetch(`/api/monitoring/verify/${orderId}`);
            const data = await response.json();
            if (response.ok) {
                setSelectedOrder(data.result);
                setOrderHistory(data.history || []);
            } else {
                showToast(data.error || 'Gagal mengambil detail order', 'error');
                setIsDetailModalOpen(false);
            }
        } catch (error) {
            showToast('Terjadi kesalahan koneksi detail', 'error');
            setIsDetailModalOpen(false);
        } finally {
            setFetchingDetail(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/monitoring/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: selectedOrder.order_id,
                    status_code: "30", // VERIFIED status
                    faq_note: "",
                    note: verifyNote || "Terverifikasi via E-ServiceDesk"
                })
            });

            const result = await response.json();
            if (response.ok) {
                showToast('Order berhasil diverifikasi', 'success');
                setIsDetailModalOpen(false);
                fetchOrders(currentStatus); // Refresh list
                fetchSummary(); // Refresh counts
            } else {
                showToast(result.error || 'Gagal memverifikasi order', 'error');
            }
        } catch (error) {
            showToast('Kesalahan saat mengirim verifikasi', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedOrder) return;
        confirm('Delete Order?', 'Apakah Anda yakin ingin membatalkan/menghapus order ini?', async () => {
            try {
                const response = await fetch('/api/monitoring/cancel-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: selectedOrder.order_id })
                });

                if (response.ok) {
                    showToast('Order berhasil dibatalkan', 'success');
                    setIsDetailModalOpen(false);
                    fetchOrders(currentStatus);
                    fetchSummary();
                } else {
                    const data = await response.json();
                    showToast(data.error || 'Gagal membatalkan order', 'error');
                }
            } catch (err) {
                showToast('Gagal membatalkan order', 'error');
            }
        });
    };

    const handleEditOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/monitoring/edit-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            });

            if (response.ok) {
                showToast('Order berhasil dperbarui', 'success');
                setIsEditModalOpen(false);
                setIsDetailModalOpen(false);
                fetchOrders(currentStatus);
            } else {
                const data = await response.json();
                showToast(data.error || 'Gagal memperbarui order', 'error');
            }
        } catch (err) {
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchAssignList = async () => {
        if (!selectedOrder) return;
        setLoadingAssign(true);
        try {
            const res = await fetch(`/api/monitoring/assign-list?orderId=${selectedOrder.order_id}`);
            const data = await res.json();
            if (res.ok) {
                setAssignList(data.result || []);
            }
        } catch (err) {
            showToast('Gagal mengambil daftar teknisi', 'error');
        } finally {
            setLoadingAssign(false);
        }
    };

    const handleAssignTeknisi = async () => {
        if (!selectedTeknisi || !selectedOrder) return;
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/monitoring/assign-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: selectedOrder.order_id,
                    id: selectedOrder.order_id,
                    teknisi_id: selectedTeknisi.teknisi_id,
                    nama_lengkap: selectedTeknisi.nama_lengkap,
                    assign_type_code: "1",
                    assign_desc: "NEW",
                    emoji_code: ":gear:"
                })
            });

            if (response.ok) {
                showToast(`Tiket berhasil didelegasikan ke ${selectedTeknisi.nama_lengkap}`, 'success');
                setIsDelegasiModalOpen(false);
                setIsDetailModalOpen(false);
                fetchOrders(currentStatus);
            } else {
                const data = await response.json();
                showToast(data.error || 'Gagal mendelegasikan order', 'error');
            }
        } catch (err) {
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredOrders = orders.filter(o => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;

        if (searchBy === 'all') {
            return (o.order_no || '').toLowerCase().includes(term) ||
                (o.catatan || '').toLowerCase().includes(term) ||
                (o.location_desc || '').toLowerCase().includes(term) ||
                (o.order_by || '').toLowerCase().includes(term) ||
                (o.teknisi || '').toLowerCase().includes(term) ||
                (o.create_date || '').toLowerCase().includes(term) ||
                (o.ext_phone || '').toLowerCase().includes(term);
        }

        const value = (o as any)[searchBy] || '';
        return value.toString().toLowerCase().includes(term);
    });

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-200">
                        🛠️
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Order Management</h1>
                        <p className="text-slate-500 font-medium mt-1">Pantau dan kelola tiket dari sistem eksternal</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="text-[10px] bg-slate-100 text-slate-400 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest animate-pulse flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live Summary (5s)
                    </div>
                    <div className="flex flex-col md:flex-row items-end gap-3 w-full md:w-auto">
                        <div className="flex flex-col gap-1.5 w-full md:w-48">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filter Berdasarkan:</label>
                            <select
                                value={searchBy}
                                onChange={(e) => setSearchBy(e.target.value)}
                                className="bg-white border border-slate-200 rounded-2xl py-3 px-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-bold text-slate-700 text-xs"
                            >
                                <option value="all">🔍 Semua Kolom</option>
                                <option value="order_no">No Order</option>
                                <option value="order_by">Nama Pelapor</option>
                                <option value="teknisi">Nama Teknisi</option>
                                <option value="location_desc">Lokasi Ruangan</option>
                                <option value="ext_phone">Nomor Extensi</option>
                                <option value="catatan">Catatan Keluhan</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full md:w-80">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kata Kunci:</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder={`Cari ${searchBy === 'all' ? 'semua...' : searchBy.replace('_', ' ')}`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-medium text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-1">
                {STATUS_LEVELS.map((status) => (
                    <button
                        key={status.code}
                        onClick={() => {
                            setCurrentStatus(status.code);
                            setCurrentPage(1);
                        }}
                        className={`p-6 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden group ${currentStatus === status.code
                            ? `bg-gradient-to-br ${status.gradient} text-white shadow-2xl ${status.shadow} scale-105 z-10`
                            : 'bg-white/80 backdrop-blur-sm border-white/20 text-slate-400 hover:shadow-xl hover:-translate-y-1'
                            }`}
                    >
                        {/* Decorative Background Glow */}
                        <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-25 transition-opacity ${currentStatus === status.code ? 'bg-white' : status.glow
                            }`}></div>

                        <div className="flex flex-col items-center text-center relative z-10 h-full justify-between">
                            <span className="text-2xl mb-3 opacity-60 group-hover:scale-110 transition-transform">{status.icon}</span>
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-5xl font-black ${currentStatus === status.code ? 'text-white' : 'text-slate-800'
                                    }`}>
                                    {orderSummary ? (orderSummary as any)[status.key] : '...'}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transform transition-transform ${currentStatus === status.code ? status.text : 'text-slate-400'
                                    }`}>
                                    {status.label}
                                </span>
                            </div>

                            {currentStatus === status.code ? (
                                <div className="mt-4 w-6 h-1 bg-white/40 rounded-full"></div>
                            ) : (
                                <div className="mt-4 w-6 h-1 bg-transparent rounded-full opacity-0"></div>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {configError && (
                <PremiumAlert
                    variant="amber"
                    icon="🔌"
                    action={
                        <Link href="/settings">
                            <PremiumButton size="sm" variant="primary">
                                Set Kredensial
                            </PremiumButton>
                        </Link>
                    }
                >
                    {configError}
                </PremiumAlert>
            )}

            {/* List Section */}
            <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden min-h-[500px]">
                <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${currentStatus === 15 ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                        <h3 className="text-xl font-bold text-slate-800">
                            {STATUS_LEVELS.find(s => s.code === currentStatus)?.label} Tickets
                        </h3>
                        <span className="bg-slate-200/50 text-slate-500 px-3 py-1 rounded-full text-xs font-black">
                            {filteredOrders.length}
                        </span>
                        {currentStatus === 30 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                * Data sinkronisasi ribuan
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => fetchOrders(currentStatus)}
                        className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md active:scale-90"
                    >
                        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/30">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">No Order</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama dan Lokasi</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Keluhan</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teknisi</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-8">
                                            <div className="h-4 bg-slate-100 rounded-full w-full opacity-50"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedOrders.length > 0 ? (
                                paginatedOrders.map((order) => (
                                    <tr key={order.order_id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="px-8 py-6">
                                            <span className="font-black text-slate-800 bg-white px-4 py-2 rounded-xl text-sm border border-slate-100 shadow-sm group-hover:border-blue-200 transition-colors">
                                                {order.order_no}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-bold text-slate-500">
                                            {order.create_date}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-700">{order.order_by}</span>
                                                <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                                                    <span className="text-blue-500">📍</span> {order.location_desc}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm text-slate-600 line-clamp-2 max-w-md leading-relaxed italic font-medium bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
                                                "{order.catatan}"
                                            </p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-2xl border border-slate-100 shadow-sm group-hover:border-blue-100 transition-all">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-black shadow-md">
                                                    {order.teknisi.charAt(0)}
                                                </div>
                                                <span className="text-sm font-black text-slate-700">
                                                    {order.teknisi.replace(/\|/g, '')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => handleViewDetail(order.order_id)}
                                                className={`${currentStatus === 15 ? 'bg-blue-600 shadow-blue-200' : 'bg-slate-800 shadow-slate-200'
                                                    } text-white px-6 py-3 rounded-2xl text-sm font-black hover:opacity-90 shadow-xl transition-all active:scale-95 flex items-center gap-3 ml-auto`}
                                            >
                                                {currentStatus === 15 ? (
                                                    <><span className="text-lg">🛡️</span> Verifikasi</>
                                                ) : (
                                                    <><span className="text-lg">👁️</span> Detail</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center text-slate-400 font-medium">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="w-32 h-32 bg-slate-50/50 rounded-full flex items-center justify-center text-6xl shadow-inner animate-bounce duration-[3s]">
                                                {currentStatus === 30 ? '📚' : '☕'}
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-slate-300">Belum ada tiket</p>
                                                <p className="text-sm text-slate-400 mt-2">Status {STATUS_LEVELS.find(s => s.code === currentStatus)?.label} saat ini sedang kosong.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-sm text-slate-400 font-black tracking-widest uppercase">
                            Showing <span className="text-slate-900">{Math.min(filteredOrders.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredOrders.length, currentPage * ITEMS_PER_PAGE)}</span> of <span className="text-slate-900">{filteredOrders.length}</span> tickets
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                            >
                                PREV
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = Math.min(totalPages - 2, currentPage - 2) + i;
                                }
                                if (pageNum > totalPages) return null;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-12 h-12 rounded-2xl font-black transition-all ${currentPage === pageNum
                                            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl scale-110'
                                            : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                            >
                                NEXT
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 backdrop-blur-md bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        {(() => {
                            const statusStyle = STATUS_LEVELS.find(s => s.code === currentStatus) || STATUS_LEVELS[0];
                            return (
                                <>
                                    <div className={`bg-gradient-to-r ${statusStyle.gradient} p-10 text-white relative`}>
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div>
                                                <span className="bg-white/10 text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-2 w-fit">
                                                    <span className={`w-1.5 h-1.5 ${statusStyle.glow.replace('bg-', 'bg-')} rounded-full animate-pulse`}></span>
                                                    Order Details
                                                </span>
                                                <h2 className="text-4xl font-black mt-4 flex items-center gap-3">
                                                    #{selectedOrder?.order_no || '...'}
                                                    <span className="text-white/30 font-light">/</span>
                                                    <span className="text-lg font-bold text-blue-300 tracking-wider">TICKET</span>
                                                </h2>
                                            </div>
                                            <button
                                                onClick={() => setIsDetailModalOpen(false)}
                                                className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-2xl border border-white/10 group active:scale-90"
                                            >
                                                <span className="group-hover:rotate-90 transition-transform">&times;</span>
                                            </button>
                                        </div>

                                        {/* Fast Stats Row */}
                                        <div className="grid grid-cols-3 gap-6 mt-10">
                                            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Kategori</p>
                                                <p className="font-black text-sm truncate">{selectedOrder?.service_name || '-'}</p>
                                            </div>
                                            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Teknisi</p>
                                                <p className="font-black text-sm truncate">{selectedOrder?.nama_teknisi || '-'}</p>
                                            </div>
                                            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Status</p>
                                                <p className="font-black text-sm flex items-center gap-2">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${statusStyle.glow.replace('bg-', 'bg-')} animate-pulse shadow-lg`}></span>
                                                    {selectedOrder?.status_desc || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {fetchingDetail ? (
                                        <div className="p-32 flex flex-col items-center justify-center gap-6 text-center">
                                            <div className="relative">
                                                <div className="w-16 h-16 border-4 border-slate-100 rounded-full animate-pulse"></div>
                                                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                            <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Authenticating Order History...</p>
                                        </div>
                                    ) : selectedOrder && (
                                        <div className="p-10 lg:p-12 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                {/* Left Column: Reports */}
                                                <div className="space-y-8">
                                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                                        <h4 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                                            <span className="w-8 h-8 bg-blue-50 flex items-center justify-center rounded-xl">📝</span>
                                                            Laporan Keluhan
                                                        </h4>
                                                        <div className="space-y-6">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">User & Lokasi</p>
                                                                <p className="font-black text-slate-800 text-lg">{selectedOrder.order_by || 'Unknown'}</p>
                                                                <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                                                                    <span className="text-blue-500">📍</span> {selectedOrder.location_desc}
                                                                </p>
                                                            </div>
                                                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-blue-100/50 relative">
                                                                <div className="absolute top-4 right-6 text-blue-100 text-4xl font-serif">"</div>
                                                                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-2">Deskripsi Tiket</p>
                                                                <p className="text-sm text-slate-700 font-bold leading-relaxed italic">
                                                                    {selectedOrder.catatan || 'Tidak ada catatan keluhan.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Column: Technical Details */}
                                                <div className="space-y-8">
                                                    <div className={`bg-white border-slate-100 shadow-xl p-8 rounded-[2.5rem] border`}>
                                                        <h4 className={`text-xs font-black ${statusStyle.gradient.split(' ')[0].replace('from-', 'text-')} uppercase tracking-[0.2em] mb-6 flex items-center gap-3`}>
                                                            <span className={`w-8 h-8 ${statusStyle.glow.replace('bg-', 'bg-')}/10 ${statusStyle.gradient.split(' ')[0].replace('from-', 'text-')} flex items-center justify-center rounded-xl`}>🛠️</span>
                                                            {(currentStatus === 15 || currentStatus === 30) ? 'Hasil Penanganan' : 'Progres Penanganan'}
                                                        </h4>
                                                        <div className="space-y-6">
                                                            <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                                                                <div>
                                                                    <p className={`text-[10px] font-black opacity-30 uppercase tracking-widest mb-1`}>Kunjungan</p>
                                                                    <p className="text-sm font-black text-slate-700">{selectedOrder.tgl_kunjungan || '-'}</p>
                                                                </div>
                                                                {(currentStatus === 15 || currentStatus === 30) && (
                                                                    <div className="text-right border-l border-slate-200 pl-6">
                                                                        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Selesai</p>
                                                                        <p className="text-sm font-black text-slate-700">{selectedOrder.tgl_selesai || '-'}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className={`text-[10px] font-black opacity-30 uppercase tracking-widest mb-2`}>
                                                                    {currentStatus === 13 ? 'Keterangan Pending' : 'Update Deskripsi'}
                                                                </p>
                                                                <div className={`text-sm font-bold ${statusStyle.glow.replace('bg-', 'bg-')}/5 ${statusStyle.gradient.split(' ')[1].replace('to-', 'border-')}/20 p-6 rounded-[2rem] border min-h-[100px]`}>
                                                                    {currentStatus === 13
                                                                        ? (selectedOrder.ket_pending || 'Tidak ada keterangan pending')
                                                                        : (currentStatus === 10 || currentStatus === 11 || currentStatus === 12)
                                                                            ? (orderHistory[0]?.status_note || 'Menunggu update teknisi di lapangan...')
                                                                            : (selectedOrder.ket_penyelesaian || 'Penyelesaian telah dikonfirmasi.')
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* History/Log Section */}
                                                <div className="md:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
                                                        <span className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-2xl">📜</span>
                                                        Timeline Tiket / Audit Log
                                                    </h4>
                                                    <div className="relative space-y-10 pl-4 before:absolute before:inset-y-0 before:left-9 before:w-0.5 before:bg-gradient-to-b before:from-blue-100 before:via-blue-500 before:to-transparent">
                                                        {orderHistory.length > 0 ? orderHistory.map((log, idx) => (
                                                            <div key={idx} className="relative flex gap-8 group">
                                                                <div className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-125 duration-500 ${idx === 0
                                                                    ? 'bg-blue-600 border-4 border-blue-100 text-white'
                                                                    : 'bg-white border-2 border-slate-100 text-slate-300'
                                                                    }`}>
                                                                    <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white animate-ping' : 'bg-slate-300'}`}></div>
                                                                </div>
                                                                <div className="flex-1 bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:border-blue-100">
                                                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                                                        <div className="font-black text-slate-800 tracking-tight uppercase">{log.status_desc}</div>
                                                                        <div className="flex items-center gap-2 font-black text-[10px] text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                                                            🕒 {log.status_date}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">
                                                                        Petugas: <span className="text-slate-900 ml-1">{log.nama_petugas || 'System Automated'}</span>
                                                                    </div>
                                                                    {log.status_note && (
                                                                        <div className="text-sm text-slate-600 bg-white/60 p-5 rounded-2xl border border-blue-50/50 italic font-semibold leading-relaxed">
                                                                            "{log.status_note}"
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <p className="text-center py-10 text-slate-300 font-black uppercase tracking-widest text-[10px]">No History Log Found</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Footer */}
                                                {currentStatus === 15 ? (
                                                    <div className="md:col-span-2 pt-10 border-t border-slate-100">
                                                        <form onSubmit={handleVerifySubmit} className="space-y-6">
                                                            <div className="flex items-center gap-4 mb-2">
                                                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl">✅</div>
                                                                <label className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">
                                                                    Final Verification
                                                                </label>
                                                            </div>
                                                            <textarea
                                                                required
                                                                placeholder="Berikan catatan terakhir untuk menutup tiket ini (Contoh: Pekerjaan telah kami cek & sesuai)"
                                                                value={verifyNote}
                                                                onChange={(e) => setVerifyNote(e.target.value)}
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all min-h-[150px] text-sm font-bold shadow-inner"
                                                            />
                                                            <div className="flex gap-6">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsDetailModalOpen(false)}
                                                                    className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-50 rounded-[2rem] transition active:scale-95"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="submit"
                                                                    disabled={isSubmitting}
                                                                    className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 tracking-widest uppercase text-sm"
                                                                >
                                                                    {isSubmitting ? (
                                                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                    ) : (
                                                                        <><span className="text-xl">✅</span> Confirm & Verify Ticket</>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                ) : (currentStatus === 10 || currentStatus === 11 || currentStatus === 12) ? (
                                                    <div className="md:col-span-2 pt-10 border-t border-slate-100 flex flex-wrap gap-4 justify-end">
                                                        <PremiumButton
                                                            onClick={() => {
                                                                setEditFormData({ ...selectedOrder });
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-100 transition-all active:scale-95 text-xs"
                                                        >
                                                            ✏️ Edit Order
                                                        </PremiumButton>
                                                        <PremiumButton
                                                            onClick={() => {
                                                                setIsDelegasiModalOpen(true);
                                                                fetchAssignList();
                                                            }}
                                                            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs"
                                                        >
                                                            👥 Delegasi
                                                        </PremiumButton>
                                                        <PremiumButton
                                                            onClick={handleCancelOrder}
                                                            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95 text-xs"
                                                        >
                                                            🗑️ Delete Order
                                                        </PremiumButton>
                                                        <button
                                                            onClick={() => setIsDetailModalOpen(false)}
                                                            className="px-8 py-4 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition active:scale-95 shadow-lg border border-slate-200 text-xs"
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="md:col-span-2 pt-10 border-t border-slate-100 text-right">
                                                        <button
                                                            onClick={() => setIsDetailModalOpen(false)}
                                                            className="px-12 py-5 bg-slate-100 text-slate-600 font-black uppercase tracking-widest rounded-[2rem] hover:bg-slate-200 transition active:scale-95 shadow-lg border border-slate-200"
                                                        >
                                                            Close Detail
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            <PremiumModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="✏️ Edit External Order"
                size="md"
            >
                {editFormData && (
                    <form onSubmit={handleEditOrder} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PremiumInput
                                label="Nomor Extensi"
                                value={editFormData.ext_phone}
                                onChange={e => setEditFormData({ ...editFormData, ext_phone: e.target.value })}
                                required
                            />
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Service Catalog</label>
                                <select
                                    value={editFormData.service_catalog_id}
                                    onChange={e => setEditFormData({ ...editFormData, service_catalog_id: parseInt(e.target.value), service_name: EXTERNAL_CATALOGS.find(c => c.id === parseInt(e.target.value))?.name || '' })}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none shadow-sm"
                                >
                                    {EXTERNAL_CATALOGS.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <PremiumInput
                            label="Lokasi / Deskripsi Lokasi"
                            value={editFormData.location_desc}
                            onChange={e => setEditFormData({ ...editFormData, location_desc: e.target.value })}
                            required
                        />
                        <PremiumTextarea
                            label="Catatan Keluhan"
                            value={editFormData.catatan}
                            onChange={e => setEditFormData({ ...editFormData, catatan: e.target.value })}
                            required
                            rows={4}
                        />
                        <div className="flex gap-4 pt-4">
                            <PremiumButton
                                type="button"
                                variant="secondary"
                                onClick={() => setIsEditModalOpen(false)}
                                className="flex-1 py-4 uppercase font-black text-xs tracking-widest"
                            >
                                Batal
                            </PremiumButton>
                            <PremiumButton
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-2 py-4 shadow-xl shadow-blue-100 uppercase font-black text-xs tracking-widest"
                            >
                                {isSubmitting ? 'Saving...' : '💾 Simpan Perubahan'}
                            </PremiumButton>
                        </div>
                    </form>
                )}
            </PremiumModal>

            {/* Delegasi Modal */}
            <PremiumModal
                isOpen={isDelegasiModalOpen}
                onClose={() => setIsDelegasiModalOpen(false)}
                title="👥 Delegasi Tugas (Assign)"
                size="sm"
            >
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Teknisi Tujuan</p>
                        <button
                            onClick={fetchAssignList}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                    {loadingAssign ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching Technicians...</p>
                        </div>
                    ) : assignList.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="text-4xl">🔍</div>
                            <div>
                                <p className="font-black text-slate-400 text-sm">Daftar Teknisi Kosong</p>
                                <p className="text-[10px] text-slate-300 font-bold mt-1">Gagal mengambil data atau memang tidak ada teknisi tersedia.</p>
                            </div>
                            <PremiumButton size="sm" variant="secondary" onClick={fetchAssignList}>
                                Coba Lagi
                            </PremiumButton>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
                                {assignList.map(tek => (
                                    <button
                                        key={tek.teknisi_id}
                                        onClick={() => setSelectedTeknisi(tek)}
                                        className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${selectedTeknisi?.teknisi_id === tek.teknisi_id
                                            ? 'border-blue-600 bg-blue-50/50 shadow-md'
                                            : 'border-slate-100 hover:border-blue-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:text-white transition-all">
                                                {(tek.nama_lengkap || 'T').charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-black text-slate-800 text-sm">{tek.nama_lengkap || 'Unknown'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tek.nama_bidang || '-'}</p>
                                            </div>
                                        </div>
                                        {selectedTeknisi?.teknisi_id === tek.teknisi_id && (
                                            <span className="text-blue-600 text-xl">✅</span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <PremiumButton
                                    onClick={handleAssignTeknisi}
                                    disabled={!selectedTeknisi || isSubmitting}
                                    className="py-5 shadow-2xl shadow-blue-100 font-black uppercase text-xs tracking-widest"
                                >
                                    {isSubmitting ? 'Assigning...' : '🤝 Konfirmasi Delegasi'}
                                </PremiumButton>
                                <button
                                    onClick={() => setIsDelegasiModalOpen(false)}
                                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 py-2 transition"
                                >
                                    Tutup
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </PremiumModal>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 100px;
                    border: 4px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                    background-clip: content-box;
                }
            `}</style>
        </div>
    );
}

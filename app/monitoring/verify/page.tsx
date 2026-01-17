'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useUI } from '@/context/UIContext';
import { PremiumAlert, PremiumButton } from '@/components/ui/PremiumComponents';
import Link from 'next/link';

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

    // Detail Modal State
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [fetchingDetail, setFetchingDetail] = useState(false);

    // Verify Form State
    const [verifyNote, setVerifyNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchUnverifiedOrders();
    }, []);

    const fetchUnverifiedOrders = async () => {
        setLoading(true);
        setConfigError(null);
        try {
            const response = await fetch('/api/monitoring/verify');
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
                fetchUnverifiedOrders(); // Refresh list
            } else {
                showToast(result.error || 'Gagal memverifikasi order', 'error');
            }
        } catch (error) {
            showToast('Kesalahan saat mengirim verifikasi', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredOrders = orders.filter(o =>
        o.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.catatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.location_desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.order_by.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-200">
                        🛡️
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Verifikasi Order</h1>
                        <p className="text-slate-500 font-medium mt-1">Selesaikan tiket yang sudah dikerjakan teknisi</p>
                    </div>
                </div>

                <div className="relative group w-full md:w-96">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Cari Order ID, No Order, atau Catatan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
                    />
                </div>
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
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[500px]">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {filteredOrders.length} Menunggu Verifikasi
                        </span>
                    </div>
                    <button
                        onClick={fetchUnverifiedOrders}
                        className="text-slate-400 hover:text-blue-600 p-2 rounded-xl hover:bg-white transition-all active:scale-90"
                    >
                        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No Order</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama dan Lokasi</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan Keluhan</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Teknisi</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-6">
                                            <div className="h-6 bg-slate-100 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map((order) => (
                                    <tr key={order.order_id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <span className="font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg text-sm border border-slate-200">
                                                {order.order_no}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-500">
                                            {order.create_date}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{order.order_by}</span>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    📍 {order.location_desc}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm text-slate-600 line-clamp-1 max-w-[200px]">
                                                {order.catatan}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                    {order.teknisi.charAt(0)}
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {order.teknisi.replace(/\|/g, '')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => handleViewDetail(order.order_id)}
                                                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                            >
                                                🔍 Verifikasi
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl">
                                                ☕
                                            </div>
                                            <p>Tidak ada order yang menunggu verifikasi.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {isDetailModalOpen && (
                <div className="fixed inset-0 backdrop-blur-md bg-slate-900/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="bg-white/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                                        Detail Tiket
                                    </span>
                                    <h2 className="text-3xl font-black mt-3">#{selectedOrder?.order_no || '...'}</h2>
                                </div>
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-2xl"
                                >
                                    &times;
                                </button>
                            </div>

                            {/* Fast Stats Row */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Kategori</p>
                                    <p className="font-bold text-sm truncate">{selectedOrder?.service_name || '-'}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Teknisi</p>
                                    <p className="font-bold text-sm truncate">{selectedOrder?.nama_teknisi || '-'}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Status</p>
                                    <p className="font-bold text-sm flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                        {selectedOrder?.status_desc || '-'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {fetchingDetail ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="font-bold text-slate-400">Memuat detail order...</p>
                            </div>
                        ) : selectedOrder && (
                            <div className="p-8 lg:p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Reports */}
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                📝 Laporan Keluhan
                                            </h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nama dan Lokasi</p>
                                                    <p className="font-bold text-slate-700">{selectedOrder.order_by || 'Unknown'} - {selectedOrder.location_desc}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Isi Keluhan</p>
                                                    <p className="text-sm text-slate-600 italic leading-relaxed">"{selectedOrder.catatan}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Technical Details */}
                                    <div className="space-y-6">
                                        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                🛠️ Hasil Penanganan
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-emerald-600/50 uppercase">Kunjungan</p>
                                                        <p className="text-xs font-bold text-slate-700">{selectedOrder.tgl_kunjungan}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-emerald-600/50 uppercase">Selesai</p>
                                                        <p className="text-xs font-bold text-slate-700">{selectedOrder.tgl_selesai}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-emerald-600/50 uppercase">Keterangan Penyelesaian</p>
                                                    <p className="text-sm font-bold text-emerald-900 bg-white/60 p-3 rounded-xl border border-emerald-100 mt-2">
                                                        {selectedOrder.ket_penyelesaian || 'Tidak ada keterangan'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* History/Log Section */}
                                    <div className="md:col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            📜 Riwayat Status / Log Tiket
                                        </h4>
                                        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                            {orderHistory.length > 0 ? orderHistory.map((log, idx) => (
                                                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-blue-600 text-slate-300 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-500">
                                                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></div>
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                                            <div className="font-bold text-slate-800">{log.status_desc}</div>
                                                            <time className="font-medium text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{log.status_date}</time>
                                                        </div>
                                                        <div className="text-slate-500 text-xs mb-2">Oleh: <span className="font-bold text-slate-600">{log.nama_petugas || 'System'}</span></div>
                                                        {log.status_note && (
                                                            <div className="text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 italic">
                                                                "{log.status_note}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-center text-slate-400 text-sm italic">Belum ada riwayat status.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Verify Form Footer */}
                                    <div className="md:col-span-2 pt-6 border-t border-slate-100">
                                        <form onSubmit={handleVerifySubmit} className="space-y-4">
                                            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider mb-2">
                                                Konfirmasi Verifikasi
                                            </label>
                                            <textarea
                                                required
                                                placeholder="Berikan umpan balik atau catatan tambahan (Contoh: PC sudah normal, terima kasih)"
                                                value={verifyNote}
                                                onChange={(e) => setVerifyNote(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all min-h-[100px] text-sm font-medium"
                                            />
                                            <div className="flex gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsDetailModalOpen(false)}
                                                    className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition"
                                                >
                                                    Tutup
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                                >
                                                    {isSubmitting ? (
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : '🛡️ Konfirmasi & Verifikasi'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 20px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}

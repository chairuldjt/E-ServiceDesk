'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PremiumAlert, PremiumButton } from '@/components/ui/PremiumComponents';
import Link from 'next/link';

interface LeaderboardItem {
    teknisi: string;
    order: number;
}

interface MonitoringData {
    date: string;
    total_orders: number;
    total_teknisi: number;
    leaderboard: LeaderboardItem[];
    data: LeaderboardItem[];
}

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function MonitoringPage() {
    return (
        <ProtectedRoute>
            <MonitoringContent />
        </ProtectedRoute>
    );
}

function MonitoringContent() {
    const [data, setData] = useState<MonitoringData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [countdown, setCountdown] = useState(50);
    const [configError, setConfigError] = useState<string | null>(null);

    const fetchData = useCallback(async (nocache = false, date?: string) => {
        // Only show full loading state on initial load or date change
        // For auto-refresh, we use isRefreshing to show a subtle indicator
        if (!data) setLoading(true);

        try {
            let url = `/api/monitoring?`;
            if (nocache) url += `nocache=1&`;
            if (date) url += `date=${date}&`;

            const res = await fetch(url);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to fetch data');
            setData(json);
            setError(null);
            setConfigError(null);
        } catch (err: any) {
            if (err.message.includes('Kredensial')) {
                setConfigError(err.message);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [data]);

    // Initial load
    useEffect(() => {
        fetchData(false, selectedDate);
    }, [selectedDate]); // Removed fetchData from deps to avoid infinite loops, depend on selectedDate

    // Auto-refresh logic
    useEffect(() => {
        // Reset countdown and start interval
        setCountdown(50);

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setIsRefreshing(true);
                    fetchData(true, selectedDate);
                    return 50; // Reset countdown
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [fetchData, selectedDate]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setCountdown(50);
        fetchData(true, selectedDate);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header Container */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-xl">
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Technician Monitoring
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        Live Updates
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 flex items-center gap-1 ml-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            Refresh in {countdown}s
                        </span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all shadow-sm"
                    />
                    <button
                        onClick={handleRefresh}
                        disabled={loading || isRefreshing}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${isRefreshing || loading
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/25 hover:-translate-y-0.5'
                            }`}
                    >
                        {isRefreshing ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                        )}
                        Refresh
                    </button>
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

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-red-700 font-medium">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        {error}
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <p className="text-blue-100 font-semibold tracking-wider uppercase text-sm">Total Orders Processed</p>
                    <div className="mt-4 flex items-end gap-3">
                        <h2 className="text-6xl font-black">
                            {loading ? '...' : data?.total_orders || 0}
                        </h2>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-2">Today</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-blue-100 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        Verified from external source
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <p className="text-emerald-100 font-semibold tracking-wider uppercase text-sm">Active Technicians</p>
                    <div className="mt-4 flex items-end gap-3">
                        <h2 className="text-6xl font-black">
                            {loading ? '...' : data?.total_teknisi || 0}
                        </h2>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-2">On Duty</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-emerald-100 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        Based on completed entries
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Leaderboard Section */}
                <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-slate-800">Top Performers</h3>
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            [1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl"></div>
                            ))
                        ) : data?.leaderboard && data.leaderboard.length > 0 ? (
                            data.leaderboard.map((item, index) => (
                                <div
                                    key={item.teknisi}
                                    className={`flex items-center p-4 rounded-2xl border transition-all hover:scale-[1.02] ${index === 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg mr-4 ${index === 0 ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-500 shadow-sm'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 truncate">{item.teknisi}</p>
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">Technical Expert</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-slate-900">{item.order}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Orders</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-12 text-slate-400 font-medium">No performance data yet</p>
                        )}
                    </div>
                </div>

                {/* Detailed Table Section */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-slate-50">
                        <h3 className="text-xl font-bold text-slate-800">Technician Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Technician Name</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Orders Handled</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-6"><div className="h-4 w-32 bg-slate-100 rounded"></div></td>
                                            <td className="px-8 py-6"><div className="h-4 w-8 bg-slate-100 rounded ml-auto"></div></td>
                                            <td className="px-8 py-6"><div className="h-2 w-full bg-slate-100 rounded"></div></td>
                                        </tr>
                                    ))
                                ) : data?.data && data.data.length > 0 ? (
                                    data.data.map((item) => {
                                        const maxOrder = Math.max(...(data.data.map(d => d.order) || [1]));
                                        const percentage = (item.order / maxOrder) * 100;

                                        return (
                                            <tr key={item.teknisi} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                                        {item.teknisi}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-slate-900 text-lg">
                                                    {item.order}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-medium">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="9" y1="22" x2="9" y2="10" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="16" y2="18" /></svg>
                                                No data available for the selected date
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

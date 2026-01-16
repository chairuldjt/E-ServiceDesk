'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUI } from '@/context/UIContext';
import Image from 'next/image';

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfileContent />
        </ProtectedRoute>
    );
}

function ProfileContent() {
    const { user } = useAuth();
    const { showToast } = useUI();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/user/profile');
            const data = await response.json();
            if (response.ok) {
                setProfile(data.data);
            } else {
                showToast(data.error || 'Gagal memuat profil', 'error');
            }
        } catch (error) {
            console.error('Fetch profile error:', error);
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">👤 Profile Detail</h1>
                    <p className="text-gray-500 text-sm">Informasi lengkap akun Anda</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32 md:h-48 relative">
                        <div className="absolute -bottom-16 left-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-2xl bg-white p-1 shadow-xl">
                                    <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white">
                                        {profile?.profile_image ? (
                                            <img
                                                src={profile.profile_image}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-4xl font-bold text-blue-600">
                                                {profile?.username?.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 pb-8 px-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{profile?.username}</h2>
                                <p className="text-gray-500 font-medium">{profile?.email}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                        {profile?.role}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${profile?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {profile?.is_active ? 'Aktif' : 'Non-Aktif'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <a
                                    href="/settings"
                                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200 text-sm font-semibold inline-block"
                                >
                                    Edit Profil
                                </a>
                            </div>
                        </div>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Username</p>
                                <p className="text-slate-700 font-medium">{profile?.username}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                <p className="text-slate-700 font-medium">{profile?.email}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Role Access</p>
                                <p className="text-slate-700 font-medium capitalize">{profile?.role}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bergabung Sejak</p>
                                <p className="text-slate-700 font-medium">
                                    {new Date(profile?.created_at).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

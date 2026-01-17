'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    return (
        <ProtectedRoute>
            <SettingsContent />
        </ProtectedRoute>
    );
}

function SettingsContent() {
    const { user, refreshUser } = useAuth();
    const { showToast } = useUI();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [profile, setProfile] = useState({
        username: '',
        email: '',
        profile_image: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [webminConfig, setWebminConfig] = useState({
        user: '',
        pass: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/user/profile');
            const data = await response.json();
            if (response.ok) {
                setProfile({
                    username: data.data.username,
                    email: data.data.email,
                    profile_image: data.data.profile_image
                });
            }

            // Fetch Webmin config
            const webminResp = await fetch('/api/settings/webmin');
            const webminData = await webminResp.json();
            if (webminResp.ok) {
                setWebminConfig({
                    user: webminData.user || '',
                    pass: webminData.pass || ''
                });
            }
        } catch (error) {
            showToast('Gagal memuat profil', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: profile.username,
                    email: profile.email
                })
            });
            const data = await response.json();
            if (response.ok) {
                showToast('Profil berhasil diperbarui', 'success');
                await refreshUser();
            } else {
                showToast(data.error || 'Gagal memperbarui profil', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('Konfirmasi password tidak cocok', 'error');
            return;
        }

        setUpdating(true);
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: profile.username,
                    email: profile.email,
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            const data = await response.json();
            if (response.ok) {
                showToast('Password berhasil diubah', 'success');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                showToast(data.error || 'Gagal mengubah password', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        if (!file.type.startsWith('image/')) {
            showToast('File harus berupa gambar', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/user/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                setProfile(prev => ({ ...prev, profile_image: data.imageUrl }));
                showToast('Foto profil berhasil diperbarui', 'success');
                await refreshUser();
            } else {
                showToast(data.error || 'Gagal mengupload gambar', 'error');
            }
        } catch (error) {
            showToast('Gagal mengupload gambar', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleWebminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const response = await fetch('/api/settings/webmin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webminConfig),
            });

            if (response.ok) {
                showToast('Kredensial sinkronisasi berhasil disimpan', 'success');
            } else {
                showToast('Gagal menyimpan kredensial', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        } finally {
            setUpdating(false);
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Account Settings</h1>
                    <p className="text-gray-500 text-sm">Kelola informasi profil dan keamanan akun Anda</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Picture Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Foto Profil</h3>
                            <div className="relative group">
                                <div className="w-40 h-40 rounded-3xl bg-slate-100 p-1 mb-6 border-2 border-dashed border-slate-300">
                                    <div className="w-full h-full rounded-2xl bg-white overflow-hidden flex items-center justify-center relative">
                                        {profile.profile_image ? (
                                            <img
                                                src={profile.profile_image}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-5xl font-bold text-blue-600">{profile.username.charAt(0).toUpperCase()}</span>
                                        )}

                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-4 right-0 w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg border-2 border-white flex items-center justify-center hover:bg-blue-700 transition"
                                    disabled={uploading}
                                >
                                    📷
                                </button>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                            />
                            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                                Gunakan foto dengan format JPG atau PNG. Ukuran maksimal 2MB.
                            </p>
                        </div>
                    </div>

                    {/* Forms Section */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* General Info */}
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="text-blue-600">📋</span> Informasi Umum
                            </h3>
                            <form onSubmit={handleProfileSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                                        <input
                                            type="text"
                                            value={profile.username}
                                            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-100 disabled:opacity-50"
                                        disabled={updating}
                                    >
                                        {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Change Password */}
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="text-amber-500">🔒</span> Ganti Password
                            </h3>
                            <form onSubmit={handlePasswordSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Password Saat Ini</label>
                                    <input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Password Baru</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Konfirmasi Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-amber-500 text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition shadow-lg shadow-amber-100 disabled:opacity-50"
                                        disabled={updating}
                                    >
                                        {updating ? 'Menyimpan...' : 'Perbarui Password'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Webmin Connection Section */}
                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center -mr-8 -mt-8 opacity-50">
                                <span className="text-4xl">🔌</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="text-indigo-600">Sync</span> Koneksi External
                            </h3>
                            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                Konfigurasi kredensial API eksternal (Webmin) untuk fitur sinkronisasi pesanan/order otomatis.
                            </p>
                            <form onSubmit={handleWebminSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Username Webmin</label>
                                        <input
                                            type="text"
                                            value={webminConfig.user}
                                            onChange={(e) => setWebminConfig({ ...webminConfig, user: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            placeholder="User API"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Password Webmin</label>
                                        <input
                                            type="password"
                                            value={webminConfig.pass}
                                            onChange={(e) => setWebminConfig({ ...webminConfig, pass: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t border-slate-50">
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
                                        disabled={updating}
                                    >
                                        {updating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>💾 Simpan Kredensial</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

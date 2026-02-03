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
        pass: '',
        base_url: ''
    });

    const [isWhatsappVisible, setIsWhatsappVisible] = useState(true);

    const [permissions, setPermissions] = useState<string[]>([]);

    const fetchPermissions = async () => {
        try {
            const res = await fetch('/api/auth/permissions');
            if (res.ok) {
                const data = await res.json();
                setPermissions(data.permissions);
            }
        } catch (error) {
            console.error('Failed to fetch permissions', error);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchPermissions();
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
                    pass: webminData.pass || '',
                    base_url: webminData.base_url || ''
                });
            }

            // Fetch WhatsApp visibility setting
            const whatsappResp = await fetch('/api/settings/whatsapp-visibility');
            const whatsappData = await whatsappResp.json();
            if (whatsappResp.ok && whatsappData.visible !== undefined) {
                setIsWhatsappVisible(whatsappData.visible);
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
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            const data = await response.json();
            if (response.ok) {
                showToast('Password berhasil diperbarui', 'success');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                showToast(data.error || 'Gagal memperbarui password', 'error');
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

        if (file.size > 2 * 1024 * 1024) {
            showToast('Ukuran file maksimal 2MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
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

    const handleToggleWhatsapp = async () => {
        setUpdating(true);
        try {
            const res = await fetch('/api/settings/whatsapp-visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visible: !isWhatsappVisible })
            });
            if (res.ok) {
                setIsWhatsappVisible(!isWhatsappVisible);
                showToast(`Menu WhatsApp Bot berhasil ${!isWhatsappVisible ? 'ditampilkan' : 'disembunyikan'}`, 'success');
                // Auto refresh to update sidebar immediately
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast('Gagal mengubah pengaturan', 'error');
            }
        } catch (error) {
            console.error(error);
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

                                {user?.role === 'admin' && (
                                    <div className="pt-4 border-t border-slate-50">
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                            <span>🌐</span> Custom External API Base URL
                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg uppercase tracking-wider">Admin Only</span>
                                        </label>
                                        <input
                                            type="url"
                                            value={webminConfig.base_url}
                                            onChange={(e) => setWebminConfig({ ...webminConfig, base_url: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition font-mono text-sm"
                                            placeholder="http://172.16.1.212:5010"
                                        />
                                        <p className="mt-2 text-[11px] text-gray-400">
                                            Default: <code>{process.env.NEXT_PUBLIC_EXTERNAL_API_BASE || 'http://172.16.1.212:5010'}</code>. Ubah jika IP server eksternal berubah.
                                        </p>
                                    </div>
                                )}

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

                        {/* WhatsApp Bot Visibility Section (Admin & Permissions based) */}
                        {(user?.role === 'admin' || permissions.includes('/whatsapp')) && (
                            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full flex items-center justify-center -mr-8 -mt-8 opacity-50">
                                    <span className="text-4xl">📱</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <span className="text-green-600">WhatsApp</span> Menu Visibility
                                </h3>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                    Kontrol visibilitas menu WhatsApp Bot di Sidebar. Pengaturan ini hanya berlaku untuk akun Anda.
                                </p>

                                <div className="flex items-center justify-between gap-8 bg-slate-50 p-6 rounded-2xl">
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-black text-slate-800">
                                            Tampilkan Menu WhatsApp Bot
                                        </h4>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                            Aktifkan atau nonaktifkan visibilitas menu WhatsApp Bot di Sidebar.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleToggleWhatsapp}
                                        disabled={updating}
                                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 shadow-inner ${isWhatsappVisible ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-slate-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${isWhatsappVisible ? 'translate-x-[24px]' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                <div className="mt-6 flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl">
                                    <span className="text-xl">💡</span>
                                    <p className="text-xs text-blue-800/70 font-medium leading-relaxed">
                                        Menyembunyikan menu ini hanya akan menghilangkan tautan di sidebar Anda. Halaman <code className="bg-blue-100 px-1 rounded text-blue-900">/whatsapp</code> tetap dapat diakses secara langsung.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

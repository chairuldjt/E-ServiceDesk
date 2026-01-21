'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { PageHeader, PremiumCard, PremiumButton, PremiumModal, PremiumInput, PremiumBadge } from '@/components/ui/PremiumComponents';

interface LogbookEntry {
  id: number;
  user_id: number;
  extensi: string;
  nama: string;
  lokasi: string;
  catatan: string;
  solusi: string;
  penyelesaian: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  is_active: number;
  created_at: string;
}

function AdminContent() {
  const { user, isLoading: userLoading } = useAuth();
  const { showToast, confirm } = useUI();
  const router = useRouter();
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    draft: 0,
    totalUsers: 0,
    adminUsers: 0,
    userUsers: 0
  });

  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({ username: '', email: '', password: '', role: 'user' });
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    if (userLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchLogbook();
    fetchUsers();
  }, [user, userLoading, router]);

  const fetchLogbook = async () => {
    try {
      const response = await fetch('/api/logbook');
      const data = await response.json();
      setLogbookEntries(data.data);
      const total = data.data.length;
      const completed = data.data.filter((entry: LogbookEntry) => entry.status === 'completed').length;
      const draft = data.data.filter((entry: LogbookEntry) => entry.status === 'draft').length;
      setStats(prev => ({ ...prev, total, completed, draft }));
    } catch (error) {
      console.error('Error fetching logbook:', error);
      showToast('Gagal memuat logbook', 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/auth/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
        const totalUsers = data.data?.length || 0;
        const adminUsers = data.data?.filter((u: User) => u.role === 'admin').length || 0;
        const userUsers = data.data?.filter((u: User) => u.role === 'user').length || 0;
        setStats(prev => ({ ...prev, totalUsers, adminUsers, userUsers }));
      } else {
        showToast('Gagal memuat users', 'error');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Gagal memuat users', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    confirm('Buat User Baru?', 'Apakah anda yakin ingin menambahkan user ini?', async () => {
      try {
        const res = await fetch('/api/auth/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData)
        });
        if (res.ok) {
          showToast('User berhasil dibuat', 'success');
          setIsUserModalOpen(false);
          setUserFormData({ username: '', email: '', password: '', role: 'user' });
          fetchUsers();
          setTimeout(() => window.location.reload(), 1000);
        } else {
          const err = await res.json();
          showToast(err.error || 'Gagal membuat user', 'error');
        }
      } catch (error) {
        console.error(error);
        showToast('Terjadi kesalahan', 'error');
      }
    });
  };

  const handleUpdateStatus = (id: number, currentStatus: number) => {
    const newStatus = currentStatus ? 0 : 1;
    const action = newStatus ? 'Aktifkan' : 'Nonaktifkan';

    confirm(`${action} User?`, `Apakah anda yakin ingin ${action.toLowerCase()} user ini?`, async () => {
      try {
        const res = await fetch(`/api/auth/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: newStatus })
        });
        if (res.ok) {
          showToast(`User berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
          fetchUsers();
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('Gagal mengubah status user', 'error');
        }
      } catch (error) { console.error(error); showToast('Terjadi kesalahan', 'error'); }
    });
  };


  const handleChangeRole = (id: number, currentRole: string) => {
    // Cycle: user -> super -> admin -> user
    let newRole = 'user';
    if (currentRole === 'user') newRole = 'super';
    else if (currentRole === 'super') newRole = 'admin';
    else if (currentRole === 'admin') newRole = 'user';

    const roleName = newRole === 'super' ? 'Super User' : newRole === 'admin' ? 'Admin' : 'User';

    confirm(`Ubah Role?`, `Ubah role user menjadi ${roleName}?`, async () => {
      try {
        const res = await fetch(`/api/auth/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });
        if (res.ok) {
          fetchUsers();
          showToast(`Role berubah menjadi ${roleName}`, 'success');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('Gagal mengubah role', 'error');
        }
      } catch (error) { console.error(error); showToast('Terjadi kesalahan', 'error'); }
    });
  };

  const handleDeleteUser = (id: number) => {
    confirm('Hapus User?', 'Yakin ingin menghapus user ini PERMANEN?', async () => {
      try {
        const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('User dihapus', 'success');
          fetchUsers();
          setTimeout(() => window.location.reload(), 1000);
        } else {
          const err = await res.json();
          showToast(err.error, 'error');
        }
      } catch (error) { console.error(error); showToast('Terjadi kesalahan', 'error'); }
    });
  };


  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPassword) return;

    confirm('Reset Password?', `Reset password untuk user ${selectedUser.username}?`, async () => {
      try {
        const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: resetPassword })
        });
        if (res.ok) {
          showToast('Password berhasil direset', 'success');
          setIsResetPasswordModalOpen(false);
          setResetPassword('');
          setSelectedUser(null);
        } else {
          showToast('Gagal reset password', 'error');
        }
      } catch (error) { console.error(error); showToast('Terjadi kesalahan', 'error'); }
    });
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      <PageHeader
        icon="🔐"
        title="Admin Dashboard"
        subtitle="Manajemen sistem dan user"
      />

      {/* Tab Navigation */}
      <PremiumCard className="p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl transition-all ${activeTab === 'overview'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl transition-all ${activeTab === 'users'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            👥 Users
          </button>

        </div>
      </PremiumCard>


      {activeTab === 'overview' && (
        <div className="space-y-8">

          {/* User Stats */}
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              👥 Statistik Users
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Users */}
              <div className="p-8 rounded-[2.5rem] border bg-gradient-to-br from-purple-600 to-fuchsia-800 text-white shadow-2xl shadow-purple-200 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white group-hover:opacity-40 transition-opacity"></div>
                <div className="flex flex-col items-center text-center relative z-10">
                  <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">👥</span>
                  <span className="text-5xl font-black mb-2 antialiased tabular-nums">{stats.totalUsers}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-100 opacity-80">Total Pengguna</span>
                  <div className="mt-4 w-8 h-1 bg-white/30 rounded-full"></div>
                </div>
              </div>

              {/* Admin */}
              <div className="p-8 rounded-[2.5rem] border bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white group-hover:opacity-40 transition-opacity"></div>
                <div className="flex flex-col items-center text-center relative z-10">
                  <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">🔐</span>
                  <span className="text-5xl font-black mb-2 antialiased tabular-nums">{stats.adminUsers}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-100 opacity-80">Administrator</span>
                  <div className="mt-4 w-8 h-1 bg-white/30 rounded-full"></div>
                </div>
              </div>

              {/* User */}
              <div className="p-8 rounded-[2.5rem] border bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white group-hover:opacity-40 transition-opacity"></div>
                <div className="flex flex-col items-center text-center relative z-10">
                  <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">👤</span>
                  <span className="text-5xl font-black mb-2 antialiased tabular-nums">{stats.userUsers}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 opacity-80">Regular User</span>
                  <div className="mt-4 w-8 h-1 bg-white/30 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900">Manajemen Users</h2>
            <PremiumButton onClick={() => setIsUserModalOpen(true)}>
              <span className="text-lg">➕</span> Tambah User
            </PremiumButton>
          </div>

          <PremiumCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-gray-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Info User</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900">{u.username}</span>
                          <span className="text-sm text-slate-500 font-medium">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleChangeRole(u.id, u.role)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all hover:scale-105 uppercase tracking-wider ${u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : u.role === 'super'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                            }`}
                        >
                          {u.role === 'admin' ? '🔐 Admin' : u.role === 'super' ? '⚡ Super' : '👤 User'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleUpdateStatus(u.id, u.is_active)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all hover:scale-105 uppercase tracking-wider ${u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                        >
                          {u.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsResetPasswordModalOpen(true);
                            }}
                            className="text-orange-600 hover:text-orange-700 font-bold hover:bg-orange-50 px-2 py-1 rounded-lg transition"
                            title="Reset Password"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-700 font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition"
                            title="Hapus User"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PremiumCard>
        </div>
      )}




      {/* MODAL: Add User */}
      <PremiumModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Tambah User Baru"
        size="sm"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <PremiumInput
            label="Username"
            type="text"
            required
            value={userFormData.username}
            onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
          />
          <PremiumInput
            label="Email"
            type="email"
            required
            value={userFormData.email}
            onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
          />
          <PremiumInput
            label="Password"
            type="password"
            required
            value={userFormData.password}
            onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
          />
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Role</label>
            <select
              value={userFormData.role}
              onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
            >
              <option value="user">User</option>
              <option value="super">Super User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <PremiumButton type="button" variant="secondary" onClick={() => setIsUserModalOpen(false)}>
              Batal
            </PremiumButton>
            <PremiumButton type="submit">
              💾 Simpan
            </PremiumButton>
          </div>
        </form>
      </PremiumModal>

      {/* MODAL: Reset Password */}
      <PremiumModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUser(null);
        }}
        title="Reset Password"
        size="sm"
      >
        {selectedUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-slate-600 font-medium">
              Masukkan password baru untuk <strong className="text-slate-900">{selectedUser.username}</strong>
            </p>
            <PremiumInput
              type="password"
              placeholder="Password Baru"
              required
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-4">
              <PremiumButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsResetPasswordModalOpen(false);
                  setSelectedUser(null);
                }}
              >
                Batal
              </PremiumButton>
              <PremiumButton type="submit" variant="danger">
                🔑 Reset Password
              </PremiumButton>
            </div>
          </form>
        )}
      </PremiumModal>
    </div>
  );
}

'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';

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
  username: string; // Added username
  role: string;
  is_active: number; // Added is_active (using number for boolean from MySQL)
  created_at: string;
}

function AdminContent() {
  const { user, isLoading: userLoading } = useAuth();
  const { showToast, confirm } = useUI();
  const router = useRouter();
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'logbook' | 'users'>('overview');
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
          fetchUsers();
          showToast(`User berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
        } else {
          showToast('Gagal mengubah status user', 'error');
        }
      } catch (error) { console.error(error); showToast('Terjadi kesalahan', 'error'); }
    });
  };

  const handleChangeRole = (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    confirm(`Ubah Role?`, `Ubah role user menjadi ${newRole}?`, async () => {
      try {
        const res = await fetch(`/api/auth/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });
        if (res.ok) {
          fetchUsers();
          showToast(`Role berubah menjadi ${newRole}`, 'success');
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
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🛡️ Admin Dashboard</h1>

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button onClick={() => setActiveTab('overview')} className={`py-2 px-1 font-medium text-sm border-b-2 transition ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>📊 Overview</button>
            <button onClick={() => setActiveTab('logbook')} className={`py-2 px-1 font-medium text-sm border-b-2 transition ${activeTab === 'logbook' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>📚 Logbook</button>
            <button onClick={() => setActiveTab('users')} className={`py-2 px-1 font-medium text-sm border-b-2 transition ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>👥 Users</button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div>
            {/* ... Existing Overview code ... (Assuming no changes needed here, but simplifying for brevity in replacement) */}
            <h2 className="text-xl font-bold text-gray-900 mb-6">Ringkasan Sistem</h2>
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistik Logbook</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6"><div><p className="text-gray-600 text-sm font-medium">Total Logbook</p><p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p></div></div>
                <div className="bg-white rounded-lg shadow p-6"><div><p className="text-gray-600 text-sm font-medium">Selesai</p><p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p></div></div>
                <div className="bg-white rounded-lg shadow p-6"><div><p className="text-gray-600 text-sm font-medium">Draft</p><p className="text-3xl font-bold text-yellow-600 mt-2">{stats.draft}</p></div></div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistik Users</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6"><div><p className="text-gray-600 text-sm font-medium">Total Users</p><p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalUsers}</p></div></div>
                <div className="bg-white rounded-lg shadow p-6"><div><p className="text-gray-600 text-sm font-medium">Admin</p><p className="text-3xl font-bold text-red-600 mt-2">{stats.adminUsers}</p></div></div>
                <div className="bg-white rounded-lg shadow p-6"><div><p className="text-gray-600 text-sm font-medium">User</p><p className="text-3xl font-bold text-indigo-600 mt-2">{stats.userUsers}</p></div></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logbook' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Semua Logbook</h2>
              <a href="/api/logbook/export" download className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">📥 Export Excel</a>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Extensi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Lokasi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Dibuat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logbookEntries.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Belum ada data logbook</td></tr>
                    ) : (
                      logbookEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{entry.extensi}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{entry.nama}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{entry.lokasi}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${entry.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {entry.status === 'completed' ? '✅ Selesai' : '📝 Draft'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(entry.created_at).toLocaleDateString('id-ID')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Manajemen Users</h2>
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <span>➕</span> Tambah User
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Info User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{u.username}</span>
                            <span className="text-sm text-gray-500">{u.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleChangeRole(u.id, u.role)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                              : 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                              }`}
                          >
                            {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleUpdateStatus(u.id, u.is_active)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${u.is_active
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                              }`}
                          >
                            {u.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setIsResetPasswordModalOpen(true);
                            }}
                            className="text-orange-600 hover:text-orange-800 font-medium"
                            title="Reset Password"
                          >
                            🔑 Reset Pass
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                            title="Hapus User"
                          >
                            🗑️ Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Tambah User Baru</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" required value={userFormData.username} onChange={e => setUserFormData({ ...userFormData, username: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" required value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" required value={userFormData.password} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset Password */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-4">Masukkan password baru untuk <strong>{selectedUser.username}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="password"
                placeholder="Password Baru"
                required
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => { setIsResetPasswordModalOpen(false); setSelectedUser(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

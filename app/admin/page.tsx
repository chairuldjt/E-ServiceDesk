'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { PageHeader, PremiumCard, PremiumButton, PremiumModal, PremiumInput, PremiumBadge } from '@/components/ui/PremiumComponents';

interface EServiceDeskEntry {
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

interface WebminUser {
  id: number;
  webmin_id: number;
  username: string;
  full_name: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  color: string;
  created_at: string;
}

interface Permission {
  menu_path: string;
  is_allowed: number;
}

const colorPresets = [
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { name: 'Amber', value: 'amber', class: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { name: 'Rose', value: 'rose', class: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { name: 'Slate', value: 'slate', class: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
];

function AdminContent() {
  const { user, isLoading: userLoading } = useAuth();
  const { showToast, confirm } = useUI();
  const router = useRouter();
  const [eservicedeskEntries, setEServiceDeskEntries] = useState<EServiceDeskEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'webmin' | 'roles'>('overview');

  const [webminUsers, setWebminUsers] = useState<WebminUser[]>([]);
  const [isWebminModalOpen, setIsWebminModalOpen] = useState(false);
  const [selectedWebminUser, setSelectedWebminUser] = useState<WebminUser | null>(null);
  const [webminFormData, setWebminFormData] = useState({ webmin_id: '', username: '', full_name: '' });

  const [roles, setRoles] = useState<Role[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({ name: '', description: '', color: 'indigo' });
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

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
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({ username: '', email: '', password: '', role: 'user', is_active: 1 });
  const [resetPassword, setResetPassword] = useState('');

  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
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
    if (user) fetchPermissions();
  }, [user]);

  useEffect(() => {
    if (userLoading) return;
    if (user && (user.role === 'admin' || permissions.includes('/admin'))) {
      fetchLogbook();
      fetchUsers();
      fetchWebminUsers();
      fetchRoles();
    } else if (user && permissions.length > 0 && !permissions.includes('/admin')) {
      router.push('/dashboard');
    } else if (!user && !userLoading) {
      router.push('/login');
    }
  }, [user, userLoading, permissions, router]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchLogbook = async () => {
    try {
      const response = await fetch('/api/eservicedesk');
      const data = await response.json();
      setEServiceDeskEntries(data.data);
      const total = data.data.length;
      const completed = data.data.filter((entry: EServiceDeskEntry) => entry.status === 'completed').length;
      const draft = data.data.filter((entry: EServiceDeskEntry) => entry.status === 'draft').length;
      setStats(prev => ({ ...prev, total, completed, draft }));
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Gagal memuat data', 'error');
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

  const fetchWebminUsers = async () => {
    try {
      const response = await fetch('/api/admin/webmin-users');
      if (response.ok) {
        const data = await response.json();
        setWebminUsers(data || []);
      } else {
        showToast('Gagal memuat webmin users', 'error');
      }
    } catch (error) {
      console.error('Error fetching webmin users:', error);
      showToast('Gagal memuat webmin users', 'error');
    }
  };

  const handleSaveWebminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedWebminUser;
    const url = isEdit ? `/api/admin/webmin-users/${selectedWebminUser.id}` : '/api/admin/webmin-users';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webminFormData)
      });
      if (res.ok) {
        showToast(`User Webmin berhasil ${isEdit ? 'diupdate' : 'dibuat'}`, 'success');
        setIsWebminModalOpen(false);
        setWebminFormData({ webmin_id: '', username: '', full_name: '' });
        setSelectedWebminUser(null);
        fetchWebminUsers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan user webmin', 'error');
      }
    } catch (error) {
      console.error(error); showToast('Terjadi kesalahan', 'error');
    }
  };

  const handleDeleteWebminUser = (id: number) => {
    confirm('Hapus Webmin User?', 'Yakin ingin menghapus user ini dari Webmin?', async () => {
      try {
        const res = await fetch(`/api/admin/webmin-users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('User Webmin dihapus', 'success');
          fetchWebminUsers();
        } else {
          showToast('Gagal menghapus user', 'error');
        }
      } catch (error) { console.error(error); showToast('Terjadi kesalahan', 'error'); }
    });
  };

  const openWebminModal = (user?: WebminUser) => {
    if (user) {
      setSelectedWebminUser(user);
      setWebminFormData({
        webmin_id: user.webmin_id.toString(),
        username: user.username || '',
        full_name: user.full_name
      });
    } else {
      setSelectedWebminUser(null);
      setWebminFormData({ webmin_id: '', username: '', full_name: '' });
    }
    setIsWebminModalOpen(true);
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
          setUserFormData({ username: '', email: '', password: '', role: 'user', is_active: 1 });
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

  const openEditUserModal = (u: User) => {
    setSelectedUser(u);
    setUserFormData({
      username: u.username,
      email: u.email,
      password: '', // Password empty by default
      role: u.role,
      is_active: u.is_active
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userFormData.username,
          email: userFormData.email,
          role: userFormData.role,
          is_active: userFormData.is_active
        })
      });

      if (res.ok) {
        showToast('User berhasil diperbarui', 'success');
        setIsEditUserModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memperbarui user', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Terjadi kesalahan', 'error');
    }
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

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncWebmin = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/admin/webmin-users/sync', {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        showToast(`Sync Selesai. +${data.added} data baru.`, 'success');
        fetchWebminUsers();
      } else {
        showToast(data.error || 'Gagal sinkronisasi', 'error');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      showToast('Gagal menghubungi server', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!selectedRole;
    const url = isEdit ? `/api/admin/roles/${selectedRole.id}` : '/api/admin/roles';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleFormData)
      });
      if (res.ok) {
        showToast(`Role berhasil ${isEdit ? 'diupdate' : 'dibuat'}`, 'success');
        setIsRoleModalOpen(false);
        setRoleFormData({ name: '', description: '', color: 'indigo' });
        setSelectedRole(null);
        fetchRoles();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan role', 'error');
      }
    } catch (error) {
      console.error(error); showToast('Terjadi kesalahan', 'error');
    }
  };

  const handleDeleteRole = (id: number) => {
    confirm('Hapus Role?', 'Yakin ingin menghapus role ini? User yang menggunakan role ini mungkin tidak bisa akses.', async () => {
      try {
        const res = await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Role dihapus', 'success');
          fetchRoles();
        } else {
          const err = await res.json();
          showToast(err.error || 'Gagal menghapus role', 'error');
        }
      } catch (error) { console.error(error); showToast('Terjadi kesalahan', 'error'); }
    });
  };

  const openPermissionModal = async (role: Role) => {
    setSelectedRole(role);
    try {
      const res = await fetch(`/api/admin/roles/${role.id}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setRolePermissions(data);
        setIsPermissionModalOpen(true);
      }
    } catch (error) {
      showToast('Gagal memuat permissions', 'error');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: rolePermissions })
      });
      if (res.ok) {
        showToast('Permissions berhasil disimpan', 'success');
        setIsPermissionModalOpen(false);
      } else {
        showToast('Gagal menyimpan permissions', 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan', 'error');
    }
  };

  const togglePermission = (path: string) => {
    setRolePermissions(prev => {
      const existing = prev.find(p => p.menu_path === path);
      if (existing) {
        return prev.map(p => p.menu_path === path ? { ...p, is_allowed: p.is_allowed ? 0 : 1 } : p);
      } else {
        return [...prev, { menu_path: path, is_allowed: 1 }];
      }
    });
  };

  const availableMenus = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Timeline', path: '/timeline' },
    { name: 'Logbook', path: '/eservicedesk' },
    { name: 'Monitoring', path: '/monitoring' },
    { name: 'Order', path: '/order' },
    { name: 'Notepad', path: '/notepad' },
    { name: 'Chatbot', path: '/chatbot' },
    { name: 'WhatsApp Bot', path: '/whatsapp' },
    { name: 'Telegram', path: '/telegram' },
    { name: 'Admin', path: '/admin' },
  ];

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
          <button
            onClick={() => setActiveTab('webmin')}
            className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl transition-all ${activeTab === 'webmin'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            🔌 Webmin Users
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl transition-all ${activeTab === 'roles'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            🛡️ Roles
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
                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all uppercase tracking-wider ${(() => {
                            const roleDef = roles.find(r => r.name === u.role);
                            const color = roleDef?.color || 'indigo';
                            const preset = colorPresets.find(p => p.value === color);
                            return preset ? preset.class : 'bg-slate-50 text-slate-700 border-slate-200';
                          })()}`}
                        >
                          {u.role === 'admin' ? '🔐 Admin' : u.role === 'super' ? '⚡ Super' : `👤 ${u.role}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all uppercase tracking-wider ${u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                        >
                          {u.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="text-blue-600 hover:text-blue-700 font-bold hover:bg-blue-50 px-2 py-1 rounded-lg transition"
                            title="Edit User"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setResetPassword('');
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

      {/* ... inside AdminContent ... */}
      {/* ... previous content or tabs ... */}

      {activeTab === 'webmin' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900">Manajemen Webmin Users</h2>
              <p className="text-sm font-bold text-slate-500">Kelola daftar user external dari database</p>
            </div>

            <div className="flex gap-3">
              <PremiumButton
                onClick={handleSyncWebmin}
                variant="secondary"
                disabled={isSyncing}
                className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 shadow-none border-2"
              >
                <span className={`text-lg ${isSyncing ? 'animate-spin' : ''}`}>🔄</span>
                {isSyncing ? 'Syncing...' : 'Fetch Update'}
              </PremiumButton>

              <PremiumButton onClick={() => openWebminModal()}>
                <span className="text-lg">➕</span> Tambah Webmin User
              </PremiumButton>
            </div>
          </div>

          <PremiumCard className="overflow-hidden">

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-gray-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Webmin ID</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Login (Username)</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Nama Lengkap</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webminUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm">{u.webmin_id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{u.username}</td>
                      <td className="px-6 py-4 text-slate-600">{u.full_name}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openWebminModal(u)}
                            className="text-orange-600 hover:text-orange-700 font-bold hover:bg-orange-50 px-2 py-1 rounded-lg transition"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteWebminUser(u.id)}
                            className="text-red-600 hover:text-red-700 font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition"
                            title="Hapus"
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

      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-900">Manajemen Role</h2>
              <p className="text-sm font-bold text-slate-500">Kelola role dan hak akses menu</p>
            </div>
            <PremiumButton onClick={() => {
              setSelectedRole(null);
              setRoleFormData({ name: '', description: '', color: 'indigo' });
              setIsRoleModalOpen(true);
            }}>
              <span className="text-lg">➕</span> Tambah Role
            </PremiumButton>
          </div>

          <PremiumCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-gray-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Nama Role</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Deskripsi</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colorPresets.find(p => p.value === r.color)?.dot || 'bg-slate-400'}`}></div>
                          <span className="font-black text-slate-900 uppercase tracking-wider">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{r.description}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openPermissionModal(r)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                            title="Manage Permissions"
                          >
                            🛡️ Permissions
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRole(r);
                              setRoleFormData({ name: r.name, description: r.description, color: r.color || 'indigo' });
                              setIsRoleModalOpen(true);
                            }}
                            className="text-orange-600 hover:text-orange-700 font-bold hover:bg-orange-50 px-2 py-1 rounded-lg transition"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          {r.name !== 'admin' && (
                            <button
                              onClick={() => handleDeleteRole(r.id)}
                              className="text-red-600 hover:text-red-700 font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition"
                              title="Hapus"
                            >
                              🗑️
                            </button>
                          )}
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
              {roles.map(r => (
                <option key={r.id} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
              ))}
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

      {/* MODAL: Webmin User */}
      <PremiumModal
        isOpen={isWebminModalOpen}
        onClose={() => setIsWebminModalOpen(false)}
        title={selectedWebminUser ? "Edit Webmin User" : "Tambah Webmin User"}
        size="sm"
      >
        <form onSubmit={handleSaveWebminUser} className="space-y-4">
          <PremiumInput
            label="Webmin ID (ID External)"
            type="number"
            required
            value={webminFormData.webmin_id}
            onChange={e => setWebminFormData({ ...webminFormData, webmin_id: e.target.value })}
            placeholder="Contoh: 123"
          />
          <PremiumInput
            label="Username (Login)"
            type="text"
            required
            value={webminFormData.username}
            onChange={e => setWebminFormData({ ...webminFormData, username: e.target.value })}
            placeholder="Contoh: windydwi"
          />
          <PremiumInput
            label="Nama Lengkap"
            type="text"
            required
            value={webminFormData.full_name}
            onChange={e => setWebminFormData({ ...webminFormData, full_name: e.target.value })}
            placeholder="Contoh: Windy Dwi"
          />
          <div className="flex justify-end gap-3 pt-4">
            <PremiumButton type="button" variant="secondary" onClick={() => setIsWebminModalOpen(false)}>
              Batal
            </PremiumButton>
            <PremiumButton type="submit">
              💾 Simpan
            </PremiumButton>
          </div>
        </form>
      </PremiumModal>

      {/* MODAL: Edit User */}
      <PremiumModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        size="sm"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
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
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Role</label>
            <select
              value={userFormData.role}
              onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
            >
              {roles.map(r => (
                <option key={r.id} value={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserFormData({ ...userFormData, is_active: 1 })}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-2 ${userFormData.is_active === 1
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                  }`}
              >
                ✅ Aktif
              </button>
              <button
                type="button"
                onClick={() => setUserFormData({ ...userFormData, is_active: 0 })}
                className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-2 ${userFormData.is_active === 0
                  ? 'bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-500/10'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                  }`}
              >
                ❌ Nonaktif
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <PremiumButton type="button" variant="secondary" onClick={() => {
              setIsEditUserModalOpen(false);
              setSelectedUser(null);
            }}>
              Batal
            </PremiumButton>
            <PremiumButton type="submit">
              💾 Update User
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
      {/* MODAL: Role */}
      <PremiumModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={selectedRole ? "Edit Role" : "Tambah Role Baru"}
        size="sm"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <PremiumInput
            label="Nama Role"
            type="text"
            required
            value={roleFormData.name}
            onChange={e => setRoleFormData({ ...roleFormData, name: e.target.value.toLowerCase() })}
            placeholder="contoh: teknisi"
          />
          <PremiumInput
            label="Deskripsi"
            type="text"
            value={roleFormData.description}
            onChange={e => setRoleFormData({ ...roleFormData, description: e.target.value })}
            placeholder="Deskripsi singkat role ini"
          />
          <div>
            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Design Status (Warna)</label>
            <div className="grid grid-cols-4 gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setRoleFormData({ ...roleFormData, color: preset.value })}
                  className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${roleFormData.color === preset.value
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full mb-1 ${preset.dot}`}></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <PremiumButton type="button" variant="secondary" onClick={() => setIsRoleModalOpen(false)}>
              Batal
            </PremiumButton>
            <PremiumButton type="submit">
              💾 Simpan
            </PremiumButton>
          </div>
        </form>
      </PremiumModal>

      {/* MODAL: Permissions */}
      <PremiumModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        title={`Permissions: ${selectedRole?.name.toUpperCase()}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm font-bold text-slate-500 px-1">Pilih menu yang dapat diakses oleh role ini:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableMenus.map((menu) => {
              const row = rolePermissions.find(p => p.menu_path === menu.path);
              const isAllowed = row ? row.is_allowed === 1 : false;
              return (
                <button
                  key={menu.path}
                  onClick={() => togglePermission(menu.path)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isAllowed
                    ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-100'
                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-black text-sm">{menu.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">{menu.path}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isAllowed ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-slate-300'
                    }`}>
                    {isAllowed && <span className="text-xs">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <PremiumButton variant="secondary" onClick={() => setIsPermissionModalOpen(false)}>
              Batal
            </PremiumButton>
            <PremiumButton onClick={handleSavePermissions}>
              💾 Simpan Permissions
            </PremiumButton>
          </div>
        </div>
      </PremiumModal>
    </div>
  );
}

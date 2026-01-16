'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';

interface LogbookEntry {
  id: number;
  extensi: string;
  nama: string;
  lokasi: string;
  status: string;
  created_at: string;
}

interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  updated_at: string;
}

const NOTE_COLORS = [
  { name: 'white', value: 'bg-white', border: 'border-gray-200' },
  { name: 'yellow', value: 'bg-yellow-100', border: 'border-yellow-200' },
  { name: 'green', value: 'bg-green-100', border: 'border-green-200' },
  { name: 'blue', value: 'bg-blue-100', border: 'border-blue-200' },
  { name: 'red', value: 'bg-red-100', border: 'border-red-200' },
  { name: 'purple', value: 'bg-purple-100', border: 'border-purple-200' },
];

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, draft: 0 });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Logbooks
        const logbookRes = await fetch('/api/logbook');
        const logbookData = await logbookRes.json();
        setLogbookEntries(logbookData.data || []);

        const total = logbookData.data?.length || 0;
        const completed = logbookData.data?.filter((entry: LogbookEntry) => entry.status === 'completed').length || 0;
        const draft = logbookData.data?.filter((entry: LogbookEntry) => entry.status === 'draft').length || 0;

        setStats({ total, completed, draft });

        // Fetch Notes
        const notesRes = await fetch('/api/notes');
        const notesData = await notesRes.json();
        setNotes(notesData.data || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleExportCDR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    setExportError('');

    try {
      const response = await axios.post('/api/cdr/export', {
        username: user?.username,
        password: exportPassword,
      }, {
        responseType: 'blob'
      });

      // Create a link to download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Format: CDRReport-2026Jan16.064931-[namauser].csv
      const now = new Date();
      const year = now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[now.getMonth()];
      const day = String(now.getDate()).padStart(2, '0');
      const time = now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

      const fileName = `CDRReport-${year}${month}${day}.${time}-${user?.username}.csv`;

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setIsExportModalOpen(false);
      setExportPassword('');
    } catch (error: any) {
      console.error('Export error:', error);
      setExportError(error.response?.data?.error || 'Gagal mengekspor CDR. Pastikan password benar.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-200">
            👋
          </div>
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Selamat Datang, {user?.username}!
            </h1>
            <p className="text-slate-500 font-medium mt-1">Kelola logbook dan catatan Anda dengan mudah</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl hover:shadow-xl hover:shadow-emerald-200 transition-all font-bold flex items-center gap-2 active:scale-95"
          >
            <span className="text-lg">📊</span> Export CDR
          </button>
          <Link
            href="/logbook/create"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl hover:shadow-xl hover:shadow-blue-200 transition-all font-bold flex items-center gap-2 active:scale-95"
          >
            <span className="text-lg">➕</span> Tambah Logbook
          </Link>
        </div>
      </div>

      {/* Export CDR Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
              <h3 className="text-2xl font-black flex items-center gap-3">
                📊 Konfirmasi Export CDR
              </h3>
              <p className="text-emerald-100 text-sm mt-2">
                Masukkan password akun <strong>{user?.username}</strong> Anda untuk mengakses data CDR.
              </p>
            </div>
            <form onSubmit={handleExportCDR} className="p-8 space-y-6">
              {exportError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-medium">
                  ⚠️ {exportError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-medium"
                  placeholder="Masukkan password Anda"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExportModalOpen(false);
                    setExportError('');
                    setExportPassword('');
                  }}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isExporting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl hover:shadow-xl hover:shadow-emerald-200 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memproses...
                    </>
                  ) : (
                    'Export Sekarang'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] p-8 border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-black uppercase tracking-widest mb-2">Total Logbook</p>
              <p className="text-5xl font-black text-blue-700">{stats.total}</p>
            </div>
            <div className="text-6xl group-hover:scale-110 transform duration-300">📚</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] p-8 border-2 border-emerald-100 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-sm font-black uppercase tracking-widest mb-2">Selesai</p>
              <p className="text-5xl font-black text-emerald-700">{stats.completed}</p>
            </div>
            <div className="text-6xl group-hover:scale-110 transform duration-300">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-[2rem] p-8 border-2 border-amber-100 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-600 text-sm font-black uppercase tracking-widest mb-2">Draft</p>
              <p className="text-5xl font-black text-amber-700">{stats.draft}</p>
            </div>
            <div className="text-6xl group-hover:scale-110 transform duration-300">📝</div>
          </div>
        </div>
      </div>

      {/* Recent Logbook */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <span className="text-2xl">📚</span> Logbook Terbaru
          </h2>
          <Link
            href="/logbook"
            className="text-blue-600 hover:text-blue-700 font-black text-sm flex items-center gap-2 hover:gap-3 transition-all"
          >
            Lihat Semua <span>→</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Extensi
                </th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nama
                </th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Lokasi
                </th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Dibuat
                </th>
                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logbookEntries.slice(0, 5).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl">
                        📭
                      </div>
                      <p className="text-slate-400 font-medium">Belum ada data logbook</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logbookEntries.slice(0, 5).map((entry) => (
                  <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg text-sm border border-slate-200">
                        {entry.extensi}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{entry.nama}</td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-600">{entry.lokasi}</td>
                    <td className="px-8 py-5">
                      <span
                        className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest font-black border-2 ${entry.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                      >
                        {entry.status === 'completed' ? 'Selesai' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-500">
                      {new Date(entry.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-8 py-5">
                      <Link
                        href={`/logbook/${entry.id}`}
                        className="text-blue-600 hover:text-blue-700 font-black text-sm hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Notepad */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <span className="text-2xl">📝</span> Catatan Terbaru
          </h2>
          <Link
            href="/notepad"
            className="text-blue-600 hover:text-blue-700 font-black text-sm flex items-center gap-2 hover:gap-3 transition-all"
          >
            Lihat Semua <span>→</span>
          </Link>
        </div>

        <div className="p-8">
          {notes.slice(0, 4).length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm">
                  📝
                </div>
                <p className="text-slate-400 font-medium">Belum ada catatan</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {notes.slice(0, 4).map((note) => {
                const colorObj = NOTE_COLORS.find((c) => c.name === note.color) || NOTE_COLORS[0];
                return (
                  <Link
                    key={note.id}
                    href="/notepad"
                    className={`${colorObj.value} border-2 ${colorObj.border} rounded-2xl p-6 shadow-md hover:shadow-xl transition-all group flex flex-col h-full hover:scale-105 transform duration-200`}
                  >
                    <h3 className="font-black text-slate-900 mb-3 truncate text-base">
                      {note.title}
                    </h3>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap line-clamp-4 flex-1 mb-4 leading-relaxed">
                      {note.content}
                    </p>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-200/50 pt-3">
                      {new Date(note.updated_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-6">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            👋 Selamat datang, {user?.username}!
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition font-semibold flex items-center gap-2"
            >
              📊 Export CDR
            </button>
            <Link
              href="/logbook/create"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              ➕ Tambah Logbook
            </Link>
          </div>
        </div>

        {/* Export CDR Modal */}
        {isExportModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-emerald-600 p-6 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  📊 Konfirmasi Export CDR
                </h3>
                <p className="text-emerald-100 text-sm mt-1">
                  Masukkan password akun <strong>{user?.username}</strong> Anda untuk mengakses data CDR.
                </p>
              </div>
              <form onSubmit={handleExportCDR} className="p-6 space-y-4">
                {exportError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                    ⚠️ {exportError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isExporting}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Logbook</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
              </div>
              <div className="text-4xl">📚</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Selesai</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Draft</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.draft}</p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </div>
        </div>

        {/* Recent Logbook */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              📚 Logbook Terbaru
            </h2>
            <Link
              href="/logbook"
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Lihat Semua →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Extensi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Lokasi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Dibuat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logbookEntries.slice(0, 5).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 text-sm">
                      Belum ada data logbook
                    </td>
                  </tr>
                ) : (
                  logbookEntries.slice(0, 5).map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{entry.extensi}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{entry.nama}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{entry.lokasi}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${entry.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}
                        >
                          {entry.status === 'completed' ? 'Selesai' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/logbook/${entry.id}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Detail
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              📝 Catatan Terbaru
            </h2>
            <Link
              href="/notepad"
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Lihat Semua →
            </Link>
          </div>

          <div className="p-6">
            {notes.slice(0, 4).length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500 text-sm">Belum ada catatan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {notes.slice(0, 4).map((note) => {
                  const colorObj = NOTE_COLORS.find((c) => c.name === note.color) || NOTE_COLORS[0];
                  return (
                    <Link
                      key={note.id}
                      href="/notepad"
                      className={`${colorObj.value} border ${colorObj.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all group flex flex-col`}
                    >
                      <h3 className="font-bold text-gray-900 mb-2 truncate text-sm">
                        {note.title}
                      </h3>
                      <p className="text-gray-700 text-xs whitespace-pre-wrap line-clamp-3 flex-1 mb-3">
                        {note.content}
                      </p>
                      <div className="text-[10px] text-gray-400">
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
    </div>
  );
}

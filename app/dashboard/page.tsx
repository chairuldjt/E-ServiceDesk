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
  { name: 'white', value: 'bg-white', border: 'border-slate-200' },
  { name: 'yellow', value: 'bg-amber-50', border: 'border-amber-100' },
  { name: 'green', value: 'bg-emerald-50', border: 'border-emerald-100' },
  { name: 'blue', value: 'bg-blue-50', border: 'border-blue-100' },
  { name: 'red', value: 'bg-rose-50', border: 'border-rose-100' },
  { name: 'purple', value: 'bg-violet-50', border: 'border-violet-100' },
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
  const [exportUsername, setExportUsername] = useState('');
  const [exportPassword, setExportPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [piketData, setPiketData] = useState<{ serviceDesk: string; hariTanggal: string; jam: string } | null>(null);
  const [piketLoading, setPiketLoading] = useState(true);

  // Helper to strip HTML tags for preview
  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ' ');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const logbookRes = await fetch('/api/logbook');
        const logbookData = await logbookRes.json();
        setLogbookEntries(logbookData.data || []);

        const total = logbookData.data?.length || 0;
        const completed = logbookData.data?.filter((entry: LogbookEntry) => entry.status === 'completed').length || 0;
        const draft = logbookData.data?.filter((entry: LogbookEntry) => entry.status === 'draft').length || 0;

        setStats({ total, completed, draft });

        const notesRes = await fetch('/api/notes');
        const notesData = await notesRes.json();
        setNotes(notesData.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchPiket = async () => {
      try {
        const res = await fetch('/api/piket');
        if (res.ok) {
          const data = await res.json();
          setPiketData(data);
        }
      } catch (err) {
        console.error('Error fetching piket:', err);
      } finally {
        setPiketLoading(false);
      }
    };

    fetchDashboardData();
    fetchPiket();
  }, []);

  const handleExportCDR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    setExportError('');

    try {
      const response = await axios.post('/api/cdr/export', {
        username: exportUsername,
        password: exportPassword,
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const now = new Date();
      const year = now.getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[now.getMonth()];
      const day = String(now.getDate()).padStart(2, '0');
      const time = now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

      const fileName = `CDRReport-${year}${month}${day}.${time}-${exportUsername}.csv`;

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setIsExportModalOpen(false);
      setExportPassword('');
      setExportUsername('');

      setToastMessage('Data CDR berhasil diekspor dan diunduh!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      console.error('Export error:', error);
      setExportError(error.response?.data?.error || 'Gagal mengekspor CDR. Pastikan username dan password benar.');
    } finally {
      setIsExporting(false);
    }
  };


  const handleCopyLaporan = () => {
    if (!piketData) return;
    const text = `Laporan Jaga Service Desk
Hari / Tanggal : ${piketData.hariTanggal || '-'}
Jam : ${piketData.jam || '-'}

Petugas : ${piketData.serviceDesk || 'Unknown'}
Terima kasih`;

    navigator.clipboard.writeText(text);
    setToastMessage('Laporan berhasil disalin ke clipboard!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-200 animate-bounce duration-[3s]">
            ✨
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">
              Selamat Datang, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{user?.username}!</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px] font-black opacity-60">Internal Service Desk Hub</p>
          </div>
        </div>

        <div className="flex gap-3">
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
                📊 Export CDR Report
              </h3>
              <p className="text-emerald-100 text-sm mt-2">
                Masukkan kredensial Anda untuk mengakses data CDR.
              </p>
            </div>
            <form onSubmit={handleExportCDR} className="p-8 space-y-5">
              {exportError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-medium">
                  ⚠️ {exportError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={exportUsername}
                  onChange={(e) => setExportUsername(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-medium"
                  placeholder="Masukkan username"
                />
              </div>
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
                  placeholder="Masukkan password"
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

      {/* Laporan Jaga: Compact Version */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden border border-slate-700">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 flex-1">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-2xl border border-blue-500/30">
              📋
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2 justify-center md:justify-start">
                Laporan Jaga Service Desk
                <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[8px] px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </span>
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-1 text-xs font-medium text-slate-400">
                <p>Hari / Tanggal : <span className="text-white font-bold">{piketLoading ? '...' : (piketData?.hariTanggal || '-')}</span></p>
                <p>Jam : <span className="text-white font-bold">{piketLoading ? '...' : (piketData?.jam || '-')}</span></p>
                <p>Petugas : <span className="text-blue-400 font-bold uppercase">{piketLoading ? '...' : (piketData?.serviceDesk || '-')}</span></p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleCopyLaporan}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl border border-white/10 transition-all font-bold text-xs flex items-center gap-2 group active:scale-95"
            >
              <span className="group-hover:rotate-12 transition-transform">📄</span> Copy Text
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 hover:scale-105 transition-all font-black text-xs flex items-center gap-2 active:scale-95"
            >
              📊 Export CDR
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2.5rem] border bg-gradient-to-br from-blue-600 to-indigo-800 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group hover:scale-105 transition-all duration-300">
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white group-hover:opacity-40 transition-opacity"></div>
          <div className="flex flex-col items-center text-center relative z-10">
            <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">📚</span>
            <span className="text-6xl font-black mb-2 antialiased tabular-nums">{stats.total}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 opacity-80">Total Logbook</span>
            <div className="mt-4 w-8 h-1 bg-white/30 rounded-full"></div>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] border bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-2xl shadow-emerald-200 relative overflow-hidden group hover:scale-105 transition-all duration-300">
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white group-hover:opacity-40 transition-opacity"></div>
          <div className="flex flex-col items-center text-center relative z-10">
            <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">✅</span>
            <span className="text-6xl font-black mb-2 antialiased tabular-nums">{stats.completed}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 opacity-80">Selesai Dikerjakan</span>
            <div className="mt-4 w-8 h-1 bg-white/30 rounded-full"></div>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] border bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-2xl shadow-amber-200 relative overflow-hidden group hover:scale-105 transition-all duration-300">
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-20 bg-white group-hover:opacity-40 transition-opacity"></div>
          <div className="flex flex-col items-center text-center relative z-10">
            <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">📝</span>
            <span className="text-6xl font-black mb-2 antialiased tabular-nums">{stats.draft}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100 opacity-80">Masih Draft</span>
            <div className="mt-4 w-8 h-1 bg-white/30 rounded-full"></div>
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
                        className={`px-3 py-1.5 rounded-xl text-[9px] uppercase tracking-widest font-black border-2 ${entry.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            entry.status === 'pending_order' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                      >
                        {entry.status === 'draft' ? 'Draft' :
                          entry.status === 'pending_order' ? 'Belum Diorderkan' :
                            entry.status === 'ordered' ? 'Sudah Diorderkan' : 'Selesai'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-slate-500">
                      {new Date(entry.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/monitoring/verify?logbookId=${entry.id}`}
                          className="text-blue-600 hover:text-blue-800 font-black text-sm flex items-center gap-1 group/btn"
                        >
                          <span className="bg-blue-50 p-1.5 rounded-lg group-hover/btn:bg-blue-100 transition-colors">🛒</span>
                          Create Order
                        </Link>
                        <Link
                          href={`/logbook/${entry.id}`}
                          className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg transition-all"
                        >
                          Detail
                        </Link>
                      </div>
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
                    className={`${colorObj.value} border-2 ${colorObj.border} rounded-[2rem] p-6 shadow-md hover:shadow-xl transition-all group flex flex-col h-full hover:scale-105 transform duration-300`}
                  >
                    <h3 className="font-black text-slate-800 mb-3 truncate text-base">
                      {note.title}
                    </h3>
                    <p className="text-slate-600 text-sm whitespace-pre-wrap line-clamp-4 flex-1 mb-4 leading-relaxed">
                      {stripHtml(note.content)}
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
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
              ✅
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-widest">Success</p>
              <p className="text-emerald-50 text-xs font-bold">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="ml-4 text-white/60 hover:text-white text-xl"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
// import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';

interface LogbookEntry {
  id: number;
  extensi: string;
  nama: string;
  lokasi: string;
  status: string;
  catatan?: string;
  solusi?: string;
  penyelesaian?: string;
  created_at: string;
  updated_at: string;
}

export default function LogbookListPage() {
  return (
    <ProtectedRoute>
      <LogbookListContent />
    </ProtectedRoute>
  );
}

function LogbookListContent() {
  const { showToast, confirm } = useUI();
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);
  const [formData, setFormData] = useState({
    extensi: '',
    nama: '',
    lokasi: '',
    catatan: '',
    solusi: '',
    penyelesaian: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchLogbook();
  }, []);

  const fetchLogbook = async () => {
    try {
      const response = await fetch('/api/logbook');
      const data = await response.json();
      setLogbookEntries(data.data);
    } catch (error) {
      console.error('Error fetching logbook:', error);
      showToast('Gagal mengambil data logbook', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    confirm('Hapus Logbook?', 'Apakah Anda yakin ingin menghapus data logbook ini?', async () => {
      try {
        const response = await fetch(`/api/logbook/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setLogbookEntries(logbookEntries.filter(entry => entry.id !== id));
          showToast('Logbook berhasil dihapus', 'success');
        } else {
          showToast('Gagal menghapus logbook', 'error');
        }
      } catch (error) {
        console.error('Error deleting logbook:', error);
        showToast('Terjadi kesalahan saat menghapus', 'error');
      }
    });
  };

  const handleEditClick = (entry: LogbookEntry) => {
    setEditingEntry(entry);
    setFormData({
      extensi: entry.extensi,
      nama: entry.nama,
      lokasi: entry.lokasi,
      catatan: entry.catatan || '',
      solusi: entry.solusi || '',
      penyelesaian: entry.penyelesaian || '',
      status: entry.status
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    try {
      const response = await fetch(`/api/logbook/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedEntry = (await response.json()).data;
        setLogbookEntries(logbookEntries.map(entry => entry.id === editingEntry.id ? updatedEntry : entry));
        setIsEditModalOpen(false);
        setEditingEntry(null);
        showToast('Logbook berhasil diupdate', 'success');
      } else {
        showToast('Gagal update logbook', 'error');
      }
    } catch (error) {
      console.error('Error updating logbook:', error);
      showToast('Terjadi kesalahan saat update', 'error');
    }
  };

  const toggleStatus = (entry: LogbookEntry) => {
    const newStatus = entry.status === 'completed' ? 'draft' : 'completed';
    const action = newStatus === 'completed' ? 'Selesaikan' : 'Batalkan selesai';

    confirm(`${action} Logbook?`, `Apakah Anda yakin ingin mengubah status menjadi ${newStatus}?`, async () => {
      try {
        const response = await fetch(`/api/logbook/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...entry, status: newStatus }),
        });

        if (response.ok) {
          const updatedEntry = (await response.json()).data;
          setLogbookEntries(logbookEntries.map(e => e.id === entry.id ? updatedEntry : e));
          showToast(`Status berhasil diubah ke ${newStatus}`, 'success');
        } else {
          showToast('Gagal mengubah status', 'error');
        }
      } catch (error) {
        console.error('Error updating status:', error);
        showToast('Terjadi kesalahan saat mengubah status', 'error');
      }
    });
  };


  const filteredEntries = logbookEntries.filter((entry) => {
    const matchSearch =
      entry.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.extensi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.lokasi.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || entry.status === statusFilter;

    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            📚 Daftar Logbook
          </h1>
          <Link
            href="/logbook/create"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            ➕ Tambah Logbook
          </Link>
        </div>

        {/* Filter and Search */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Cari nama, extensi, atau lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="completed">Selesai</option>
            </select>
          </div>
        </div>

        {/* Logbook Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Extensi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Lokasi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Dibuat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Tidak ada data logbook
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{entry.extensi}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{entry.nama}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{entry.lokasi}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => toggleStatus(entry)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 ${entry.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}
                          title={entry.status === 'completed' ? 'Klik untuk ubah ke Draft' : 'Klik untuk ubah ke Selesai'}
                        >
                          {entry.status === 'completed' ? '✅ Selesai' : '📝 Draft'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2 flex">
                        <button
                          onClick={() => handleEditClick(entry)}
                          className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-6">
          <a
            href="/api/logbook/export"
            download
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold inline-block"
          >
            📥 Export ke Excel
          </a>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Edit Logbook
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Extensi</label>
                  <input type="text" required value={formData.extensi} onChange={e => setFormData({ ...formData, extensi: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lokasi</label>
                  <input type="text" required value={formData.lokasi} onChange={e => setFormData({ ...formData, lokasi: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                <input type="text" required value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Catatan/Keluhan</label>
                <textarea required rows={3} value={formData.catatan} onChange={e => setFormData({ ...formData, catatan: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Solusi</label>
                <textarea rows={3} value={formData.solusi} onChange={e => setFormData({ ...formData, solusi: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Penyelesaian (Teknisi)</label>
                <input type="text" value={formData.penyelesaian} onChange={e => setFormData({ ...formData, penyelesaian: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="draft">Draft (Belum Selesai)</option>
                  <option value="completed">Completed (Selesai)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-sm">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { EXTERNAL_CATALOGS, EXTERNAL_USERS } from '@/lib/constants';

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

  // Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [orderFormData, setOrderFormData] = useState({
    service_catalog_id: '11',
    order_by: '33'
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Webmin Setting Modal State
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [webminConfig, setWebminConfig] = useState({
    user: '',
    pass: ''
  });
  const [isSavingSetting, setIsSavingSetting] = useState(false);

  useEffect(() => {
    fetchLogbook();
    fetchWebminConfig();
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

  const fetchWebminConfig = async () => {
    try {
      const response = await fetch('/api/settings/webmin');
      const data = await response.json();
      setWebminConfig({ user: data.user || '', pass: data.pass || '' });
    } catch (error) {
      console.error('Error fetching webmin config:', error);
    }
  };

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSetting(true);
    try {
      const response = await fetch('/api/settings/webmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webminConfig),
      });

      if (response.ok) {
        showToast('Setting Webmin berhasil disimpan', 'success');
        setIsSettingModalOpen(false);
      } else {
        showToast('Gagal menyimpan setting', 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan saat menyimpan', 'error');
    } finally {
      setIsSavingSetting(false);
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

  const handleOrderClick = (entry: LogbookEntry) => {
    setSelectedEntry(entry);
    setIsOrderModalOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    setIsSubmittingOrder(true);
    try {
      const response = await fetch('/api/monitoring/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catatan: selectedEntry.catatan || selectedEntry.nama,
          ext_phone: selectedEntry.extensi,
          location_desc: selectedEntry.lokasi,
          service_catalog_id: orderFormData.service_catalog_id,
          order_by: orderFormData.order_by
        }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Order berhasil dikirim ke system external', 'success');
        setIsOrderModalOpen(false);
      } else {
        showToast(`Gagal: ${result.error}`, 'error');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      showToast('Terjadi kesalahan saat mengirim order', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
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
          <div className="flex gap-2">
            <button
              onClick={() => setIsSettingModalOpen(true)}
              className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900 transition font-semibold flex items-center gap-2"
            >
              ⚙️ Setting Webmin
            </button>
            <Link
              href="/logbook/create"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              ➕ Tambah Logbook
            </Link>
          </div>
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
                          onClick={() => handleOrderClick(entry)}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                          title="Kirim ke Order System"
                        >
                          🛒 Order
                        </button>
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
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Webmin Setting Modal */}
      {isSettingModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">⚙️ Setting Koneksi Webmin</h2>
                <p className="text-slate-300 text-xs mt-1">Konfigurasi kredensial API eksternal</p>
              </div>
              <button onClick={() => setIsSettingModalOpen(false)} className="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSaveSetting} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Username Webmin</label>
                  <input
                    type="text"
                    required
                    value={webminConfig.user}
                    onChange={e => setWebminConfig({ ...webminConfig, user: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Password Webmin</label>
                  <input
                    type="password"
                    required
                    value={webminConfig.pass}
                    onChange={e => setWebminConfig({ ...webminConfig, pass: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSavingSetting}
                  className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingSetting ? 'Menyimpan...' : '💾 Simpan Konfigurasi'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingModalOpen(false)}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {isOrderModalOpen && selectedEntry && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">🚀 Buat Order Baru</h2>
                <p className="text-emerald-100 text-xs mt-1">Kirim data logbook ke system external</p>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-2">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Review Data Logbook</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Extensi</span>
                    <span className="font-semibold text-slate-700">{selectedEntry.extensi}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Lokasi</span>
                    <span className="font-semibold text-slate-700">{selectedEntry.lokasi}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase">Catatan</span>
                    <span className="font-semibold text-slate-700 line-clamp-2">{selectedEntry.catatan || selectedEntry.nama}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    📁 Service Catalog
                  </label>
                  <select
                    value={orderFormData.service_catalog_id}
                    onChange={e => setOrderFormData({ ...orderFormData, service_catalog_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  >
                    {EXTERNAL_CATALOGS.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    👤 Order By (User)
                  </label>
                  <select
                    value={orderFormData.order_by}
                    onChange={e => setOrderFormData({ ...orderFormData, order_by: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  >
                    {EXTERNAL_USERS.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} (ID: {u.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingOrder ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sedang Mengirim...
                    </>
                  ) : (
                    'Konfirmasi & Kirim Order'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

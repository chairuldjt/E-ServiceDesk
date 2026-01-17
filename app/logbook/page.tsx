'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { EXTERNAL_CATALOGS, EXTERNAL_USERS } from '@/lib/constants';
import { PageHeader, PremiumCard, PremiumButton, PremiumModal, PremiumInput, PremiumTextarea, PremiumBadge, SearchBar } from '@/components/ui/PremiumComponents';

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
    service_catalog_id: '11'
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);


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
          service_catalog_id: orderFormData.service_catalog_id
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
    <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      <PageHeader
        icon="📚"
        title="Logbook"
        subtitle="Kelola catatan pekerjaan dan service"
        actions={
          <div className="flex gap-3">
            <Link href="/logbook/create">
              <PremiumButton>
                <span className="text-lg">➕</span> Tambah Logbook
              </PremiumButton>
            </Link>
          </div>
        }
      />

      {/* Filter and Search */}
      <PremiumCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Cari nama, extensi, atau lokasi..."
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3.5 px-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="completed">Selesai</option>
            </select>
          </div>
        </div>
      </PremiumCard>

      {/* Logbook Table */}
      <PremiumCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-gray-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">No</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Extensi</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Lokasi</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Dibuat</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-3">
                        📚
                      </div>
                      <p className="text-slate-400 font-medium">Tidak ada data logbook</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{entry.extensi}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{entry.nama}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{entry.lokasi}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => toggleStatus(entry)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 border-2 ${entry.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        title={entry.status === 'completed' ? 'Klik untuk ubah ke Draft' : 'Klik untuk ubah ke Selesai'}
                      >
                        {entry.status === 'completed' ? '✅ Selesai' : '📝 Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {new Date(entry.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOrderClick(entry)}
                          className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition"
                          title="Kirim ke Order System"
                        >
                          🛒 Order
                        </button>
                        <button
                          onClick={() => handleEditClick(entry)}
                          className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                          title="Edit"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                          title="Hapus"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {/* Export Button */}
      <div>
        <a
          href="/api/logbook/export"
          download
          className="inline-block"
        >
          <PremiumButton variant="success">
            <span className="text-lg">📥</span> Export ke Excel
          </PremiumButton>
        </a>
      </div>

      {/* Edit Modal */}
      <PremiumModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Logbook"
        size="lg"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PremiumInput
              label="Extensi"
              type="text"
              required
              value={formData.extensi}
              onChange={e => setFormData({ ...formData, extensi: e.target.value })}
            />
            <PremiumInput
              label="Lokasi"
              type="text"
              required
              value={formData.lokasi}
              onChange={e => setFormData({ ...formData, lokasi: e.target.value })}
            />
          </div>

          <PremiumInput
            label="Nama Lengkap"
            type="text"
            required
            value={formData.nama}
            onChange={e => setFormData({ ...formData, nama: e.target.value })}
          />

          <PremiumTextarea
            label="Catatan/Keluhan"
            required
            rows={3}
            value={formData.catatan}
            onChange={e => setFormData({ ...formData, catatan: e.target.value })}
          />

          <PremiumTextarea
            label="Solusi"
            rows={3}
            value={formData.solusi}
            onChange={e => setFormData({ ...formData, solusi: e.target.value })}
          />

          <PremiumInput
            label="Penyelesaian (Teknisi)"
            type="text"
            value={formData.penyelesaian}
            onChange={e => setFormData({ ...formData, penyelesaian: e.target.value })}
          />

          <div>
            <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
            >
              <option value="draft">Draft (Belum Selesai)</option>
              <option value="completed">Completed (Selesai)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <PremiumButton type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Batal
            </PremiumButton>
            <PremiumButton type="submit">
              💾 Simpan Perubahan
            </PremiumButton>
          </div>
        </form>
      </PremiumModal>


      {/* Order Modal */}
      <PremiumModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="🚀 Buat Order Baru"
        size="sm"
      >
        {selectedEntry && (
          <form onSubmit={handleCreateOrder} className="space-y-5">
            <p className="text-emerald-600 text-sm font-bold">Kirim data logbook ke system external</p>

            <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 space-y-3">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Review Data Logbook</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Extensi</span>
                  <span className="font-bold text-slate-700">{selectedEntry.extensi}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Lokasi</span>
                  <span className="font-bold text-slate-700">{selectedEntry.lokasi}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Catatan</span>
                  <span className="font-bold text-slate-700 line-clamp-2">{selectedEntry.catatan || selectedEntry.nama}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2 uppercase tracking-wider">
                📁 Service Catalog
              </label>
              <select
                value={orderFormData.service_catalog_id}
                onChange={e => setOrderFormData({ ...orderFormData, service_catalog_id: e.target.value })}
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all font-medium"
              >
                {EXTERNAL_CATALOGS.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <PremiumButton
                type="submit"
                variant="success"
                disabled={isSubmittingOrder}
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
              </PremiumButton>
              <PremiumButton
                type="button"
                variant="secondary"
                onClick={() => setIsOrderModalOpen(false)}
              >
                Batal
              </PremiumButton>
            </div>
          </form>
        )}
      </PremiumModal>
    </div>
  );
}

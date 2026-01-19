'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { EXTERNAL_CATALOGS, EXTERNAL_USERS } from '@/lib/constants';
import { PageHeader, PremiumCard, PremiumButton, PremiumModal, PremiumInput, PremiumTextarea, PremiumBadge, SearchBar, CustomDropdown } from '@/components/ui/PremiumComponents';

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ordered':
      return { label: 'Sudah Diorderkan', variant: 'emerald' as const };
    case 'pending_order':
    case 'draft':
    default:
      return { label: 'Belum Diorderkan', variant: 'blue' as const };
  }
};

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [orderFormData, setOrderFormData] = useState({
    service_catalog_id: '11'
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkOrderModalOpen, setIsBulkOrderModalOpen] = useState(false);
  const [bulkOrderData, setBulkOrderData] = useState<{ [key: number]: string }>({});
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);


  useEffect(() => {
    fetchLogbook(selectedDate);
  }, [selectedDate]);

  const fetchLogbook = async (date?: string) => {
    try {
      setLoading(true);
      let url = '/api/logbook';
      if (date) url += `?date=${date}`;
      const response = await fetch(url);
      const data = await response.json();
      setLogbookEntries(data.data);
    } catch (error) {
      console.error('Error fetching logbook:', error);
      showToast('Gagal mengambil data order', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = (id: number) => {
    confirm('Hapus Order?', 'Apakah Anda yakin ingin menghapus data order ini?', async () => {
      try {
        const response = await fetch(`/api/logbook/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setLogbookEntries(logbookEntries.filter(entry => entry.id !== id));
          showToast('Order berhasil dihapus', 'success');
        } else {
          showToast('Gagal menghapus order', 'error');
        }
      } catch (error) {
        console.error('Error deleting logbook:', error);
        showToast('Terjadi kesalahan saat menghapus', 'error');
      }
    });
  };

  const toggleStatus = (entry: LogbookEntry) => {
    const newStatus = entry.status === 'ordered' ? 'pending_order' : 'ordered';

    confirm(`Ubah Status?`, `Ubah status order ke ${getStatusBadge(newStatus).label}?`, async () => {
      try {
        const response = await fetch(`/api/logbook/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...entry,
            status: newStatus,
            nama: entry.lokasi
          }),
        });

        if (response.ok) {
          const updatedEntry = (await response.json()).data;
          setLogbookEntries(logbookEntries.map(e => e.id === entry.id ? updatedEntry : e));
          showToast(`Status berhasil diubah`, 'success');
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
          logbookId: selectedEntry.id
        }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Order berhasil dikirim dan status order diupdate', 'success');
        setIsOrderModalOpen(false);
        fetchLogbook(selectedDate);
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

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map(e => e.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleOpenBulkModal = () => {
    if (selectedIds.length === 0) {
      showToast('Pilih minimal satu order', 'error');
      return;
    }
    // Initialize bulkOrderData with default catalog (11)
    const initialBulkData: { [key: number]: string } = {};
    selectedIds.forEach(id => {
      initialBulkData[id] = '11';
    });
    setBulkOrderData(initialBulkData);
    setIsBulkOrderModalOpen(true);
  };

  const handleBulkOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBulk(true);
    let successCount = 0;
    let failCount = 0;

    const selectedEntries = logbookEntries.filter(e => selectedIds.includes(e.id));

    for (const entry of selectedEntries) {
      try {
        const response = await fetch('/api/monitoring/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catatan: entry.catatan || entry.nama,
            ext_phone: entry.extensi,
            location_desc: entry.lokasi,
            service_catalog_id: bulkOrderData[entry.id],
            logbookId: entry.id
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }

        // Add 500ms delay to be safe for external server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error bulk order for ID ${entry.id}:`, error);
        failCount++;
      }
    }

    showToast(`${successCount} order berhasil dikirim, ${failCount} gagal`, successCount > 0 ? 'success' : 'error');
    setIsBulkOrderModalOpen(false);
    setSelectedIds([]);
    fetchLogbook(selectedDate);
    setIsSubmittingBulk(false);
  };

  const filteredEntries = logbookEntries.filter((entry) => {
    const matchSearch =
      (entry.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.extensi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.lokasi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.catatan || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'all' || entry.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const currentItems = filteredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6 animate-in fade-in duration-700">
      <PageHeader
        icon="📚"
        title="Create Order"
        subtitle="Kelola catatan pekerjaan dan service desk"
        actions={
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-xl border-2 border-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all shadow-sm font-bold text-slate-700"
            />
            <PremiumButton
              variant="secondary"
              onClick={() => fetchLogbook(selectedDate)}
            >
              <span className="text-lg">🔄</span> Refresh
            </PremiumButton>
            <PremiumButton
              variant="secondary"
              onClick={() => window.open(`/api/order/export-laporan?date=${selectedDate}`, '_blank')}
            >
              <span className="text-lg">📂</span> Export Laporan Jaga
            </PremiumButton>
            <Link href="/logbook/create">
              <PremiumButton>
                <span className="text-lg">➕</span> Tambah Order
              </PremiumButton>
            </Link>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
        <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchBar
            value={searchTerm}
            onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            placeholder="Cari extensi, lokasi, atau catatan..."
          />
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'pending_order', label: 'Belum Diorderkan' },
              { value: 'ordered', label: 'Sudah Diorderkan' },
            ]}
          />
        </div>

        <div className="w-full md:w-auto">
          <PremiumButton
            onClick={handleOpenBulkModal}
            disabled={selectedIds.length === 0}
            variant="success"
            className="w-full md:w-auto px-10 py-4 shadow-xl shadow-emerald-100 uppercase tracking-widest text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Create Multiple Order ({selectedIds.length})
          </PremiumButton>
        </div>
      </div>

      {/* Logbook Table */}
      <PremiumCard className="overflow-hidden border-none shadow-2xl shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-5 text-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                    checked={selectedIds.length === filteredEntries.length && filteredEntries.length > 0}
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ext</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-[18%]">Nama / Lokasi</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-[28%]">Catatan</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-4">📚</div>
                      <p className="text-slate-400 font-bold">Data order tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((entry, index) => {
                  const statusInfo = getStatusBadge(entry.status);
                  const entryIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={entry.id} className={`hover:bg-blue-50/30 transition-colors ${selectedIds.includes(entry.id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-6 py-6 text-center">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => handleToggleSelect(entry.id)}
                        />
                      </td>
                      <td className="px-6 py-6 font-bold text-slate-300 text-center">{entryIndex}</td>
                      <td className="px-6 py-6 font-black text-slate-800 text-center">{entry.extensi}</td>
                      <td className="px-6 py-6 text-center">
                        <p className="font-bold text-slate-800 break-words leading-tight">{entry.lokasi}</p>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <p className="text-slate-500 text-xs italic line-clamp-2 leading-relaxed max-w-xs mx-auto" title={entry.catatan}>
                          {entry.catatan || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <button
                          onClick={() => toggleStatus(entry)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border-2 w-full max-w-[150px] mx-auto text-center ${entry.status === 'ordered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                        >
                          {statusInfo.label}
                        </button>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOrderClick(entry)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${entry.status === 'ordered'
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                              }`}
                            disabled={entry.status === 'ordered'}
                          >
                            <span>🚀</span>
                            <span className="hidden xl:inline">Order</span>
                          </button>

                          <Link
                            href={`/logbook/${entry.id}`}
                            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 text-[9px] font-black uppercase tracking-widest"
                          >
                            <span>✏️</span>
                            <span className="hidden xl:inline">Details</span>
                          </Link>

                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-xl hover:bg-red-100 transition text-[9px] font-black uppercase tracking-widest border border-red-100"
                          >
                            <span>🗑️</span>
                            <span className="hidden xl:inline">Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Halaman {currentPage} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Sebelumnya
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => goToPage(i + 1)}
                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-blue-200'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </PremiumCard>

      {/* Order Modal */}
      <PremiumModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="🚀 Create External Order"
        size="sm"
      >
        {selectedEntry && (
          <form onSubmit={handleCreateOrder} className="space-y-5">
            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border-2 border-emerald-100/50 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🚀</div>
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Eskalasi Job</p>
                  <p className="text-sm font-bold text-slate-800">Detail Pengiriman Order</p>
                </div>
              </div>
              <div className="space-y-3 pt-3 border-t border-emerald-100">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 font-bold uppercase tracking-tighter">Ext Phone</span>
                  <span className="font-black text-slate-800 tracking-tight">{selectedEntry.extensi}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 font-bold uppercase tracking-tighter">Lokasi</span>
                  <span className="font-black text-slate-800 text-right">{selectedEntry.lokasi}</span>
                </div>
              </div>
            </div>

            <CustomDropdown
              label="Pilih Service Catalog"
              value={orderFormData.service_catalog_id}
              onChange={val => setOrderFormData({ ...orderFormData, service_catalog_id: val })}
              options={EXTERNAL_CATALOGS.map(cat => ({
                value: cat.id.toString(),
                label: cat.name
              }))}
            />

            <div className="flex flex-col gap-3 pt-6">
              <PremiumButton
                type="submit"
                variant="success"
                disabled={isSubmittingOrder}
                className="py-5 shadow-2xl shadow-emerald-100 text-xs font-black tracking-widest uppercase"
              >
                {isSubmittingOrder ? 'Memproses...' : 'Konfirmasi & Kirim Sekarang'}
              </PremiumButton>
            </div>
          </form>
        )}
      </PremiumModal>

      {/* Bulk Order Modal */}
      <PremiumModal
        isOpen={isBulkOrderModalOpen}
        onClose={() => setIsBulkOrderModalOpen(false)}
        title="🚀 Create Multiple External Order"
        size="lg"
      >
        <form onSubmit={handleBulkOrderSubmit} className="space-y-6">
          <div className="max-h-[60vh] overflow-y-auto px-1 space-y-4">
            {logbookEntries
              .filter(e => selectedIds.includes(e.id))
              .map(entry => (
                <div key={entry.id} className="bg-emerald-50/50 p-6 rounded-[2rem] border-2 border-emerald-100/50 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🚀</div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Eskalasi Job</p>
                        <p className="text-sm font-bold text-slate-800">EXT {entry.extensi} - {entry.lokasi}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-emerald-100">
                    <div className="bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Catatan:</p>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed italic">{entry.catatan || '-'}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="block text-[10px] font-black text-emerald-600 label uppercase tracking-widest mb-2 px-1">
                          Service Catalog
                        </label>
                        <select
                          value={bulkOrderData[entry.id]}
                          onChange={(e) => setBulkOrderData({ ...bulkOrderData, [entry.id]: e.target.value })}
                          className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600 outline-none transition-all appearance-none"
                          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2310b981\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                        >
                          {EXTERNAL_CATALOGS.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <PremiumButton
              type="submit"
              variant="success"
              disabled={isSubmittingBulk}
              className="py-4 shadow-xl shadow-emerald-100 text-xs font-black tracking-widest uppercase"
            >
              {isSubmittingBulk ? 'Memproses Bulk Order...' : `Kirim ${selectedIds.length} Order Sekarang`}
            </PremiumButton>
            <button
              type="button"
              onClick={() => setIsBulkOrderModalOpen(false)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition py-2"
            >
              Batal
            </button>
          </div>
        </form>
      </PremiumModal>
    </div>
  );
}

'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { EXTERNAL_CATALOGS } from '@/lib/constants';
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

export default function EServiceDeskListPage() {
  return (
    <ProtectedRoute>
      <EServiceDeskListContent />
    </ProtectedRoute>
  );
}

function EServiceDeskListContent() {
  const { showToast, confirm } = useUI();
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [orderFormData, setOrderFormData] = useState({
    service_catalog_id: '11',
    technician_id: ''
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkOrderModalOpen, setIsBulkOrderModalOpen] = useState(false);
  const [bulkOrderData, setBulkOrderData] = useState<{ [key: number]: { service_catalog_id: string, technician_id: string } }>({});
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [externalOrders, setExternalOrders] = useState<any[]>([]);
  const [selectedExportOrderNos, setSelectedExportOrderNos] = useState<string[]>([]);
  const [isFetchingExternalOrders, setIsFetchingExternalOrders] = useState(false);


  useEffect(() => {
    fetchLogbook(selectedDate);
    fetchTechnicians();
  }, [selectedDate]);

  const fetchTechnicians = async () => {
    try {
      setLoadingTechnicians(true);
      const response = await fetch('/api/monitoring/assign-list?orderId=0');
      const data = await response.json();
      if (response.ok) {
        setTechnicians(data.result || []);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const changeDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    // Simple yyyy-mm-dd format in Jakarta time
    const newDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
    setSelectedDate(newDate);
  };

  const fetchLogbook = async (date?: string) => {
    try {
      setLoading(true);
      let url = '/api/eservicedesk';
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
        const response = await fetch(`/api/eservicedesk/${id}`, {
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

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    confirm('Hapus Semua Terpilih?', `Apakah Anda yakin ingin menghapus ${selectedIds.length} data yang dipilih?`, async () => {
      try {
        const response = await fetch('/api/eservicedesk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds }),
        });

        if (response.ok) {
          setLogbookEntries(logbookEntries.filter(entry => !selectedIds.includes(entry.id)));
          setSelectedIds([]);
          showToast('Data terpilih berhasil dihapus', 'success');
        } else {
          const result = await response.json();
          showToast(result.error || 'Gagal menghapus data bulk', 'error');
        }
      } catch (error) {
        console.error('Error deleting bulk logbook:', error);
        showToast('Terjadi kesalahan saat menghapus bulk', 'error');
      }
    });
  };

  const toggleStatus = (entry: LogbookEntry) => {
    const newStatus = entry.status === 'ordered' ? 'pending_order' : 'ordered';

    confirm(`Ubah Status?`, `Ubah status order ke ${getStatusBadge(newStatus).label}?`, async () => {
      try {
        const response = await fetch(`/api/eservicedesk/${entry.id}`, {
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
    setOrderFormData({
      service_catalog_id: '11',
      technician_id: ''
    });
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
        let msg = 'Order berhasil dikirim dan status order diupdate';

        // Handle delegation if technician is selected
        if (orderFormData.technician_id && result.id) {
          try {
            // High delay to ensure external DB is ready
            await new Promise(r => setTimeout(r, 1000));

            const tech = technicians.find(t => t.teknisi_id.toString() === orderFormData.technician_id);
            const assignRes = await fetch('/api/monitoring/assign-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: result.id,
                id: result.id,
                teknisi_id: orderFormData.technician_id,
                nama_lengkap: tech ? tech.nama_lengkap : 'Teknisi',
                assign_type_code: "1",
                assign_desc: "NEW",
                emoji_code: ":gear:"
              }),
            });
            if (assignRes.ok) {
              msg += ' & Teknisi berhasil didelegasikan';
            }
          } catch (err) {
            console.error('Auto assign failed:', err);
          }
        }

        showToast(msg, 'success');
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
    const initialBulkData: { [key: number]: { service_catalog_id: string, technician_id: string } } = {};
    selectedIds.forEach(id => {
      initialBulkData[id] = { service_catalog_id: '11', technician_id: '' };
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
        const itemData = bulkOrderData[entry.id];
        const response = await fetch('/api/monitoring/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catatan: entry.catatan || entry.nama,
            ext_phone: entry.extensi,
            location_desc: entry.lokasi,
            service_catalog_id: itemData.service_catalog_id,
            logbookId: entry.id
          }),
        });

        const result = await response.json();
        if (response.ok) {
          successCount++;

          // Handle delegation if technician is selected
          if (itemData.technician_id && result.id) {
            try {
              // High delay to ensure external DB is ready
              await new Promise(r => setTimeout(r, 1000));

              const tech = technicians.find(t => t.teknisi_id.toString() === itemData.technician_id);
              await fetch('/api/monitoring/assign-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id: result.id,
                  id: result.id,
                  teknisi_id: itemData.technician_id,
                  nama_lengkap: tech ? tech.nama_lengkap : 'Teknisi',
                  assign_type_code: "1",
                  assign_desc: "NEW",
                  emoji_code: ":gear:"
                }),
              });
            } catch (err) {
              console.error(`Auto assign failed for ID ${entry.id}:`, err);
            }
          }
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

  const handleOpenExportModal = async () => {
    setIsFetchingExternalOrders(true);
    setIsExportModalOpen(true);
    try {
      const response = await fetch(`/api/order/export-laporan?date=${selectedDate}&type=json`);
      const result = await response.json();
      if (response.ok) {
        setExternalOrders(result.data);
        // Default select all
        setSelectedExportOrderNos(result.data.map((o: any) => o.order_no));
      } else {
        showToast('Gagal mengambil data order eksternal', 'error');
        setIsExportModalOpen(false);
      }
    } catch (error) {
      console.error('Error fetching external orders:', error);
      showToast('Terjadi kesalahan saat mengambil data', 'error');
      setIsExportModalOpen(false);
    } finally {
      setIsFetchingExternalOrders(false);
    }
  };

  const handleDownloadExcel = () => {
    if (selectedExportOrderNos.length === 0) {
      showToast('Pilih minimal satu order untuk di-export', 'error');
      return;
    }
    const orderNos = selectedExportOrderNos.join(',');
    window.open(`/api/order/export-laporan?date=${selectedDate}&order_nos=${orderNos}`, '_blank');
    setIsExportModalOpen(false);
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
        subtitle="Kelola catatan pekerjaan dan internal hub"
        actions={
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <div className="flex items-center gap-1 bg-white rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden p-1 min-w-fit">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
                title="Hari Sebelumnya"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 outline-none font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer text-sm"
              />
              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
                title="Hari Berikutnya"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <PremiumButton
                variant="secondary"
                size="sm"
                onClick={() => fetchLogbook(selectedDate)}
                className="whitespace-nowrap"
              >
                <span className="text-base">🔄</span> Refresh
              </PremiumButton>
              <PremiumButton
                variant="secondary"
                size="sm"
                onClick={handleOpenExportModal}
                className="whitespace-nowrap"
              >
                <span className="text-base">📂</span> Export
              </PremiumButton>
              <Link href="/eservicedesk/create" className="w-full sm:w-auto">
                <PremiumButton size="sm" className="w-full sm:w-auto whitespace-nowrap">
                  <span className="text-base">➕</span> Tambah Order
                </PremiumButton>
              </Link>
            </div>
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

        <div className="w-full md:w-auto flex items-center gap-2">
          <PremiumButton
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            variant="danger"
            size="sm"
            className="flex-1 md:flex-none py-3 shadow-lg shadow-red-100 uppercase tracking-widest text-[10px] font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Hapus ({selectedIds.length})
          </PremiumButton>

          <PremiumButton
            onClick={handleOpenBulkModal}
            disabled={selectedIds.length === 0}
            variant="success"
            size="sm"
            className="flex-1 md:flex-none py-3 shadow-lg shadow-emerald-100 uppercase tracking-widest text-[10px] font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Bulk Order ({selectedIds.length})
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
                            href={`/eservicedesk/${entry.id}`}
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

            <CustomDropdown
              label="Delegasi Teknisi (Opsional)"
              value={orderFormData.technician_id}
              onChange={val => setOrderFormData({ ...orderFormData, technician_id: val })}
              options={[
                { value: '', label: '-- Pilih Teknisi (Opsional) --' },
                ...technicians.map(t => ({
                  value: t.teknisi_id.toString(),
                  label: t.nama_lengkap
                }))
              ]}
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
                      <div className="w-full">
                        <CustomDropdown
                          label="Service Catalog"
                          value={bulkOrderData[entry.id]?.service_catalog_id}
                          onChange={(val) => setBulkOrderData({
                            ...bulkOrderData,
                            [entry.id]: { ...bulkOrderData[entry.id], service_catalog_id: val }
                          })}
                          options={EXTERNAL_CATALOGS.map(cat => ({
                            value: cat.id.toString(),
                            label: cat.name
                          }))}
                          className="w-full"
                        />
                      </div>
                      <div className="w-full">
                        <CustomDropdown
                          label="Delegasi Teknisi"
                          value={bulkOrderData[entry.id]?.technician_id}
                          onChange={(val) => setBulkOrderData({
                            ...bulkOrderData,
                            [entry.id]: { ...bulkOrderData[entry.id], technician_id: val }
                          })}
                          options={[
                            { value: '', label: '-- Pilih Teknisi (Opsional) --' },
                            ...technicians.map(t => ({
                              value: t.teknisi_id.toString(),
                              label: t.nama_lengkap
                            }))
                          ]}
                          className="w-full"
                        />
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

      {/* Export Selection Modal */}
      <PremiumModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="📂 Pilih Order untuk Export"
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">📋</div>
              <div>
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Data Order</p>
                <p className="text-sm font-bold text-slate-800">
                  Tanggal: {(() => {
                    const now = new Date();
                    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                    const wib = new Date(utc + (3600000 * 7));
                    const currentWIBDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);

                    if (selectedDate === currentWIBDate && wib.getHours() < 7) {
                      const yesterday = new Date(wib);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const formatDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                      return `${formatDate(yesterday)} - Sekarang`;
                    }

                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                  })()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest italic">{externalOrders.length} Order ditemukan</p>
              <button
                onClick={() => {
                  if (selectedExportOrderNos.length === externalOrders.length) setSelectedExportOrderNos([]);
                  else setSelectedExportOrderNos(externalOrders.map(o => o.order_no));
                }}
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 underline transition uppercase tracking-tighter"
              >
                {selectedExportOrderNos.length === externalOrders.length ? 'Batalkan Semua' : 'Pilih Semua'}
              </button>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto px-2 space-y-3 custom-scrollbar">
            {isFetchingExternalOrders ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-400 font-bold">Mengambil data order SIMRS...</p>
              </div>
            ) : externalOrders.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-400 font-bold">Tidak ada data order untuk tanggal ini</p>
              </div>
            ) : (
              externalOrders.map((order) => (
                <div
                  key={order.order_no}
                  onClick={() => {
                    setSelectedExportOrderNos(prev =>
                      prev.includes(order.order_no)
                        ? prev.filter(no => no !== order.order_no)
                        : [...prev, order.order_no]
                    );
                  }}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedExportOrderNos.includes(order.order_no)
                    ? 'bg-blue-50/80 border-blue-200 shadow-md shadow-blue-100'
                    : 'bg-slate-50 border-slate-100 opacity-70 hover:opacity-100'
                    }`}
                >
                  <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedExportOrderNos.includes(order.order_no)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-300'
                    }`}>
                    {selectedExportOrderNos.includes(order.order_no) && <span className="text-[10px]">✓</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight">#{order.order_no}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 uppercase tracking-widest">
                        {order.status_desc}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 mb-1 leading-tight">{order.catatan}</p>
                    <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold">
                      <span>📍 {order.location_desc}</span>
                      <span>📞 {order.ext_phone || '-'}</span>
                      <span>⏰ {order.create_date}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <PremiumButton
              onClick={handleDownloadExcel}
              disabled={isFetchingExternalOrders || selectedExportOrderNos.length === 0}
              variant="primary"
              className="py-4 shadow-xl shadow-blue-100 text-xs font-black tracking-widest uppercase"
            >
              🚀 Download Excel ({selectedExportOrderNos.length} Selected)
            </PremiumButton>
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition py-2"
            >
              Batal
            </button>
          </div>
        </div>
      </PremiumModal>
    </div>
  );
}

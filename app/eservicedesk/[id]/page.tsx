'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { EXTERNAL_CATALOGS } from '@/lib/constants';
import { PageHeader, PremiumCard, PremiumButton, PremiumInput, PremiumTextarea, PremiumBadge, PremiumModal } from '@/components/ui/PremiumComponents';

interface LogbookEntry {
  id: number;
  extensi: string;
  nama: string;
  lokasi: string;
  catatan: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'ordered':
      return { label: 'Sudah Diorderkan', variant: 'emerald' as const };
    case 'completed':
      return { label: 'Selesai', variant: 'emerald' as const };
    case 'pending_order':
    case 'draft':
    default:
      return { label: 'Belum Diorderkan', variant: 'blue' as const };
  }
};

export default function DetailLogbookPage() {
  return (
    <ProtectedRoute>
      <DetailLogbookContent />
    </ProtectedRoute>
  );
}

function DetailLogbookContent() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useUI();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [logbook, setLogbook] = useState<LogbookEntry | null>(null);

  // Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    service_catalog_id: '11'
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [formData, setFormData] = useState({
    extensi: '',
    lokasi: '',
    catatan: '',
    status: 'pending_order',
  });

  useEffect(() => {
    fetchLogbook();
  }, [id]);

  const fetchLogbook = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/eservicedesk/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal memuat data');
        return;
      }

      const entry = data.data;
      setLogbook(entry);
      setFormData({
        extensi: entry.extensi || '',
        lokasi: entry.lokasi || '',
        catatan: entry.catatan || '',
        status: entry.status || 'pending_order',
      });
    } catch (error) {
      setError('Terjadi kesalahan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/eservicedesk/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nama: formData.lokasi
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal menyimpan logbook');
        return;
      }

      setLogbook(data.data);
      setIsEditing(false);
      showToast('Data berhasil diperbarui', 'success');
    } catch (error) {
      setError('Terjadi kesalahan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logbook) return;

    setIsSubmittingOrder(true);
    try {
      const response = await fetch('/api/monitoring/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catatan: logbook.catatan || logbook.nama,
          ext_phone: logbook.extensi,
          location_desc: logbook.lokasi,
          service_catalog_id: orderFormData.service_catalog_id,
          logbookId: logbook.id
        }),
      });

      const result = await response.json();
      if (response.ok) {
        showToast('External Order berhasil dibuat', 'success');
        setIsOrderModalOpen(false);
        fetchLogbook(); // Refresh to show "Sudah Diorderkan"
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

  if (loading && !logbook) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      <PageHeader
        icon={isEditing ? '✏️' : '📋'}
        title={isEditing ? 'Edit Order' : 'Detail Order'}
        subtitle={isEditing ? 'Perbarui informasi catatan pekerjaan' : 'Informasi lengkap catatan order'}
        actions={
          <Link href="/eservicedesk">
            <PremiumButton variant="secondary" className="text-xs uppercase tracking-widest px-6">
              ← Kembali
            </PremiumButton>
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 font-bold">
            ⚠️ {error}
          </div>
        )}

        {logbook && (
          <PremiumCard className="p-10 border-none shadow-2xl shadow-slate-200/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b-2 border-slate-50 pb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  {isEditing ? 'Mode Pengeditan' : 'Informasi Pekerjaan'}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <PremiumBadge variant={getStatusDisplay(logbook.status).variant} size="md" className="font-black text-[10px] uppercase tracking-widest">
                    {getStatusDisplay(logbook.status).label}
                  </PremiumBadge>
                </div>
              </div>
            </div>

            {!isEditing ? (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Extensi</label>
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-transparent group-hover:border-blue-100 transition-all">
                      <p className="text-3xl text-slate-900 font-black tracking-tight">{logbook.extensi}</p>
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Lokasi / Personil</label>
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-transparent group-hover:border-blue-100 transition-all">
                      <p className="text-xl text-slate-800 font-black leading-tight">{logbook.lokasi}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="relative group">
                    <div className="absolute -left-2 top-0 bottom-0 w-1 bg-slate-200 rounded-full group-hover:bg-blue-400 transition-colors"></div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4">Catatan / Keluhan</label>
                    <p className="text-slate-700 px-4 font-medium leading-relaxed whitespace-pre-wrap">{logbook.catatan || '-'}</p>
                  </div>
                </div>

                <div className="pt-10 flex flex-col md:flex-row gap-4">
                  <PremiumButton onClick={() => setIsEditing(true)} className="flex-1 py-5 text-sm font-black tracking-widest shadow-xl shadow-blue-100 uppercase">
                    ✏️ Edit Order
                  </PremiumButton>
                  {logbook.status !== 'ordered' && (
                    <PremiumButton
                      onClick={() => setIsOrderModalOpen(true)}
                      variant="success"
                      className="flex-1 py-5 text-sm font-black tracking-widest uppercase shadow-xl shadow-emerald-100"
                    >
                      🚀 Create External Order
                    </PremiumButton>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <PremiumInput
                    label="Nomor Extensi"
                    type="text"
                    name="extensi"
                    value={formData.extensi}
                    onChange={handleChange}
                    placeholder="..."
                    required
                    className="text-xl font-black py-4"
                  />

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Status Order</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-black text-slate-700 appearance-none bg-white shadow-sm"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23cbd5e1\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em' }}
                    >
                      <option value="pending_order">Belum Diorderkan</option>
                      <option value="ordered">Sudah Diorderkan</option>
                      <option value="completed">Selesai</option>
                    </select>
                  </div>
                </div>

                <PremiumInput
                  label="Nama Personil / Lokasi / Ruangan"
                  type="text"
                  name="lokasi"
                  value={formData.lokasi}
                  onChange={handleChange}
                  placeholder="Contoh: Poli Dalam"
                  required
                  className="font-bold py-4"
                />

                <PremiumTextarea
                  label="Catatan Kasus / Keluhan Utama"
                  name="catatan"
                  value={formData.catatan}
                  onChange={handleChange}
                  placeholder="..."
                  rows={6}
                />

                <div className="flex flex-col md:flex-row gap-4 pt-10">
                  <PremiumButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      fetchLogbook();
                    }}
                    className="flex-1 py-5 text-xs font-black tracking-widest uppercase"
                  >
                    Batal
                  </PremiumButton>
                  <PremiumButton
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-5 text-xs font-black tracking-widest uppercase shadow-2xl shadow-blue-100"
                  >
                    {saving ? 'MENYIMPAN...' : '💾 SIMPAN PERUBAHAN'}
                  </PremiumButton>
                </div>
              </form>
            )}
          </PremiumCard>
        )}
      </div>

      {/* Order Modal */}
      <PremiumModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="🚀 Create External Order"
        size="sm"
      >
        {logbook && (
          <form onSubmit={handleCreateOrder} className="space-y-5">
            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border-2 border-emerald-100/50 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🛒</div>
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Eskalasi Job</p>
                  <p className="text-sm font-bold text-slate-800">Detail Pengiriman Order</p>
                </div>
              </div>
              <div className="space-y-3 pt-3 border-t border-emerald-100">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 font-bold uppercase tracking-tighter">Ext Phone</span>
                  <span className="font-black text-slate-800 tracking-tight">{logbook.extensi}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 font-bold uppercase tracking-tighter">Lokasi</span>
                  <span className="font-black text-slate-800 text-right">{logbook.lokasi}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest px-1">
                Pilih Service Catalog
              </label>
              <select
                value={orderFormData.service_catalog_id}
                onChange={e => setOrderFormData({ ...orderFormData, service_catalog_id: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-600 outline-none transition-all font-bold text-slate-700 appearance-none shadow-sm"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23cbd5e1\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.2rem center', backgroundSize: '1.2em' }}
              >
                {EXTERNAL_CATALOGS.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-6">
              <PremiumButton
                type="submit"
                variant="success"
                disabled={isSubmittingOrder}
                className="py-5 shadow-2xl shadow-emerald-100 text-xs font-black tracking-widest uppercase"
              >
                {isSubmittingOrder ? 'Memproses Pengiriman...' : 'Konfirmasi & Kirim Sekarang'}
              </PremiumButton>
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition py-2"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </PremiumModal>
    </div>
  );
}

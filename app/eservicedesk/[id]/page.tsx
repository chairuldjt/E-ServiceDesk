'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { EXTERNAL_CATALOGS } from '@/lib/constants';
import { PageHeader, PremiumCard, PremiumButton, PremiumInput, PremiumTextarea, PremiumBadge, PremiumModal, CustomDropdown } from '@/components/ui/PremiumComponents';

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
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [orderFormData, setOrderFormData] = useState({
    service_catalog_id: '11',
    technician_id: '',
    technician_name: ''
  });
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [formData, setFormData] = useState({
    extensi: '',
    lokasi: '',
    catatan: '',
    status: 'pending_order',
    createExternal: false,
    service_catalog_id: '11',
    technician_id: '',
    technician_name: ''
  });

  useEffect(() => {
    fetchLogbook();
    fetchTechnicians();
  }, [id]);

  const fetchTechnicians = async () => {
    try {
      const res = await fetch('/api/monitoring/assign-list?orderId=0');
      const data = await res.json();
      if (res.ok) {
        setTechnicians(data.result || []);
      }
    } catch (err) {
      console.error('Failed to fetch technicians', err);
    }
  };

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
        createExternal: false,
        service_catalog_id: '11',
        technician_id: '',
        technician_name: ''
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

  const handleExternalDelegation = async (externalOrderId: any, techId: string, techName: string) => {
    if (!techId || !externalOrderId) return { success: true };

    // High delay for sync (1s)
    await new Promise(r => setTimeout(r, 1000));
    console.log(`Auto-delegating Order ID: ${externalOrderId} to Tech: ${techId}`);

    try {
      const assignRes = await fetch('/api/monitoring/assign-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: externalOrderId,
          id: externalOrderId,
          teknisi_id: techId,
          nama_lengkap: techName,
          assign_type_code: "1",
          assign_desc: "NEW",
          emoji_code: ":gear:"
        })
      });

      if (assignRes.ok) return { success: true };
      const err = await assignRes.json();
      return { success: false, error: err.error || 'Gagal delegasi' };
    } catch (err) {
      return { success: false, error: 'Koneksi delegasi gagal' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // 1. Update Local Logbook
      const response = await fetch(`/api/eservicedesk/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensi: formData.extensi,
          lokasi: formData.lokasi,
          catatan: formData.catatan,
          status: formData.status,
          nama: formData.lokasi
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal menyimpan logbook');
        setSaving(false);
        return;
      }

      // 2. If Create External is toggled, process it
      let externalInfo = '';
      if (formData.createExternal && logbook && logbook.status !== 'ordered') {
        const extRes = await fetch('/api/monitoring/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catatan: formData.catatan,
            ext_phone: formData.extensi,
            location_desc: formData.lokasi,
            service_catalog_id: formData.service_catalog_id,
            logbookId: id
          }),
        });

        const orderData = await extRes.json();
        if (extRes.ok) {
          const externalOrderId = orderData.id;
          externalInfo = ' & Order External Berhasil';

          if (formData.technician_id) {
            const delRes = await handleExternalDelegation(externalOrderId, formData.technician_id, formData.technician_name);
            if (delRes.success) {
              externalInfo += ' + Delegasi Berhasil';
            } else {
              externalInfo += ` (Delegasi Gagal: ${delRes.error})`;
            }
          }
        } else {
          externalInfo = ` (Gagal External: ${orderData.error})`;
        }
      }

      setLogbook(data.data);
      setIsEditing(false);
      showToast('Data berhasil diperbarui' + externalInfo, externalInfo.includes('Gagal') ? 'error' : 'success');
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
      // 1. Create External Order
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

      const orderData = await response.json();
      console.log('External Order System Response:', orderData);

      if (!response.ok) {
        showToast(`Gagal: ${orderData.error}`, 'error');
        setIsSubmittingOrder(false);
        return;
      }

      const externalOrderId = orderData.id;

      // 2. Auto Delegation if technician is selected
      if (orderFormData.technician_id && externalOrderId) {
        // High delay for sync (1s)
        await new Promise(r => setTimeout(r, 1000));

        console.log(`Auto-delegating Order ID: ${externalOrderId} to Tech: ${orderFormData.technician_id}`);

        try {
          const assignRes = await fetch('/api/monitoring/assign-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: externalOrderId,
              id: externalOrderId,
              teknisi_id: orderFormData.technician_id,
              nama_lengkap: orderFormData.technician_name,
              assign_type_code: "1",
              assign_desc: "NEW",
              emoji_code: ":gear:"
            })
          });

          if (assignRes.ok) {
            showToast('External Order & Delegasi berhasil', 'success');
          } else {
            const assignErr = await assignRes.json();
            showToast('Order terbuat, tapi delegasi gagal', 'error');
            console.error('Delegation Error:', assignErr);
          }
        } catch (assignErr) {
          showToast('Order terbuat, tapi koneksi delegasi gagal', 'error');
        }
      } else {
        showToast('External Order berhasil dibuat', 'success');
      }

      setIsOrderModalOpen(false);
      fetchLogbook(); // Refresh to show "Sudah Diorderkan"
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

                {/* External Options Integration */}
                <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 bg-white shadow-xl ${formData.createExternal ? 'border-emerald-200 shadow-emerald-100/50' : 'border-slate-100'}`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-all duration-500 ${formData.createExternal ? 'bg-emerald-600 text-white rotate-12 scale-110 shadow-emerald-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                        {formData.createExternal ? '🚀' : '📡'}
                      </div>
                      <div>
                        <h4 className={`text-lg font-black tracking-tight transition-colors ${formData.createExternal ? 'text-emerald-900' : 'text-slate-700'}`}>
                          External Option
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Eskalasi ke SIMRS</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.createExternal}
                        onChange={(e) => setFormData({ ...formData, createExternal: e.target.checked })}
                        disabled={logbook.status === 'ordered'}
                      />
                      <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                      <span className={`ml-3 text-xs font-black uppercase tracking-widest transition-colors ${formData.createExternal ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {formData.createExternal ? 'Direct Escalation Active' : 'Internal Only'}
                      </span>
                    </label>
                  </div>

                  {formData.createExternal && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
                      <CustomDropdown
                        label="Service Catalog"
                        value={formData.service_catalog_id}
                        onChange={val => setFormData({ ...formData, service_catalog_id: val })}
                        options={EXTERNAL_CATALOGS.map(cat => ({
                          value: cat.id.toString(),
                          label: cat.name
                        }))}
                      />

                      <CustomDropdown
                        label="Delegasi Teknisi (Opsional)"
                        value={formData.technician_id}
                        onChange={val => {
                          const techName = technicians.find(t => t.teknisi_id.toString() === val)?.nama_lengkap || '';
                          setFormData({ ...formData, technician_id: val, technician_name: techName });
                        }}
                        options={[
                          { value: '', label: '-- Pilih Teknisi (Opsional) --' },
                          ...technicians.map(t => ({
                            value: t.teknisi_id.toString(),
                            label: t.nama_lengkap
                          }))
                        ]}
                      />
                    </div>
                  )}

                  {logbook.status === 'ordered' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                      <span className="text-xl">ℹ️</span>
                      <p className="text-xs font-bold text-blue-700">Order ini sudah pernah dikirim ke SIMRS sebelumnya.</p>
                    </div>
                  )}
                </div>

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
          <form onSubmit={handleCreateOrder} className="space-y-6">
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

            <div className="space-y-4">
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
                onChange={val => {
                  const techName = technicians.find(t => t.teknisi_id.toString() === val)?.nama_lengkap || '';
                  setOrderFormData({ ...orderFormData, technician_id: val, technician_name: techName });
                }}
                options={[
                  { value: '', label: '-- Pilih Teknisi (Opsional) --' },
                  ...technicians.map(t => ({
                    value: t.technician_id?.toString() || t.teknisi_id?.toString(),
                    label: t.nama_lengkap
                  }))
                ]}
              />
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

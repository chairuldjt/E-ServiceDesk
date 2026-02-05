'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useUI } from '@/context/UIContext';
import { EXTERNAL_CATALOGS } from '@/lib/constants';
import { PageHeader, PremiumCard, PremiumButton, PremiumInput, PremiumTextarea, CustomDropdown } from '@/components/ui/PremiumComponents';

interface LogbookFormEntry {
  extensi: string;
  lokasi: string;
  catatan: string;
  service_catalog_id: string;
  createExternal: boolean;
  technician_id: string;
  technician_name: string;
}

interface Technician {
  teknisi_id: number;
  nama_lengkap: string;
  nama_bidang: string;
}

export default function CreateLogbookPage() {
  return (
    <ProtectedRoute>
      <CreateLogbookContent />
    </ProtectedRoute>
  );
}

function CreateLogbookContent() {
  const router = useRouter();
  const { showToast } = useUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Multi-entry state
  const [entries, setEntries] = useState<LogbookFormEntry[]>([
    { extensi: '', lokasi: '', catatan: '', service_catalog_id: '11', createExternal: false, technician_id: '', technician_name: '' }
  ]);

  useEffect(() => {
    fetchTechnicians();
  }, []);

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

  const handleAddRow = () => {
    setEntries([...entries, { extensi: '', lokasi: '', catatan: '', service_catalog_id: '11', createExternal: false, technician_id: '', technician_name: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const handleChange = (index: number, field: keyof LogbookFormEntry, value: any) => {
    const newEntries = [...entries];
    (newEntries[index] as any)[field] = value;

    // Special case for technician name
    if (field === 'technician_id') {
      const selected = technicians.find(t => t.teknisi_id.toString() === value);
      newEntries[index].technician_name = selected ? selected.nama_lengkap : '';
    }

    setEntries(newEntries);
  };

  const callExternalApi = async (entry: LogbookFormEntry, logbookId: number) => {
    try {
      // 1. Create External Order (Status will be OPEN)
      const response = await fetch('/api/monitoring/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catatan: entry.catatan || entry.lokasi,
          ext_phone: entry.extensi,
          location_desc: entry.lokasi,
          service_catalog_id: entry.service_catalog_id,
          logbookId: logbookId
        }),
      });

      const orderData = await response.json();
      console.log('External Order System Response:', orderData);

      if (!response.ok) {
        console.error('External API failed:', orderData);
        return { success: false, error: orderData.error };
      }

      const externalOrderId = orderData.id;

      // 2. If technician is selected, DELEGATE automatically
      if (entry.createExternal && entry.technician_id && externalOrderId) {
        // High delay to ensure external DB is ready
        await new Promise(r => setTimeout(r, 1000));

        console.log(`Auto-delegating Order ID: ${externalOrderId} to Technician: ${entry.technician_id}`);

        try {
          const assignRes = await fetch('/api/monitoring/assign-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: externalOrderId,
              id: externalOrderId,
              teknisi_id: entry.technician_id,
              nama_lengkap: entry.technician_name,
              assign_type_code: "1",
              assign_desc: "NEW", // Match standard flow
              emoji_code: ":gear:"
            })
          });

          if (!assignRes.ok) {
            const assignErr = await assignRes.json();
            console.error('Auto Delegation Failed:', assignErr);
            return { success: true, warning: 'Order terbuat tapi gagal delegasi: ' + (assignErr.error || 'Unknown error') };
          }
          return { success: true, delegated: true };
        } catch (assignCatch) {
          console.error('Auto Delegation Error:', assignCatch);
          return { success: true, warning: 'Order terbuat tapi gagal delegasi (Koneksi)' };
        }
      }

      return { success: true };
    } catch (err) {
      console.error('External API error:', err);
      return { success: false, error: 'Connection error' };
    }
  };

  const handleSaveSingle = async (index: number) => {
    const entry = entries[index];
    if (!entry.extensi || !entry.lokasi) {
      showToast('Extensi dan lokasi harus diisi', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/eservicedesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, nama: entry.lokasi }),
      });

      const data = await response.json();

      if (response.ok) {
        let externalMsg = '';
        let isError = false;

        if (entry.createExternal && data.ids && data.ids[0]) {
          const extResult = await callExternalApi(entry, data.ids[0]);
          if (extResult.success) {
            externalMsg = extResult.delegated ? ' & Delegasi Berhasil' : ' & External Order Sent';
            if (extResult.warning) {
              externalMsg = ` (${extResult.warning})`;
              isError = true;
            }
          } else {
            externalMsg = ' (Gagal external: ' + extResult.error + ')';
            isError = true;
          }
        }

        showToast(`Order berhasil disimpan${externalMsg}`, isError ? 'error' : 'success');

        if (entries.length > 1) {
          setEntries(entries.filter((_, i) => i !== index));
        } else {
          router.push('/eservicedesk');
        }
      } else {
        showToast(data.error || 'Gagal menyimpan order', 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiPayload = entries.map(entry => ({
        ...entry,
        nama: entry.lokasi
      }));

      const response = await fetch('/api/eservicedesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal membuat logbook');
        setLoading(false);
        return;
      }

      // Handle External Orders & Delegation
      let successExt = 0;
      let failExt = 0;
      let successDel = 0;

      if (data.ids && data.ids.length === entries.length) {
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].createExternal) {
            const result = await callExternalApi(entries[i], data.ids[i]);
            if (result.success) {
              successExt++;
              if (result.delegated) successDel++;
            } else {
              failExt++;
            }
            // Small delay to prevent rate limit
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      let toastMsg = `${entries.length} Catatan disimpan.`;
      if (successExt > 0) toastMsg += ` External: ${successExt} sent.`;
      if (successDel > 0) toastMsg += ` Delegasi: ${successDel} ok.`;
      if (failExt > 0) toastMsg += ` Gagal: ${failExt}.`;

      showToast(toastMsg, failExt > 0 ? 'error' : 'success');
      router.push('/eservicedesk');
    } catch (error) {
      setError('Terjadi kesalahan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      <PageHeader
        icon="➕"
        title="Tambah Order Baru"
        subtitle="Buat catatan internal + external order + delegasi sekaligus"
        actions={
          <Link href="/eservicedesk">
            <PremiumButton variant="secondary" className="px-6 text-xs uppercase tracking-widest">
              ← Kembali
            </PremiumButton>
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {entries.map((entry, index) => (
            <PremiumCard key={index} className="p-8 relative group border-2 border-transparent hover:border-blue-100 transition-all shadow-xl shadow-slate-200/50">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm">
                    {index + 1}
                  </span>
                  <h3 className="text-xl font-black text-slate-800">Data Order</h3>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleSaveSingle(index)}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 text-[10px] font-black uppercase tracking-widest"
                    disabled={loading}
                  >
                    💾 Simpan Baris Ini
                  </button>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="text-xs font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition"
                    >
                      🗑️ Hapus Baris
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <PremiumInput
                    label="Nomor Extensi"
                    type="text"
                    value={entry.extensi}
                    onChange={(e) => handleChange(index, 'extensi', e.target.value)}
                    placeholder="Contoh: 1234"
                    required
                  />

                  <PremiumInput
                    label="Nama / Lokasi"
                    type="text"
                    value={entry.lokasi}
                    onChange={(e) => handleChange(index, 'lokasi', e.target.value)}
                    placeholder="Nama user atau lokasi"
                    required
                  />
                </div>

                <div className="bg-emerald-50/50 p-6 rounded-[2rem] border-2 border-emerald-100/50 space-y-5 h-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🚀</span>
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">External & Delegasi</p>
                        <p className="text-xs font-bold text-slate-800">SIMRS Escalation</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entry.createExternal}
                        onChange={(e) => handleChange(index, 'createExternal', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className={`space-y-4 transition-all duration-300 ${entry.createExternal ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none -translate-y-2'}`}>
                    <CustomDropdown
                      label="Service Catalog"
                      value={entry.service_catalog_id}
                      onChange={(val) => handleChange(index, 'service_catalog_id', val)}
                      options={EXTERNAL_CATALOGS.map(cat => ({
                        value: cat.id.toString(),
                        label: cat.name
                      }))}
                    />

                    <CustomDropdown
                      label="Delegasi Teknisi (Opsional)"
                      value={entry.technician_id}
                      onChange={(val) => handleChange(index, 'technician_id', val)}
                      options={[
                        { value: '', label: '-- Pilih Teknisi (Opsional) --' },
                        ...technicians.map(t => ({
                          value: t.teknisi_id.toString(),
                          label: t.nama_lengkap
                        }))
                      ]}
                    />
                  </div>
                </div>
              </div>

              <PremiumTextarea
                label="Catatan Kasus / Keluhan Utama"
                value={entry.catatan}
                onChange={(e) => handleChange(index, 'catatan', e.target.value)}
                placeholder="Rincian masalah..."
                rows={3}
              />
            </PremiumCard>
          ))}

          <div className="flex flex-col md:flex-row gap-4">
            <PremiumButton
              type="button"
              variant="secondary"
              onClick={handleAddRow}
              className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
            >
              ➕ Tambah Baris Order (Multi-Entry)
            </PremiumButton>

            <PremiumButton
              type="submit"
              disabled={loading}
              className="flex-1 py-4 text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-100 placeholder-opacity-50"
            >
              <span className="mr-2">💾</span>
              {loading ? 'MENYIMPAN...' : 'SIMPAN WORKLOG & EXTERNAL ORDER'}
            </PremiumButton>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl font-bold animate-pulse">
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

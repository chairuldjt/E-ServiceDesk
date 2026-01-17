'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { PageHeader, PremiumCard, PremiumButton, PremiumInput, PremiumTextarea } from '@/components/ui/PremiumComponents';

interface LogbookFormEntry {
  extensi: string;
  lokasi: string;
  catatan: string;
  solusi: string;
  penyelesaian: string;
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

  // Multi-entry state
  const [entries, setEntries] = useState<LogbookFormEntry[]>([
    { extensi: '', lokasi: '', catatan: '', solusi: 'belum ada', penyelesaian: 'belum ada' }
  ]);

  const handleAddRow = () => {
    setEntries([...entries, { extensi: '', lokasi: '', catatan: '', solusi: 'belum ada', penyelesaian: 'belum ada' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const handleChange = (index: number, field: keyof LogbookFormEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Map entries for API (lokasi -> nama)
      const apiPayload = entries.map(entry => ({
        ...entry,
        nama: entry.lokasi
      }));

      const response = await fetch('/api/logbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal membuat logbook');
        return;
      }

      showToast(`${entries.length} Logbook berhasil dibuat`, 'success');
      router.push('/logbook');
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
        title="Tambah Logbook Baru"
        subtitle="Buat beberapa catatan pekerjaan sekaligus"
        actions={
          <Link href="/logbook">
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
                  <h3 className="text-xl font-black text-slate-800">Data Logbook</h3>
                </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <PremiumInput
                  label="Extensi"
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

              <PremiumTextarea
                label="Catatan Kasus"
                value={entry.catatan}
                onChange={(e) => handleChange(index, 'catatan', e.target.value)}
                placeholder="Rincian masalah..."
                rows={2}
                className="mb-6"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PremiumTextarea
                  label="Solusi"
                  value={entry.solusi}
                  onChange={(e) => handleChange(index, 'solusi', e.target.value)}
                  rows={2}
                />
                <PremiumTextarea
                  label="Penyelesaian"
                  value={entry.penyelesaian}
                  onChange={(e) => handleChange(index, 'penyelesaian', e.target.value)}
                  rows={2}
                />
              </div>
            </PremiumCard>
          ))}

          <div className="flex flex-col md:flex-row gap-4">
            <PremiumButton
              type="button"
              variant="secondary"
              onClick={handleAddRow}
              className="flex-1 py-4 text-xs font-black uppercase tracking-widest bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
            >
              ➕ Tambah Baris Logbook (Multi-Entry)
            </PremiumButton>

            <PremiumButton
              type="submit"
              disabled={loading}
              className="flex-1 py-4 text-xs font-black uppercase tracking-widest shadow-2xl shadow-blue-100"
            >
              {loading ? 'MENYIMPAN...' : '💾 SIMPAN SEMUA LOGBOOK'}
            </PremiumButton>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl font-bold">
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

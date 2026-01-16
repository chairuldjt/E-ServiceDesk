'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUI } from '@/context/UIContext';
import { PageHeader, PremiumCard, PremiumButton, PremiumInput, PremiumTextarea } from '@/components/ui/PremiumComponents';

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
  const [formData, setFormData] = useState({
    extensi: '',
    nama: '',
    lokasi: '',
    catatan: '',
    solusi: '',
    penyelesaian: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/logbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal membuat logbook');
        return;
      }

      showToast('Logbook berhasil dibuat', 'success');
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
        subtitle="Buat catatan pekerjaan dan service baru"
        actions={
          <Link href="/logbook">
            <PremiumButton variant="secondary">
              ← Kembali
            </PremiumButton>
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto">
        <PremiumCard className="p-8">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 font-semibold flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PremiumInput
                label="Extensi"
                type="text"
                name="extensi"
                value={formData.extensi}
                onChange={handleChange}
                placeholder="Contoh: ext. 1234"
                required
              />

              <PremiumInput
                label="Nama"
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                placeholder="Nama kegiatan"
                required
              />
            </div>

            <PremiumInput
              label="Lokasi"
              type="text"
              name="lokasi"
              value={formData.lokasi}
              onChange={handleChange}
              placeholder="Lokasi kegiatan"
              required
            />

            <PremiumTextarea
              label="Catatan"
              name="catatan"
              value={formData.catatan}
              onChange={handleChange}
              placeholder="Catatan mengenai kegiatan"
              rows={3}
            />

            <PremiumTextarea
              label="Solusi"
              name="solusi"
              value={formData.solusi}
              onChange={handleChange}
              placeholder="Solusi yang diberikan"
              rows={3}
            />

            <PremiumTextarea
              label="Penyelesaian"
              name="penyelesaian"
              value={formData.penyelesaian}
              onChange={handleChange}
              placeholder="Hasil penyelesaian"
              rows={3}
            />

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <Link href="/logbook" className="flex-1">
                <PremiumButton
                  type="button"
                  variant="secondary"
                  className="w-full"
                >
                  Batal
                </PremiumButton>
              </Link>
              <PremiumButton
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sedang menyimpan...
                  </>
                ) : (
                  <>💾 Simpan Logbook</>
                )}
              </PremiumButton>
            </div>
          </form>
        </PremiumCard>
      </div>
    </div>
  );
}

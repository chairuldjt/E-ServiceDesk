'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUI } from '@/context/UIContext';
import { PageHeader, PremiumCard, PremiumButton, PremiumInput, PremiumTextarea, PremiumBadge } from '@/components/ui/PremiumComponents';

interface LogbookEntry {
  id: number;
  extensi: string;
  nama: string;
  lokasi: string;
  catatan: string;
  solusi: string;
  penyelesaian: string;
  status: string;
  created_at: string;
  updated_at: string;
}

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
  const [formData, setFormData] = useState({
    extensi: '',
    nama: '',
    lokasi: '',
    catatan: '',
    solusi: '',
    penyelesaian: '',
    status: 'draft',
  });

  useEffect(() => {
    fetchLogbook();
  }, [id]);

  const fetchLogbook = async () => {
    try {
      const response = await fetch(`/api/logbook/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal memuat logbook');
        return;
      }

      setLogbook(data.data);
      setFormData({
        extensi: data.data.extensi,
        nama: data.data.nama,
        lokasi: data.data.lokasi,
        catatan: data.data.catatan,
        solusi: data.data.solusi,
        penyelesaian: data.data.penyelesaian,
        status: data.data.status,
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
      const response = await fetch(`/api/logbook/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal menyimpan logbook');
        return;
      }

      setLogbook(data.data);
      setIsEditing(false);
      showToast('Logbook berhasil diupdate', 'success');
    } catch (error) {
      setError('Terjadi kesalahan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

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
        icon={isEditing ? '✏️' : '📋'}
        title={isEditing ? 'Edit Logbook' : 'Detail Logbook'}
        subtitle={isEditing ? 'Update informasi logbook' : 'Informasi lengkap logbook'}
        actions={
          <Link href="/logbook">
            <PremiumButton variant="secondary">
              ← Kembali
            </PremiumButton>
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 font-semibold flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {logbook && (
          <PremiumCard className="p-8">
            {!isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Extensi</label>
                    <p className="text-xl text-slate-900 font-bold">{logbook.extensi}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Status</label>
                    <PremiumBadge
                      variant={logbook.status === 'completed' ? 'emerald' : 'amber'}
                      size="md"
                    >
                      {logbook.status === 'completed' ? '✅ Selesai' : '📝 Draft'}
                    </PremiumBadge>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nama</label>
                  <p className="text-lg text-slate-900 font-semibold">{logbook.nama}</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Lokasi</label>
                  <p className="text-lg text-slate-900 font-semibold">{logbook.lokasi}</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Catatan</label>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{logbook.catatan || '-'}</p>
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100">
                  <label className="block text-xs font-black text-blue-600 uppercase tracking-wider mb-3">Solusi</label>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{logbook.solusi || '-'}</p>
                </div>

                <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                  <label className="block text-xs font-black text-emerald-600 uppercase tracking-wider mb-3">Penyelesaian</label>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{logbook.penyelesaian || '-'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t-2 border-slate-100">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Dibuat</label>
                    <p className="text-sm text-slate-700 font-semibold">
                      {new Date(logbook.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Diupdate</label>
                    <p className="text-sm text-slate-700 font-semibold">
                      {new Date(logbook.updated_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <PremiumButton onClick={() => setIsEditing(true)}>
                    ✏️ Edit Logbook
                  </PremiumButton>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PremiumInput
                    label="Extensi"
                    type="text"
                    name="extensi"
                    value={formData.extensi}
                    onChange={handleChange}
                    required
                  />

                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium"
                    >
                      <option value="draft">Draft</option>
                      <option value="completed">Selesai</option>
                    </select>
                  </div>
                </div>

                <PremiumInput
                  label="Nama"
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  required
                />

                <PremiumInput
                  label="Lokasi"
                  type="text"
                  name="lokasi"
                  value={formData.lokasi}
                  onChange={handleChange}
                  required
                />

                <PremiumTextarea
                  label="Catatan"
                  name="catatan"
                  value={formData.catatan}
                  onChange={handleChange}
                  rows={3}
                />

                <PremiumTextarea
                  label="Solusi"
                  name="solusi"
                  value={formData.solusi}
                  onChange={handleChange}
                  rows={3}
                />

                <PremiumTextarea
                  label="Penyelesaian"
                  name="penyelesaian"
                  value={formData.penyelesaian}
                  onChange={handleChange}
                  rows={3}
                />

                <div className="flex gap-4 pt-6 border-t-2 border-slate-100">
                  <PremiumButton
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Batal
                  </PremiumButton>
                  <PremiumButton
                    type="submit"
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      <>💾 Simpan</>
                    )}
                  </PremiumButton>
                </div>
              </form>
            )}
          </PremiumCard>
        )}
      </div>
    </div>
  );
}

'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      alert('Logbook berhasil diupdate');
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
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? '✏️ Edit Logbook' : '📋 Detail Logbook'}
          </h1>
          <Link href="/logbook" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Kembali
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {logbook && (
          <div className="bg-white rounded-lg shadow p-8">
            {!isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-500 text-sm font-medium">Extensi</label>
                    <p className="text-lg text-gray-900 font-semibold">{logbook.extensi}</p>
                  </div>

                  <div>
                    <label className="block text-gray-500 text-sm font-medium">Status</label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        logbook.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {logbook.status === 'completed' ? '✅ Selesai' : '📝 Draft'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 text-sm font-medium">Nama</label>
                  <p className="text-lg text-gray-900">{logbook.nama}</p>
                </div>

                <div>
                  <label className="block text-gray-500 text-sm font-medium">Lokasi</label>
                  <p className="text-lg text-gray-900">{logbook.lokasi}</p>
                </div>

                <div>
                  <label className="block text-gray-500 text-sm font-medium">Catatan</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{logbook.catatan || '-'}</p>
                </div>

                <div>
                  <label className="block text-gray-500 text-sm font-medium">Solusi</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{logbook.solusi || '-'}</p>
                </div>

                <div>
                  <label className="block text-gray-500 text-sm font-medium">Penyelesaian</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{logbook.penyelesaian || '-'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                  <div>
                    <label className="block text-gray-500 text-sm font-medium">Dibuat</label>
                    <p className="text-sm text-gray-900">
                      {new Date(logbook.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-500 text-sm font-medium">Diupdate</label>
                    <p className="text-sm text-gray-900">
                      {new Date(logbook.updated_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition"
                >
                  ✏️ Edit
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Extensi <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="extensi"
                      value={formData.extensi}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="draft">Draft</option>
                      <option value="completed">Selesai</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Nama <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Lokasi <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="lokasi"
                    value={formData.lokasi}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Catatan
                  </label>
                  <textarea
                    name="catatan"
                    value={formData.catatan}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Solusi
                  </label>
                  <textarea
                    name="solusi"
                    value={formData.solusi}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Penyelesaian
                  </label>
                  <textarea
                    name="penyelesaian"
                    value={formData.penyelesaian}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Sedang menyimpan...' : '💾 Simpan'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-500 transition"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

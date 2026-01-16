'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, PremiumCard, PremiumButton, PremiumModal, PremiumInput, PremiumTextarea, PremiumBadge } from '@/components/ui/PremiumComponents';

interface Note {
    id: number;
    user_id: number;
    username?: string;
    title: string;
    content: string;
    color: string;
    is_public: number;
    images?: string | null;
    updated_at: string;
}

const COLORS = [
    { name: 'white', value: 'bg-white', border: 'border-gray-200' },
    { name: 'yellow', value: 'bg-yellow-100', border: 'border-yellow-200' },
    { name: 'green', value: 'bg-green-100', border: 'border-green-200' },
    { name: 'blue', value: 'bg-blue-100', border: 'border-blue-200' },
    { name: 'red', value: 'bg-red-100', border: 'border-red-200' },
    { name: 'purple', value: 'bg-purple-100', border: 'border-purple-200' },
];

export default function NotepadPage() {
    return (
        <ProtectedRoute>
            <NotepadContent />
        </ProtectedRoute>
    );
}

function NotepadContent() {
    const { user } = useAuth();
    const { showToast, confirm } = useUI();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        color: 'white',
        is_public: false,
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const response = await fetch('/api/notes');
            const data = await response.json();
            setNotes(data.data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
            showToast('Gagal memuat catatan', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingNote(null);
        setFormData({ title: '', content: '', color: 'white', is_public: false });
        setIsModalOpen(true);
    };

    const handleEdit = (note: Note) => {
        setEditingNote(note);
        setFormData({
            title: note.title,
            content: note.content,
            color: note.color,
            is_public: note.is_public === 1,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        confirm('Hapus Catatan?', 'Apakah Anda yakin ingin menghapus catatan ini?', async () => {
            try {
                const response = await fetch(`/api/notes/${id}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    setNotes(notes.filter((n) => n.id !== id));
                    showToast('Catatan berhasil dihapus', 'success');
                } else {
                    showToast('Gagal menghapus catatan', 'error');
                }
            } catch (error) {
                console.error('Error deleting note:', error);
                showToast('Terjadi kesalahan', 'error');
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingNote ? `/api/notes/${editingNote.id}` : '/api/notes';
            const method = editingNote ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const result = await response.json();
                if (editingNote) {
                    setNotes(notes.map((n) => (n.id === editingNote.id ? result.data : n)));
                    showToast('Catatan berhasil diperbarui', 'success');
                } else {
                    setNotes([result.data, ...notes]);
                    showToast('Catatan berhasil dibuat', 'success');
                }
                setIsModalOpen(false);
            } else {
                showToast('Gagal menyimpan catatan', 'error');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            showToast('Terjadi kesalahan', 'error');
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
                icon="📝"
                title="Notepad"
                subtitle="Kelola catatan dan ide Anda"
                actions={
                    <PremiumButton onClick={handleCreate}>
                        <span className="text-lg">➕</span> Buat Catatan
                    </PremiumButton>
                }
            />

            {notes.length === 0 ? (
                <PremiumCard className="p-16">
                    <div className="text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                            📝
                        </div>
                        <p className="text-slate-400 text-lg mb-6 font-medium">Belum ada catatan</p>
                        <PremiumButton onClick={handleCreate} size="lg">
                            Buat catatan pertama Anda
                        </PremiumButton>
                    </div>
                </PremiumCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {notes.map((note) => {
                        const colorObj = COLORS.find((c) => c.name === note.color) || COLORS[0];
                        return (
                            <div
                                key={note.id}
                                onClick={() => handleEdit(note)}
                                className={`${colorObj.value} border-2 ${colorObj.border} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full hover:scale-105 transform duration-200`}
                            >
                                <div className="flex justify-between items-start mb-3 gap-2">
                                    <h3 className="font-black text-slate-900 truncate flex-1 text-lg">
                                        {note.title}
                                    </h3>
                                    <div className="flex gap-2 items-center">
                                        {note.is_public === 1 && (
                                            <PremiumBadge variant="blue" size="sm">
                                                Publik
                                            </PremiumBadge>
                                        )}
                                        {(note.user_id === user?.id || user?.role === 'admin') && (
                                            <button
                                                onClick={(e) => handleDelete(note.id, e)}
                                                className="text-red-500 hover:text-red-700 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition p-1.5 hover:bg-red-50 rounded-lg"
                                                title="Hapus"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-slate-700 text-sm whitespace-pre-wrap line-clamp-6 flex-1 mb-4 leading-relaxed">
                                    {note.content}
                                </p>
                                <div className="flex justify-between items-end text-[10px] text-slate-500 border-t border-black/5 pt-3">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 text-xs">
                                            {note.user_id === user?.id ? 'Saya' : note.username}
                                        </span>
                                        <span className="font-medium">
                                            {new Date(note.updated_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <PremiumModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingNote
                    ? (editingNote.user_id === user?.id || user?.role === 'admin' ? 'Edit Catatan' : 'Detail Catatan')
                    : 'Catatan Baru'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <PremiumInput
                        label="Judul"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Masukkan judul catatan"
                        required
                        disabled={!!(editingNote && editingNote.user_id !== user?.id && user?.role !== 'admin')}
                    />

                    <PremiumTextarea
                        label="Isi Catatan"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Tulis sesuatu..."
                        rows={10}
                        disabled={!!(editingNote && editingNote.user_id !== user?.id && user?.role !== 'admin')}
                    />

                    {(!editingNote || editingNote.user_id === user?.id || user?.role === 'admin') && (
                        <>
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">
                                    Warna
                                </label>
                                <div className="flex gap-3 flex-wrap">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: c.name })}
                                            className={`w-12 h-12 rounded-2xl border-2 ${c.border} ${c.value} transition transform hover:scale-110 ${formData.color === c.name
                                                ? 'ring-4 ring-blue-500 ring-offset-2 scale-110'
                                                : ''
                                                }`}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                <label className="flex items-center cursor-pointer gap-4 flex-1">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.is_public}
                                            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                        />
                                        <div className={`w-12 h-7 rounded-full transition-colors ${formData.is_public ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${formData.is_public ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">
                                        Tampilkan ke semua user lain (Publik)
                                    </span>
                                </label>
                            </div>
                        </>
                    )}

                    <div className="flex gap-4 pt-4">
                        {editingNote && (editingNote.user_id === user?.id || user?.role === 'admin') && (
                            <PremiumButton
                                type="button"
                                variant="danger"
                                onClick={(e) => {
                                    setIsModalOpen(false);
                                    handleDelete(editingNote.id, e as any);
                                }}
                            >
                                🗑️ Hapus
                            </PremiumButton>
                        )}
                        <div className="flex-1"></div>
                        <PremiumButton
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            {(!editingNote || editingNote.user_id === user?.id || user?.role === 'admin') ? 'Batal' : 'Tutup'}
                        </PremiumButton>
                        {(!editingNote || editingNote.user_id === user?.id || user?.role === 'admin') && (
                            <PremiumButton type="submit">
                                💾 Simpan
                            </PremiumButton>
                        )}
                    </div>
                </form>
            </PremiumModal>
        </div>
    );
}

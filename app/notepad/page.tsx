'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, PremiumCard, PremiumButton, PremiumModal, PremiumInput, PremiumBadge } from '@/components/ui/PremiumComponents';
import { PremiumRichEditor } from '@/components/ui/PremiumRichEditor';

interface Note {
    id: number;
    user_id: number;
    username?: string;
    title: string;
    content: string;
    color: string;
    is_public: number;
    is_pinned: number;
    images?: string | null;
    updated_at: string;
}

const COLORS = [
    { name: 'white', value: 'bg-white', border: 'border-slate-200' },
    { name: 'yellow', value: 'bg-amber-50', border: 'border-amber-100' },
    { name: 'green', value: 'bg-emerald-50', border: 'border-emerald-100' },
    { name: 'blue', value: 'bg-blue-50', border: 'border-blue-100' },
    { name: 'red', value: 'bg-rose-50', border: 'border-rose-100' },
    { name: 'purple', value: 'bg-violet-50', border: 'border-violet-100' },
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
    const [viewMode, setViewMode] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        color: 'white',
        is_public: false,
        is_pinned: false,
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
        setViewMode(false);
        setFormData({ title: '', content: '', color: 'white', is_public: false, is_pinned: false });
        setIsModalOpen(true);
    };

    const handleOpenNote = (note: Note) => {
        setEditingNote(note);
        setViewMode(true);
        setFormData({
            title: note.title,
            content: note.content,
            color: note.color,
            is_public: note.is_public === 1,
            is_pinned: note.is_pinned === 1,
        });
        setIsModalOpen(true);
    };

    const togglePin = async (note: Note, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        try {
            const newPinnedStatus = note.is_pinned === 1 ? 0 : 1;
            const response = await fetch(`/api/notes/${note.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...note,
                    is_pinned: newPinnedStatus,
                    is_public: note.is_public === 1 // Ensure this is boolean for the API
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setNotes(notes.map(n => n.id === note.id ? result.data : n));
                showToast(newPinnedStatus ? 'Catatan dipin' : 'Catatan dilepas', 'success');
            }
        } catch (error) {
            console.error('Error toggling pin:', error);
            showToast('Gagal mengubah status pin', 'error');
        }
    };

    const handleDelete = (id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        confirm('Hapus Catatan?', 'Apakah Anda yakin ingin menghapus catatan ini?', async () => {
            try {
                const response = await fetch(`/api/notes/${id}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    setNotes(notes.filter((n) => n.id !== id));
                    showToast('Catatan berhasil dihapus', 'success');
                    if (isModalOpen) setIsModalOpen(false);
                } else {
                    showToast('Gagal menghapus catatan', 'error');
                }
            } catch (error) {
                console.error('Error deleting note:', error);
                showToast('Terjadi kesalahan', 'error');
            }
        });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

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

    // Sort notes: Pinned first, then by updated_at (though the API already does it, we double check here)
    const sortedNotes = [...notes].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

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
                subtitle="Kelola catatan dengan format teks kaya dan gambar"
                actions={
                    <PremiumButton onClick={handleCreate}>
                        <span className="text-lg">➕</span> Buat Catatan
                    </PremiumButton>
                }
            />

            {sortedNotes.length === 0 ? (
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
                    {sortedNotes.map((note) => {
                        const colorObj = COLORS.find((c) => c.name === note.color) || COLORS[0];
                        return (
                            <div
                                key={note.id}
                                onClick={() => handleOpenNote(note)}
                                className={`${colorObj.value} border-2 ${colorObj.border} rounded-[2rem] p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full hover:scale-105 transform duration-300 relative overflow-hidden`}
                            >
                                <div className="absolute top-0 right-0 p-4 flex gap-2 items-center z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {(note.user_id === user?.id || user?.role === 'admin') && (
                                        <>
                                            <button
                                                onClick={(e) => togglePin(note, e)}
                                                className={`p-2.5 rounded-xl shadow-lg transition-all active:scale-95 border ${note.is_pinned ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/90 text-slate-400 hover:text-blue-600 border-slate-100'}`}
                                                title={note.is_pinned ? 'Lepas Pin' : 'Pin Catatan'}
                                            >
                                                📌
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(note.id, e)}
                                                className="bg-white/90 backdrop-blur-sm text-red-500 hover:text-red-700 p-2.5 rounded-xl shadow-lg transition-all active:scale-95 border border-red-100"
                                                title="Hapus"
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    )}
                                </div>

                                {note.is_pinned === 1 && (
                                    <div className="absolute top-4 left-4 text-blue-600 md:group-hover:opacity-0 transition-opacity">
                                        <span className="text-xl">📌</span>
                                    </div>
                                )}

                                <div className={`flex justify-between items-start mb-4 gap-2 pr-8 ${note.is_pinned ? 'pl-8 md:pl-0' : ''}`}>
                                    <h3 className="font-black text-slate-800 line-clamp-2 flex-1 text-lg">
                                        {note.title}
                                    </h3>
                                    {note.is_public === 1 && (
                                        <PremiumBadge variant="blue" size="sm">
                                            Publik
                                        </PremiumBadge>
                                    )}
                                </div>
                                <div
                                    className="text-slate-600 text-sm line-clamp-6 flex-1 mb-4 leading-relaxed prose prose-sm max-w-none prose-slate"
                                    dangerouslySetInnerHTML={{ __html: note.content }}
                                />
                                <div className="flex justify-between items-end text-[10px] text-slate-500 border-t border-slate-200/50 pt-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-700 text-xs uppercase tracking-wider">
                                            {note.user_id === user?.id ? 'Saya' : note.username}
                                        </span>
                                        <span className="font-medium mt-0.5 opacity-60">
                                            {new Date(note.updated_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
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
                    ? (viewMode ? '📋 Detail Catatan' : '✏️ Edit Catatan')
                    : '➕ Catatan Baru'}
                size="xl"
            >
                <div className="space-y-6">
                    {viewMode ? (
                        <div className="space-y-6">
                            <div className="border-b border-slate-100 pb-4 flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <h2 className="text-3xl font-black text-slate-800">{formData.title}</h2>
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                        {formData.is_pinned && <PremiumBadge variant="blue">📌 Disematkan</PremiumBadge>}
                                        {formData.is_public && <PremiumBadge variant="purple">🌍 Publik</PremiumBadge>}
                                        <PremiumBadge variant="emerald" size="sm">
                                            🎨 Warna: {formData.color}
                                        </PremiumBadge>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="prose prose-slate max-w-none min-h-[300px] text-slate-700"
                                dangerouslySetInnerHTML={{ __html: formData.content }}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <PremiumInput
                                        label="Judul"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Masukkan judul catatan..."
                                        required
                                    />
                                </div>
                                <div className="mb-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_pinned: !formData.is_pinned })}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${formData.is_pinned ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500'}`}
                                        title={formData.is_pinned ? 'Lepas Pin' : 'Pin Catatan'}
                                    >
                                        <span className="text-xl">📌</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">
                                    Isi Catatan
                                </label>
                                <PremiumRichEditor
                                    value={formData.content}
                                    onChange={(content) => setFormData({ ...formData, content })}
                                    placeholder="Tulis ide, daftar periksa, atau tempel gambar di sini..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">
                                        Warna Kartu
                                    </label>
                                    <div className="flex gap-3 flex-wrap">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c.name}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color: c.name })}
                                                className={`w-10 h-10 rounded-xl border-2 ${c.border} ${c.value} transition transform hover:scale-110 active:scale-95 ${formData.color === c.name
                                                    ? 'ring-4 ring-blue-500 ring-offset-2 scale-110'
                                                    : ''
                                                    }`}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">Opsi Publik</label>
                                    <label className="flex items-center cursor-pointer gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.is_public}
                                                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                            />
                                            <div className="w-12 h-7 bg-slate-200 peer-checked:bg-blue-600 rounded-full transition-all"></div>
                                            <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-700">Tampilkan ke user lain</span>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-slate-100">
                        {editingNote && (editingNote.user_id === user?.id || user?.role === 'admin') && (
                            <PremiumButton
                                type="button"
                                variant="danger"
                                onClick={() => handleDelete(editingNote.id)}
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
                            Tutup
                        </PremiumButton>

                        {viewMode ? (
                            (editingNote?.user_id === user?.id || user?.role === 'admin') && (
                                <PremiumButton
                                    type="button"
                                    onClick={() => setViewMode(false)}
                                >
                                    ✏️ Edit Catatan
                                </PremiumButton>
                            )
                        ) : (
                            <PremiumButton
                                type="button"
                                onClick={() => handleSubmit()}
                            >
                                💾 Simpan Catatan
                            </PremiumButton>
                        )}
                    </div>
                </div>
            </PremiumModal>

            <style jsx global>{`
                .prose strong { color: inherit; font-weight: 800; }
                .prose em { color: inherit; }
                .prose ul[data-type="taskList"] {
                    list-style: none;
                    padding-left: 0;
                }
                .prose ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
                .prose ul[data-type="taskList"] input[type="checkbox"] {
                    margin-top: 0.3rem;
                    pointer-events: none;
                }
                .prose img {
                    border-radius: 1rem;
                    margin: 1rem 0;
                    border: 1px solid rgba(0,0,0,0.1);
                    max-width: 100%;
                    height: auto;
                }
            `}</style>
        </div>
    );
}



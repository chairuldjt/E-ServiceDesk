'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { useUI } from '@/context/UIContext';
import { useAuth } from '@/hooks/useAuth';

interface Note {
    id: number;
    user_id: number;
    username?: string;
    title: string;
    content: string;
    color: string;
    is_public: number;
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
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📝 Notepad</h1>
                    <button
                        onClick={handleCreate}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
                    >
                        ➕ Buat Catatan
                    </button>
                </div>

                {notes.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <p className="text-gray-500 text-lg mb-4">Belum ada catatan</p>
                        <button
                            onClick={handleCreate}
                            className="text-blue-600 font-semibold hover:underline"
                        >
                            Buat catatan pertama Anda
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {notes.map((note) => {
                            const colorObj = COLORS.find((c) => c.name === note.color) || COLORS[0];
                            return (
                                <div
                                    key={note.id}
                                    onClick={() => handleEdit(note)}
                                    className={`${colorObj.value} border ${colorObj.border} rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer group relative flex flex-col h-full`}
                                >
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <h3 className="font-bold text-gray-900 truncate flex-1">
                                            {note.title}
                                        </h3>
                                        <div className="flex gap-1">
                                            {note.is_public === 1 && (
                                                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                    Publik
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-6 flex-1 mb-4">
                                        {note.content}
                                    </p>
                                    <div className="flex justify-between items-end text-[10px] text-gray-500 border-t border-black/5 pt-3">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-700">
                                                By: {note.user_id === user?.id ? 'Saya' : note.username}
                                            </span>
                                            <span>
                                                {new Date(note.updated_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        {(note.user_id === user?.id || user?.role === 'admin') && (
                                            <button
                                                onClick={(e) => handleDelete(note.id, e)}
                                                className="text-red-500 hover:text-red-700 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition p-1"
                                                title="Hapus"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
                            <form onSubmit={handleSubmit}>
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-gray-800">
                                        {editingNote
                                            ? (editingNote.user_id === user?.id || user?.role === 'admin' ? 'Edit Catatan' : 'Detail Catatan')
                                            : 'Catatan Baru'}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl"
                                    >
                                        &times;
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Judul"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        readOnly={!!(editingNote && editingNote.user_id !== user?.id && user?.role !== 'admin')}
                                        className={`w-full text-xl font-bold border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none py-2 px-1 transition placeholder-gray-400 ${editingNote && editingNote.user_id !== user?.id && user?.role !== 'admin' ? 'cursor-default' : ''
                                            }`}
                                        required
                                        autoFocus
                                    />

                                    <textarea
                                        placeholder="Tulis sesuatu..."
                                        value={formData.content}
                                        onChange={(e) =>
                                            setFormData({ ...formData, content: e.target.value })
                                        }
                                        readOnly={!!(editingNote && editingNote.user_id !== user?.id && user?.role !== 'admin')}
                                        className={`w-full h-64 resize-none border-none focus:ring-0 text-gray-700 text-base leading-relaxed p-1 placeholder-gray-400 bg-transparent ${editingNote && editingNote.user_id !== user?.id && user?.role !== 'admin' ? 'cursor-default' : ''
                                            }`}
                                    />

                                    {(!editingNote || editingNote.user_id === user?.id || user?.role === 'admin') && (
                                        <>
                                            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                                <span className="text-sm font-medium text-gray-500">
                                                    Warna:
                                                </span>
                                                <div className="flex gap-2">
                                                    {COLORS.map((c) => (
                                                        <button
                                                            key={c.name}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, color: c.name })}
                                                            className={`w-8 h-8 rounded-full border ${c.border
                                                                } ${c.value} transition transform hover:scale-110 ${formData.color === c.name
                                                                    ? 'ring-2 ring-blue-500 ring-offset-1'
                                                                    : ''
                                                                }`}
                                                            title={c.name}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                                <label className="flex items-center cursor-pointer gap-3">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={formData.is_public}
                                                            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                                        />
                                                        <div className={`w-10 h-6 rounded-full transition-colors ${formData.is_public ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_public ? 'translate-x-4' : ''}`}></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Tampilkan ke semua user lain (Publik)
                                                    </span>
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                                    <div className="flex-1">
                                        {editingNote && (editingNote.user_id === user?.id || user?.role === 'admin') && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    setIsModalOpen(false);
                                                    handleDelete(editingNote.id, e as any);
                                                }}
                                                className="text-red-600 font-medium hover:text-red-700 flex items-center gap-1"
                                            >
                                                🗑️ Hapus
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition"
                                    >
                                        {(!editingNote || editingNote.user_id === user?.id || user?.role === 'admin') ? 'Batal' : 'Tutup'}
                                    </button>
                                    {(!editingNote || editingNote.user_id === user?.id || user?.role === 'admin') && (
                                        <button
                                            type="submit"
                                            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm"
                                        >
                                            Simpan
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

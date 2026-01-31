'use client';

import { useState, useEffect } from 'react';
import { CreatePost } from '@/components/timeline/CreatePost';
import { PostCard } from '@/components/timeline/PostCard';
import { Loader2, RefreshCw } from 'lucide-react';
import { TimelinePost } from '@/lib/types/timeline';
import { useUI } from '@/context/UIContext';
import { SearchBar } from '@/components/ui/PremiumComponents';

export default function TimelinePage() {
    const { showToast } = useUI();
    const [posts, setPosts] = useState<TimelinePost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPosts, setTotalPosts] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const postsPerPage = 10;

    // Handle debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchPosts = async (page = 1, search = debouncedSearch) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/timeline?page=${page}&limit=${postsPerPage}&search=${encodeURIComponent(search)}`);
            if (res.status === 401) {
                // Unauthorized, redirect to login
                window.location.href = '/login';
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts);
                setTotalPosts(data.total);
                setCurrentPage(page);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const hash = window.location.hash;

        if (hash) {
            // If there's a hash (e.g., #post-1), fetch all posts to ensure we can scroll to it
            const fetchAllAndScroll = async () => {
                try {
                    // Fetch without pagination to get all posts
                    const res = await fetch('/api/timeline?page=1&limit=1000');
                    if (res.status === 401) {
                        // Unauthorized, redirect to login
                        window.location.href = '/login';
                        return;
                    }
                    if (res.ok) {
                        const data = await res.json();
                        setPosts(data.posts);
                        setTotalPosts(data.total);
                        setCurrentPage(1);

                        // Wait for render then scroll
                        setTimeout(() => {
                            const element = document.querySelector(hash);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                // Add highlight effect
                                element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
                                setTimeout(() => {
                                    element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
                                }, 2000);
                            }
                        }, 300);
                    }
                } catch (error) {
                    console.error('Failed to fetch posts:', error);
                }
                setIsLoading(false);
            };

            fetchAllAndScroll();
        } else {
            // Normal fetch with pagination
            fetchPosts(1, debouncedSearch);
        }
    }, [debouncedSearch]);

    const handlePostCreated = (newPost: TimelinePost) => {
        // Find if there are already pinned posts
        // Insert new post after pinned posts if not pinned, or at the top if pinned
        setPosts(prev => [newPost, ...prev]);
        // After adding, we might want to refetch to ensure correct sorting (especially if pinning is involved)
        // fetchPosts(); 
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/timeline/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== id));
                showToast('Postingan berhasil dihapus', 'success');
            } else {
                const data = await res.json();
                showToast(data.error || 'Gagal menghapus postingan', 'error');
            }
        } catch (error) {
            console.error('Failed to delete post:', error);
            showToast('Terjadi kesalahan sistem', 'error');
        }
    };

    const handleTogglePin = async (id: number, current: boolean) => {
        try {
            const res = await fetch(`/api/timeline/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_pinned: current ? 0 : 1 })
            });
            if (res.ok) {
                fetchPosts(currentPage); // Refetch to handle re-sorting
                showToast(current ? 'Pin dilepas' : 'Postingan di-pin', 'success');
            } else {
                showToast('Gagal mengubah status pin', 'error');
            }
        } catch (error) {
            console.error('Failed to toggle pin:', error);
            showToast('Terjadi kesalahan sistem', 'error');
        }
    };

    const handleUpdate = (updatedPost: TimelinePost) => {
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    };

    const totalPages = Math.ceil(totalPosts / postsPerPage);

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="bg-white rounded-3xl border-2 border-slate-50 p-6 mb-8 shadow-xl shadow-slate-100/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-100">
                                📅
                            </div>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Timeline
                            </h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-13">Bagikan aktivitas dan pemikiran Anda</p>
                    </div>
                    <div className="flex items-center gap-3 flex-1 md:flex-none">
                        <div className="flex-1 md:w-64">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Cari postingan..."
                            />
                        </div>
                        <button
                            onClick={() => fetchPosts(currentPage)}
                            className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-full border-2 border-slate-100 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition shrink-0 shadow-sm"
                            title="Refresh"
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <CreatePost onPostCreated={handlePostCreated} />

            {isLoading && posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <p className="font-medium">Memuat postingan...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="font-bold text-lg text-slate-600">Belum ada postingan</p>
                    <p className="text-sm">Jadilah yang pertama untuk berbagi sesuatu hari ini!</p>
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onDelete={handleDelete}
                                onTogglePin={handleTogglePin}
                                onUpdate={handleUpdate}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-8">
                            <button
                                onClick={() => fetchPosts(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm"
                            >
                                ← Sebelumnya
                            </button>
                            <span className="px-4 py-2 text-sm text-slate-600 font-medium">
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <button
                                onClick={() => fetchPosts(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm"
                            >
                                Selanjutnya →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

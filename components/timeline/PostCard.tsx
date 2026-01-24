'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pin, Trash2, Globe, Lock, Heart, MessageCircle, Share2, Send, AlertTriangle, X } from 'lucide-react';
import { TimelinePost } from '@/lib/types/timeline';
import { useUI } from '@/context/UIContext';
import { Lightbox } from '@/components/ui/Lightbox';
import Link from 'next/link';

interface PostCardProps {
    post: TimelinePost;
    onDelete: (id: number) => void;
    onTogglePin: (id: number, current: boolean) => void;
}

export function PostCard({ post, onDelete, onTogglePin }: PostCardProps) {
    const { showToast } = useUI();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [liked, setLiked] = useState(!!post.user_liked);
    const [likeCount, setLikeCount] = useState(post.like_count);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [lightboxData, setLightboxData] = useState<{ index: number; open: boolean }>({ index: 0, open: false });
    const [users, setUsers] = useState<any[]>([]);
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(0);

    const menuRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const images = JSON.parse(post.images || '[]');

    useEffect(() => {
        if (isCommentsOpen && users.length === 0) {
            fetch('/api/users/mentions')
                .then(res => res.json())
                .then(data => setUsers(data))
                .catch(console.error);
        }
    }, [isCommentsOpen, users.length]);

    const allSuggestions = [
        { id: 'everyone', username: 'everyone', isSpecial: true },
        ...users
    ];

    const filteredUsers = allSuggestions.filter(u =>
        u.username.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    const insertMention = (username: string) => {
        const cursorPos = commentInputRef.current?.selectionStart ?? 0;
        const textBeforeCursor = newComment.substring(0, cursorPos);
        const lastAtIdx = textBeforeCursor.lastIndexOf('@');

        const contentAfterReplace =
            newComment.substring(0, lastAtIdx) +
            `@${username} ` +
            newComment.substring(cursorPos);

        setNewComment(contentAfterReplace);
        setShowMentions(false);
        commentInputRef.current?.focus();
    };

    // Function to parse content for mentions
    const renderContent = (content: string) => {
        if (!content) return null;

        // Regex to find @username
        const mentionRegex = /@(\w+)/g;
        const parts = content.split(mentionRegex);

        if (parts.length === 1) return content;

        const matches = [...content.matchAll(mentionRegex)];
        const result: (string | React.ReactNode)[] = [];

        let lastIndex = 0;
        matches.forEach((match, i) => {
            const username = match[1];
            const offset = match.index || 0;

            // Push text before mention
            result.push(content.substring(lastIndex, offset));

            // Push styled mention
            const isEveryone = username.toLowerCase() === 'everyone';
            result.push(
                <span key={i} className={`${isEveryone ? 'text-amber-600 bg-amber-50 px-1 rounded' : 'text-blue-600'} font-bold hover:underline cursor-pointer`}>
                    @{username}
                </span>
            );

            lastIndex = offset + match[0].length;
        });

        // Push remaining text
        result.push(content.substring(lastIndex));

        return result;
    };

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    const handleLike = async () => {
        try {
            const res = await fetch(`/api/timeline/${post.id}/like`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setLiked(data.liked);
                setLikeCount(prev => data.liked ? prev + 1 : prev - 1);
            }
        } catch (error) {
            console.error('Like failed:', error);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/timeline/${post.id}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error('Fetch comments failed:', error);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsSubmittingComment(true);
        try {
            const res = await fetch(`/api/timeline/${post.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment })
            });
            if (res.ok) {
                setNewComment('');
                fetchComments();
            }
        } catch (error) {
            console.error('Comment failed:', error);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleShare = async () => {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const url = `${protocol}//${host}/timeline#post-${post.id}`;

        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                showToast('Tautan postingan berhasil disalin ke clipboard!', 'success');
            } else {
                // Fallback for older browsers or when clipboard API is not available
                const textArea = document.createElement('textarea');
                textArea.value = url;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast('Tautan postingan berhasil disalin ke clipboard!', 'success');
                } catch (err) {
                    showToast('Gagal menyalin tautan. Silakan copy manual: ' + url, 'error');
                }
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('Share failed:', error);
            showToast('Gagal menyalin tautan', 'error');
        }
    };

    return (
        <div id={`post-${post.id}`} className={`bg-white rounded-2xl shadow-sm border ${post.is_pinned ? 'border-blue-200 ring-1 ring-blue-50' : 'border-slate-200'} p-4 mb-6 relative transition-all duration-300`}>
            {!!post.is_pinned && (
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] uppercase tracking-wider mb-3 px-2 py-0.5 bg-blue-50 rounded-full w-fit">
                    <Pin size={12} className="fill-current" />
                    Pinned Post
                </div>
            )}

            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-sm">
                        {post.profile_image ? (
                            <img src={post.profile_image} alt={post.username} className="w-full h-full object-cover" />
                        ) : (
                            post.username.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">{post.username}</h3>
                            {post.privacy === 'private' ? (
                                <Lock size={12} className="text-slate-400" />
                            ) : (
                                <Globe size={12} className="text-slate-400" />
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            {new Date(post.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                {!!post.is_owner && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`p-2 rounded-full transition ${isMenuOpen ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <MoreHorizontal size={20} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-10 animate-fade-in-up">
                                <button
                                    onClick={() => {
                                        onTogglePin(post.id, !!post.is_pinned);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                                >
                                    <Pin size={16} className={post.is_pinned ? 'text-blue-500 fill-blue-50' : ''} />
                                    {post.is_pinned ? 'Lepas Pin' : 'Pin Postingan'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                                >
                                    <Trash2 size={16} /> Hapus Postingan
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
                            <AlertTriangle size={24} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">Hapus Postingan?</h4>
                        <p className="text-slate-500 text-sm mb-6">Tindakan ini tidak dapat dibatalkan. Postingan beserta fotonya akan dihapus secara permanen.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(post.id);
                                    setIsDeleteModalOpen(false);
                                }}
                                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-slate-800 leading-relaxed whitespace-pre-wrap mb-4">
                {renderContent(post.content)}
            </div>

            {images.length > 0 && (
                <div className={`grid ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-4 rounded-xl overflow-hidden`}>
                    {images.map((img: string, idx: number) => (
                        <div key={idx} className="aspect-video bg-slate-100 relative group overflow-hidden">
                            <img
                                src={img}
                                alt={`Post content ${idx + 1}`}
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105 cursor-pointer"
                                onClick={() => setLightboxData({ index: idx, open: true })}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Gallery */}
            {lightboxData.open && (
                <Lightbox
                    images={images}
                    initialIndex={lightboxData.index}
                    onClose={() => setLightboxData({ ...lightboxData, open: false })}
                />
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex gap-4">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 transition group ${liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                    >
                        <Heart size={20} className={liked ? 'fill-red-500' : 'group-hover:fill-red-500 transition'} />
                        <span className="text-sm font-medium">{likeCount > 0 ? likeCount : 'Suka'}</span>
                    </button>
                    <button
                        onClick={() => {
                            if (!isCommentsOpen) fetchComments();
                            setIsCommentsOpen(!isCommentsOpen);
                        }}
                        className={`flex items-center gap-2 transition ${isCommentsOpen ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}
                    >
                        <MessageCircle size={20} />
                        <span className="text-sm font-medium">{post.comment_count > 0 ? post.comment_count : 'Komentar'}</span>
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-slate-500 hover:text-emerald-500 transition"
                    >
                        <Share2 size={20} />
                        <span className="text-sm font-medium">Bagikan</span>
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            {isCommentsOpen && (
                <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="space-y-4 mb-4">
                        {comments.length === 0 ? (
                            <p className="text-xs text-center text-slate-400 py-2">Belum ada komentar.</p>
                        ) : comments.map(comment => (
                            <div key={comment.id} className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] shrink-0">
                                    {comment.profile_image ? (
                                        <img src={comment.profile_image} alt={comment.username} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        comment.username.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 bg-slate-50 rounded-2xl px-3 py-2">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-xs font-bold text-slate-900">{comment.username}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(comment.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{renderContent(comment.content)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleComment} className="flex gap-2 relative">
                        <div className="flex-1 relative">
                            <input
                                ref={commentInputRef}
                                type="text"
                                value={newComment}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const cursorPos = e.target.selectionStart ?? 0;
                                    setNewComment(value);

                                    // Check for mentions
                                    const textBeforeCursor = value.substring(0, cursorPos);
                                    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

                                    if (lastAtIdx !== -1 && !textBeforeCursor.substring(lastAtIdx).includes(' ')) {
                                        setMentionSearch(textBeforeCursor.substring(lastAtIdx + 1));
                                        setShowMentions(true);
                                        setMentionIndex(0);
                                    } else {
                                        setShowMentions(false);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (showMentions) {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setMentionIndex(prev => (prev < filteredUsers.length - 1 ? prev + 1 : prev));
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setMentionIndex(prev => (prev > 0 ? prev - 1 : prev));
                                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                                            e.preventDefault();
                                            if (filteredUsers[mentionIndex]) {
                                                insertMention(filteredUsers[mentionIndex].username);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowMentions(false);
                                        }
                                    }
                                }}
                                placeholder="Tulis komentar..."
                                className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            />

                            {/* Mentions Dropdown for Comments */}
                            {showMentions && filteredUsers.length > 0 && (
                                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in-up">
                                    <p className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Tag User</p>
                                    {filteredUsers.map((user, idx) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => insertMention(user.username)}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition ${mentionIndex === idx ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${user.isSpecial ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {user.isSpecial ? (
                                                    '📢'
                                                ) : user.profile_image ? (
                                                    <img src={user.profile_image} className="w-full h-full rounded-full object-cover" alt="" />
                                                ) : user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={`font-bold ${user.isSpecial ? 'text-amber-700' : ''}`}>{user.username}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmittingComment || !newComment.trim()}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition disabled:opacity-50 h-fit"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

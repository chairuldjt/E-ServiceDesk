'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pin, Trash2, Edit2, Globe, Lock, Heart, MessageCircle, Share2, Send, AlertTriangle, X, Check, Video, Paperclip, Image as ImageIcon } from 'lucide-react';
import { TimelinePost } from '@/lib/types/timeline';
import { useUI } from '@/context/UIContext';
import { Lightbox } from '@/components/ui/Lightbox';
import Link from 'next/link';

interface PostCardProps {
    post: TimelinePost;
    onDelete: (id: number) => void;
    onTogglePin: (id: number, current: boolean) => void;
    onUpdate?: (updatedPost: TimelinePost) => void;
}

export function PostCard({ post, onDelete, onTogglePin, onUpdate }: PostCardProps) {
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
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [editPrivacy, setEditPrivacy] = useState(post.privacy);
    const [editImages, setEditImages] = useState<string[]>(JSON.parse(post.images || '[]'));
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const privacyRef = useRef<HTMLDivElement>(null);
    const images = JSON.parse(post.images || '[]');

    useEffect(() => {
        if (isCommentsOpen && users.length === 0) {
            fetch('/api/users/mentions')
                .then(res => {
                    if (res.status === 401) {
                        window.location.href = '/login';
                        return null;
                    }
                    return res.json();
                })
                .then(data => {
                    if (data) setUsers(data);
                })
                .catch(console.error);
        }
    }, [isCommentsOpen, users.length]);

    const allSuggestions = [
        { id: 'everyone', username: 'everyone', isSpecial: true },
        ...(Array.isArray(users) ? users : [])
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

    // Function to parse content for formatting (bold, italic, links, mentions)
    const renderContent = (content: string) => {
        if (!content) return null;

        // Sequence of transformations:
        // 1. URLs to links
        // 2. Bold (**text**)
        // 3. Italic (_text_)
        // 4. Mentions (@user)

        let parts: (string | React.ReactNode)[] = [content];

        // 1. Linkify URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        parts = parts.flatMap(part => {
            if (typeof part !== 'string') return part;
            const subparts = part.split(urlRegex);
            return subparts.map((sub, i) => {
                if (urlRegex.test(sub)) {
                    return <a key={`link-${i}`} href={sub} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{sub}</a>;
                }
                return sub;
            });
        });

        // 2. Bold
        const boldRegex = /\*\*(.*?)\*\*/g;
        parts = parts.flatMap(part => {
            if (typeof part !== 'string') return part;
            const subparts = part.split(boldRegex);
            return subparts.map((sub, i) => {
                if (i % 2 === 1) return <strong key={`bold-${i}`}>{sub}</strong>;
                return sub;
            });
        });

        // 3. Italic
        const italicRegex = /_(.*?)_/g;
        parts = parts.flatMap(part => {
            if (typeof part !== 'string') return part;
            const subparts = part.split(italicRegex);
            return subparts.map((sub, i) => {
                if (i % 2 === 1) return <em key={`italic-${i}`}>{sub}</em>;
                return sub;
            });
        });

        // 4. Mentions
        const mentionRegex = /@(\w+)/g;
        parts = parts.flatMap(part => {
            if (typeof part !== 'string') return part;
            const subparts = part.split(mentionRegex);
            return subparts.map((sub, i) => {
                if (i % 2 === 1) {
                    const isEveryone = sub.toLowerCase() === 'everyone';
                    return (
                        <span key={`mention-${i}`} className={`${isEveryone ? 'text-amber-600 bg-amber-50 px-1 rounded' : 'text-blue-600'} font-bold hover:underline cursor-pointer`}>
                            @{sub}
                        </span>
                    );
                }
                return sub;
            });
        });

        return parts;
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

    const handleUpdatePost = async () => {
        setIsUpdating(true);
        try {
            let finalizedImages = [...editImages];

            // Upload new files if any
            if (newFiles.length > 0) {
                const formData = new FormData();
                newFiles.forEach(file => formData.append('files', file));

                const uploadRes = await fetch('/api/timeline/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    finalizedImages = [...finalizedImages, ...uploadData.urls];
                }
            }

            const res = await fetch(`/api/timeline/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: editContent,
                    privacy: editPrivacy,
                    images: finalizedImages
                })
            });

            if (res.ok) {
                setIsEditing(false);
                setNewFiles([]);
                setNewPreviews([]);
                if (onUpdate) {
                    // We need to fetch the updated post or construct it
                    onUpdate({
                        ...post,
                        content: editContent,
                        privacy: editPrivacy,
                        images: JSON.stringify(finalizedImages)
                    });
                }
                showToast('Postingan berhasil diperbarui!', 'success');
            }
        } catch (error) {
            console.error('Update failed:', error);
            showToast('Gagal memperbarui postingan', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setNewFiles(prev => [...prev, ...files]);

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                const url = URL.createObjectURL(file);
                setNewPreviews(prev => [...prev, url]);
            }
        });
    };

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
        setNewPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (index: number) => {
        setEditImages(prev => prev.filter((_, i) => i !== index));
    };

    const isVideoFile = (url: string) => {
        return url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video');
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
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            {new Date(post.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                            {new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 60000 && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[9px] font-bold uppercase tracking-tighter">
                                    (diubah)
                                </span>
                            )}
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
                                        setIsEditing(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                                >
                                    <Edit2 size={16} /> Edit Postingan
                                </button>
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

            {isEditing ? (
                <div className="space-y-4 animate-fade-in">
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-lg resize-none leading-relaxed bg-slate-50/50"
                        placeholder="Apa yang Anda pikirkan?"
                    />

                    {/* Media Management in Edit Mode */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {/* Existing Images */}
                        {editImages.map((img, idx) => (
                            <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden group">
                                {isVideoFile(img) ? (
                                    <video src={img} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                )}
                                <button
                                    onClick={() => removeExistingImage(idx)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                                >
                                    <X size={14} />
                                </button>
                                {isVideoFile(img) && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/30 rounded-full p-2">
                                            <Video size={16} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* New Previews */}
                        {newPreviews.map((preview, idx) => {
                            const isVideo = newFiles[idx]?.type.startsWith('video/') ||
                                newFiles[idx]?.name.match(/\.(mp4|webm|ogg|mov)$/i);
                            return (
                                <div key={`new-${idx}`} className="relative aspect-square rounded-xl border-2 border-blue-200 overflow-hidden group">
                                    {isVideo ? (
                                        <video src={preview} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={preview} alt="New Preview" className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        onClick={() => removeNewFile(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 transition"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="absolute top-1 left-1 bg-blue-500 text-[8px] text-white px-1 rounded font-bold uppercase">Baru</div>
                                </div>
                            );
                        })}

                        <button
                            onClick={() => editFileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition bg-white"
                        >
                            <Paperclip size={24} />
                            <span className="text-xs mt-1 font-medium">Tambah Media</span>
                        </button>
                    </div>

                    <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                    />

                    <div className="flex items-center justify-between pt-2">
                        <div className="relative" ref={privacyRef}>
                            <button
                                type="button"
                                onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                            >
                                {editPrivacy === 'public' ? (
                                    <Globe size={16} className="text-blue-500" />
                                ) : (
                                    <Lock size={16} className="text-amber-500" />
                                )}
                                <span className="text-xs font-bold capitalize">{editPrivacy}</span>
                            </button>
                            {isPrivacyOpen && (
                                <div className="absolute bottom-full left-0 mb-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-10">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditPrivacy('public');
                                            setIsPrivacyOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition"
                                    >
                                        <Globe size={14} /> Publik
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditPrivacy('private');
                                            setIsPrivacyOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition"
                                    >
                                        <Lock size={14} /> Privat
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditContent(post.content);
                                    setEditPrivacy(post.privacy);
                                    setEditImages(JSON.parse(post.images || '[]'));
                                    setNewFiles([]);
                                    setNewPreviews([]);
                                }}
                                className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleUpdatePost}
                                disabled={isUpdating || (!editContent.trim() && editImages.length === 0 && newFiles.length === 0)}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Check size={18} />
                                )}
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="text-slate-800 leading-relaxed whitespace-pre-wrap mb-4">
                        {renderContent(post.content)}
                    </div>

                    {images.length > 0 && (
                        <div className={`
                            grid gap-1 mb-4 rounded-2xl overflow-hidden
                            ${images.length === 1 ? 'grid-cols-1' :
                                images.length === 2 ? 'grid-cols-2' :
                                    'grid-cols-2'}
                        `}>
                            {images.map((img: string, idx: number) => {
                                // Smart Layout logic
                                let span = '';
                                if (images.length === 3 && idx === 0) span = 'row-span-2 aspect-[4/5]';
                                else if (images.length === 3) span = 'aspect-square';
                                else if (images.length === 1) span = 'aspect-auto max-h-[500px] w-auto mx-auto';
                                else span = 'aspect-square';

                                // Max 4 shown
                                if (idx > 3) return null;

                                return (
                                    <div
                                        key={idx}
                                        className={`bg-slate-100 relative group overflow-hidden ${span} ${images.length === 1 ? 'rounded-2xl border border-slate-100' : ''}`}
                                    >
                                        {isVideoFile(img) ? (
                                            <video
                                                src={img}
                                                controls
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <>
                                                <img
                                                    src={img}
                                                    alt={`Post content ${idx + 1}`}
                                                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105 cursor-pointer"
                                                    onClick={() => setLightboxData({ index: idx, open: true })}
                                                />
                                                {idx === 3 && images.length > 4 && (
                                                    <div
                                                        className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-3xl font-black cursor-pointer"
                                                        onClick={() => setLightboxData({ index: 3, open: true })}
                                                    >
                                                        +{images.length - 4}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
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
            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in relative z-10">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Hapus Postingan?</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6">
                                Tindakan ini tidak dapat dibatalkan. Postingan Anda akan dihapus secara permanen.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => {
                                        onDelete(post.id);
                                        setIsDeleteModalOpen(false);
                                    }}
                                    className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition shadow-lg shadow-red-200"
                                >
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

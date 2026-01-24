'use client';

import { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Globe, Lock, Send, X, Paperclip } from 'lucide-react';
import { TimelinePost } from '@/lib/types/timeline';

interface CreatePostProps {
    onPostCreated: (post: TimelinePost) => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
    const [content, setContent] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [mentionSearch, setMentionSearch] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const privacyRef = useRef<HTMLDivElement>(null);

    // Close privacy dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (privacyRef.current && !privacyRef.current.contains(event.target as Node)) {
                setIsPrivacyOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
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
    }, []);

    const allSuggestions = [
        { id: 'everyone', username: 'everyone', isSpecial: true },
        ...(Array.isArray(users) ? users : [])
    ];

    const filteredUsers = allSuggestions.filter(u =>
        u.username.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    const insertMention = (username: string) => {
        const cursorPos = textareaRef.current?.selectionStart ?? 0;
        const textBeforeCursor = content.substring(0, cursorPos);
        const lastAtIdx = textBeforeCursor.lastIndexOf('@');

        const newContent =
            content.substring(0, lastAtIdx) +
            `@${username} ` +
            content.substring(cursorPos);

        setContent(newContent);
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setSelectedImages(prev => [...prev, ...files]);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!content.trim() && selectedImages.length === 0) return;

        setIsUploading(true);
        try {
            let imageUrls: string[] = [];

            if (selectedImages.length > 0) {
                const formData = new FormData();
                selectedImages.forEach(file => {
                    formData.append('files', file);
                });

                const uploadRes = await fetch('/api/timeline/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imageUrls = uploadData.urls;
                }
            }

            const postRes = await fetch('/api/timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    images: imageUrls,
                    privacy
                }),
            });

            if (postRes.ok) {
                const newPost = await postRes.json();
                onPostCreated(newPost);
                setContent('');
                setSelectedImages([]);
                setPreviews([]);
                setPrivacy('public');
            }
        } catch (error) {
            console.error('Failed to create post:', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                    P
                </div>
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                            const value = e.target.value;
                            const cursorPos = e.target.selectionStart ?? 0;
                            setContent(value);

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
                        placeholder="Apa yang Anda pikirkan?"
                        className="w-full min-h-[120px] px-4 pt-3 pb-2 border-none focus:ring-0 outline-none text-slate-800 placeholder:text-slate-400 text-lg resize-none leading-relaxed bg-transparent"
                    />

                    {/* Mentions Dropdown */}
                    {showMentions && filteredUsers.length > 0 && (
                        <div className="absolute left-4 top-12 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 animate-fade-in-up">
                            <p className="px-4 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Pilih User</p>
                            {filteredUsers.map((user, idx) => (
                                <button
                                    key={user.id}
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

                    {previews.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                            {previews.map((preview, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition"
                            >
                                <Paperclip size={24} />
                                <span className="text-xs mt-1">Tambah</span>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 transition"
                            >
                                <ImageIcon size={20} className="text-emerald-500" />
                                <span className="text-sm font-medium">Foto</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                multiple
                                accept="image/*"
                                className="hidden"
                            />

                            <div className="relative" ref={privacyRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${isPrivacyOpen ? 'bg-slate-100 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    {privacy === 'public' ? (
                                        <Globe size={20} className="text-blue-500" />
                                    ) : (
                                        <Lock size={20} className="text-amber-500" />
                                    )}
                                    <span className="text-sm font-medium capitalize">{privacy}</span>
                                </button>
                                {isPrivacyOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-10 animate-fade-in-up">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPrivacy('public');
                                                setIsPrivacyOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                                        >
                                            <Globe size={16} /> Publik
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPrivacy('private');
                                                setIsPrivacyOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                                        >
                                            <Lock size={16} /> Privat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handlePost}
                            disabled={isUploading || (!content.trim() && selectedImages.length === 0)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-lg ${isUploading || (!content.trim() && selectedImages.length === 0)
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                }`}
                        >
                            {isUploading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

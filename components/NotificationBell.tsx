'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: number;
    type: 'mention' | 'system' | 'github';
    message: string;
    link: string | null;
    is_read: number;
    created_at: string;
    sender_username: string | null;
    sender_image: string | null;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 15 seconds for new notifications
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (notificationId?: number) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationId ? { notificationId } : { markAllAsRead: true })
            });
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'mention': return '💬';
            case 'github': return '🔔';
            case 'system': return '⚙️';
            default: return '📢';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 animate-fade-in-up max-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Notifikasi</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAsRead()}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Check size={14} /> Tandai Semua
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Bell size={48} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Belum ada notifikasi</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition ${!notif.is_read ? 'bg-blue-50/30' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-lg">
                                            {notif.sender_image ? (
                                                <img src={notif.sender_image} className="w-full h-full rounded-full object-cover" alt="" />
                                            ) : (
                                                getNotificationIcon(notif.type)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 mb-1">{notif.message}</p>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-400">
                                                    {new Date(notif.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={() => markAsRead(notif.id)}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Tandai dibaca
                                                    </button>
                                                )}
                                            </div>
                                            {notif.link && (
                                                <Link
                                                    href={notif.link}
                                                    onClick={() => {
                                                        markAsRead(notif.id);
                                                        setIsOpen(false);
                                                    }}
                                                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                                >
                                                    Lihat →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

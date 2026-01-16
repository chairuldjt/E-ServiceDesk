'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export function LayoutContent({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (!user) {
        return <main className="min-h-screen">{children}</main>;
    }

    return (
        <div className="flex min-h-screen relative bg-slate-50">
            {/* Mobile Header / Toggle */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <span className="text-xl">☰</span>
                    </button>
                    <h1 className="font-bold text-slate-800 tracking-tight">E-ServiceDesk</h1>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                </div>
            </div>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 w-full min-w-0 overflow-auto">
                <div className="lg:p-0 pt-[60px] lg:pt-0">
                    {children}
                </div>
            </main>
        </div>
    );
}

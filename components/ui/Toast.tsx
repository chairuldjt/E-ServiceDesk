import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: number) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id);
        }, 3000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const variants = {
        success: {
            bg: 'from-emerald-600 to-teal-600',
            icon: '✅',
            title: 'Success'
        },
        error: {
            bg: 'from-red-600 to-rose-600',
            icon: '❌',
            title: 'Error'
        },
        info: {
            bg: 'from-blue-600 to-indigo-600',
            icon: 'ℹ️',
            title: 'Information'
        },
        warning: {
            bg: 'from-amber-500 to-orange-600',
            icon: '⚠️',
            title: 'Warning'
        },
    };

    const variant = variants[toast.type];

    return (
        <div className={`bg-gradient-to-r ${variant.bg} text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-auto mb-4`}>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl shrink-0">
                {variant.icon}
            </div>
            <div className="flex-1">
                <p className="font-black text-sm uppercase tracking-widest">{variant.title}</p>
                <p className="text-white/90 text-xs font-bold">{toast.message}</p>
            </div>
            <button
                onClick={() => onClose(toast.id)}
                className="ml-2 text-white/60 hover:text-white text-2xl transition-colors shrink-0"
            >
                &times;
            </button>
        </div>
    );
};

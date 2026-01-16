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

    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500',
    };

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️',
    };

    return (
        <div className={`${bgColors[toast.type]} text-white px-6 py-3 rounded-lg shadow-lg mb-4 flex items-center gap-3 min-w-[300px] animate-fade-in-up transform transition-all duration-300`}>
            <span className="text-xl">{icons[toast.type]}</span>
            <p className="font-medium flex-1">{toast.message}</p>
            <button onClick={() => onClose(toast.id)} className="text-white/80 hover:text-white font-bold ml-4">
                &times;
            </button>
        </div>
    );
};

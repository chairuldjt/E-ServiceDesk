'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
export { CustomDropdown } from './CustomDropdown';

export interface ActionItem {
    label: string;
    icon: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface PremiumActionDropdownProps {
    trigger: React.ReactNode;
    items: ActionItem[];
    className?: string;
}

export function PremiumActionDropdown({ trigger, items, className = '' }: PremiumActionDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Try to align to the right of the trigger
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.right + window.scrollX - 200,
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className={`relative inline-block ${className}`} ref={triggerRef}>
            <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: '200px',
                            zIndex: 9999,
                        }}
                        className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="py-1">
                            {items.map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        item.onClick();
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-5 py-3 text-left text-sm font-bold flex items-center gap-3 transition-colors ${item.variant === 'danger'
                                        ? 'text-red-600 hover:bg-red-50'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

interface PremiumCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    gradient?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
}

const gradients = {
    blue: 'from-blue-50 to-indigo-50 border-blue-100',
    emerald: 'from-emerald-50 to-teal-50 border-emerald-100',
    amber: 'from-amber-50 to-yellow-50 border-amber-100',
    purple: 'from-purple-50 to-pink-50 border-purple-100',
    slate: 'from-slate-50 to-gray-50 border-slate-100',
};

export function PremiumCard({ children, className = '', hover = true, gradient }: PremiumCardProps) {
    const baseClasses = gradient
        ? `bg-gradient-to-br ${gradients[gradient]} border-2`
        : 'bg-white border border-slate-100';

    const hoverClasses = hover ? 'hover:shadow-xl transition-all' : '';

    return (
        <div className={`${baseClasses} rounded-[2rem] shadow-lg ${hoverClasses} ${className}`}>
            {children}
        </div>
    );
}

interface PremiumButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const buttonVariants = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-200',
    secondary: 'bg-gradient-to-r from-slate-600 to-gray-600 hover:shadow-slate-200',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-red-200',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-200',
};

const buttonSizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
};

export function PremiumButton({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    disabled = false,
    className = '',
    size = 'md',
}: PremiumButtonProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${buttonVariants[variant]} ${buttonSizes[size]} text-white rounded-full hover:shadow-xl transition-all font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {children}
        </button>
    );
}

interface PremiumInputProps {
    label?: string;
    type?: string;
    name?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

export function PremiumInput({
    label,
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    className = '',
}: PremiumInputProps) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className="w-full px-6 py-3.5 border-2 border-slate-200 rounded-full focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium disabled:bg-slate-50 disabled:cursor-not-allowed shadow-sm"
            />
        </div>
    );
}

interface PremiumTextareaProps {
    label?: string;
    name?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    rows?: number;
    className?: string;
}

export function PremiumTextarea({
    label,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    rows = 4,
    className = '',
}: PremiumTextareaProps) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                rows={rows}
                className="w-full px-8 py-6 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium resize-none disabled:bg-slate-50 disabled:cursor-not-allowed shadow-sm"
            />
        </div>
    );
}

interface PremiumSelectProps {
    label?: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    required?: boolean;
}

export function PremiumSelect({
    label,
    value,
    onChange,
    children,
    className = '',
    disabled = false,
    required = false,
}: PremiumSelectProps) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">
                    {label}
                </label>
            )}
            <div className="relative group/select">
                <select
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    required={required}
                    className="w-full px-6 py-3.5 bg-white border-2 border-slate-200 rounded-full focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 shadow-sm relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {children}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within/select:text-blue-500 transition-colors z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

interface PremiumBadgeProps {
    children: React.ReactNode;
    variant?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'slate';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const badgeVariants = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

const badgeSizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
};

export function PremiumBadge({ children, variant = 'blue', size = 'md', className = '' }: PremiumBadgeProps) {
    return (
        <span
            className={`${badgeVariants[variant]} ${badgeSizes[size]} rounded-xl font-black uppercase tracking-widest border-2 inline-block ${className}`}
        >
            {children}
        </span>
    );
}

interface PageHeaderProps {
    icon: string;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 shadow-xl">
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-200">
                    {icon}
                </div>
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    {subtitle && <p className="text-slate-500 font-medium mt-1">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex gap-3">{actions}</div>}
        </div>
    );
}

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const modalSizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
};

export function PremiumModal({ isOpen, onClose, title, children, size = 'md' }: PremiumModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${modalSizes[size]} overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white flex justify-between items-center">
                    <h2 className="text-2xl font-black">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-2xl"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-8 overflow-y-auto flex-1">{children}</div>
            </div>
        </div>
    );
}

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Cari...', className = '' }: SearchBarProps) {
    return (
        <div className={`relative group ${className}`}>
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg
                    className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-full py-4 pl-12 pr-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
            />
        </div>
    );
}

interface PremiumAlertProps {
    children: React.ReactNode;
    variant?: 'blue' | 'emerald' | 'amber' | 'red';
    icon?: string;
    action?: React.ReactNode;
}

const alertVariants = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
};

export function PremiumAlert({ children, variant = 'blue', icon, action }: PremiumAlertProps) {
    return (
        <div className={`${alertVariants[variant]} border-2 p-5 rounded-3xl flex items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top duration-500`}>
            <div className="flex items-center gap-4">
                {icon && <span className="text-2xl">{icon}</span>}
                <div className="text-sm font-semibold leading-relaxed">
                    {children}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

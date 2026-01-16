import React from 'react';

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
            className={`${buttonVariants[variant]} ${buttonSizes[size]} text-white rounded-2xl hover:shadow-xl transition-all font-bold flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {children}
        </button>
    );
}

interface PremiumInputProps {
    label?: string;
    type?: string;
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
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
        </div>
    );
}

interface PremiumTextareaProps {
    label?: string;
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
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                rows={rows}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
        </div>
    );
}

interface PremiumBadgeProps {
    children: React.ReactNode;
    variant?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'slate';
    size?: 'sm' | 'md' | 'lg';
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

export function PremiumBadge({ children, variant = 'blue', size = 'md' }: PremiumBadgeProps) {
    return (
        <span
            className={`${badgeVariants[variant]} ${badgeSizes[size]} rounded-xl font-black uppercase tracking-widest border-2 inline-block`}
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
                className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm font-medium"
            />
        </div>
    );
}

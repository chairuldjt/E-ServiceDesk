'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CustomDropdownProps {
    label?: string;
    value: string | number;
    onChange: (value: string) => void;
    options: { value: string | number; label: string }[];
    className?: string;
    disabled?: boolean;
    placeholder?: string;
}

export function CustomDropdown({
    label,
    value,
    onChange,
    options,
    className = '',
    disabled = false,
    placeholder = 'Pilih...',
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Update dropdown position when opened
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={className}>
            {label && (
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest pl-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {/* Dropdown Button */}
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full px-6 py-3.5 bg-white border border-slate-200 rounded-full focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-sm text-slate-700 text-left flex items-center justify-between shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed ${isOpen ? 'ring-4 ring-blue-100 border-blue-500' : ''
                        }`}
                >
                    <span className={selectedOption ? 'text-slate-700' : 'text-slate-400'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''} ${isOpen ? 'text-blue-500' : 'text-slate-400'
                            }`}
                    >
                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                    </svg>
                </button>

                {/* Dropdown List - Rendered via Portal */}
                {isOpen &&
                    createPortal(
                        <div
                            ref={dropdownRef}
                            style={{
                                position: 'absolute',
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
                                width: `${dropdownPosition.width}px`,
                                zIndex: 9999,
                            }}
                            className="bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        >
                            <div className="max-h-[240px] overflow-y-auto custom-scrollbar py-1">
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(String(option.value));
                                            setIsOpen(false);
                                        }}
                                        className={`w-full px-6 py-3 text-left font-medium transition-all text-sm ${option.value === value
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-slate-700 hover:bg-slate-50'
                                            } first:rounded-t-3xl last:rounded-b-3xl`}
                                    >
                                        {option.label}
                                        {option.value === value && (
                                            <span className="float-right text-blue-600">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>,
                        document.body
                    )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 100px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}

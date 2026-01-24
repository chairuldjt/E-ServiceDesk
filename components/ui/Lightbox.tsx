'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface LightboxProps {
    images: string[];
    initialIndex: number;
    onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    };

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length, onClose]);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50 group"
            >
                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 sm:left-10 p-4 bg-white/5 hover:bg-white/15 rounded-full text-white transition-all z-50 group border border-white/10"
                    >
                        <ChevronLeft size={32} />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 sm:right-10 p-4 bg-white/5 hover:bg-white/15 rounded-full text-white transition-all z-50 group border border-white/10"
                    >
                        <ChevronRight size={32} />
                    </button>
                </>
            )}

            {/* Main Image */}
            <div className="relative max-w-5xl max-h-[85vh] w-full mx-4 flex items-center justify-center">
                <img
                    src={images[currentIndex]}
                    alt={`Image ${currentIndex + 1}`}
                    className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                />

                {/* Image Counter Badge */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-4 py-1 bg-white/10 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/10">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>

            {/* Thumbnail Strip (Optional, for more premium feel) */}
            {images.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto pb-2 no-scrollbar">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentIndex(idx);
                            }}
                            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${currentIndex === idx ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent opacity-40 hover:opacity-100'
                                }`}
                        >
                            <img src={img} className="w-full h-full object-cover" alt="" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

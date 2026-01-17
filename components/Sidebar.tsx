'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const isActive = (path: string) => {
    // Priority 1: Exact Match
    if (pathname === path) return true;

    // Priority 2: Sub-path match, but ONLY if there isn't a better match in menuItems
    if (path !== '/' && pathname?.startsWith(path + '/')) {
      const isBetterMatchExist = menuItems.some(item =>
        item.path !== path && item.path.startsWith(path) && pathname?.startsWith(item.path)
      );
      return !isBetterMatchExist;
    }

    return false;
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Logbook', path: '/logbook', icon: '📔' },
    { name: 'Monitoring', path: '/monitoring', icon: '📡' },
    { name: 'Order', path: '/monitoring/verify', icon: '🎫' },
    { name: 'Notepad', path: '/notepad', icon: '📝' },
  ];

  if (user.role === 'admin') {
    menuItems.push({ name: 'Admin', path: '/admin', icon: '🔐' });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out lg:relative ${isOpen ? 'translate-x-0 ml-0 shadow-xl' : '-translate-x-full lg:-ml-64 shadow-none'
        }`}>
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700/50 shrink-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20 border border-white/10 group">
              <span className="group-hover:rotate-12 transition-transform duration-300">⚡</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black bg-gradient-to-r from-white via-blue-200 to-teal-200 bg-clip-text text-transparent leading-none">
                E-ServiceDesk
              </h1>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Internal Hub</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Main Menu
          </p>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive(item.path)
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
            >
              {isActive(item.path) && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"></div>
              )}
              <span className={`text-xl transition-transform duration-200 group-hover:scale-110 relative z-10`}>
                {item.icon}
              </span>
              <span className="font-bold relative z-10">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Footer Info */}
        <div className="p-6 border-t border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-medium uppercase tracking-widest">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>© 2026 E-ServiceDesk</span>
          </div>
        </div>
      </aside>
    </>
  );
}

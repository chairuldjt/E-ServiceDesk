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
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname === path || (path !== '/' && pathname?.startsWith(path + '/'));
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Monitoring', path: '/monitoring', icon: '📡' },
    { name: 'Verif Order', path: '/monitoring/verify', icon: '🛡️' },
    { name: 'Logbook', path: '/logbook', icon: '📔' },
    { name: 'Notepad', path: '/notepad', icon: '📝' },
  ];

  if (user.role === 'admin') {
    menuItems.push({ name: 'Admin', path: '/admin', icon: '🛡️' });
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out lg:relative ${isOpen ? 'translate-x-0 ml-0 shadow-xl' : '-translate-x-full lg:-ml-64 shadow-none'
        }`}>
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              E-ServiceDesk
            </h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-colors"
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive(item.path)
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <span className={`text-xl transition-transform duration-200 group-hover:scale-110`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Footer Info */}
        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-medium uppercase tracking-widest">
            <span>© 2026 E-ServiceDesk</span>
          </div>
        </div>
      </aside>
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FolderOpen, FileText, MessageSquare,
  Scale, FilePen, MessageCircle, Users, Vote,
  Shield, User, Settings, LogOut, Sun, Moon, Menu, X,
  Search, Bell
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Översikt', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mina ärenden', href: '/cases', icon: FolderOpen },
  { name: 'Dokument', href: '/documents', icon: FileText },
  { name: 'AI-assistent', href: '/ai-chat', icon: MessageSquare },
  { name: 'Rättspraxis', href: '/legal-cases', icon: Scale },
  { name: 'Överklaganden', href: '/appeals', icon: FilePen },
  { name: 'Forum', href: '/forum', icon: MessageCircle },
  { name: 'Juristnätverk', href: '/jurists', icon: Users },
  { name: 'Namninsamlingar', href: '/petitions', icon: Vote },
];

const adminNav = [
  { name: 'Adminpanel', href: '/admin', icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, theme, toggleTheme } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white dark:bg-slate-800 shadow-md"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
        'transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Scale size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Rättighets</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">plattformen</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  )}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 px-3">Admin</p>
                </div>
                {adminNav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <item.icon size={18} />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <button onClick={toggleTheme} className="sidebar-link w-full">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}
            </button>
            <Link href="/profile" onClick={() => setIsMobileOpen(false)} className="sidebar-link">
              <User size={18} />
              Profil
            </Link>
            <button onClick={handleLogout} className="sidebar-link w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut size={18} />
              Logga ut
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
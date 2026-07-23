'use client';

import { useEffect, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/store';

export function Providers({ children }: { children: ReactNode }) {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const toggleTheme = useAuthStore((state) => state.toggleTheme);
  const theme = useAuthStore((state) => state.theme);

  useEffect(() => {
    fetchUser();
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, [fetchUser]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#1e293b' : '#fff',
            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
            border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
          },
        }}
      />
      {children}
    </>
  );
}
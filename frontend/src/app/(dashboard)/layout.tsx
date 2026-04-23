'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header }  from '@/components/layout/Header';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router          = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady]       = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // localStorage is synchronous — always available after mount,
    // no Zustand hydration timing issues.
    const token = localStorage.getItem('taj_access_token');
    setHasToken(!!token);
    setReady(true);
  }, []);

  // Redirect only when both the token and Zustand state are gone (true logout).
  useEffect(() => {
    if (!ready) return;
    const token = localStorage.getItem('taj_access_token');
    if (!isAuthenticated && !token) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) return null;
  if (!hasToken && !isAuthenticated) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

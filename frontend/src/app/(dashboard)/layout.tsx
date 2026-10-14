'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { Dock }   from '@/components/layout/Dock';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router          = useRouter();
  const pathname        = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHome          = pathname === '/';

  // Le middleware Next.js protège les routes via cookie ; ce useEffect gère
  // la déconnexion dynamique en cours de session.
  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem('taj_access_token')) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <main
        className={cn(
          'flex-1 min-w-0 overflow-auto',
          isHome ? '' : 'p-4 md:p-6 bg-background print:p-0 print:overflow-visible',
        )}
      >
        {children}
      </main>
      {!isHome && <Dock />}
    </div>
  );
}

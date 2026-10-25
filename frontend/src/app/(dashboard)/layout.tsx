'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Dock }   from '@/components/layout/Dock';
import { useAuthStore } from '@/stores/auth.store';
import { canAccessModule, moduleKeyFromPath, ALL_MODULE_KEYS } from '@/lib/modules';
import { cn } from '@/lib/utils';

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <Lock className="w-7 h-7 text-destructive" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Accès non autorisé</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Vous n&apos;avez pas accès à ce module. Contactez un administrateur si vous pensez que c&apos;est une erreur.
        </p>
      </div>
      <Link href="/" className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium inline-flex items-center hover:bg-primary/90 transition-colors">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router          = useRouter();
  const pathname        = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const me              = useAuthStore((s) => s.user);
  const isHome          = pathname === '/';

  const moduleK = moduleKeyFromPath(pathname);
  const isModuleRoute = !!moduleK && ALL_MODULE_KEYS.includes(moduleK);
  const denied = isModuleRoute && !canAccessModule(me, moduleK);

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
          isHome ? '' : 'p-4 md:p-6 pb-28 bg-background print:p-0 print:overflow-visible',
        )}
      >
        {denied ? <AccessDenied /> : children}
      </main>
      {!isHome && <Dock />}
    </div>
  );
}

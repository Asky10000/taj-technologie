'use client';

import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ROUTE_LABELS: Record<string, string> = {
  '/':           'Tableau de bord',
  '/crm':        'CRM',
  '/inventory':  'Inventaire',
  '/sales':      'Ventes',
  '/suppliers':  'Fournisseurs',
  '/tickets':    'Tickets',
  '/projects':   'Projets',
  '/users':      'Utilisateurs',
  '/reports':    'Rapports',
  '/settings':   'Paramètres',
};

export function Header() {
  const pathname  = usePathname();
  const { theme, setTheme } = useTheme();

  const title = ROUTE_LABELS[pathname] ?? 'TAJ Technologie';

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4">
      <div className="flex-1">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>

      {/* Recherche globale */}
      <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground w-56">
        <Search className="w-4 h-4 flex-shrink-0" />
        <span>Recherche rapide…</span>
        <kbd className="ml-auto text-[10px] border border-border rounded px-1 py-0.5 font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Thème */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'w-9 h-9 rounded-md border border-input flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
        )}
        title="Changer de thème"
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>

      {/* Notifications */}
      <button
        className={cn(
          'relative w-9 h-9 rounded-md border border-input flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
        )}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
      </button>
    </header>
  );
}

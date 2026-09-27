'use client';

import { useEffect, useState } from 'react';
import { Search, Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CommandPalette } from './CommandPalette';
import { NotificationsMenu } from './NotificationsMenu';

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

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname  = usePathname();
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const title = ROUTE_LABELS[pathname] ?? 'TAJ Technologie';

  // Raccourci ⌘K / Ctrl+K pour ouvrir la recherche
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-4 gap-3 flex-shrink-0">
      {/* Hamburger — mobile uniquement */}
      <button
        onClick={onMenuClick}
        className={cn(
          'lg:hidden w-9 h-9 rounded-md border border-input flex items-center justify-center flex-shrink-0',
          'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
        )}
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
      </div>

      {/* Recherche globale — desktop */}
      <button
        onClick={() => setPaletteOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground w-56 flex-shrink-0 hover:border-ring/50 hover:text-foreground transition-colors"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span>Recherche rapide…</span>
        <kbd className="ml-auto text-[10px] border border-border rounded px-1 py-0.5 font-mono">⌘K</kbd>
      </button>

      {/* Recherche — mobile (icône) */}
      <button
        onClick={() => setPaletteOpen(true)}
        className="md:hidden w-9 h-9 rounded-md border border-input flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Rechercher"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Thème */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'w-9 h-9 rounded-md border border-input flex items-center justify-center flex-shrink-0',
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
      <NotificationsMenu />
    </header>

    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

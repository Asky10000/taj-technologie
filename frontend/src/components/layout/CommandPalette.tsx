'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, CornerDownLeft, LayoutDashboard, Building2, Package,
  Warehouse, FileText, Truck, Ticket, FolderKanban, Users, BarChart3,
  Settings, Loader2, Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/useCrm';
import { useProducts } from '@/hooks/useInventory';
import { useQuotes } from '@/hooks/useSales';

interface CommandPaletteProps {
  open:    boolean;
  onClose: () => void;
}

interface Item {
  key:      string;
  group:    string;
  label:    string;
  sublabel?: string;
  href:     string;
  icon:     React.ComponentType<{ className?: string }>;
}

const NAV: Item[] = [
  { key: 'nav-home',      group: 'Navigation', label: 'Tableau de bord', href: '/',           icon: LayoutDashboard },
  { key: 'nav-crm',       group: 'Navigation', label: 'CRM',             href: '/crm',        icon: Building2 },
  { key: 'nav-products',  group: 'Navigation', label: 'Produits',        href: '/products',   icon: Package },
  { key: 'nav-inventory', group: 'Navigation', label: 'Inventaire',      href: '/inventory',  icon: Warehouse },
  { key: 'nav-sales',     group: 'Navigation', label: 'Ventes',          href: '/sales',      icon: FileText },
  { key: 'nav-suppliers', group: 'Navigation', label: 'Fournisseurs',    href: '/suppliers',  icon: Truck },
  { key: 'nav-tickets',   group: 'Navigation', label: 'Tickets',         href: '/tickets',    icon: Ticket },
  { key: 'nav-projects',  group: 'Navigation', label: 'Projets',         href: '/projects',   icon: FolderKanban },
  { key: 'nav-users',     group: 'Navigation', label: 'Utilisateurs',    href: '/users',      icon: Users },
  { key: 'nav-reports',   group: 'Navigation', label: 'Rapports',        href: '/reports',    icon: BarChart3 },
  { key: 'nav-settings',  group: 'Navigation', label: 'Paramètres',      href: '/settings',   icon: Settings },
];

function useDebounced(value: string, delay = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(query.trim());
  const hasQuery = debounced.length >= 2;

  // Reset à l'ouverture
  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  // Verrouille le scroll du body
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Données existantes (uniquement quand la palette est montée)
  const { data: customers, isFetching: fc } = useCustomers({ search: hasQuery ? debounced : undefined, limit: 6 });
  const { data: products,  isFetching: fp } = useProducts({ search: hasQuery ? debounced : undefined, limit: 6 });
  const { data: quotes,    isFetching: fq } = useQuotes({ search: hasQuery ? debounced : undefined, limit: 6 });

  const items = useMemo<Item[]>(() => {
    const q = debounced.toLowerCase();
    const nav = NAV.filter((n) => !q || n.label.toLowerCase().includes(q));
    if (!hasQuery) return nav;

    const custItems: Item[] = (customers?.items ?? []).map((c: any) => ({
      key: `cust-${c.id}`, group: 'Clients', label: c.name, sublabel: c.code, href: `/crm/${c.id}`, icon: Building2,
    }));
    const prodItems: Item[] = (products?.items ?? []).map((p: any) => ({
      key: `prod-${p.id}`, group: 'Produits', label: p.name, sublabel: p.sku, href: '/products', icon: Package,
    }));
    const quoteItems: Item[] = (quotes?.items ?? []).map((qt: any) => ({
      key: `quote-${qt.id}`, group: 'Devis', label: qt.number, sublabel: qt.customer?.name, href: `/sales/quotes/${qt.id}`, icon: Receipt,
    }));
    return [...nav, ...custItems, ...prodItems, ...quoteItems];
  }, [debounced, hasQuery, customers, products, quotes]);

  useEffect(() => { setActive(0); }, [items.length]);

  const go = (item?: Item) => {
    const target = item ?? items[active];
    if (!target) return;
    router.push(target.href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    // Enter est géré par le <form onSubmit> pour une compatibilité maximale
  };

  if (!open) return null;

  const loading = hasQuery && (fc || fp || fq);
  let flatIndex = -1;
  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Champ de recherche */}
        <form
          onSubmit={(e) => { e.preventDefault(); go(); }}
          className="flex items-center gap-3 px-4 h-14 border-b border-border"
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher un client, produit, devis…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Résultats */}
        <div className="max-h-[52vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-center text-muted-foreground">
              {hasQuery ? 'Aucun résultat' : 'Tapez au moins 2 caractères pour rechercher'}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-1">
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                {items.filter((i) => i.group === group).map((item) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.key}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        idx === active ? 'bg-accent' : 'hover:bg-accent/60',
                      )}
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-foreground truncate">{item.label}</span>
                        {item.sublabel && <span className="block text-xs text-muted-foreground truncate">{item.sublabel}</span>}
                      </span>
                      {idx === active && <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Pied */}
        <div className="flex items-center gap-4 px-4 h-9 border-t border-border text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↑</kbd><kbd className="border border-border rounded px-1">↓</kbd> naviguer</span>
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↵</kbd> ouvrir</span>
          <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
}

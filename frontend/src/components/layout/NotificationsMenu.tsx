'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, Package, Receipt, Ticket, Truck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardReport } from '@/hooks/useReports';

type Level = 'danger' | 'warning' | 'info';

interface Alert {
  key:   string;
  level: Level;
  label: string;
  href:  string;
  icon:  React.ComponentType<{ className?: string }>;
}

const LEVEL_COLOR: Record<Level, string> = {
  danger:  'text-red-400',
  warning: 'text-amber-400',
  info:    'text-[hsl(var(--ring))]',
};

/** Construit des alertes à partir des indicateurs réels du tableau de bord. */
function buildAlerts(d: any): Alert[] {
  if (!d) return [];
  const a: Alert[] = [];
  const plural = (n: number) => (n > 1 ? 's' : '');

  if (d.sales?.overdueCount > 0)
    a.push({ key: 'overdue', level: 'danger', icon: Receipt, href: '/sales/invoices',
      label: `${d.sales.overdueCount} facture${plural(d.sales.overdueCount)} en retard` });
  if (d.inventory?.outOfStock > 0)
    a.push({ key: 'oos', level: 'danger', icon: Package, href: '/inventory',
      label: `${d.inventory.outOfStock} produit${plural(d.inventory.outOfStock)} en rupture de stock` });
  if (d.inventory?.lowStock > 0)
    a.push({ key: 'low', level: 'warning', icon: Package, href: '/inventory',
      label: `${d.inventory.lowStock} produit${plural(d.inventory.lowStock)} en stock bas` });
  if (d.tickets?.critical > 0)
    a.push({ key: 'crit', level: 'danger', icon: Ticket, href: '/tickets',
      label: `${d.tickets.critical} ticket${plural(d.tickets.critical)} critique${plural(d.tickets.critical)}` });
  if (d.tickets?.slaBreached > 0)
    a.push({ key: 'sla', level: 'warning', icon: AlertTriangle, href: '/tickets',
      label: `SLA dépassé sur ${d.tickets.slaBreached} ticket${plural(d.tickets.slaBreached)}` });
  if (d.purchases?.pendingOrders > 0)
    a.push({ key: 'po', level: 'info', icon: Truck, href: '/suppliers/orders',
      label: `${d.purchases.pendingOrders} commande${plural(d.purchases.pendingOrders)} fournisseur en attente` });

  return a;
}

export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useDashboardReport();
  const alerts = buildAlerts(data);

  // Fermer au clic extérieur / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative w-9 h-9 rounded-md border border-input flex items-center justify-center',
          'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
          open && 'bg-accent text-foreground',
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 h-12 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {alerts.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Aucune alerte — tout est à jour.</p>
              </div>
            ) : (
              alerts.map((al) => (
                <button
                  key={al.key}
                  onClick={() => { router.push(al.href); setOpen(false); }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/60 last:border-0 hover:bg-accent/60 transition-colors"
                >
                  <al.icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', LEVEL_COLOR[al.level])} />
                  <span className="text-sm text-foreground leading-snug">{al.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

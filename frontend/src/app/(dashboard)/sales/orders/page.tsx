'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Loader2, FileText } from 'lucide-react';
import { useOrders, useUpdateOrderStatus, useGenerateInvoice } from '@/hooks/useSales';
import { Badge }       from '@/components/ui/Badge';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/sales.types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  CONFIRMED:      { label: 'Confirmée',      variant: 'info' },
  IN_PREPARATION: { label: 'En préparation', variant: 'warning' },
  SHIPPED:        { label: 'Expédiée',       variant: 'info' },
  DELIVERED:      { label: 'Livrée',         variant: 'success' },
  CANCELLED:      { label: 'Annulée',        variant: 'default' },
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  CONFIRMED:      'IN_PREPARATION',
  IN_PREPARATION: 'SHIPPED',
  SHIPPED:        'DELIVERED',
  DELIVERED:      null,
  CANCELLED:      null,
};

const TRANSITION_LABELS: Partial<Record<OrderStatus, string>> = {
  IN_PREPARATION: 'En préparation',
  SHIPPED:        'Expédier',
  DELIVERED:      'Marquer livré',
};

export default function OrdersPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');

  const { data, isLoading, isFetching } = useOrders({ page, limit: 20, search: search || undefined, status: status || undefined });
  const updateStatus    = useUpdateOrderStatus();
  const generateInvoice = useGenerateInvoice();

  const FILTER_OPTIONS: { label: string; value: OrderStatus | '' }[] = [
    { label: 'Toutes',          value: '' },
    { label: 'Confirmées',      value: 'CONFIRMED' },
    { label: 'En préparation',  value: 'IN_PREPARATION' },
    { label: 'Expédiées',       value: 'SHIPPED' },
    { label: 'Livrées',         value: 'DELIVERED' },
  ];

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Référence, client…" className="w-56" />
          <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-background">
            {FILTER_OPTIONS.map((f) => (
              <button key={f.value} onClick={() => { setStatus(f.value); setPage(1); }}
                className={cn('px-3 py-1 rounded text-xs font-medium transition-colors',
                  status === f.value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}>
                {f.label}
              </button>
            ))}
          </div>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Liste */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 items-center">
                <div className="h-3.5 w-28 bg-muted rounded animate-pulse" />
                <div className="flex-1 h-3 w-40 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={ShoppingCart} title="Aucune commande" description="Les commandes apparaîtront ici après conversion d'un devis." />
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['RÉFÉRENCE','CLIENT','TOTAL TTC','DATE LIVRAISON','STATUT','ACTIONS'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {data.items.map((order) => {
                const sc         = STATUS_CONFIG[order.status];
                const nextStatus = STATUS_TRANSITIONS[order.status];
                const isDelivered = order.status === 'DELIVERED';
                return (
                  <div key={order.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors">
                    <Link href={`/dashboard/sales/orders/${order.id}`} className="text-sm font-medium text-primary hover:underline">
                      {order.code}
                    </Link>
                    <div>
                      <p className="text-sm text-foreground">{order.customer?.companyName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(order.totalTTC)}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.deliveredAt ? formatDate(order.deliveredAt) : '—'}
                    </span>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                    <div className="flex items-center gap-1.5">
                      {nextStatus && (
                        <button
                          onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                          disabled={updateStatus.isPending}
                          className="h-7 px-2.5 text-xs rounded-md border border-input hover:bg-accent transition-colors disabled:opacity-50"
                        >
                          {TRANSITION_LABELS[nextStatus] ?? nextStatus}
                        </button>
                      )}
                      {isDelivered && (
                        <button
                          onClick={() => generateInvoice.mutate(order.id)}
                          disabled={generateInvoice.isPending}
                          title="Générer la facture"
                          className="h-7 px-2.5 text-xs rounded-md bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {generateInvoice.isPending
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <FileText className="w-3 h-3" />}
                          Facture
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border px-5">
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

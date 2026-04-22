'use client';

import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Loader2, Activity } from 'lucide-react';
import { useMovements } from '@/hooks/useInventory';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge }       from '@/components/ui/Badge';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import type { MovementType } from '@/types/inventory.types';

const TYPE_CONFIG: Record<MovementType, {
  label: string;
  variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline';
  icon: React.ElementType;
  sign: string;
  color: string;
}> = {
  IN:         { label: 'Entrée',     variant: 'success', icon: ArrowDownCircle, sign: '+', color: 'text-emerald-600' },
  OUT:        { label: 'Sortie',     variant: 'danger',  icon: ArrowUpCircle,   sign: '−', color: 'text-red-600' },
  ADJUSTMENT: { label: 'Ajustement', variant: 'warning', icon: RefreshCw,       sign: '±', color: 'text-amber-600' },
  RESERVE:    { label: 'Réservé',    variant: 'info',    icon: ArrowUpCircle,   sign: '−', color: 'text-blue-600' },
  RELEASE:    { label: 'Libéré',     variant: 'outline', icon: ArrowDownCircle, sign: '+', color: 'text-slate-600' },
};

const FILTER_OPTIONS: { label: string; value: MovementType | '' }[] = [
  { label: 'Tous',        value: '' },
  { label: 'Entrées',     value: 'IN' },
  { label: 'Sorties',     value: 'OUT' },
  { label: 'Ajustements', value: 'ADJUSTMENT' },
];

export default function MovementsPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [type,   setType]   = useState<MovementType | ''>('');

  const { data, isLoading, isFetching } = useMovements({ page, limit: 30, search: search || undefined, type: type || undefined });

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Produit, référence…" className="w-56" />
        <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-background">
          {FILTER_OPTIONS.map((f) => (
            <button key={f.value} onClick={() => { setType(f.value); setPage(1); }}
              className={cn('px-3 py-1 rounded text-xs font-medium transition-colors',
                type === f.value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}>
              {f.label}
            </button>
          ))}
        </div>
        {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 items-center">
                <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
                <div className="flex-1 h-3 w-40 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={Activity} title="Aucun mouvement" description="Les mouvements de stock apparaîtront ici." />
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['TYPE','PRODUIT','QTÉ','AVANT','APRÈS','COÛT UNIT.','DATE'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {data.items.map((mv) => {
                const tc   = TYPE_CONFIG[mv.type];
                const Icon = tc.icon;
                return (
                  <div key={mv.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 items-center hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn('w-4 h-4', tc.color)} />
                      <Badge variant={tc.variant}>{tc.label}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{mv.stock?.product?.name ?? '—'}</p>
                      <div className="flex items-center gap-2">
                        {mv.stock?.product?.reference && (
                          <span className="text-xs text-muted-foreground font-mono">{mv.stock.product.reference}</span>
                        )}
                        {mv.reference && (
                          <span className="text-xs text-muted-foreground">· {mv.reference}</span>
                        )}
                        {mv.notes && (
                          <span className="text-xs text-muted-foreground italic truncate max-w-[160px]">{mv.notes}</span>
                        )}
                      </div>
                    </div>
                    <span className={cn('text-sm font-semibold tabular-nums', tc.color)}>
                      {tc.sign}{mv.quantity}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{mv.quantityBefore}</span>
                    <span className="text-xs font-medium tabular-nums">{mv.quantityAfter}</span>
                    <span className="text-sm tabular-nums">
                      {mv.unitCost ? formatCurrency(mv.unitCost) : '—'}
                    </span>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatDate(mv.createdAt)}</p>
                      {mv.createdBy && (
                        <p className="text-xs text-muted-foreground">
                          {mv.createdBy.firstName} {mv.createdBy.lastName}
                        </p>
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

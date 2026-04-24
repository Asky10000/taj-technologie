'use client';

import { useState } from 'react';
import { Package, Loader2, AlertTriangle, TrendingDown } from 'lucide-react';
import { useStocks, useAdjustStock } from '@/hooks/useInventory';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatCurrency, cn } from '@/lib/utils';

type AdjType = 'IN' | 'OUT' | 'ADJUSTMENT';

const ADJ_CONFIG: Record<AdjType, { label: string; color: string }> = {
  IN:         { label: 'Entrée',     color: 'text-emerald-600' },
  OUT:        { label: 'Sortie',     color: 'text-red-600' },
  ADJUSTMENT: { label: 'Ajustement', color: 'text-amber-600' },
};

export default function StocksPage() {
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [lowStock, setLowStock] = useState(false);

  const [adjModal,  setAdjModal]  = useState<string | null>(null);
  const [adjType,   setAdjType]   = useState<AdjType>('IN');
  const [adjQty,    setAdjQty]    = useState(1);
  const [adjCost,   setAdjCost]   = useState(0);
  const [adjNotes,  setAdjNotes]  = useState('');
  const [adjRef,    setAdjRef]    = useState('');

  const { data, isLoading, isFetching } = useStocks({ page, limit: 20, search: search || undefined, lowStock: lowStock || undefined });
  const adjust = useAdjustStock();

  const openModal = (id: string) => {
    setAdjModal(id);
    setAdjType('IN');
    setAdjQty(1);
    setAdjCost(0);
    setAdjNotes('');
    setAdjRef('');
  };

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Produit, référence…" className="w-full sm:w-56" />
          <button
            onClick={() => { setLowStock((p) => !p); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors',
              lowStock ? 'bg-amber-500/10 border-amber-500 text-amber-600' : 'border-input text-muted-foreground hover:text-foreground',
            )}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Stock bas
          </button>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 items-center">
                <div className="h-3.5 w-36 bg-muted rounded animate-pulse" />
                <div className="flex-1 h-3 w-24 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={Package} title="Aucun stock" description="Les stocks apparaîtront ici." />
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['PRODUIT','RÉFÉ.','QTÉ DISPO','RÉSERVÉ','SEUIL','P.M.P.','VALEUR','ACTION'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {data.items.map((stock) => {
                const isLow = stock.quantity <= stock.minQuantity && stock.minQuantity > 0;
                return (
                  <div key={stock.id} className={cn(
                    'grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors',
                    isLow && 'bg-amber-50/50 dark:bg-amber-950/20',
                  )}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        <p className="text-sm font-medium text-foreground">{stock.product?.name ?? '—'}</p>
                      </div>
                      {stock.product?.category && (
                        <p className="text-xs text-muted-foreground">{stock.product.category.name}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{stock.product?.reference ?? '—'}</span>
                    <span className={cn('text-sm font-semibold tabular-nums', isLow ? 'text-amber-600' : 'text-foreground')}>
                      {stock.availableQuantity}
                      {stock.product?.unit && <span className="text-xs text-muted-foreground ml-1">{stock.product.unit}</span>}
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">{stock.reservedQuantity}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{stock.minQuantity}</span>
                    <span className="text-sm tabular-nums">{formatCurrency(stock.avgCostPrice)}</span>
                    <span className="text-sm font-medium tabular-nums">{formatCurrency(stock.totalValue)}</span>
                    <button
                      onClick={() => openModal(stock.id)}
                      className="h-7 px-2.5 text-xs rounded-md border border-input hover:bg-accent transition-colors whitespace-nowrap"
                    >
                      Ajuster
                    </button>
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

      {/* Modal ajustement */}
      <Modal open={!!adjModal} onClose={() => setAdjModal(null)} title="Ajuster le stock" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!adjModal) return;
            await adjust.mutateAsync({
              id: adjModal,
              type: adjType,
              quantity: adjQty,
              unitCost: adjCost || undefined,
              notes: adjNotes || undefined,
              reference: adjRef || undefined,
            });
            setAdjModal(null);
          }}
          className="space-y-4"
        >
          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type de mouvement <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {(['IN', 'OUT', 'ADJUSTMENT'] as AdjType[]).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setAdjType(t)}
                  className={cn(
                    'h-9 rounded-md border text-xs font-medium transition-colors',
                    adjType === t ? 'bg-primary text-white border-primary' : 'border-input hover:bg-accent',
                  )}
                >
                  {ADJ_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantité */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantité <span className="text-destructive">*</span></label>
            <input
              required type="number" min={0.001} step={0.5}
              value={adjQty}
              onChange={(e) => setAdjQty(+e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Coût unitaire (optionnel pour IN) */}
          {adjType === 'IN' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Coût unitaire (FCFA)</label>
              <input
                type="number" min={0} step={0.01}
                value={adjCost || ''}
                onChange={(e) => setAdjCost(+e.target.value)}
                placeholder="Laissez vide pour garder le P.M.P."
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Référence */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Référence</label>
            <input
              value={adjRef}
              onChange={(e) => setAdjRef(e.target.value)}
              placeholder="N° bon, commande…"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              rows={2}
              value={adjNotes}
              onChange={(e) => setAdjNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setAdjModal(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={adjust.isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {adjust.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Valider
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

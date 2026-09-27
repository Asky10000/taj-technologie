'use client';

import { useState } from 'react';
import {
  Package, Loader2, AlertTriangle, TrendingDown,
  ExternalLink, ArrowDownCircle, ArrowUpCircle,
  RefreshCw, Plus, History,
} from 'lucide-react';
import Link from 'next/link';
import { useStocks, useAdjustStock, useMovements } from '@/hooks/useInventory';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { Badge }       from '@/components/ui/Badge';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import type { Stock, MovementType } from '@/types/inventory.types';

/* ─── Config types de mouvement ──────────────────────────────── */
type AdjType = 'IN' | 'OUT' | 'ADJUSTMENT';

const MOV_CONFIG: Record<MovementType, {
  label: string;
  variant: 'success' | 'danger' | 'warning' | 'outline' | 'info';
  icon: React.ReactNode;
  sign: string;
}> = {
  IN:         { label: 'Entrée',      variant: 'success', icon: <ArrowDownCircle className="w-3.5 h-3.5" />, sign: '+' },
  OUT:        { label: 'Sortie',      variant: 'danger',  icon: <ArrowUpCircle   className="w-3.5 h-3.5" />, sign: '-' },
  ADJUSTMENT: { label: 'Ajustement', variant: 'warning', icon: <RefreshCw       className="w-3.5 h-3.5" />, sign: '±' },
  RESERVE:    { label: 'Réservé',    variant: 'info',    icon: <Package         className="w-3.5 h-3.5" />, sign: '-' },
  RELEASE:    { label: 'Libéré',     variant: 'outline', icon: <Package         className="w-3.5 h-3.5" />, sign: '+' },
};

/* ─── Page principale ────────────────────────────────────────── */
export default function InventoryPage() {
  const [tab, setTab] = useState<'stocks' | 'movements'>('stocks');

  return (
    <div className="space-y-5">
      {/* Onglets */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: 'stocks',    label: 'Stocks',     icon: Package },
          { key: 'movements', label: 'Mouvements', icon: History },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'stocks'    && <StocksTab    />}
      {tab === 'movements' && <MovementsTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Onglet STOCKS
═══════════════════════════════════════════════════════════════ */
function StocksTab() {
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [adjState, setAdjState] = useState<{ stock: Stock; type: AdjType } | null>(null);

  const { data, isLoading, isFetching } = useStocks({
    page, limit: 20,
    search: search || undefined,
    lowStock: lowStock || undefined,
  });

  const openAdj = (stock: Stock, type: AdjType = 'IN') => setAdjState({ stock, type });
  const closeAdj = () => setAdjState(null);

  return (
    <>
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Produit, référence…"
            className="w-full sm:w-56"
          />
          <button
            onClick={() => { setLowStock((p) => !p); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors',
              lowStock
                ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                : 'border-input text-muted-foreground hover:text-foreground',
            )}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Stock bas
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
          <EmptyState icon={Package} title="Aucun stock" description="Les stocks apparaîtront ici une fois des produits créés." />
        ) : (
          <>
            {/* Header desktop */}
            <div className="hidden md:grid grid-cols-[1fr_80px_80px_70px_70px_100px_110px_120px] gap-3 px-5 py-2.5 border-b bg-muted/30">
              {['PRODUIT','QTÉ DISPO','RÉSERVÉ','SEUIL','P.M.P.','VALEUR','MOUVEMENT'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-border">
              {data.items.map((stock) => {
                const isLow = stock.quantity <= stock.minQuantity && stock.minQuantity > 0;
                return (
                  <div key={stock.id}>
                    {/* Desktop */}
                    <div className={cn(
                      'hidden md:grid grid-cols-[1fr_80px_80px_70px_70px_100px_110px_120px] gap-3 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors',
                      isLow && 'bg-amber-50/50 dark:bg-amber-950/20',
                    )}>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          {stock.productId ? (
                            <Link href={`/products?highlight=${stock.productId}`}
                              className="text-sm font-medium hover:text-primary hover:underline flex items-center gap-1 group">
                              {stock.product?.name ?? '—'}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </Link>
                          ) : (
                            <p className="text-sm font-medium">{stock.product?.name ?? '—'}</p>
                          )}
                        </div>
                        {stock.product?.category && (
                          <p className="text-xs text-muted-foreground">{stock.product.category.name}</p>
                        )}
                      </div>
                      <span className={cn('text-sm font-semibold tabular-nums', isLow ? 'text-amber-600' : '')}>
                        {stock.availableQuantity}
                        {stock.product?.unit && <span className="text-xs text-muted-foreground ml-1">{stock.product.unit}</span>}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">{stock.reservedQuantity}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{stock.minQuantity}</span>
                      <span className="text-sm tabular-nums">{formatCurrency(stock.avgCostPrice)}</span>
                      <span className="text-sm font-medium tabular-nums">{formatCurrency(stock.totalValue)}</span>
                      {/* Boutons mouvement rapide */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openAdj(stock, 'IN')}
                          title="Entrée de stock"
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 transition-colors"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openAdj(stock, 'OUT')}
                          title="Sortie de stock"
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 transition-colors"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openAdj(stock, 'ADJUSTMENT')}
                          title="Ajustement inventaire"
                          className="h-7 w-7 flex items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className={cn(
                      'md:hidden px-4 py-3 space-y-2 hover:bg-accent/20 transition-colors',
                      isLow && 'bg-amber-50/50 dark:bg-amber-950/20',
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          <p className="text-sm font-medium truncate">{stock.product?.name ?? '—'}</p>
                        </div>
                        <span className={cn('text-sm font-bold tabular-nums flex-shrink-0', isLow ? 'text-amber-600' : 'text-foreground')}>
                          {stock.availableQuantity} {stock.product?.unit ?? ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground space-x-3">
                          <span>Réservé: {stock.reservedQuantity}</span>
                          <span>PMP: {formatCurrency(stock.avgCostPrice)}</span>
                        </div>
                        <button
                          onClick={() => openAdj(stock, 'IN')}
                          className="flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Mouvement
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border px-5">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal mouvement */}
      {adjState && (
        <MovementModal
          stock={adjState.stock}
          initialType={adjState.type}
          onClose={closeAdj}
          onSuccess={closeAdj}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Modal création de mouvement
═══════════════════════════════════════════════════════════════ */
function MovementModal({ stock, initialType = 'IN', onClose, onSuccess }: {
  stock: Stock;
  initialType?: AdjType;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [adjType,  setAdjType]  = useState<AdjType>(initialType);
  const [adjQty,   setAdjQty]   = useState(1);
  const [adjCost,  setAdjCost]  = useState(0);
  const [adjNotes, setAdjNotes] = useState('');
  const [adjRef,   setAdjRef]   = useState('');
  const adjust = useAdjustStock();

  const typeConfig: { type: AdjType; label: string; cls: string }[] = [
    { type: 'IN',         label: '↓ Entrée',      cls: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    { type: 'OUT',        label: '↑ Sortie',       cls: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
    { type: 'ADJUSTMENT', label: '± Ajustement',  cls: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  ];

  return (
    <Modal open onClose={onClose} title="Mouvement de stock" size="sm">
      {/* Produit concerné */}
      <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">Produit</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">{stock.product?.name ?? '—'}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>Stock actuel : <strong className="text-foreground">{stock.availableQuantity} {stock.product?.unit ?? ''}</strong></span>
          {stock.minQuantity > 0 && (
            <span>Seuil min : <strong className="text-foreground">{stock.minQuantity}</strong></span>
          )}
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await adjust.mutateAsync({
            id:       stock.id,
            type:     adjType,
            quantity: adjQty,
            unitCost: adjCost || undefined,
            notes:    adjNotes || undefined,
            reference: adjRef || undefined,
          });
          onSuccess();
        }}
        className="space-y-4"
      >
        {/* Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type de mouvement <span className="text-destructive">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {typeConfig.map(({ type, label, cls }) => (
              <button
                key={type}
                type="button"
                onClick={() => setAdjType(type)}
                className={cn(
                  'h-9 rounded-md border text-xs font-medium transition-colors',
                  adjType === type ? cls : 'border-input hover:bg-accent text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantité */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Quantité {adjType === 'ADJUSTMENT' ? '(inventaire réel)' : ''} <span className="text-destructive">*</span>
          </label>
          <input
            required type="number"
            min={adjType === 'ADJUSTMENT' ? 0 : 1}
            step={1}
            value={adjQty}
            onChange={(e) => setAdjQty(Math.max(adjType === 'ADJUSTMENT' ? 0 : 1, Math.trunc(+e.target.value)))}
            onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {adjType === 'ADJUSTMENT' && (
            <p className="text-xs text-muted-foreground">Entrez la quantité réelle constatée (résultat d'un inventaire physique).</p>
          )}
        </div>

        {/* Coût unitaire (entrées uniquement) */}
        {adjType === 'IN' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Coût unitaire (FCFA)</label>
            <input
              type="number" min={0} step={1}
              value={adjCost || ''}
              onChange={(e) => setAdjCost(Math.max(0, Math.trunc(+e.target.value)))}
              onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
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
            placeholder="N° bon livraison, commande, inventaire…"
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
            placeholder="Motif, observations…"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose}
            className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={adjust.isPending}
            className={cn(
              'h-9 px-5 rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-2 text-white transition-colors',
              adjType === 'IN'         ? 'bg-emerald-600 hover:bg-emerald-700' :
              adjType === 'OUT'        ? 'bg-red-600 hover:bg-red-700' :
                                        'bg-amber-600 hover:bg-amber-700',
            )}
          >
            {adjust.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {adjType === 'IN' ? 'Enregistrer l\'entrée' : adjType === 'OUT' ? 'Enregistrer la sortie' : 'Valider l\'ajustement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Onglet MOUVEMENTS
═══════════════════════════════════════════════════════════════ */
function MovementsTab() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [type,   setType]   = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const { data, isLoading, isFetching } = useMovements({
    page, limit: 30,
    search:  search || undefined,
    type:    type   || undefined,
  });

  const TYPES = [
    { value: '',           label: 'Tous' },
    { value: 'IN',         label: 'Entrées' },
    { value: 'OUT',        label: 'Sorties' },
    { value: 'ADJUSTMENT', label: 'Ajustements' },
  ];

  return (
    <>
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Produit, référence…"
            className="w-full sm:w-56"
          />
          <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-background">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setType(t.value); setPage(1); }}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  type === t.value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Table mouvements */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 items-center">
                <div className="h-3.5 w-20 bg-muted rounded animate-pulse" />
                <div className="flex-1 h-3 w-32 bg-muted rounded animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={History} title="Aucun mouvement" description="Les mouvements de stock apparaîtront ici." />
        ) : (
          <>
            {/* Header desktop */}
            <div className="hidden md:grid grid-cols-[130px_1fr_90px_80px_120px_1fr_100px] gap-3 px-5 py-2.5 border-b bg-muted/30">
              {['DATE','PRODUIT','TYPE','QUANTITÉ','AVANT → APRÈS','RÉFÉRENCE / NOTES','OPÉRATEUR'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-border">
              {data.items.map((mv) => {
                const cfg = MOV_CONFIG[mv.type] ?? MOV_CONFIG.ADJUSTMENT;
                const qtyColor =
                  mv.type === 'IN'  || mv.type === 'RELEASE'  ? 'text-emerald-600' :
                  mv.type === 'OUT' || mv.type === 'RESERVE'  ? 'text-red-600' :
                  'text-amber-600';

                return (
                  <div key={mv.id}>
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-[130px_1fr_90px_80px_120px_1fr_100px] gap-3 px-5 py-3 items-center hover:bg-accent/20 transition-colors">
                      <div>
                        <p className="text-xs font-medium text-foreground">{formatDate(mv.createdAt)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelativeTime(mv.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {mv.stock?.product?.name ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{mv.stock?.product?.reference ?? ''}</p>
                      </div>
                      <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
                        {cfg.icon} {cfg.label}
                      </Badge>
                      <span className={cn('text-sm font-semibold tabular-nums', qtyColor)}>
                        {cfg.sign}{mv.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {mv.quantityBefore} → <strong className="text-foreground">{mv.quantityAfter}</strong>
                      </span>
                      <div className="min-w-0">
                        {mv.reference && <p className="text-xs font-medium text-foreground truncate">{mv.reference}</p>}
                        {mv.notes     && <p className="text-xs text-muted-foreground truncate">{mv.notes}</p>}
                        {!mv.reference && !mv.notes && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {mv.createdBy ? `${mv.createdBy.firstName} ${mv.createdBy.lastName}` : '—'}
                      </p>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden px-4 py-3 space-y-1.5 hover:bg-accent/20 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{mv.stock?.product?.name ?? '—'}</p>
                        <Badge variant={cfg.variant} className="flex items-center gap-1 flex-shrink-0">
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(mv.createdAt)}</span>
                        <span className={cn('font-semibold', qtyColor)}>{cfg.sign}{mv.quantity}</span>
                      </div>
                      {(mv.reference || mv.notes) && (
                        <p className="text-xs text-muted-foreground truncate">{mv.reference ?? mv.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border px-5">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

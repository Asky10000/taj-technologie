'use client';

import { useState } from 'react';
import { ShoppingBag, Plus, Loader2, Truck, CreditCard } from 'lucide-react';
import {
  usePurchaseOrders, useCreatePurchaseOrder, useSuppliers,
  useUpdatePurchaseOrderStatus, useReceiveGoods, useRecordPurchasePayment,
} from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useInventory';
import { Badge }       from '@/components/ui/Badge';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import type { PurchaseOrderStatus, PurchaseOrderLine } from '@/types/supplier.types';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:              { label: 'Brouillon',      variant: 'outline' },
  SENT:               { label: 'Envoyé',         variant: 'info' },
  CONFIRMED:          { label: 'Confirmé',       variant: 'info' },
  PARTIALLY_RECEIVED: { label: 'Part. reçu',     variant: 'warning' },
  RECEIVED:           { label: 'Reçu',           variant: 'success' },
  CANCELLED:          { label: 'Annulé',         variant: 'default' },
};

const STATUS_NEXT: Partial<Record<PurchaseOrderStatus, { next: PurchaseOrderStatus; label: string }>> = {
  DRAFT:     { next: 'SENT',      label: 'Envoyer' },
  SENT:      { next: 'CONFIRMED', label: 'Confirmer' },
};

type EmptyLine = Omit<PurchaseOrderLine, 'id' | 'receivedQuantity' | 'product'>;

const emptyLine = (): EmptyLine => ({ designation: '', quantity: 1, unitPrice: 0, taxRate: 20 });

const FILTER_OPTIONS: { label: string; value: PurchaseOrderStatus | '' }[] = [
  { label: 'Tous',       value: '' },
  { label: 'Brouillon',  value: 'DRAFT' },
  { label: 'Confirmés',  value: 'CONFIRMED' },
  { label: 'En attente', value: 'PARTIALLY_RECEIVED' },
  { label: 'Reçus',      value: 'RECEIVED' },
];

export default function PurchaseOrdersPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');

  // Création
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ supplierId: '', expectedDeliveryDate: '', notes: '' });
  const [createLines, setCreateLines] = useState<EmptyLine[]>([emptyLine()]);

  // Réception
  const [receiveModal, setReceiveModal] = useState<string | null>(null);
  const [receiveLines, setReceiveLines] = useState<{ lineId: string; designation: string; ordered: number; received: number; toReceive: number }[]>([]);

  // Paiement
  const [payModal,  setPayModal]  = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payRef,    setPayRef]    = useState('');

  const { data, isLoading, isFetching } = usePurchaseOrders({ page, limit: 20, search: search || undefined, status: status || undefined });
  const { data: suppliersData } = useSuppliers({ limit: 100 });
  const { data: productsData }  = useProducts();
  const products = productsData?.items ?? [];
  const createMutation  = useCreatePurchaseOrder();
  const updateStatus    = useUpdatePurchaseOrderStatus();
  const receiveMutation = useReceiveGoods();
  const payMutation     = useRecordPurchasePayment();

  const openReceive = (order: { id: string; lines?: PurchaseOrderLine[] }) => {
    setReceiveLines((order.lines ?? []).map((l) => ({
      lineId:      l.id!,
      designation: l.designation,
      ordered:     l.quantity,
      received:    l.receivedQuantity ?? 0,
      toReceive:   l.quantity - (l.receivedQuantity ?? 0),
    })));
    setReceiveModal(order.id);
  };

  const updateLine = (i: number, patch: Partial<EmptyLine>) =>
    setCreateLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const totalTTC = createLines.reduce((s, l) => {
    const ht = l.quantity * l.unitPrice;
    return s + ht * (1 + l.taxRate / 100);
  }, 0);

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Référence, fournisseur…" className="w-full sm:w-56" />
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
        <button onClick={() => { setCreateForm({ supplierId: '', expectedDeliveryDate: '', notes: '' }); setCreateLines([emptyLine()]); setShowCreate(true); }}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nouveau BC
        </button>
      </div>

      {/* Table */}
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
          <EmptyState icon={ShoppingBag} title="Aucun bon de commande" description="Créez un bon de commande pour commencer." />
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['RÉFÉRENCE','FOURNISSEUR','TOTAL TTC','PAYÉ','RESTE','LIVRAISON','STATUT / ACTIONS'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {data.items.map((order) => {
                const sc         = STATUS_CONFIG[order.status];
                const transition = STATUS_NEXT[order.status];
                const canReceive = ['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(order.status);
                const canPay     = ['CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(order.status) && order.remainingAmount > 0;
                return (
                  <div key={order.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors">
                    <span className="text-sm font-medium text-primary font-mono">{order.code}</span>
                    <div>
                      <p className="text-sm text-foreground">{order.supplier?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(order.totalTTC)}</span>
                    <span className="text-sm text-emerald-600">{formatCurrency(order.paidAmount)}</span>
                    <span className={cn('text-sm font-medium', order.remainingAmount > 0 ? 'text-foreground' : 'text-emerald-600')}>
                      {formatCurrency(order.remainingAmount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '—'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      {transition && (
                        <button onClick={() => updateStatus.mutate({ id: order.id, status: transition.next })}
                          disabled={updateStatus.isPending}
                          className="h-7 px-2.5 text-xs rounded-md border border-input hover:bg-accent transition-colors disabled:opacity-50">
                          {transition.label}
                        </button>
                      )}
                      {canReceive && (
                        <button onClick={() => openReceive(order)}
                          className="w-7 h-7 flex items-center justify-center rounded border border-input hover:bg-accent transition-colors text-muted-foreground"
                          title="Réceptionner des marchandises">
                          <Truck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canPay && (
                        <button onClick={() => { setPayModal(order.id); setPayAmount(order.remainingAmount); setPayRef(''); }}
                          className="w-7 h-7 flex items-center justify-center rounded border border-input hover:bg-accent transition-colors text-muted-foreground"
                          title="Enregistrer un paiement">
                          <CreditCard className="w-3.5 h-3.5" />
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

      {/* ── Modal création ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau bon de commande" size="xl">
        <form onSubmit={async (e) => {
          e.preventDefault();
          await createMutation.mutateAsync({
            supplierId: createForm.supplierId,
            ...(createForm.expectedDeliveryDate ? { expectedDeliveryDate: createForm.expectedDeliveryDate } : {}),
            ...(createForm.notes ? { notes: createForm.notes } : {}),
            lines: createLines,
          });
          setShowCreate(false);
        }} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fournisseur <span className="text-destructive">*</span></label>
              <select required value={createForm.supplierId}
                onChange={(e) => setCreateForm((p) => ({ ...p, supplierId: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Sélectionner —</option>
                {(suppliersData?.items ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Livraison prévue</label>
              <input type="date" value={createForm.expectedDeliveryDate}
                onChange={(e) => setCreateForm((p) => ({ ...p, expectedDeliveryDate: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <input value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Lignes */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">Lignes de commande</h3>
            <div className="grid grid-cols-[1fr_60px_90px_60px_32px] gap-2 px-1">
              {['Désignation','Qté','P.U. HT','TVA%',''].map((h) => (
                <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase">{h}</span>
              ))}
            </div>
            {createLines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_90px_60px_32px] gap-2 items-center">
                <select
                  value={line.designation}
                  onChange={(e) => {
                    const selected = products.find((p) => p.name === e.target.value);
                    updateLine(i, {
                      designation: e.target.value,
                      unitPrice:   selected ? Math.round(selected.sellingPrice) : line.unitPrice,
                      taxRate:     selected ? Math.round(selected.taxRate)      : line.taxRate,
                    });
                  }}
                  className="h-8 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Produit —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>{p.name} ({p.sku})</option>
                  ))}
                  {line.designation && !products.find((p) => p.name === line.designation) && (
                    <option value={line.designation}>{line.designation}</option>
                  )}
                </select>
                <input type="number" min={1} step={1} value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: Math.max(1, Math.trunc(+e.target.value) || 1) })}
                  onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                  className="h-8 px-2 rounded border border-input bg-background text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring" />
                <input type="number" min={0} step={1} value={line.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: Math.max(0, Math.trunc(+e.target.value)) })}
                  onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                  className="h-8 px-2 rounded border border-input bg-background text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring" />
                <input type="number" min={0} max={100} step={1} value={line.taxRate}
                  onChange={(e) => updateLine(i, { taxRate: Math.min(100, Math.max(0, Math.trunc(+e.target.value))) })}
                  onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                  className="h-8 px-2 rounded border border-input bg-background text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring" />
                <button type="button" onClick={() => setCreateLines((p) => p.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-lg leading-none">
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setCreateLines((p) => [...p, emptyLine()])}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
            </button>
            <div className="border-t border-border pt-2 flex justify-end">
              <span className="text-sm font-bold text-primary">Total TTC : {formatCurrency(totalTTC)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={createMutation.isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer le BC
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal réception ── */}
      <Modal open={!!receiveModal} onClose={() => setReceiveModal(null)} title="Réceptionner des marchandises" size="md">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!receiveModal) return;
          await receiveMutation.mutateAsync({
            id: receiveModal,
            lines: receiveLines
              .filter((l) => l.toReceive > 0)
              .map((l) => ({ lineId: l.lineId, receivedQuantity: l.toReceive })),
          });
          setReceiveModal(null);
        }} className="space-y-4">
          <p className="text-sm text-muted-foreground">Indiquez les quantités effectivement reçues pour chaque ligne.</p>
          <div className="space-y-3">
            {receiveLines.map((line, i) => (
              <div key={line.lineId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{line.designation}</p>
                  <p className="text-xs text-muted-foreground">Commandé : {line.ordered} · Déjà reçu : {line.received}</p>
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-xs text-muted-foreground">À réceptionner</label>
                  <input
                    type="number" min={0} max={line.ordered - line.received} step={1}
                    value={line.toReceive}
                    onChange={(e) => setReceiveLines((prev) => prev.map((l, idx) => idx === i ? { ...l, toReceive: +e.target.value } : l))}
                    className="w-20 h-8 px-2 rounded border border-input bg-background text-sm text-right focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setReceiveModal(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={receiveMutation.isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {receiveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Valider la réception
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal paiement ── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Enregistrer un paiement" size="sm">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!payModal) return;
          await payMutation.mutateAsync({ id: payModal, amount: payAmount, ...(payRef ? { reference: payRef } : {}) });
          setPayModal(null);
        }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Montant (FCFA) <span className="text-destructive">*</span></label>
            <input required type="number" min={0.01} step={0.01} value={payAmount}
              onChange={(e) => setPayAmount(+e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Référence</label>
            <input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="N° virement, chèque, reçu…"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setPayModal(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={payMutation.isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {payMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

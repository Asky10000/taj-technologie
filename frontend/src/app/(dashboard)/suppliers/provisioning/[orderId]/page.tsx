'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, PackageCheck, Store } from 'lucide-react';
import {
  useOrderProvisioning, useSuppliers, useGeneratePurchaseOrders,
} from '@/hooks/useSuppliers';
import { Badge }      from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils';
import type { ProvisionOrderLine } from '@/types/supplier.types';

interface LineAssignment {
  supplierId: string;
  unitPrice: number;
  quantity: number;
}

const defaultPrice = (line: ProvisionOrderLine): number =>
  Math.round(Number(line.product?.costPrice ?? line.unitPrice ?? 0));

export default function OrderProvisioningPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { data, isLoading } = useOrderProvisioning(orderId);
  const { data: suppliersData } = useSuppliers({ limit: 100 });
  const generate = useGeneratePurchaseOrders();

  const order = data?.order;
  const generatedPOs = data?.purchaseOrders ?? [];
  const suppliers = useMemo(() => suppliersData?.items ?? [], [suppliersData]);
  const lines = useMemo(() => order?.lines ?? [], [order]);

  const [assignments, setAssignments] = useState<Record<string, LineAssignment>>({});

  // Seed l'état dès que la commande est chargée
  useEffect(() => {
    if (!lines.length) return;
    setAssignments((prev) => {
      if (Object.keys(prev).length) return prev;
      const seed: Record<string, LineAssignment> = {};
      for (const l of lines) {
        seed[l.id] = { supplierId: '', unitPrice: defaultPrice(l), quantity: Number(l.quantity) };
      }
      return seed;
    });
  }, [lines]);

  const patch = (lineId: string, p: Partial<LineAssignment>) =>
    setAssignments((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...p } }));

  // Aperçu : regroupement par fournisseur
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; lines: number; total: number }>();
    for (const l of lines) {
      const a = assignments[l.id];
      if (!a?.supplierId) continue;
      const supplier = suppliers.find((s) => s.id === a.supplierId);
      const total = a.unitPrice * a.quantity * (1 + Number(l.taxRate) / 100);
      const entry = map.get(a.supplierId) ?? { name: supplier?.name ?? '—', lines: 0, total: 0 };
      entry.lines += 1;
      entry.total += total;
      map.set(a.supplierId, entry);
    }
    return Array.from(map.values());
  }, [lines, assignments, suppliers]);

  const assignedCount = Object.values(assignments).filter((a) => a.supplierId).length;

  const handleGenerate = async () => {
    const payload = lines
      .filter((l) => assignments[l.id]?.supplierId)
      .map((l) => ({
        lineId:     l.id,
        supplierId: assignments[l.id].supplierId,
        unitPrice:  assignments[l.id].unitPrice,
        quantity:   assignments[l.id].quantity,
      }));
    if (!payload.length) return;
    await generate.mutateAsync({ orderId, assignments: payload });
    // Réinitialise les attributions traitées
    setAssignments((prev) => {
      const next = { ...prev };
      for (const p of payload) next[p.lineId] = { ...next[p.lineId], supplierId: '' };
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <EmptyState icon={PackageCheck} title="Commande introuvable" description="Cette commande n'existe pas ou a été supprimée." />;
  }

  return (
    <div className="space-y-5">
      <Link href="/suppliers/provisioning" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Commandes à approvisionner
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">
            Approvisionnement <span className="font-mono text-primary">{order.number}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {order.customer?.name ?? '—'} · {formatCurrency(order.totalTTC)}
          </p>
        </div>
      </div>

      {/* Bons de commande déjà générés */}
      {generatedPOs.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-5 py-3.5">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
            Bons de commande déjà générés
          </p>
          <div className="flex flex-wrap gap-2">
            {generatedPOs.map((po) => (
              <Link key={po.id} href={`/suppliers/orders/${po.id}`}
                className="inline-flex items-center gap-1.5 text-xs bg-card border rounded-md px-2.5 py-1 hover:bg-accent transition-colors">
                <span className="font-mono font-medium text-primary">{po.code}</span>
                <span className="text-muted-foreground">· {po.supplier?.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lignes */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_90px_120px_minmax(200px,260px)] px-5 py-2.5 border-b bg-muted/30 text-xs font-semibold text-muted-foreground divide-x divide-border [&>*]:px-3 [&>*:first-child]:pl-0">
          <span>DÉSIGNATION</span>
          <span className="text-right">QTÉ</span>
          <span className="text-right">PRIX ACHAT HT</span>
          <span>FOURNISSEUR</span>
        </div>
        <div className="divide-y divide-border">
          {lines.map((line) => {
            const a = assignments[line.id] ?? { supplierId: '', unitPrice: defaultPrice(line), quantity: Number(line.quantity) };
            return (
              <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_90px_120px_minmax(200px,260px)] px-5 py-3 items-center divide-x divide-border [&>*]:px-3 [&>*:first-child]:pl-0">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{line.description}</p>
                  {line.product?.sku && (
                    <p className="text-xs text-muted-foreground font-mono">{line.product.sku}</p>
                  )}
                </div>
                <input
                  type="number" min={1} step={1} value={a.quantity}
                  onChange={(e) => patch(line.id, { quantity: Math.max(1, Math.trunc(+e.target.value) || 1) })}
                  onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                  className="h-8 px-2 rounded border border-input bg-background text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="number" min={0} step={1} value={a.unitPrice}
                  onChange={(e) => patch(line.id, { unitPrice: Math.max(0, Math.trunc(+e.target.value) || 0) })}
                  onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                  className="h-8 px-2 rounded border border-input bg-background text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <select
                  value={a.supplierId}
                  onChange={(e) => patch(line.id, { supplierId: e.target.value })}
                  className="h-8 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Non attribué —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aperçu groupé par fournisseur + action */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Store className="w-4 h-4 text-muted-foreground" />
          Aperçu des bons de commande à générer
        </div>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Attribuez un fournisseur à au moins une ligne pour générer un bon de commande.
          </p>
        ) : (
          <div className="space-y-2">
            {grouped.map((g) => (
              <div key={g.name} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                <span className="flex items-center gap-2">
                  <Badge variant="info">{g.name}</Badge>
                  <span className="text-muted-foreground text-xs">{g.lines} ligne{g.lines > 1 ? 's' : ''}</span>
                </span>
                <span className="font-semibold">{formatCurrency(g.total)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {assignedCount} ligne{assignedCount > 1 ? 's' : ''} attribuée{assignedCount > 1 ? 's' : ''} · {grouped.length} bon{grouped.length > 1 ? 's' : ''} de commande
          </span>
          <button
            onClick={handleGenerate}
            disabled={generate.isPending || assignedCount === 0}
            className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            {generate.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Générer les bons de commande
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Printer, PackageCheck } from 'lucide-react';
import { usePurchaseOrder } from '@/hooks/useSuppliers';
import { Badge }      from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { PurchaseOrderStatus, PurchaseOrderLine } from '@/types/supplier.types';

const STATUS: Record<PurchaseOrderStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:              { label: 'Brouillon',  variant: 'outline' },
  SENT:               { label: 'Envoyé',     variant: 'info' },
  CONFIRMED:          { label: 'Confirmé',   variant: 'info' },
  PARTIALLY_RECEIVED: { label: 'Part. reçu', variant: 'warning' },
  RECEIVED:           { label: 'Reçu',       variant: 'success' },
  CANCELLED:          { label: 'Annulé',     variant: 'default' },
};

const lineHT = (l: PurchaseOrderLine): number =>
  l.subtotalHT ??
  Math.round(Number(l.quantity) * Number(l.unitPrice) * (1 - Number(l.discountPercent ?? 0) / 100) * 100) / 100;

const lineTTC = (l: PurchaseOrderLine): number =>
  l.totalTTC ?? Math.round(lineHT(l) * (1 + Number(l.taxRate) / 100) * 100) / 100;

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ poId: string }>;
}) {
  const { poId } = use(params);
  const { data: po, isLoading } = usePurchaseOrder(poId);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!po) {
    return <EmptyState icon={PackageCheck} title="Bon de commande introuvable" description="Ce bon de commande n'existe pas ou a été supprimé." />;
  }

  const sc = STATUS[po.status];
  const remaining = Number(po.remainingAmount ?? Number(po.totalTTC) - Number(po.paidAmount));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 no-print">
        <Link href="/suppliers/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux bons de commande
        </Link>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors">
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
        </button>
      </div>

      {/* En-tête */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-semibold font-mono text-primary">{po.code}</h1>
              {sc && <Badge variant={sc.variant}>{sc.label}</Badge>}
            </div>
            <p className="text-sm text-foreground mt-1">{po.supplier?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
              <span>Créé le {formatDate(po.createdAt)}</span>
              {po.expectedDeliveryDate && <span>Livraison prévue : {formatDate(po.expectedDeliveryDate)}</span>}
              {po.receivedAt && <span>Reçu le {formatDate(po.receivedAt)}</span>}
            </p>
            {po.sourceOrder?.number && (
              <p className="text-xs text-muted-foreground mt-1">
                Issu de la commande client{' '}
                <Link href={`/suppliers/provisioning/${po.sourceOrder.id}`} className="font-mono text-primary hover:underline">
                  {po.sourceOrder.number}
                </Link>
              </p>
            )}
          </div>
        </div>
        {po.notes && <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">{po.notes}</p>}
      </div>

      {/* Lignes */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Détail de la commande</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['DÉSIGNATION', 'QTÉ', 'REÇU', 'P.U. HT', 'TVA', 'TOTAL HT', 'TOTAL TTC'].map((h, i) => (
                  <th key={h} className={cn('px-4 py-2.5 text-xs font-semibold text-muted-foreground', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(po.lines ?? []).map((l, i) => (
                <tr key={l.id ?? i} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-foreground">{l.designation}</p>
                    {(l.product?.sku ?? l.product?.reference) && (
                      <p className="text-xs text-muted-foreground font-mono">{l.product?.sku ?? l.product?.reference}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(l.quantity)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{Number(l.receivedQuantity ?? 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(l.unitPrice))}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{Number(l.taxRate)} %</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(lineHT(l))}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(lineTTC(l))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totaux */}
      <div className="flex justify-end">
        <div className="bg-card border rounded-xl p-5 w-full sm:w-80 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span className="tabular-nums">{formatCurrency(Number(po.totalHT))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span className="tabular-nums">{formatCurrency(Number(po.totalTVA))}</span></div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total TTC</span><span className="tabular-nums">{formatCurrency(Number(po.totalTTC))}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Payé</span><span className="tabular-nums text-emerald-500">{formatCurrency(Number(po.paidAmount))}</span></div>
          <div className="flex justify-between font-medium"><span>Reste à payer</span><span className={cn('tabular-nums', remaining > 0 ? 'text-amber-500' : 'text-emerald-500')}>{formatCurrency(remaining)}</span></div>
        </div>
      </div>
    </div>
  );
}

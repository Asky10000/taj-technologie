'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Truck, Printer, Mail } from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/useSuppliers';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { PurchaseOrderStatus } from '@/types/supplier.types';

const STATUS: Record<PurchaseOrderStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:              { label: 'Brouillon',  variant: 'outline' },
  SENT:               { label: 'Envoyé',     variant: 'info' },
  CONFIRMED:          { label: 'Confirmé',   variant: 'info' },
  PARTIALLY_RECEIVED: { label: 'Part. reçu', variant: 'warning' },
  RECEIVED:           { label: 'Reçu',       variant: 'success' },
  CANCELLED:          { label: 'Annulé',     variant: 'default' },
};

export default function SupplierAccountStatementPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = usePurchaseOrders({ supplierId: id, limit: 100 });

  const orders = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [data],
  );
  const supplier = orders[0]?.supplier;

  const totals = orders.reduce(
    (s, po) => ({
      ordered: s.ordered + Number(po.totalTTC),
      paid:    s.paid + Number(po.paidAmount),
      balance: s.balance + Number(po.remainingAmount ?? Number(po.totalTTC) - Number(po.paidAmount)),
    }),
    { ordered: 0, paid: 0, balance: 0 },
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 no-print">
        <Link href="/suppliers/accounts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux comptes fournisseurs
        </Link>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors">
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
        </button>
      </div>

      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{supplier?.name ?? 'Compte fournisseur'}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
              {supplier?.code && <span>{supplier.code}</span>}
              {supplier?.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.email}</span>}
              {supplier?.paymentTermsDays != null && <span>Délai : {supplier.paymentTermsDays} j</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total commandé</p>
          <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatCurrency(totals.ordered)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Payé</p>
          <p className="text-xl font-bold text-emerald-500 mt-1 tabular-nums">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Solde à payer</p>
          <p className={cn('text-xl font-bold mt-1 tabular-nums', totals.balance > 0 ? 'text-amber-400' : 'text-emerald-500')}>{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Relevé des commandes d'achat</h3>
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center text-muted-foreground">Aucune commande pour ce fournisseur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['DATE', 'COMMANDE', 'TOTAL TTC', 'PAYÉ', 'RESTE', 'STATUT'].map((h) => (
                    <th key={h} className={cn('px-5 py-2.5 text-xs font-semibold text-muted-foreground', ['TOTAL TTC', 'PAYÉ', 'RESTE'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((po) => {
                  const remaining = Number(po.remainingAmount ?? Number(po.totalTTC) - Number(po.paidAmount));
                  const sc = STATUS[po.status];
                  return (
                    <tr key={po.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{formatDate(po.createdAt)}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{po.code}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(Number(po.totalTTC))}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-emerald-500">{formatCurrency(Number(po.paidAmount))}</td>
                      <td className={cn('px-5 py-3 text-right font-medium tabular-nums', remaining > 0 ? 'text-amber-400' : 'text-emerald-500')}>{formatCurrency(remaining)}</td>
                      <td className="px-5 py-3">{sc && <Badge variant={sc.variant}>{sc.label}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="px-5 py-3" colSpan={2}>Totaux</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(totals.ordered)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-emerald-500">{formatCurrency(totals.paid)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-amber-400">{formatCurrency(totals.balance)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

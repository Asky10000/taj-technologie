'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Building2, Printer, Mail } from 'lucide-react';
import { useCustomer } from '@/hooks/useCrm';
import { useInvoices } from '@/hooks/useSales';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { InvoiceStatus } from '@/types/sales.types';

const STATUS: Record<InvoiceStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:          { label: 'Brouillon',   variant: 'outline' },
  SENT:           { label: 'Envoyée',     variant: 'info' },
  PARTIALLY_PAID: { label: 'Part. payée', variant: 'warning' },
  PAID:           { label: 'Payée',       variant: 'success' },
  OVERDUE:        { label: 'En retard',   variant: 'danger' },
  CANCELLED:      { label: 'Annulée',     variant: 'default' },
  REFUNDED:       { label: 'Remboursée',  variant: 'outline' },
};

export default function CustomerAccountStatementPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer } = useCustomer(id);
  const { data, isLoading } = useInvoices({ customerId: id, limit: 100 });

  const invoices = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [data],
  );

  const totals = invoices.reduce(
    (s, inv) => ({
      invoiced: s.invoiced + Number(inv.totalTTC),
      paid:     s.paid + Number(inv.paidAmount),
      balance:  s.balance + Number(inv.remainingAmount ?? Number(inv.totalTTC) - Number(inv.paidAmount)),
    }),
    { invoiced: 0, paid: 0, balance: 0 },
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Barre d'action (non imprimée) */}
      <div className="flex items-center justify-between gap-3 no-print">
        <Link href="/sales/accounts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour aux comptes clients
        </Link>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors">
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
        </button>
      </div>

      {/* En-tête compte */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{customer?.name ?? 'Compte client'}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
              {customer?.code && <span>{customer.code}</span>}
              {customer?.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>}
              {customer?.paymentTermsDays != null && <span>Délai : {customer.paymentTermsDays} j</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Soldes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total facturé</p>
          <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatCurrency(totals.invoiced)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Encaissé</p>
          <p className="text-xl font-bold text-emerald-500 mt-1 tabular-nums">{formatCurrency(totals.paid)}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Solde dû</p>
          <p className={cn('text-xl font-bold mt-1 tabular-nums', totals.balance > 0 ? 'text-amber-400' : 'text-emerald-500')}>{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      {/* Relevé des factures */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Relevé des factures</h3>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center text-muted-foreground">Aucune facture pour ce client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['DATE', 'FACTURE', 'ÉCHÉANCE', 'TOTAL TTC', 'PAYÉ', 'RESTE', 'STATUT'].map((h) => (
                    <th key={h} className={cn('px-5 py-2.5 text-xs font-semibold text-muted-foreground', ['TOTAL TTC', 'PAYÉ', 'RESTE'].includes(h) ? 'text-right' : 'text-left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  const remaining = Number(inv.remainingAmount ?? Number(inv.totalTTC) - Number(inv.paidAmount));
                  const sc = STATUS[inv.status];
                  return (
                    <tr key={inv.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{formatDate(inv.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Link href={`/sales/invoices/${inv.id}`} className="text-primary hover:underline font-medium">{inv.number}</Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(Number(inv.totalTTC))}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-emerald-500">{formatCurrency(Number(inv.paidAmount))}</td>
                      <td className={cn('px-5 py-3 text-right font-medium tabular-nums', remaining > 0 ? 'text-amber-400' : 'text-emerald-500')}>{formatCurrency(remaining)}</td>
                      <td className="px-5 py-3"><Badge variant={sc.variant}>{sc.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="px-5 py-3" colSpan={3}>Totaux</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(totals.invoiced)}</td>
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

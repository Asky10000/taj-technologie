'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { useInvoices, useRecordPayment } from '@/hooks/useSales';
import { Badge }       from '@/components/ui/Badge';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import type { InvoiceStatus } from '@/types/sales.types';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:           { label: 'Brouillon',       variant: 'outline' },
  PENDING:         { label: 'En attente',      variant: 'info' },
  PARTIALLY_PAID:  { label: 'Part. payée',     variant: 'warning' },
  PAID:            { label: 'Payée',           variant: 'success' },
  OVERDUE:         { label: 'En retard',       variant: 'danger' },
  CANCELLED:       { label: 'Annulée',         variant: 'default' },
};

export default function InvoicesPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [payModal, setPayModal]     = useState<string | null>(null);
  const [payAmount, setPayAmount]   = useState(0);
  const [payMethod, setPayMethod]   = useState('BANK_TRANSFER');

  const { data, isLoading, isFetching } = useInvoices({ page, limit: 20, search: search || undefined, status: status || undefined });
  const recordPayment = useRecordPayment();

  const FILTER_OPTIONS: { label: string; value: InvoiceStatus | '' }[] = [
    { label: 'Toutes',     value: '' },
    { label: 'En attente', value: 'PENDING' },
    { label: 'En retard',  value: 'OVERDUE' },
    { label: 'Payées',     value: 'PAID' },
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
          <EmptyState icon={FileText} title="Aucune facture" description="Les factures apparaîtront ici." />
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['RÉFÉRENCE','CLIENT','TOTAL TTC','PAYÉ','RESTE','ÉCHÉANCE','STATUT'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {data.items.map((invoice) => {
                const sc = STATUS_CONFIG[invoice.status];
                const isOverdue = invoice.status === 'OVERDUE';
                return (
                  <div key={invoice.id} className={cn(
                    'grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors',
                    isOverdue && 'bg-red-50/50 dark:bg-red-950/20',
                  )}>
                    <div className="flex items-center gap-2">
                      {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                      <Link href={`/sales/invoices/${invoice.id}`} className="text-sm font-medium text-primary hover:underline">
                        {invoice.code}
                      </Link>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{invoice.customer?.companyName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(invoice.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(invoice.totalTTC)}</span>
                    <span className="text-sm text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
                    <span className={cn('text-sm font-medium', invoice.remainingAmount > 0 ? (isOverdue ? 'text-destructive' : 'text-foreground') : 'text-emerald-600')}>
                      {formatCurrency(invoice.remainingAmount)}
                    </span>
                    <span className={cn('text-xs', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      {!['PAID','CANCELLED'].includes(invoice.status) && (
                        <button
                          onClick={() => { setPayModal(invoice.id); setPayAmount(invoice.remainingAmount); }}
                          className="w-7 h-7 flex items-center justify-center rounded border border-input hover:bg-accent hover:text-foreground transition-colors text-muted-foreground"
                          title="Enregistrer un paiement"
                        >
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

      {/* Modal paiement */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Enregistrer un paiement" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!payModal) return;
            await recordPayment.mutateAsync({ id: payModal, amount: payAmount, paymentMethod: payMethod });
            setPayModal(null);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Montant (€) <span className="text-destructive">*</span></label>
            <input
              required type="number" min={0.01} step={0.01}
              value={payAmount}
              onChange={(e) => setPayAmount(+e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mode de paiement</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="BANK_TRANSFER">Virement bancaire</option>
              <option value="CHECK">Chèque</option>
              <option value="CASH">Espèces</option>
              <option value="CARD">Carte bancaire</option>
              <option value="DIRECT_DEBIT">Prélèvement</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setPayModal(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={recordPayment.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {recordPayment.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

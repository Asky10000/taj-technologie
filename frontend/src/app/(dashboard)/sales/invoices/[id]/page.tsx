'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Receipt, Send, CreditCard, Ban, Building2, Calendar, ShoppingCart, AlertTriangle, Printer, Undo2 } from 'lucide-react';
import { useInvoice, useRecordPayment, useSendInvoice, useCancelInvoice, useRefundInvoice } from '@/hooks/useSales';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SaleLinesTable } from '@/components/sales/SaleLinesTable';
import { SaleDocumentPrint } from '@/components/sales/SaleDocumentPrint';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import type { InvoiceStatus } from '@/types/sales.types';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:          { label: 'Brouillon',   variant: 'outline' },
  SENT:           { label: 'Envoyée',     variant: 'info' },
  PARTIALLY_PAID: { label: 'Part. payée', variant: 'warning' },
  PAID:           { label: 'Payée',       variant: 'success' },
  OVERDUE:        { label: 'En retard',   variant: 'danger' },
  CANCELLED:      { label: 'Annulée',     variant: 'default' },
  REFUNDED:       { label: 'Remboursée',  variant: 'outline' },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError } = useInvoice(id);
  const recordPayment = useRecordPayment();
  const sendInvoice   = useSendInvoice();
  const cancelInvoice = useCancelInvoice();
  const refundInvoice = useRefundInvoice();

  const [payOpen, setPayOpen]     = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [refundOpen, setRefundOpen] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (isError || !invoice) {
    return (
      <div className="space-y-4">
        <Link href="/sales/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Retour aux factures</Link>
        <div className="bg-card border rounded-xl p-10 text-center text-muted-foreground">Facture introuvable.</div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[invoice.status];
  const isOverdue = invoice.status === 'OVERDUE';
  const remaining = invoice.remainingAmount ?? Math.round(Number(invoice.totalTTC) - Number(invoice.paidAmount));
  const canPay    = !['PAID', 'CANCELLED', 'REFUNDED'].includes(invoice.status);
  const canSend   = invoice.status === 'DRAFT';
  const canCancel = !['PAID', 'CANCELLED', 'REFUNDED'].includes(invoice.status);
  const canRefund = !['DRAFT', 'CANCELLED', 'REFUNDED'].includes(invoice.status);
  const busy = recordPayment.isPending || sendInvoice.isPending || cancelInvoice.isPending || refundInvoice.isPending;

  const openPay = () => { setPayAmount(remaining); setPayOpen(true); };

  return (
    <>
    <div className="space-y-5 no-print">
      <Link href="/sales/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux factures
      </Link>

      <div className="bg-card border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-semibold text-foreground">{invoice.number}</h1>
                <Badge variant={sc.variant}>{sc.label}</Badge>
                {isOverdue && <AlertTriangle className="w-4 h-4 text-destructive" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Créée {formatRelativeTime(invoice.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors">
              <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
            </button>
            {canSend && (
              <button onClick={() => sendInvoice.mutate(invoice.id)} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> Envoyer
              </button>
            )}
            {canPay && (
              <button onClick={openPay} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-white text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                <CreditCard className="w-3.5 h-3.5" /> Enregistrer un paiement
              </button>
            )}
            {canRefund && (
              <button onClick={() => setRefundOpen(true)} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                <Undo2 className="w-3.5 h-3.5" /> Créer un avoir
              </button>
            )}
            {canCancel && (
              <button onClick={() => cancelInvoice.mutate(invoice.id)} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                <Ban className="w-3.5 h-3.5" /> Annuler
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium text-foreground">{invoice.customer?.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className={cn('w-4 h-4 flex-shrink-0', isOverdue ? 'text-destructive' : 'text-muted-foreground')} />
            <div>
              <p className="text-xs text-muted-foreground">Échéance</p>
              <p className={cn('text-sm font-medium', isOverdue ? 'text-destructive' : 'text-foreground')}>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
            </div>
          </div>
          {invoice.orderId && (
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Commande source</p>
                <Link href={`/sales/orders/${invoice.orderId}`} className="text-sm font-medium text-primary hover:underline">Voir la commande</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Résumé paiement */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total TTC</p>
          <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{formatCurrency(Number(invoice.totalTTC))}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Payé</p>
          <p className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">{formatCurrency(Number(invoice.paidAmount))}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Reste à payer</p>
          <p className={cn('text-xl font-bold mt-1 tabular-nums', remaining > 0 ? (isOverdue ? 'text-destructive' : 'text-foreground') : 'text-emerald-600')}>{formatCurrency(remaining)}</p>
        </div>
      </div>

      <SaleLinesTable lines={invoice.lines ?? []} totalHT={invoice.totalHT} totalTTC={invoice.totalTTC} />

      {invoice.notes && (
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Modal paiement */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Enregistrer un paiement" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await recordPayment.mutateAsync({ id: invoice.id, amount: payAmount, paymentMethod: payMethod });
            setPayOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Montant (FCFA) <span className="text-destructive">*</span></label>
            <input required type="number" min={1} step={1} max={remaining} value={payAmount}
              onChange={(e) => setPayAmount(+e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <p className="text-xs text-muted-foreground">Reste à payer : {formatCurrency(remaining)}</p>
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
            <button type="button" onClick={() => setPayOpen(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={recordPayment.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {recordPayment.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>

    {/* Version imprimable / PDF */}
    <SaleDocumentPrint
      docType="Facture"
      number={invoice.number}
      statusLabel={sc.label}
      customerName={invoice.customer?.name}
      meta={[
        { label: 'Date', value: formatDate(invoice.createdAt) },
        { label: 'Échéance', value: invoice.dueDate ? formatDate(invoice.dueDate) : '—' },
      ]}
      lines={invoice.lines ?? []}
      totalHT={invoice.totalHT}
      totalTTC={invoice.totalTTC}
      notes={invoice.notes}
      payment={{ paid: Number(invoice.paidAmount), remaining }}
    />

    <ConfirmDialog
      open={refundOpen}
      onClose={() => setRefundOpen(false)}
      onConfirm={async () => { await refundInvoice.mutateAsync(invoice.id); setRefundOpen(false); }}
      title="Créer un avoir"
      message={`Créer un avoir pour la facture ${invoice.number} ? Elle passera en « Remboursée » et son montant (${formatCurrency(Number(invoice.totalTTC))}) sortira du chiffre d'affaires.`}
      confirmLabel="Créer l'avoir"
      pending={refundInvoice.isPending}
    />
    </>
  );
}

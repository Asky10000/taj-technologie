'use client';

import { FileText, Image as ImageIcon } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { PAYMENT_METHOD_LABELS } from '@/types/payment.types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mediaUrl } from '@/lib/api';

export function PaymentHistory(props: { invoiceId?: string; purchaseOrderId?: string }) {
  const { data: payments = [], isLoading } = usePayments(props);

  if (isLoading) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  if (payments.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun paiement enregistré.</p>;
  }

  return (
    <div className="space-y-1">
      {payments.map((p) => {
        const isPdf = p.proofUrl?.toLowerCase().endsWith('.pdf');
        return (
          <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            {p.proofUrl ? (
              <a href={mediaUrl(p.proofUrl)} target="_blank" rel="noreferrer" className="flex-shrink-0" title="Voir la preuve">
                {isPdf ? (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.proofUrl)} alt="Preuve" className="w-10 h-10 rounded object-cover border border-border" />
                )}
              </a>
            ) : (
              <div className="w-10 h-10 rounded bg-muted/40 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(p.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(p.paidAt)}
                {p.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[p.paymentMethod]}` : ''}
                {p.reference ? ` · ${p.reference}` : ''}
              </p>
            </div>
            {p.proofUrl && (
              <a href={mediaUrl(p.proofUrl)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex-shrink-0">
                Voir
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

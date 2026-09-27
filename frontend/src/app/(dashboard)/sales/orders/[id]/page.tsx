'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShoppingCart, FileText, Ban, ArrowRight, Building2, Calendar, Truck, Printer, Pencil, Trash2 } from 'lucide-react';
import { useOrder, useUpdateOrderStatus, useGenerateInvoice, useUpdateOrder, useDeleteOrder } from '@/hooks/useSales';
import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/Badge';
import { SaleLinesTable } from '@/components/sales/SaleLinesTable';
import { SaleDocumentPrint } from '@/components/sales/SaleDocumentPrint';
import { SaleEditModal } from '@/components/sales/SaleEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { OrderStatus } from '@/types/sales.types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  PENDING:             { label: 'En attente',    variant: 'outline' },
  CONFIRMED:           { label: 'Confirmée',     variant: 'info' },
  PROCESSING:          { label: 'En traitement', variant: 'warning' },
  PARTIALLY_DELIVERED: { label: 'Part. livrée',  variant: 'warning' },
  DELIVERED:           { label: 'Livrée',        variant: 'success' },
  INVOICED:            { label: 'Facturée',      variant: 'success' },
  CANCELLED:           { label: 'Annulée',       variant: 'default' },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'DELIVERED',
  PARTIALLY_DELIVERED: 'DELIVERED',
  DELIVERED: null,
  INVOICED: null,
  CANCELLED: null,
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Confirmer',
  PROCESSING: 'Passer en traitement',
  DELIVERED: 'Marquer livrée',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading, isError } = useOrder(id);
  const updateStatus    = useUpdateOrderStatus();
  const generateInvoice = useGenerateInvoice();
  const updateOrder     = useUpdateOrder();
  const deleteOrder     = useDeleteOrder();
  const isSuperAdmin    = useAuthStore((s) => s.user?.role) === 'SUPER_ADMIN';
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    await deleteOrder.mutateAsync(id);
    router.push('/sales/orders');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (isError || !order) {
    return (
      <div className="space-y-4">
        <Link href="/sales/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Retour aux commandes</Link>
        <div className="bg-card border rounded-xl p-10 text-center text-muted-foreground">Commande introuvable.</div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[order.status];
  const next = NEXT_STATUS[order.status];
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';
  const editable = !['DELIVERED', 'INVOICED', 'CANCELLED'].includes(order.status);
  const busy = updateStatus.isPending || generateInvoice.isPending;

  const handleInvoice = async () => {
    const inv = await generateInvoice.mutateAsync(order.id);
    if (inv?.id) router.push(`/sales/invoices/${inv.id}`);
  };

  return (
    <>
    <div className="space-y-5 no-print">
      <Link href="/sales/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux commandes
      </Link>

      <div className="bg-card border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-semibold text-foreground">{order.number}</h1>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Créée {formatRelativeTime(order.createdAt)}
                {order.quoteId && <> · issue d'un devis</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors">
              <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
            </button>
            {editable && (
              <button onClick={() => setEditOpen(true)} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                <Pencil className="w-3.5 h-3.5" /> Modifier
              </button>
            )}
            {next && (
              <button onClick={() => updateStatus.mutate({ id: order.id, status: next })} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                <ArrowRight className="w-3.5 h-3.5" /> {NEXT_LABEL[next] ?? next}
              </button>
            )}
            {order.status === 'DELIVERED' && (
              <button onClick={handleInvoice} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-white text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {generateInvoice.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Générer la facture
              </button>
            )}
            {canCancel && (
              <button onClick={() => updateStatus.mutate({ id: order.id, status: 'CANCELLED' })} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                <Ban className="w-3.5 h-3.5" /> Annuler
              </button>
            )}
            {isSuperAdmin && (
              <button onClick={() => setConfirmOpen(true)} disabled={deleteOrder.isPending}
                title="Suppression réservée au super administrateur"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50">
                {deleteOrder.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Supprimer
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium text-foreground">{order.customer?.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Livrée le</p>
              <p className="text-sm font-medium text-foreground">{order.deliveredAt ? formatDate(order.deliveredAt) : '—'}</p>
            </div>
          </div>
          {order.quoteId && (
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Devis source</p>
                <Link href={`/sales/quotes/${order.quoteId}`} className="text-sm font-medium text-primary hover:underline">Voir le devis</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <SaleLinesTable lines={order.lines ?? []} totalHT={order.totalHT} totalTTC={order.totalTTC} />

      {order.notes && (
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>

    {/* Version imprimable / PDF */}
    <SaleDocumentPrint
      docType="Bon de commande"
      number={order.number}
      statusLabel={sc.label}
      customerName={order.customer?.name}
      meta={[
        { label: 'Date', value: formatDate(order.createdAt) },
        { label: 'Livrée le', value: order.deliveredAt ? formatDate(order.deliveredAt) : '—' },
      ]}
      lines={order.lines ?? []}
      totalHT={order.totalHT}
      totalTTC={order.totalTTC}
      notes={order.notes}
    />

    <SaleEditModal
      open={editOpen}
      onClose={() => setEditOpen(false)}
      title={`Modifier la commande ${order.number}`}
      customerName={order.customer?.name}
      initial={{ notes: order.notes, globalDiscountPercent: (order as any).globalDiscountPercent, lines: order.lines ?? [] }}
      pending={updateOrder.isPending}
      onSubmit={async (p) => {
        await updateOrder.mutateAsync({
          id: order.id,
          notes: p.notes,
          globalDiscountPercent: p.globalDiscountPercent,
          lines: p.lines,
        });
        setEditOpen(false);
      }}
    />

    <ConfirmDialog
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      onConfirm={handleDelete}
      title="Supprimer la commande"
      message={`Supprimer définitivement la commande ${order.number} ? Cette action est irréversible.`}
      confirmLabel="Supprimer"
      pending={deleteOrder.isPending}
    />
    </>
  );
}

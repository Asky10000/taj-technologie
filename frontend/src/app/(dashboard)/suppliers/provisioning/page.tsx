'use client';

import Link from 'next/link';
import { PackageSearch, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useOrdersToProvision } from '@/hooks/useSuppliers';
import { Badge }      from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING:             'En attente',
  CONFIRMED:           'Confirmée',
  PROCESSING:          'En traitement',
  PARTIALLY_DELIVERED: 'Part. livrée',
  DELIVERED:           'Livrée',
  INVOICED:            'Facturée',
};

export default function ProvisioningPage() {
  const { data, isLoading } = useOrdersToProvision();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Commandes clients à approvisionner</h1>
        <p className="text-sm text-muted-foreground">
          Attribuez un fournisseur à chaque ligne pour générer les bons de commande d&apos;achat.
        </p>
      </div>

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
        ) : !data?.length ? (
          <EmptyState
            icon={PackageSearch}
            title="Aucune commande à approvisionner"
            description="Les commandes clients validées apparaîtront ici."
          />
        ) : (
          <>
            <div className="grid grid-cols-[150px_minmax(0,1fr)_150px_140px_minmax(160px,auto)] px-5 py-2.5 border-b bg-muted/30 text-xs font-semibold text-muted-foreground divide-x divide-border [&>*]:px-3 [&>*:first-child]:pl-0">
              <span>COMMANDE</span>
              <span>CLIENT</span>
              <span className="text-right">TOTAL TTC</span>
              <span>STATUT</span>
              <span>APPROVISIONNEMENT</span>
            </div>
            <div className="divide-y divide-border">
              {data.map((order) => {
                const provisioned = (order.purchaseOrderCount ?? 0) > 0;
                return (
                  <Link
                    key={order.id}
                    href={`/suppliers/provisioning/${order.id}`}
                    className="grid grid-cols-[150px_minmax(0,1fr)_150px_140px_minmax(160px,auto)] px-5 py-3.5 items-center hover:bg-accent/30 transition-colors divide-x divide-border [&>*]:px-3 [&>*:first-child]:pl-0"
                  >
                    <span className="text-sm font-medium text-primary font-mono">{order.number}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{order.customer?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold text-right">{formatCurrency(order.totalTTC)}</span>
                    <span>
                      <Badge variant="outline">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      {provisioned ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {order.purchaseOrderCount} BC généré{(order.purchaseOrderCount ?? 0) > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">À traiter</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

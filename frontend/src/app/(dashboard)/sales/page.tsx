'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Loader2, ArrowRight } from 'lucide-react';
import { useQuotes, useCreateQuote, useUpdateQuoteStatus, useConvertQuoteToOrder } from '@/hooks/useSales';
import { Badge }           from '@/components/ui/Badge';
import { Pagination }      from '@/components/ui/Pagination';
import { EmptyState }      from '@/components/ui/EmptyState';
import { SearchInput }     from '@/components/ui/SearchInput';
import { Modal }           from '@/components/ui/Modal';
import { SaleLineEditor }  from '@/components/sales/SaleLineEditor';
import { formatCurrency, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import type { QuoteStatus, SaleLine } from '@/types/sales.types';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:     { label: 'Brouillon',  variant: 'outline' },
  SENT:      { label: 'Envoyé',     variant: 'info' },
  ACCEPTED:  { label: 'Accepté',   variant: 'success' },
  REJECTED:  { label: 'Refusé',    variant: 'danger' },
  EXPIRED:   { label: 'Expiré',    variant: 'warning' },
  CONVERTED: { label: 'Converti',  variant: 'success' },
};

const STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT:     ['SENT'],
  SENT:      ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED:  ['CONVERTED'],
  REJECTED:  [],
  EXPIRED:   [],
  CONVERTED: [],
};

export default function QuotesPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customerId: '', validUntil: '', globalDiscount: 0, notes: '',
  });
  const [lines, setLines] = useState<Omit<SaleLine, 'id'>[]>([
    { designation: '', quantity: 1, unitPrice: 0, taxRate: 20, discountPercent: 0 },
  ]);

  const { data, isLoading, isFetching } = useQuotes({ page, limit: 20, search: search || undefined, status: status || undefined });
  const createMutation  = useCreateQuote();
  const updateStatus    = useUpdateQuoteStatus();
  const convertMutation = useConvertQuoteToOrder();

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const FILTER_OPTIONS: { label: string; value: QuoteStatus | '' }[] = [
    { label: 'Tous',      value: '' },
    { label: 'Brouillon', value: 'DRAFT' },
    { label: 'Envoyés',   value: 'SENT' },
    { label: 'Acceptés',  value: 'ACCEPTED' },
  ];

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={handleSearch} placeholder="Référence, client…" className="w-56" />
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
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nouveau devis
        </button>
      </div>

      {/* Liste */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 items-center">
                <div className="h-3.5 w-28 bg-muted rounded animate-pulse" />
                <div className="h-3 w-40 bg-muted rounded animate-pulse flex-1" />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={FileText} title="Aucun devis" description="Créez votre premier devis."
            action={<button onClick={() => setShowModal(true)} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> Nouveau devis</button>} />
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['RÉFÉRENCE','CLIENT','TOTAL TTC','VALIDITÉ','STATUT','ACTIONS'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {data.items.map((quote) => {
                const sc = STATUS_CONFIG[quote.status];
                const transitions = STATUS_TRANSITIONS[quote.status];
                return (
                  <div key={quote.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors">
                    <Link href={`/dashboard/sales/quotes/${quote.id}`} className="text-sm font-medium text-primary hover:underline">{quote.code}</Link>
                    <div>
                      <p className="text-sm text-foreground">{quote.customer?.companyName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(quote.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(quote.totalTTC)}</span>
                    <span className="text-xs text-muted-foreground">
                      {quote.validUntil ? formatDate(quote.validUntil) : '—'}
                    </span>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                    <div className="flex items-center gap-1.5">
                      {transitions.includes('SENT') && (
                        <button onClick={() => updateStatus.mutate({ id: quote.id, status: 'SENT' })}
                          className="h-7 px-2.5 text-xs rounded-md border border-input hover:bg-accent transition-colors">
                          Envoyer
                        </button>
                      )}
                      {transitions.includes('ACCEPTED') && (
                        <button onClick={() => updateStatus.mutate({ id: quote.id, status: 'ACCEPTED' })}
                          className="h-7 px-2.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                          Accepter
                        </button>
                      )}
                      {(transitions.includes('CONVERTED') || quote.status === 'ACCEPTED') && (
                        <button onClick={() => convertMutation.mutate(quote.id)}
                          disabled={convertMutation.isPending}
                          className="h-7 px-2.5 text-xs rounded-md bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Commande
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

      {/* Modal création */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau devis" size="xl">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!lines.length || !lines[0].designation) return;
            await createMutation.mutateAsync({ ...form, lines, globalDiscount: form.globalDiscount || 0 });
            setShowModal(false);
            setForm({ customerId: '', validUntil: '', globalDiscount: 0, notes: '' });
            setLines([{ designation: '', quantity: 1, unitPrice: 0, taxRate: 20, discountPercent: 0 }]);
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">UUID Client <span className="text-destructive">*</span></label>
              <input required value={form.customerId} onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
                placeholder="UUID du client"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valable jusqu'au</label>
              <input type="date" value={form.validUntil} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Remise globale (%)</label>
              <input type="number" min={0} max={100} step={0.5} value={form.globalDiscount || ''}
                onChange={(e) => setForm((p) => ({ ...p, globalDiscount: +e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Lignes */}
          <div className="border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Lignes du devis</h3>
            <SaleLineEditor lines={lines} onChange={setLines} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={createMutation.isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer le devis
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

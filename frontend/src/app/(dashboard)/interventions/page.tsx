'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Wrench, Plus, Loader2 } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { InterventionModal } from '@/components/interventions/InterventionModal';
import { useInterventions } from '@/hooks/useInterventions';
import { formatDate, cn } from '@/lib/utils';
import type { Intervention } from '@/types/intervention.types';

const FILTER_OPTIONS = [
  { label: 'Toutes',    value: '' },
  { label: 'Brouillon', value: 'DRAFT' },
  { label: 'Terminé',   value: 'COMPLETED' },
];

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' }> = {
  COMPLETED: { label: 'Terminé',   variant: 'success' },
  DRAFT:     { label: 'Brouillon', variant: 'warning' },
};

function InterventionsInner() {
  const params = useSearchParams();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Intervention | null>(null);

  const defaultCustomerId = params.get('customer') ?? undefined;

  // Ouverture automatique depuis la fiche client (?new=1&customer=...)
  useEffect(() => {
    if (params.get('new') === '1') { setEditing(null); setModalOpen(true); }
  }, [params]);

  const { data, isLoading, isFetching } = useInterventions({
    page, search: search || undefined, status: status || undefined,
  });

  const openNew  = () => { setEditing(null); setModalOpen(true); };

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Interventions</h2>
          <p className="text-sm text-muted-foreground">Comptes-rendus de visites sur site</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm font-medium">
          <Plus className="w-4 h-4" /> Nouvelle intervention
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="N°, objet, client…" className="w-full sm:w-56" />
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

      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Wrench} title="Aucune intervention" description="Enregistrez le compte-rendu d'une visite chez un client." />
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_150px_120px] px-5 py-2.5 border-b bg-muted/30 text-xs font-semibold text-muted-foreground divide-x divide-border [&>*]:px-3 [&>*:first-child]:pl-0">
              <span>RÉFÉRENCE / OBJET</span>
              <span>CLIENT</span>
              <span className="text-right">DATE</span>
              <span>TECHNICIEN</span>
              <span>STATUT</span>
            </div>
            <div className="divide-y divide-border">
              {data.items.map((i) => {
                const sc = STATUS[i.status] ?? STATUS.DRAFT;
                return (
                  <Link key={i.id} href={`/interventions/${i.id}`}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_150px_120px] gap-1 sm:gap-0 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors sm:divide-x sm:divide-border sm:[&>*]:px-3 sm:[&>*:first-child]:pl-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{i.number}</p>
                      <p className="text-xs text-muted-foreground truncate">{i.subject || '—'}</p>
                    </div>
                    <span className="text-sm text-foreground truncate">{i.customer?.name ?? '—'}</span>
                    <span className="hidden sm:block text-xs text-muted-foreground text-right">{formatDate(i.visitDate)}</span>
                    <span className="hidden sm:block text-xs text-muted-foreground truncate">
                      {i.technician ? `${i.technician.firstName} ${i.technician.lastName}` : '—'}
                    </span>
                    <span><Badge variant={sc.variant}>{sc.label}</Badge></span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-border px-5">
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <InterventionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        intervention={editing}
        defaultCustomerId={defaultCustomerId}
      />
    </div>
  );
}

export default function InterventionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
      <InterventionsInner />
    </Suspense>
  );
}

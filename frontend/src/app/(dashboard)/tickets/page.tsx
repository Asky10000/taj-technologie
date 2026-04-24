'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Ticket, AlertTriangle, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { useTickets, useTicketStats, useCreateTicket } from '@/hooks/useTickets';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { TicketStatus, TicketPriority, TicketCategory } from '@/types/tickets.types';

// ── Helpers visuels ──────────────────────────────────────────────
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: typeof Ticket }> = {
  OPEN:             { label: 'Ouvert',           color: 'bg-yellow-400',  icon: Ticket },
  IN_PROGRESS:      { label: 'En cours',         color: 'bg-blue-500',    icon: Clock },
  PENDING_CLIENT:   { label: 'Att. client',      color: 'bg-slate-400',   icon: Clock },
  PENDING_SUPPLIER: { label: 'Att. fournisseur', color: 'bg-orange-400',  icon: Clock },
  ESCALATED:        { label: 'Escaladé',         color: 'bg-red-400',     icon: AlertTriangle },
  RESOLVED:         { label: 'Résolu',           color: 'bg-emerald-500', icon: CheckCircle },
  CLOSED:           { label: 'Fermé',            color: 'bg-gray-400',    icon: CheckCircle },
  CANCELLED:        { label: 'Annulé',           color: 'bg-gray-300',    icon: CheckCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; variant: 'danger' | 'warning' | 'info' | 'default' }> = {
  CRITICAL: { label: 'Critique', variant: 'danger' },
  HIGH:     { label: 'Haute',    variant: 'warning' },
  MEDIUM:   { label: 'Moyenne',  variant: 'info' },
  LOW:      { label: 'Basse',    variant: 'default' },
};

const STATUS_FILTERS: { label: string; value: TicketStatus | '' }[] = [
  { label: 'Tous',       value: '' },
  { label: 'Ouverts',    value: 'OPEN' },
  { label: 'En cours',   value: 'IN_PROGRESS' },
  { label: 'En attente', value: 'PENDING_CLIENT' },
  { label: 'Résolus',    value: 'RESOLVED' },
];

export default function TicketsPage() {
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState<TicketStatus | ''>('');
  const [priority,  setPriority]  = useState<TicketPriority | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({
    title: '', description: '', priority: 'MEDIUM' as TicketPriority,
    category: 'OTHER' as TicketCategory,
  });

  const { data, isLoading, isFetching } = useTickets({
    page, limit: 25, search: search || undefined,
    status: status || undefined, priority: priority || undefined,
  });
  const { data: stats } = useTicketStats();
  const createMutation  = useCreateTicket();

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: TicketStatus | '') => { setStatus(v); setPage(1); };

  return (
    <div className="space-y-5">
      {/* KPIs rapides */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ouverts',     value: stats.byStatus?.OPEN ?? 0,        color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'En cours',   value: stats.byStatus?.IN_PROGRESS ?? 0,  color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Critiques',  value: stats.byPriority?.CRITICAL ?? 0,   color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Résolus',    value: stats.byStatus?.RESOLVED ?? 0,     color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          ].map((kpi) => (
            <div key={kpi.label} className={cn('rounded-xl p-4 border', kpi.bg)}>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={cn('text-2xl font-bold mt-1', kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={handleSearch} placeholder="Titre, code…" className="w-full sm:w-56" />
          <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-background">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatus(f.value)}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  status === f.value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value as any); setPage(1); }}
            className="h-8 px-2 rounded-md border border-input bg-background text-xs"
          >
            <option value="">Toutes priorités</option>
            {(['CRITICAL','HIGH','MEDIUM','LOW'] as TicketPriority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau ticket
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-2 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-64 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Ticket}
            title="Aucun ticket trouvé"
            description="Créez le premier ticket de support."
            action={
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> Nouveau ticket
              </button>
            }
          />
        ) : (
          <>
            {/* Header — desktop uniquement */}
            <div className="hidden sm:grid grid-cols-[8px_1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-border bg-muted/30">
              <span />
              <span className="text-xs font-semibold text-muted-foreground">TICKET</span>
              <span className="text-xs font-semibold text-muted-foreground hidden md:block">CLIENT</span>
              <span className="text-xs font-semibold text-muted-foreground">PRIORITÉ</span>
              <span className="text-xs font-semibold text-muted-foreground">STATUT</span>
            </div>

            <div className="divide-y divide-border">
              {data.items.map((ticket) => {
                const sc = STATUS_CONFIG[ticket.status];
                const pc = PRIORITY_CONFIG[ticket.priority];
                const isOverdueSla =
                  ticket.slaResolutionDueAt &&
                  new Date(ticket.slaResolutionDueAt) < new Date() &&
                  !['RESOLVED', 'CLOSED'].includes(ticket.status);

                return (
                  <div key={ticket.id}>
                    {/* Carte mobile */}
                    <Link href={`/tickets/${ticket.id}`} className="sm:hidden flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                      <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', {
                        'bg-red-500':    ticket.priority === 'CRITICAL',
                        'bg-orange-400': ticket.priority === 'HIGH',
                        'bg-blue-400':   ticket.priority === 'MEDIUM',
                        'bg-gray-300':   ticket.priority === 'LOW',
                      })} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate flex-1">{ticket.title}</p>
                          {isOverdueSla && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge variant={pc.variant}>{pc.label}</Badge>
                            <div className={cn('w-2 h-2 rounded-full', sc.color)} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{ticket.number}</span>
                          {ticket.customer && <span>· {ticket.customer.name}</span>}
                        </div>
                      </div>
                    </Link>

                    {/* Ligne desktop */}
                    <Link href={`/tickets/${ticket.id}`} className="hidden sm:grid grid-cols-[8px_1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/50 transition-colors group">
                      <div className={cn('h-full w-1.5 rounded-full', {
                        'bg-red-500':    ticket.priority === 'CRITICAL',
                        'bg-orange-400': ticket.priority === 'HIGH',
                        'bg-blue-400':   ticket.priority === 'MEDIUM',
                        'bg-gray-300':   ticket.priority === 'LOW',
                      })} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{ticket.title}</p>
                          {isOverdueSla && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{ticket.number}</span>
                          {ticket.assignedTo && (
                            <span className="text-xs text-muted-foreground">→ {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(ticket.createdAt)}</span>
                        </div>
                      </div>
                      <span className="hidden md:block text-xs text-muted-foreground max-w-32 truncate">{ticket.customer?.name ?? '—'}</span>
                      <Badge variant={pc.variant}>{pc.label}</Badge>
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', sc.color)} />
                        <span className="text-xs text-foreground">{sc.label}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border px-5">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal création */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau ticket" size="md">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createMutation.mutateAsync(form);
            setShowModal(false);
            setForm({ title: '', description: '', priority: 'MEDIUM', category: 'OTHER' });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Titre <span className="text-destructive">*</span></label>
            <input
              required
              minLength={5}
              maxLength={300}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Imprimante HP ne répond plus"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as TicketPriority }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Haute</option>
                <option value="CRITICAL">Critique</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Catégorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as TicketCategory }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {[['HARDWARE','Matériel'],['SOFTWARE','Logiciel'],['NETWORK','Réseau'],
                  ['SECURITY','Sécurité'],['EMAIL','Email'],['PRINT','Impression'],
                  ['ACCESS','Accès'],['INSTALLATION','Installation'],['MAINTENANCE','Maintenance'],
                  ['OTHER','Autre']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
            <textarea
              required
              minLength={10}
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Décrivez le problème en détail…"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={createMutation.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer le ticket
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

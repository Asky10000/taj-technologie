'use client';

import { useState } from 'react';
import { Plus, Users, Euro, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { useProspects, usePipeline, useCreateProspect, useUpdateProspectStatus, useConvertProspect } from '@/hooks/useCrm';
import { ProspectStatusBadge } from '@/components/ui/Badge';
import { SearchInput }         from '@/components/ui/SearchInput';
import { Modal }               from '@/components/ui/Modal';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { ProspectStatus } from '@/types/crm.types';

const PIPELINE_STAGES: { status: ProspectStatus; label: string; color: string }[] = [
  { status: 'NEW',           label: 'Nouveau',        color: 'bg-slate-400' },
  { status: 'CONTACTED',     label: 'Contacté',       color: 'bg-blue-400' },
  { status: 'QUALIFIED',     label: 'Qualifié',       color: 'bg-violet-500' },
  { status: 'PROPOSAL_SENT', label: 'Devis envoyé',   color: 'bg-amber-400' },
  { status: 'NEGOTIATION',   label: 'Négociation',    color: 'bg-orange-400' },
];

export default function ProspectsPage() {
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState<'list' | 'pipeline'>('pipeline');
  const [showModal, setShowModal] = useState(false);
  const [newProspect, setNewProspect] = useState({
    companyName: '', email: '', phone: '', estimatedBudget: 0, source: 'OTHER',
  });

  const { data: prospectsData, isLoading } = useProspects({ search: search || undefined, limit: 100 });
  const { data: pipeline }                 = usePipeline();
  const createMutation     = useCreateProspect();
  const updateStatus       = useUpdateProspectStatus();
  const convertMutation    = useConvertProspect();

  const prospects = prospectsData?.items ?? [];

  // Regrouper par statut pour le kanban
  const byStatus = PIPELINE_STAGES.reduce(
    (acc, stage) => ({
      ...acc,
      [stage.status]: prospects.filter((p) => p.status === stage.status),
    }),
    {} as Record<string, typeof prospects>,
  );

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex border border-input rounded-md overflow-hidden">
            {(['pipeline', 'list'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'pipeline' ? 'Pipeline' : 'Liste'}
              </button>
            ))}
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un prospect…" className="w-56" />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau prospect
        </button>
      </div>

      {/* Stats pipeline */}
      {pipeline && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const stats = pipeline[stage.status] ?? { count: 0, totalBudget: 0 };
            return (
              <div key={stage.status} className="bg-card border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{stats.count}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalBudget)}</p>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === 'pipeline' ? (
        /* ── Vue Pipeline (Kanban) ── */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const cards = byStatus[stage.status] ?? [];
            return (
              <div
                key={stage.status}
                className="flex-shrink-0 w-72 bg-muted/30 rounded-xl p-3 space-y-2"
              >
                {/* Colonne header */}
                <div className="flex items-center justify-between px-1 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-card border rounded-full px-2 py-0.5">
                    {cards.length}
                  </span>
                </div>

                {/* Cartes */}
                {cards.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Aucun prospect
                  </div>
                ) : (
                  cards.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="bg-card border rounded-lg p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {prospect.companyName}
                        </p>
                        {prospect.email && (
                          <p className="text-xs text-muted-foreground truncate">{prospect.email}</p>
                        )}
                      </div>

                      {prospect.estimatedBudget > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <Euro className="w-3 h-3" />
                          <span className="font-medium">{formatCurrency(prospect.estimatedBudget)}</span>
                        </div>
                      )}

                      {/* Progression rapide du statut */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          {PIPELINE_STAGES.map((s, i) => (
                            <div
                              key={s.status}
                              className={`w-1.5 h-1.5 rounded-full ${
                                PIPELINE_STAGES.findIndex((x) => x.status === prospect.status) >= i
                                  ? s.color
                                  : 'bg-border'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Avancer statut */}
                          {stage.status !== 'NEGOTIATION' && (
                            <button
                              onClick={() => {
                                const idx = PIPELINE_STAGES.findIndex((s) => s.status === stage.status);
                                const next = PIPELINE_STAGES[idx + 1];
                                if (next) updateStatus.mutate({ id: prospect.id, status: next.status });
                              }}
                              title="Étape suivante"
                              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {/* Convertir en client */}
                          {stage.status === 'NEGOTIATION' && (
                            <button
                              onClick={() => {
                                if (confirm(`Convertir "${prospect.companyName}" en client ?`)) {
                                  convertMutation.mutate(prospect.id);
                                }
                              }}
                              className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium hover:bg-emerald-200 transition-colors"
                            >
                              Convertir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Vue Liste ── */
        <div className="bg-card border rounded-xl overflow-hidden">
          {prospects.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              Aucun prospect trouvé
            </div>
          ) : (
            <div className="divide-y divide-border">
              {prospects.map((prospect) => (
                <div
                  key={prospect.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{prospect.companyName}</p>
                    <p className="text-xs text-muted-foreground">{prospect.email}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-muted-foreground">Budget estimé</p>
                    <p className="text-sm font-medium">{formatCurrency(prospect.estimatedBudget)}</p>
                  </div>
                  <ProspectStatusBadge status={prospect.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal création prospect */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau prospect" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createMutation.mutateAsync(newProspect as any);
            setShowModal(false);
            setNewProspect({ companyName: '', email: '', phone: '', estimatedBudget: 0, source: 'OTHER' });
          }}
          className="space-y-4"
        >
          {[
            { key: 'companyName', label: 'Raison sociale', required: true, type: 'text' },
            { key: 'email',       label: 'Email',           required: false, type: 'email' },
            { key: 'phone',       label: 'Téléphone',       required: false, type: 'tel' },
          ].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-sm font-medium">
                {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <input
                required={f.required}
                type={f.type}
                value={(newProspect as any)[f.key]}
                onChange={(e) => setNewProspect((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Budget estimé (€)</label>
            <input
              type="number"
              min={0}
              step={500}
              value={newProspect.estimatedBudget}
              onChange={(e) => setNewProspect((p) => ({ ...p, estimatedBudget: +e.target.value }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source</label>
            <select
              value={newProspect.source}
              onChange={(e) => setNewProspect((p) => ({ ...p, source: e.target.value }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[
                ['WEBSITE', 'Site web'], ['REFERRAL', 'Recommandation'],
                ['COLD_CALL', 'Prospection'], ['EMAIL', 'Email'],
                ['SOCIAL_MEDIA', 'Réseaux sociaux'], ['EVENT', 'Événement'], ['OTHER', 'Autre'],
              ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent">Annuler</button>
            <button type="submit" disabled={createMutation.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FolderKanban, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { useProjects, useProjectStats, useCreateProject } from '@/hooks/useProjects';
import { Badge }       from '@/components/ui/Badge';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { ProjectStatus, ProjectType } from '@/types/projects.types';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Brouillon',   color: 'bg-gray-400' },
  ACTIVE:    { label: 'Actif',       color: 'bg-emerald-500' },
  ON_HOLD:   { label: 'En pause',    color: 'bg-amber-400' },
  COMPLETED: { label: 'Terminé',     color: 'bg-blue-500' },
  CANCELLED: { label: 'Annulé',      color: 'bg-red-400' },
};

const TYPE_LABELS: Record<ProjectType, string> = {
  INSTALLATION: 'Installation',
  MAINTENANCE:  'Maintenance',
  DEVELOPMENT:  'Développement',
  CONSULTING:   'Conseil',
  SUPPORT:      'Support',
  OTHER:        'Autre',
};

export default function ProjectsPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'OTHER' as ProjectType, budget: 0,
    startDate: '', endDate: '', description: '',
  });

  const { data, isLoading, isFetching } = useProjects({ page, limit: 20, search: search || undefined });
  const { data: stats }                 = useProjectStats();
  const createMutation                  = useCreateProject();

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Actifs',         value: stats.activeCount,     color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'En dépassement', value: stats.overBudgetCount, color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'Budget total',   value: formatCurrency(stats.totalBudget),     color: 'text-foreground', bg: 'bg-card' },
            { label: 'Coût réel',      value: formatCurrency(stats.totalActualCost), color: 'text-foreground', bg: 'bg-card' },
          ].map((kpi) => (
            <div key={kpi.label} className={cn('rounded-xl p-4 border', kpi.bg)}>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={cn('text-xl font-bold mt-1', kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={handleSearch} placeholder="Nom, code…" className="w-56" />
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau projet
        </button>
      </div>

      {/* Grille de cartes */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-5 space-y-3 animate-pulse">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-2 w-full bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet trouvé"
          description="Créez votre premier projet IT."
          action={
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> Nouveau projet
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.items.map((project) => {
              const sc         = STATUS_CONFIG[project.status];
              const isOverBudget = Number(project.actualCost) > Number(project.budget) && Number(project.budget) > 0;
              const budgetPct  = project.budget > 0
                ? Math.min(100, Math.round((Number(project.actualCost) / Number(project.budget)) * 100))
                : 0;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-card border rounded-xl p-5 space-y-4 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  {/* En-tête */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{project.code}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={cn('w-2 h-2 rounded-full', sc.color)} />
                      <span className="text-xs text-muted-foreground">{sc.label}</span>
                    </div>
                  </div>

                  {/* Type + client */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[project.type]}
                    </span>
                    {project.customer && (
                      <span className="text-xs text-muted-foreground truncate">
                        {project.customer.name}
                      </span>
                    )}
                  </div>

                  {/* Avancement */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Avancement</span>
                      <span className="text-xs font-semibold text-foreground">{project.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', project.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary')}
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget */}
                  {project.budget > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Budget</span>
                        <div className="flex items-center gap-1">
                          {isOverBudget && <AlertTriangle className="w-3 h-3 text-destructive" />}
                          <span className={cn('text-xs font-semibold', isOverBudget ? 'text-destructive' : 'text-foreground')}>
                            {budgetPct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', isOverBudget ? 'bg-destructive' : budgetPct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                          style={{ width: `${Math.min(100, budgetPct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatCurrency(Number(project.actualCost))} dépensé</span>
                        <span>{formatCurrency(Number(project.budget))} budget</span>
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  {(project.startDate || project.endDate) && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                      <span>{project.startDate ? formatDate(project.startDate) : '—'}</span>
                      <span>→</span>
                      <span>{project.endDate ? formatDate(project.endDate) : '—'}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Modal création */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau projet" size="md">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createMutation.mutateAsync({
              ...form,
              budget: form.budget || undefined,
              startDate: form.startDate || undefined,
              endDate:   form.endDate   || undefined,
              description: form.description || undefined,
            });
            setShowModal(false);
            setForm({ name: '', type: 'OTHER', budget: 0, startDate: '', endDate: '', description: '' });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nom du projet <span className="text-destructive">*</span></label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Migration réseau Mairie"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ProjectType }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Budget (€)</label>
              <input
                type="number"
                min={0}
                step={100}
                value={form.budget || ''}
                onChange={(e) => setForm((p) => ({ ...p, budget: +e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[['startDate', 'Date début'], ['endDate', 'Date fin']].map(([k, l]) => (
              <div key={k} className="space-y-1.5">
                <label className="text-sm font-medium">{l}</label>
                <input
                  type="date"
                  value={(form as any)[k]}
                  onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={createMutation.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer le projet
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

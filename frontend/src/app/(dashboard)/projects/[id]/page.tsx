'use client';

import { useState } from 'react';
import { useParams }    from 'next/navigation';
import Link             from 'next/link';
import {
  ArrowLeft, Plus, Clock, CheckCircle, Circle, AlertTriangle,
  Loader2, Users, Euro, BarChart3, Play, Pause,
} from 'lucide-react';
import {
  useProject, useProjectDashboard, useProjectTasks,
  useProjectTimeEntries, useUpdateProjectStatus,
  useCreateTask, useUpdateTask, useLogTime,
} from '@/hooks/useProjects';
import { Modal }  from '@/components/ui/Modal';
import { formatCurrency, formatDate, formatNumber, cn, getInitials } from '@/lib/utils';
import type { TaskStatus, TaskPriority, ProjectStatus } from '@/types/projects.types';

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  TODO:       { label: 'À faire',     icon: Circle,       color: 'text-gray-400' },
  IN_PROGRESS:{ label: 'En cours',    icon: Play,         color: 'text-blue-500' },
  IN_REVIEW:  { label: 'En relecture',icon: AlertTriangle,color: 'text-amber-500' },
  DONE:       { label: 'Terminée',    icon: CheckCircle,  color: 'text-emerald-500' },
  CANCELLED:  { label: 'Annulée',     icon: Circle,       color: 'text-gray-300' },
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  URGENT: 'bg-red-500',
  HIGH:   'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW:    'bg-gray-300',
};

const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT:     ['ACTIVE', 'CANCELLED'],
  ACTIVE:    ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD:   ['ACTIVE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT:     'Brouillon',
  ACTIVE:    'Actif',
  ON_HOLD:   'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

type Tab = 'tasks' | 'time' | 'team' | 'overview';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab]                   = useState<Tab>('tasks');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [taskForm, setTaskForm]          = useState({ title: '', priority: 'MEDIUM' as TaskPriority, estimatedHours: 0, dueDate: '' });
  const [timeForm, setTimeForm]          = useState({ hours: 1, entryDate: new Date().toISOString().slice(0, 10), description: '', isBillable: true });

  const { data: project, isLoading }    = useProject(id);
  const { data: dashboard }             = useProjectDashboard(id);
  const { data: tasks = [] }            = useProjectTasks(id);
  const { data: timeEntries = [] }      = useProjectTimeEntries(id);
  const updateStatus                    = useUpdateProjectStatus();
  const createTask                      = useCreateTask();
  const updateTask                      = useUpdateTask();
  const logTime                         = useLogTime();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!project) return null;

  const allowedTransitions = PROJECT_TRANSITIONS[project.status] ?? [];
  const isOverBudget = Number(project.actualCost) > Number(project.budget) && Number(project.budget) > 0;
  const budgetPct    = project.budget > 0
    ? Math.min(100, Math.round((Number(project.actualCost) / Number(project.budget)) * 100))
    : 0;

  // Tâches racines (sans parent)
  const rootTasks  = tasks.filter((t) => !t.parentTaskId);
  const tasksDone  = tasks.filter((t) => t.status === 'DONE').length;
  const totalHours = timeEntries.reduce((s, e) => s + Number(e.hours), 0);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'tasks',    label: `Tâches (${tasks.length})` },
    { key: 'time',     label: `Temps (${Math.round(totalHours * 10) / 10} h)` },
    { key: 'team',     label: `Équipe (${project.members?.length ?? 0})` },
    { key: 'overview', label: 'Vue d\'ensemble' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="w-8 h-8 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">{project.name}</h2>
              {isOverBudget && (
                <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Budget dépassé
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{project.code} · {PROJECT_STATUS_LABELS[project.status]}</p>
          </div>
        </div>

        {/* Transitions de statut */}
        <div className="flex items-center gap-2 flex-wrap">
          {allowedTransitions.map((next) => (
            <button
              key={next}
              onClick={() => updateStatus.mutate({ id, status: next })}
              disabled={updateStatus.isPending}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium border transition-colors',
                next === 'COMPLETED'
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : next === 'CANCELLED'
                    ? 'border-destructive text-destructive hover:bg-destructive/10'
                    : 'border-input hover:bg-accent',
              )}
            >
              {PROJECT_STATUS_LABELS[next]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: 'Avancement', value: `${project.progressPercent}%`, color: 'text-primary' },
          { icon: CheckCircle, label: 'Tâches', value: `${tasksDone}/${tasks.length}`, color: 'text-emerald-600' },
          { icon: Clock, label: 'Heures saisies', value: `${Math.round(totalHours * 10) / 10} h`, color: 'text-blue-600' },
          { icon: Euro, label: 'Coût réel', value: formatCurrency(Number(project.actualCost)), color: isOverBudget ? 'text-destructive' : 'text-foreground' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <kpi.icon className={cn('w-5 h-5 flex-shrink-0', kpi.color)} />
            <div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={cn('text-lg font-bold', kpi.color)}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de progression budget */}
      {project.budget > 0 && (
        <div className="bg-card border rounded-xl px-5 py-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Budget consommé</span>
            <span className={cn('font-semibold', isOverBudget ? 'text-destructive' : budgetPct > 80 ? 'text-amber-600' : 'text-foreground')}>
              {formatCurrency(Number(project.actualCost))} / {formatCurrency(Number(project.budget))} ({budgetPct}%)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', isOverBudget ? 'bg-destructive' : budgetPct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Tâches ── */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nouvelle tâche
            </button>
          </div>

          {rootTasks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Aucune tâche — créez la première
            </div>
          ) : (
            <div className="space-y-2">
              {rootTasks.map((task) => {
                const sc = TASK_STATUS_CONFIG[task.status];
                return (
                  <div key={task.id} className="bg-card border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Toggle statut */}
                      <button
                        onClick={() => updateTask.mutate({
                          projectId: id,
                          taskId:    task.id,
                          payload:   { status: task.status === 'DONE' ? 'TODO' : 'DONE' },
                        })}
                        className={cn('flex-shrink-0 transition-colors', sc.color)}
                      >
                        <sc.icon className="w-5 h-5" />
                      </button>

                      {/* Dot priorité */}
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority])} />

                      {/* Titre */}
                      <p className={cn(
                        'flex-1 text-sm font-medium',
                        task.status === 'DONE' ? 'line-through text-muted-foreground' : 'text-foreground',
                      )}>
                        {task.title}
                      </p>

                      {/* Méta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                        {task.assignee && (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {getInitials(task.assignee.firstName, task.assignee.lastName)}
                          </div>
                        )}
                        {task.estimatedHours > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.actualHours > 0 ? `${task.actualHours}/` : ''}{task.estimatedHours} h
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={cn(
                            new Date(task.dueDate) < new Date() && task.status !== 'DONE'
                              ? 'text-destructive font-medium'
                              : '',
                          )}>
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>

                      {/* Progression */}
                      <div className="w-16 hidden sm:block">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${task.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sous-tâches */}
                    {task.subTasks && task.subTasks.length > 0 && (
                      <div className="border-t border-border divide-y divide-border">
                        {task.subTasks.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-3 px-4 py-2 pl-10 bg-muted/20">
                            <button
                              onClick={() => updateTask.mutate({ projectId: id, taskId: sub.id, payload: { status: sub.status === 'DONE' ? 'TODO' : 'DONE' } })}
                              className={TASK_STATUS_CONFIG[sub.status].color}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <p className={cn('flex-1 text-xs', sub.status === 'DONE' ? 'line-through text-muted-foreground' : 'text-foreground')}>
                              {sub.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Temps ── */}
      {tab === 'time' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowTimeModal(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Saisir du temps
            </button>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden">
            {timeEntries.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Aucune saisie de temps
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
                  {['COLLABORATEUR','DATE','TÂCHE','HEURES','COÛT'].map((h) => (
                    <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                          {entry.user ? getInitials(entry.user.firstName, entry.user.lastName) : '?'}
                        </div>
                        <span className="text-sm text-foreground truncate">
                          {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : '—'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(entry.entryDate)}</span>
                      <span className="text-xs text-muted-foreground max-w-36 truncate">
                        {entry.task?.title ?? '—'}
                      </span>
                      <span className="text-sm font-medium">{entry.hours} h</span>
                      <span className="text-sm text-muted-foreground">
                        {entry.hourlyRate > 0 ? formatCurrency(Number(entry.hours) * Number(entry.hourlyRate)) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border px-5 py-3 flex justify-between items-center bg-muted/30">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <div className="flex items-center gap-6 text-sm font-bold text-foreground">
                    <span>{Math.round(totalHours * 100) / 100} h</span>
                    <span>{formatCurrency(Number(project.actualCost))}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Onglet Équipe ── */}
      {tab === 'team' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.members?.map((member) => (
            <div key={member.id} className="bg-card border rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                {member.user ? getInitials(member.user.firstName, member.user.lastName) : '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Inconnu'}
                </p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
                {member.hourlyRate != null && member.hourlyRate > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(member.hourlyRate)}/h
                  </p>
                )}
              </div>
            </div>
          ))}
          {(!project.members || project.members.length === 0) && (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
              Aucun membre dans l'équipe
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Vue d'ensemble ── */}
      {tab === 'overview' && dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold">Tâches par statut</h3>
            {Object.entries(dashboard.taskStats ?? {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-28">{TASK_STATUS_CONFIG[status as TaskStatus]?.label ?? status}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: tasks.length ? `${((count as number) / tasks.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs font-medium w-4">{count as number}</span>
              </div>
            ))}
          </div>

          <div className="bg-card border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold">Temps par collaborateur</h3>
            {dashboard.timeByUser?.map((u: any) => (
              <div key={u.userId} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{u.name}</span>
                <span className="text-sm font-medium">{Math.round(u.hours * 10) / 10} h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nouvelle tâche */}
      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)} title="Nouvelle tâche" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createTask.mutateAsync({ projectId: id, payload: taskForm });
            setShowTaskModal(false);
            setTaskForm({ title: '', priority: 'MEDIUM', estimatedHours: 0, dueDate: '' });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Titre <span className="text-destructive">*</span></label>
            <input
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priorité</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Heures estimées</label>
              <input
                type="number" min={0} step={0.5}
                value={taskForm.estimatedHours || ''}
                onChange={(e) => setTaskForm((p) => ({ ...p, estimatedHours: +e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date d'échéance</label>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowTaskModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent">Annuler</button>
            <button type="submit" disabled={createTask.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createTask.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal saisie de temps */}
      <Modal open={showTimeModal} onClose={() => setShowTimeModal(false)} title="Saisir du temps" size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await logTime.mutateAsync({ projectId: id, payload: timeForm });
            setShowTimeModal(false);
            setTimeForm({ hours: 1, entryDate: new Date().toISOString().slice(0, 10), description: '', isBillable: true });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Heures <span className="text-destructive">*</span></label>
              <input
                required type="number" min={0.1} step={0.25}
                value={timeForm.hours}
                onChange={(e) => setTimeForm((p) => ({ ...p, hours: +e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={timeForm.entryDate}
                onChange={(e) => setTimeForm((p) => ({ ...p, entryDate: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tâche concernée</label>
            <select
              value=""
              onChange={(e) => setTimeForm((p) => ({ ...p, taskId: e.target.value || undefined } as any))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Aucune tâche spécifique</option>
              {tasks.filter((t) => t.status !== 'DONE').map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              rows={2}
              value={timeForm.description}
              onChange={(e) => setTimeForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={timeForm.isBillable}
              onChange={(e) => setTimeForm((p) => ({ ...p, isBillable: e.target.checked }))}
              className="rounded"
            />
            Temps facturable au client
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowTimeModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent">Annuler</button>
            <button type="submit" disabled={logTime.isPending} className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {logTime.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

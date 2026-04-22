'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle, User,
  MessageSquare, Lock, Loader2, Star,
} from 'lucide-react';
import { useTicket, useUpdateTicketStatus, useAddComment, useRateTicket } from '@/hooks/useTickets';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatRelativeTime, cn, getInitials } from '@/lib/utils';
import type { TicketStatus } from '@/types/tickets.types';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN:        ['IN_PROGRESS', 'ON_HOLD', 'CLOSED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD:     ['IN_PROGRESS', 'CLOSED'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN:        'Ouvert',
  IN_PROGRESS: 'En cours',
  ON_HOLD:     'En attente',
  RESOLVED:    'Résolu',
  CLOSED:      'Fermé',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  HIGH:     'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  MEDIUM:   'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  LOW:      'text-gray-600 bg-gray-50 dark:bg-gray-800/50',
};

export default function TicketDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();

  const [comment, setComment]           = useState('');
  const [isInternal, setIsInternal]     = useState(false);
  const [timeSpent, setTimeSpent]       = useState(0);
  const [hoverStar, setHoverStar]       = useState(0);

  const { data: ticket, isLoading }     = useTicket(id);
  const updateStatus                    = useUpdateTicketStatus();
  const addComment                      = useAddComment();
  const rateTicket                      = useRateTicket();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!ticket) return null;

  const allowedTransitions = STATUS_TRANSITIONS[ticket.status] ?? [];
  const isOverdue = ticket.slaResolutionDueAt && new Date(ticket.slaResolutionDueAt) < new Date()
    && !['RESOLVED','CLOSED'].includes(ticket.status);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await addComment.mutateAsync({
      ticketId: id,
      payload: { content: comment, isInternal, timeSpentMinutes: timeSpent || undefined },
    });
    setComment('');
    setTimeSpent(0);
    setIsInternal(false);
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Navigation */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tickets" className="w-8 h-8 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">{ticket.title}</h2>
              {isOverdue && (
                <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-medium">
                  <AlertTriangle className="w-3 h-3" /> SLA dépassé
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{ticket.code} · créé {formatRelativeTime(ticket.createdAt)}</p>
          </div>
        </div>

        {/* Transitions de statut */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {allowedTransitions.map((next) => (
            <button
              key={next}
              onClick={() => updateStatus.mutate({ id, status: next })}
              disabled={updateStatus.isPending}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium transition-colors border',
                next === 'RESOLVED' || next === 'CLOSED'
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'border-input hover:bg-accent',
              )}
            >
              {STATUS_LABELS[next]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="bg-card border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Description</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Fil de commentaires */}
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Commentaires
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                ({ticket.comments?.length ?? 0})
              </span>
            </h3>

            {ticket.comments?.map((c) => (
              <div key={c.id} className={cn('flex gap-3 rounded-lg p-3 -mx-1', c.isInternal && 'bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30')}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {c.author ? getInitials(c.author.firstName, c.author.lastName) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">
                      {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Système'}
                    </span>
                    {c.isInternal && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                        <Lock className="w-2.5 h-2.5" /> Interne
                      </span>
                    )}
                    {c.isFirstResponse && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        1ère réponse
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatRelativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                  {c.timeSpentMinutes > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {c.timeSpentMinutes} min
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Formulaire nouveau commentaire */}
            {!['CLOSED'].includes(ticket.status) && (
              <form onSubmit={handleComment} className="pt-2 border-t border-border space-y-3">
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={isInternal ? 'Note interne (non visible du client)…' : 'Réponse au client…'}
                  className={cn(
                    'w-full px-3 py-2 rounded-md border text-sm resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-ring bg-background',
                    isInternal ? 'border-amber-300 dark:border-amber-700' : 'border-input',
                  )}
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      <Lock className="w-3 h-3" /> Note interne
                    </label>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <input
                        type="number"
                        min={0}
                        value={timeSpent || ''}
                        onChange={(e) => setTimeSpent(+e.target.value)}
                        placeholder="min"
                        className="w-14 h-6 px-2 rounded border border-input bg-background text-xs"
                      />
                      <span>min passées</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!comment.trim() || addComment.isPending}
                    className="h-8 px-4 rounded-md bg-primary text-white text-xs font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {addComment.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Envoyer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Panneau droit */}
        <div className="space-y-4">
          {/* Informations */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Détails</h3>
            {[
              { label: 'Statut',    value: STATUS_LABELS[ticket.status] },
              { label: 'Priorité',  value: ticket.priority },
              { label: 'Catégorie', value: ticket.category },
              { label: 'Client',    value: ticket.customer?.companyName ?? '—' },
              { label: 'Assigné à', value: ticket.assignee ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}` : 'Non assigné' },
              { label: 'Temps total', value: `${Math.round(ticket.totalTimeMinutes / 60 * 10) / 10} h` },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted-foreground flex-shrink-0">{item.label}</span>
                <span className="text-xs font-medium text-foreground text-right">{item.value}</span>
              </div>
            ))}
          </div>

          {/* SLA */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SLA</h3>
            {[
              {
                label:  'Délai réponse',
                due:     ticket.slaResponseDueAt,
                met:     ticket.slaResponseMet,
                done:    !!ticket.firstResponseAt,
              },
              {
                label:  'Délai résolution',
                due:     ticket.slaResolutionDueAt,
                met:     ticket.slaResolutionMet,
                done:    !!ticket.resolvedAt,
              },
            ].map((sla) => {
              const overdue = sla.due && new Date(sla.due) < new Date() && !sla.done;
              return (
                <div key={sla.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{sla.label}</span>
                    {sla.done
                      ? <CheckCircle className={cn('w-3.5 h-3.5', sla.met ? 'text-emerald-500' : 'text-destructive')} />
                      : overdue
                        ? <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                        : <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </div>
                  {sla.due && (
                    <p className={cn('text-xs', overdue && !sla.done ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      {formatDate(sla.due)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Satisfaction (si résolu) */}
          {['RESOLVED','CLOSED'].includes(ticket.status) && (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Satisfaction</h3>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverStar(star)}
                    onMouseLeave={() => setHoverStar(0)}
                    onClick={() => rateTicket.mutate({ id, score: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={cn(
                      'w-6 h-6',
                      star <= (hoverStar || ticket.satisfactionScore || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground',
                    )} />
                  </button>
                ))}
              </div>
              {ticket.satisfactionScore && (
                <p className="text-xs text-muted-foreground">Note actuelle : {ticket.satisfactionScore}/5</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Printer, Pencil, Trash2, Loader2,
  AlertTriangle, Eye, Lightbulb, Calendar, User, Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { InterventionModal } from '@/components/interventions/InterventionModal';
import { InterventionPrint } from '@/components/interventions/InterventionPrint';
import { useIntervention, useDeleteIntervention } from '@/hooks/useInterventions';
import { formatDate, cn } from '@/lib/utils';

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' }> = {
  COMPLETED: { label: 'Terminé',   variant: 'success' },
  DRAFT:     { label: 'Brouillon', variant: 'warning' },
};

export default function InterventionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: i, isLoading } = useIntervention(id);
  const del = useDeleteIntervention();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!i) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Intervention introuvable</p>
        <Link href="/interventions" className="text-xs text-primary hover:underline">Retour à la liste</Link>
      </div>
    );
  }

  const sc = STATUS[i.status] ?? STATUS.DRAFT;
  const tech = i.technician ? `${i.technician.firstName} ${i.technician.lastName}` : '—';

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette intervention ? Cette action est irréversible.')) return;
    await del.mutateAsync(i.id);
    router.push('/interventions');
  };

  const sections = [
    { icon: AlertTriangle, title: 'Anomalies constatées', value: i.anomalies, danger: true },
    { icon: Eye,           title: 'Observations',         value: i.observations },
    { icon: Lightbulb,     title: 'Suggestions',          value: i.suggestions },
  ];

  return (
    <div className="space-y-5">
      {/* En-tête actions (masqué à l'impression) */}
      <div className="no-print flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/interventions" className="w-8 h-8 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">{i.number}</h2>
            <p className="text-xs text-muted-foreground truncate">{i.subject || 'Compte-rendu de visite'}</p>
          </div>
          <Badge variant={sc.variant}>{sc.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm hover:bg-accent transition-colors">
            <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
          </button>
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm hover:bg-accent transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </button>
          <button onClick={handleDelete} disabled={del.isPending} className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
        </div>
      </div>

      {/* Contenu écran (masqué à l'impression) */}
      <div className="no-print space-y-5">
        <div className="bg-card border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium text-foreground">{i.customer?.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Date de visite</p>
              <p className="text-sm font-medium text-foreground">{formatDate(i.visitDate)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Technicien</p>
              <p className="text-sm font-medium text-foreground">{tech}</p>
            </div>
          </div>
        </div>

        {sections.map((s) => (
          <div key={s.title} className="bg-card border rounded-xl p-5">
            <h3 className={cn('text-sm font-semibold mb-2 flex items-center gap-2', s.danger ? 'text-destructive' : 'text-foreground')}>
              <s.icon className="w-4 h-4" /> {s.title}
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.value || '—'}</p>
          </div>
        ))}
      </div>

      {/* Version imprimable */}
      <InterventionPrint intervention={i} />

      <InterventionModal open={editOpen} onClose={() => setEditOpen(false)} intervention={i} />
    </div>
  );
}

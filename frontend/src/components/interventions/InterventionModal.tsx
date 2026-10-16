'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, Lightbulb, Loader2, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useCustomers } from '@/hooks/useCrm';
import { useCreateIntervention, useUpdateIntervention } from '@/hooks/useInterventions';
import type { Intervention, InterventionStatus } from '@/types/intervention.types';

interface Props {
  open:              boolean;
  onClose:           () => void;
  intervention?:     Intervention | null;   // édition
  defaultCustomerId?: string;               // pré-sélection (depuis la fiche client)
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function InterventionModal({ open, onClose, intervention, defaultCustomerId }: Props) {
  const isEdit = !!intervention;
  const { data: customersPage } = useCustomers({ limit: 100 });
  const customers = customersPage?.items ?? [];

  const create = useCreateIntervention();
  const update = useUpdateIntervention(intervention?.id ?? '');
  const busy = create.isPending || update.isPending;

  const [customerId,   setCustomerId]   = useState('');
  const [visitDate,    setVisitDate]    = useState(todayISO());
  const [subject,      setSubject]      = useState('');
  const [status,       setStatus]       = useState<InterventionStatus>('DRAFT');
  const [anomalies,    setAnomalies]    = useState('');
  const [observations, setObservations] = useState('');
  const [suggestions,  setSuggestions]  = useState('');
  const [error,        setError]        = useState('');

  // (Ré)initialise le formulaire à l'ouverture
  useEffect(() => {
    if (!open) return;
    setError('');
    setCustomerId(intervention?.customerId ?? defaultCustomerId ?? '');
    setVisitDate(intervention?.visitDate ? intervention.visitDate.slice(0, 10) : todayISO());
    setSubject(intervention?.subject ?? '');
    setStatus(intervention?.status ?? 'DRAFT');
    setAnomalies(intervention?.anomalies ?? '');
    setObservations(intervention?.observations ?? '');
    setSuggestions(intervention?.suggestions ?? '');
  }, [open, intervention, defaultCustomerId]);

  const handleSubmit = async () => {
    if (!customerId) { setError('Sélectionnez un client.'); return; }
    if (!visitDate)  { setError('Indiquez la date de visite.'); return; }
    const payload = {
      customerId,
      visitDate: new Date(visitDate).toISOString(),
      subject: subject.trim() || undefined,
      status,
      anomalies: anomalies.trim() || undefined,
      observations: observations.trim() || undefined,
      suggestions: suggestions.trim() || undefined,
    };
    try {
      if (isEdit) await update.mutateAsync(payload);
      else        await create.mutateAsync(payload);
      onClose();
    } catch {
      /* toast géré par le hook */
    }
  };

  const inputCls = 'w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const taCls    = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier l\'intervention' : 'Nouvelle intervention'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Client <span className="text-destructive">*</span></label>
            <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!!defaultCustomerId && !isEdit}>
              <option value="">Sélectionner un client…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date de visite <span className="text-destructive">*</span></label>
            <input type="date" className={inputCls} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Objet</label>
            <input className={inputCls} placeholder="ex. Maintenance caméras de surveillance" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={300} />
          </div>
          <div>
            <label className={labelCls}>Statut</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as InterventionStatus)}>
              <option value="DRAFT">Brouillon</option>
              <option value="COMPLETED">Terminé</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Anomalies constatées</label>
          <textarea className={taCls} rows={3} placeholder="Pannes / anomalies relevées sur site…" value={anomalies} onChange={(e) => setAnomalies(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}><Eye className="w-3.5 h-3.5" /> Observations</label>
          <textarea className={taCls} rows={3} placeholder="Remarques, état général, contexte…" value={observations} onChange={(e) => setObservations(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}><Lightbulb className="w-3.5 h-3.5" /> Suggestions</label>
          <textarea className={taCls} rows={3} placeholder="Recommandations, améliorations, devis à prévoir…" value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-input text-sm hover:bg-accent transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={busy} className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </Modal>
  );
}

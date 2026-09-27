'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, Check, X, ArrowRight, FileText, User, Calendar, Building2, Printer, Pencil, Trash2, FolderKanban, Link2 } from 'lucide-react';
import { useQuote, useUpdateQuoteStatus, useConvertQuoteToOrder, useUpdateQuote, useDeleteQuote, useConvertQuoteToProject, useAttachQuoteToProject } from '@/hooks/useSales';
import { useProjects } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { SaleLinesTable } from '@/components/sales/SaleLinesTable';
import { SaleDocumentPrint } from '@/components/sales/SaleDocumentPrint';
import { SaleEditModal } from '@/components/sales/SaleEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { QuoteStatus } from '@/types/sales.types';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  DRAFT:     { label: 'Brouillon', variant: 'outline' },
  SENT:      { label: 'Envoyé',    variant: 'info' },
  ACCEPTED:  { label: 'Accepté',   variant: 'success' },
  REJECTED:  { label: 'Refusé',    variant: 'danger' },
  EXPIRED:   { label: 'Expiré',    variant: 'warning' },
  CONVERTED: { label: 'Converti',  variant: 'success' },
};

export default function QuoteDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const { data: quote, isLoading, isError } = useQuote(id);
  const updateStatus = useUpdateQuoteStatus();
  const convert      = useConvertQuoteToOrder();
  const updateQuote  = useUpdateQuote();
  const deleteQuote  = useDeleteQuote();
  const convertProject = useConvertQuoteToProject();
  const attachProject  = useAttachQuoteToProject();
  const isSuperAdmin = useAuthStore((s) => s.user?.role) === 'SUPER_ADMIN';
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const { data: projectsData } = useProjects({ limit: 100 });

  const handleDelete = async () => {
    await deleteQuote.mutateAsync(id);
    router.push('/sales');
  };

  const handleConvertProject = async () => {
    const res = await convertProject.mutateAsync(id);
    if (res?.projectId) router.push(`/projects/${res.projectId}`);
  };

  const handleAttach = async () => {
    if (!selectedProject) return;
    await attachProject.mutateAsync({ id, projectId: selectedProject });
    setAttachOpen(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  if (isError || !quote) {
    return (
      <div className="space-y-4">
        <Link href="/sales" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Retour aux devis</Link>
        <div className="bg-card border rounded-xl p-10 text-center text-muted-foreground">Devis introuvable.</div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[quote.status];
  const busy = updateStatus.isPending || convert.isPending;
  const editable = quote.status !== 'CONVERTED';

  const handleConvert = async () => {
    const order = await convert.mutateAsync(quote.id);
    if (order?.id) router.push(`/sales/orders/${order.id}`);
  };

  return (
    <>
    <div className="space-y-5 no-print">
      {/* Fil d'ariane + retour */}
      <Link href="/sales" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux devis
      </Link>

      {/* En-tête */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-semibold text-foreground">{quote.number}</h1>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Créé {formatRelativeTime(quote.createdAt)}</p>
            </div>
          </div>

          {/* Actions selon statut */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors">
              <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
            </button>
            {editable && (
              <button onClick={() => setEditOpen(true)} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                <Pencil className="w-3.5 h-3.5" /> Modifier
              </button>
            )}
            {quote.status === 'DRAFT' && (
              <button onClick={() => updateStatus.mutate({ id: quote.id, status: 'SENT' })} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> Envoyer
              </button>
            )}
            {quote.status === 'SENT' && (
              <>
                <button onClick={() => updateStatus.mutate({ id: quote.id, status: 'ACCEPTED' })} disabled={busy}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
                  <Check className="w-3.5 h-3.5" /> Accepter
                </button>
                <button onClick={() => updateStatus.mutate({ id: quote.id, status: 'REJECTED' })} disabled={busy}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                  <X className="w-3.5 h-3.5" /> Refuser
                </button>
              </>
            )}
            {quote.status === 'ACCEPTED' && (
              <button onClick={handleConvert} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-white text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {convert.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />} Convertir en commande
              </button>
            )}
            {!quote.projectId && (
              <>
                <button onClick={handleConvertProject} disabled={convertProject.isPending}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                  {convertProject.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderKanban className="w-3.5 h-3.5" />} Convertir en projet
                </button>
                <button onClick={() => setAttachOpen(true)} disabled={attachProject.isPending}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                  <Link2 className="w-3.5 h-3.5" /> Rattacher à un projet
                </button>
              </>
            )}
            {isSuperAdmin && (
              <button onClick={() => setConfirmOpen(true)} disabled={deleteQuote.isPending}
                title="Suppression réservée au super administrateur"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50">
                {deleteQuote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Méta-infos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium text-foreground">{quote.customer?.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Valable jusqu'au</p>
              <p className="text-sm font-medium text-foreground">{quote.validUntil ? formatDate(quote.validUntil) : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Remise globale</p>
              <p className="text-sm font-medium text-foreground">{Number(quote.globalDiscountPercent ?? 0)} %</p>
            </div>
          </div>
          {quote.projectId && (
            <div className="flex items-center gap-2.5">
              <FolderKanban className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Projet</p>
                <Link href={`/projects/${quote.projectId}`} className="text-sm font-medium text-primary hover:underline">Voir le projet</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lignes */}
      <SaleLinesTable lines={quote.lines ?? []} totalHT={quote.totalHT} totalTTC={quote.totalTTC} />

      {/* Notes */}
      {quote.notes && (
        <div className="bg-card border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
    </div>

    {/* Version imprimable / PDF */}
    <SaleDocumentPrint
      docType="Devis"
      number={quote.number}
      statusLabel={sc.label}
      customerName={quote.customer?.name}
      meta={[
        { label: 'Date', value: formatDate(quote.createdAt) },
        { label: 'Valable jusqu\'au', value: quote.validUntil ? formatDate(quote.validUntil) : '—' },
        { label: 'Remise globale', value: `${Number(quote.globalDiscountPercent ?? 0)} %` },
      ]}
      lines={quote.lines ?? []}
      totalHT={quote.totalHT}
      totalTTC={quote.totalTTC}
      notes={quote.notes}
    />

    <SaleEditModal
      open={editOpen}
      onClose={() => setEditOpen(false)}
      title={`Modifier le devis ${quote.number}`}
      customerName={quote.customer?.name}
      dateLabel="Valable jusqu'au"
      initial={{ date: quote.validUntil, notes: quote.notes, globalDiscountPercent: quote.globalDiscountPercent, lines: quote.lines ?? [] }}
      pending={updateQuote.isPending}
      onSubmit={async (p) => {
        await updateQuote.mutateAsync({
          id: quote.id,
          ...(p.date ? { validUntil: p.date } : {}),
          notes: p.notes,
          globalDiscountPercent: p.globalDiscountPercent,
          lines: p.lines,
        });
        setEditOpen(false);
      }}
    />

    <ConfirmDialog
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      onConfirm={handleDelete}
      title="Supprimer le devis"
      message={`Supprimer définitivement le devis ${quote.number} ? Cette action est irréversible.`}
      confirmLabel="Supprimer"
      pending={deleteQuote.isPending}
    />

    <Modal open={attachOpen} onClose={() => setAttachOpen(false)} title="Rattacher le devis à un projet" size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Projet</label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— Sélectionner un projet —</option>
            {projectsData?.items?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
            ))}
          </select>
          {!projectsData?.items?.length && (
            <p className="text-xs text-muted-foreground">Aucun projet existant — utilisez « Convertir en projet ».</p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={() => setAttachOpen(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
          <button type="button" onClick={handleAttach} disabled={!selectedProject || attachProject.isPending}
            className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
            {attachProject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Rattacher
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}

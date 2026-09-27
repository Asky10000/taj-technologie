'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SaleLineEditor } from '@/components/sales/SaleLineEditor';
import type { SaleLine } from '@/types/sales.types';

export interface SaleEditPayload {
  date?: string;
  notes?: string;
  globalDiscountPercent: number;
  lines: Omit<SaleLine, 'id'>[];
}

interface SaleEditModalProps {
  open:        boolean;
  onClose:     () => void;
  title:       string;
  customerName?: string;
  dateLabel?:  string;                 // ex. « Valable jusqu'au » (optionnel)
  initial: {
    date?:    string;
    notes?:   string;
    globalDiscountPercent?: number;
    lines:    SaleLine[];
  };
  pending:     boolean;
  onSubmit:    (payload: SaleEditPayload) => void;
}

/** Modale d'édition d'un devis / d'une commande (lignes, remise, date, notes). */
export function SaleEditModal({ open, onClose, title, customerName, dateLabel, initial, pending, onSubmit }: SaleEditModalProps) {
  const [date, setDate]   = useState('');
  const [notes, setNotes] = useState('');
  const [disc, setDisc]   = useState(0);
  const [lines, setLines] = useState<Omit<SaleLine, 'id'>[]>([]);

  // (Ré)initialise à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setDate(initial.date ? initial.date.slice(0, 10) : '');
    setNotes(initial.notes ?? '');
    setDisc(Number(initial.globalDiscountPercent ?? 0));
    setLines(
      (initial.lines ?? []).map((l) => ({
        productId:    l.productId ?? undefined,
        description:  l.description,
        quantity:     Number(l.quantity),
        unitPrice:    Number(l.unitPrice),
        taxRate:      Number(l.taxRate ?? 20),
        discountType: l.discountType ?? 'PERCENT',
        discountValue: Number(l.discountValue ?? 0),
        sortOrder:    l.sortOrder ?? 0,
      })),
    );
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!lines.length || !lines[0].description) return;
          onSubmit({
            ...(dateLabel && date ? { date } : {}),
            ...(notes ? { notes } : { notes: '' }),
            globalDiscountPercent: disc || 0,
            lines,
          });
        }}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {customerName && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client</label>
              <div className="h-9 px-3 flex items-center rounded-md border border-input bg-muted/40 text-sm text-muted-foreground">
                {customerName}
              </div>
            </div>
          )}
          {dateLabel && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{dateLabel}</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Remise globale (%)</label>
            <input type="number" min={0} max={100} step={1} value={disc || ''}
              onChange={(e) => setDisc(+e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div className="border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Lignes</h3>
          <SaleLineEditor lines={lines} onChange={setLines} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
          <button type="submit" disabled={pending}
            className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </Modal>
  );
}

'use client';

import { Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open:          boolean;
  onClose:       () => void;
  onConfirm:     () => void;
  title:         string;
  message:       string;
  confirmLabel?: string;
  pending?:      boolean;
}

/** Boîte de confirmation intégrée (thème app) pour les actions destructives. */
export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', pending,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose}
            className="h-9 px-4 rounded-md border border-input text-sm hover:bg-accent transition-colors">
            Annuler
          </button>
          <button type="button" onClick={onConfirm} disabled={pending}
            className="h-9 px-4 rounded-md bg-destructive text-white text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2">
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

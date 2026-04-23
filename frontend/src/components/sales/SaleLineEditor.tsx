'use client';

import { Plus, Trash2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { SaleLine } from '@/types/sales.types';

interface SaleLineEditorProps {
  lines:    Omit<SaleLine, 'id'>[];
  onChange: (lines: Omit<SaleLine, 'id'>[]) => void;
}

const emptyLine = (): Omit<SaleLine, 'id'> => ({
  description: '', quantity: 1, unitPrice: 0, taxRate: 20, discountType: 'PERCENT', discountValue: 0,
});

function calcLine(l: Omit<SaleLine, 'id'>) {
  const base = Number(l.quantity) * Number(l.unitPrice);
  const discVal = Number(l.discountValue ?? 0);
  const ht = l.discountType === 'FIXED'
    ? base - discVal
    : base * (1 - discVal / 100);
  const ttc  = ht * (1 + Number(l.taxRate) / 100);
  return { ht, ttc };
}

export function SaleLineEditor({ lines, onChange }: SaleLineEditorProps) {
  const update = (i: number, patch: Partial<Omit<SaleLine, 'id'>>) => {
    const next = lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange(next);
  };

  const add    = () => onChange([...lines, emptyLine()]);
  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  const totalHT  = lines.reduce((s, l) => s + calcLine(l).ht,  0);
  const totalTTC = lines.reduce((s, l) => s + calcLine(l).ttc, 0);

  const input = (cls?: string) =>
    cn('h-8 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring', cls);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_56px_80px_64px_64px_72px_32px] gap-1.5 px-1">
        {['Désignation', 'Qté', 'P.U. HT', 'TVA%', 'Remise%', 'Total HT', ''].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase">{h}</span>
        ))}
      </div>

      {/* Lignes */}
      {lines.map((line, i) => {
        const { ht } = calcLine(line);
        return (
          <div key={i} className="grid grid-cols-[1fr_56px_80px_64px_64px_72px_32px] gap-1.5 items-center">
            <input
              value={line.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Description du produit ou service"
              className={input('w-full')}
            />
            <input
              type="number" min={0.001} step={0.5}
              value={line.quantity}
              onChange={(e) => update(i, { quantity: +e.target.value })}
              className={input('w-full text-right')}
            />
            <input
              type="number" min={0} step={0.01}
              value={line.unitPrice}
              onChange={(e) => update(i, { unitPrice: +e.target.value })}
              className={input('w-full text-right')}
            />
            <input
              type="number" min={0} max={100} step={1}
              value={line.taxRate}
              onChange={(e) => update(i, { taxRate: +e.target.value })}
              className={input('w-full text-right')}
            />
            <input
              type="number" min={0} step={0.5}
              value={line.discountValue ?? 0}
              onChange={(e) => update(i, { discountValue: +e.target.value })}
              className={input('w-full text-right')}
            />
            <span className="text-xs font-medium text-right text-foreground pr-1">
              {formatCurrency(ht)}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      {/* Ajouter ligne */}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
      >
        <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
      </button>

      {/* Totaux */}
      {lines.length > 0 && (
        <div className="border-t border-border pt-3 mt-3 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium w-28 text-right">{formatCurrency(totalHT)}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground">TVA</span>
            <span className="font-medium w-28 text-right">{formatCurrency(totalTTC - totalHT)}</span>
          </div>
          <div className="flex gap-8 font-bold text-base">
            <span>Total TTC</span>
            <span className="w-28 text-right text-primary">{formatCurrency(totalTTC)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

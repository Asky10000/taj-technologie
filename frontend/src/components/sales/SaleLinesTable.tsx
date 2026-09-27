'use client';

import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { SaleLine } from '@/types/sales.types';

interface SaleLinesTableProps {
  lines:    SaleLine[];
  totalHT:  number;
  totalTTC: number;
}

/** Calcul du total HT d'une ligne (montants FCFA entiers). */
function lineHT(l: SaleLine): number {
  const base = Number(l.quantity) * Number(l.unitPrice);
  const disc = Number(l.discountValue ?? 0);
  const ht = l.discountType === 'FIXED' ? base - disc : base * (1 - disc / 100);
  return Math.round(ht);
}

export function SaleLinesTable({ lines, totalHT, totalTTC }: SaleLinesTableProps) {
  const totalTVA = Math.round(Number(totalTTC) - Number(totalHT));

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* En-tête desktop */}
      <div className="hidden sm:grid grid-cols-[1fr_70px_110px_60px_70px_120px] gap-3 px-5 py-2.5 border-b bg-muted/30">
        {['DÉSIGNATION', 'QTÉ', 'P.U. HT', 'TVA%', 'REMISE%', 'TOTAL HT'].map((h) => (
          <span key={h} className="text-xs font-semibold text-muted-foreground uppercase last:text-right">{h}</span>
        ))}
      </div>

      <div className="divide-y divide-border">
        {lines.map((l, i) => (
          <div key={l.id ?? i}>
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-[1fr_70px_110px_60px_70px_120px] gap-3 px-5 py-3 items-center">
              <div className="flex items-center gap-2 min-w-0">
                {l.productId && <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{l.description}</p>
                  {l.product?.sku && <p className="text-[11px] text-muted-foreground">{l.product.sku}</p>}
                </div>
              </div>
              <span className="text-sm text-right tabular-nums">{Number(l.quantity)}</span>
              <span className="text-sm text-right tabular-nums">{formatCurrency(Number(l.unitPrice))}</span>
              <span className="text-sm text-right tabular-nums text-muted-foreground">{Number(l.taxRate)}</span>
              <span className="text-sm text-right tabular-nums text-muted-foreground">{Number(l.discountValue ?? 0)}</span>
              <span className="text-sm text-right font-medium tabular-nums">{formatCurrency(lineHT(l))}</span>
            </div>

            {/* Mobile */}
            <div className="sm:hidden px-4 py-3">
              <div className="flex items-center gap-2">
                {l.productId && <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                <p className="text-sm font-medium text-foreground">{l.description}</p>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <span>{Number(l.quantity)} × {formatCurrency(Number(l.unitPrice))} · TVA {Number(l.taxRate)}%</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(lineHT(l))}</span>
              </div>
            </div>
          </div>
        ))}
        {lines.length === 0 && (
          <p className="px-5 py-6 text-sm text-center text-muted-foreground">Aucune ligne</p>
        )}
      </div>

      {/* Totaux */}
      <div className="border-t border-border px-5 py-4 flex flex-col items-end gap-1 text-sm bg-muted/20">
        <div className="flex gap-8">
          <span className="text-muted-foreground">Total HT</span>
          <span className="font-medium w-40 text-right tabular-nums">{formatCurrency(Number(totalHT))}</span>
        </div>
        <div className="flex gap-8">
          <span className="text-muted-foreground">TVA</span>
          <span className="font-medium w-40 text-right tabular-nums">{formatCurrency(totalTVA)}</span>
        </div>
        <div className="flex gap-8 font-bold text-base pt-1">
          <span>Total TTC</span>
          <span className="w-40 text-right text-primary tabular-nums">{formatCurrency(Number(totalTTC))}</span>
        </div>
      </div>
    </div>
  );
}

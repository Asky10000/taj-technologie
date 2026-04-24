'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useProducts } from '@/hooks/useInventory';
import type { SaleLine } from '@/types/sales.types';

interface SaleLineEditorProps {
  lines:    Omit<SaleLine, 'id'>[];
  onChange: (lines: Omit<SaleLine, 'id'>[]) => void;
}

const emptyLine = (): Omit<SaleLine, 'id'> => ({
  productId: undefined, description: '', quantity: 1,
  unitPrice: 0, taxRate: 18, discountType: 'PERCENT', discountValue: 0,
});

function calcLine(l: Omit<SaleLine, 'id'>) {
  const base   = Number(l.quantity) * Number(l.unitPrice);
  const discVal = Number(l.discountValue ?? 0);
  const ht  = l.discountType === 'FIXED' ? base - discVal : base * (1 - discVal / 100);
  const ttc = ht * (1 + Number(l.taxRate) / 100);
  return { ht, ttc };
}

/* Champ désignation avec liste déroulante + saisie libre */
function DesignationCell({
  line, index, onUpdate,
}: {
  line:     Omit<SaleLine, 'id'>;
  index:    number;
  onUpdate: (patch: Partial<Omit<SaleLine, 'id'>>) => void;
}) {
  const { data: productsData } = useProducts();
  const products = productsData?.items ?? [];

  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  const selectProduct = (p: (typeof products)[0]) => {
    onUpdate({
      productId:   p.id,
      description: p.name,
      unitPrice:   p.sellingPrice,
      taxRate:     p.taxRate,
    });
    setSearch('');
    setOpen(false);
  };

  const clearProduct = () => {
    onUpdate({ productId: undefined, description: '', unitPrice: 0 });
    setSearch('');
  };

  return (
    <div className="relative w-full">
      {/* Champ affiché */}
      <div
        className={cn(
          'flex items-center gap-1 h-8 px-2 rounded border border-input bg-background text-xs cursor-pointer',
          open && 'ring-1 ring-ring border-ring',
        )}
        onClick={() => { setOpen((v) => !v); setSearch(''); }}
      >
        <span className={cn('flex-1 truncate', !line.description && 'text-muted-foreground')}>
          {line.description || 'Sélectionner ou saisir…'}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Recherche */}
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full h-7 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Liste produits */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">Aucun produit trouvé</p>
            ) : (
              filtered.slice(0, 50).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProduct(p)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.sku}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary flex-shrink-0">
                    {formatCurrency(p.sellingPrice)}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Option saisie libre */}
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => {
                clearProduct();
                setOpen(false);
                // Permettre la saisie manuelle
                setTimeout(() => {
                  const el = document.getElementById(`desc-free-${index}`);
                  el?.focus();
                }, 50);
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1 text-center transition-colors"
            >
              ✏️ Saisie libre (service / autre)
            </button>
          </div>
        </div>
      )}

      {/* Champ texte libre (quand pas de produit sélectionné) */}
      {!line.productId && !open && (
        <input
          id={`desc-free-${index}`}
          value={line.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          placeholder="Description libre…"
          className="absolute inset-0 h-8 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
        />
      )}
    </div>
  );
}

export function SaleLineEditor({ lines, onChange }: SaleLineEditorProps) {
  const update = (i: number, patch: Partial<Omit<SaleLine, 'id'>>) => {
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const add    = () => onChange([...lines, emptyLine()]);
  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  const totalHT  = lines.reduce((s, l) => s + calcLine(l).ht,  0);
  const totalTTC = lines.reduce((s, l) => s + calcLine(l).ttc, 0);

  const input = (cls?: string) =>
    cn('h-8 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring', cls);

  return (
    <div className="space-y-2">
      {/* Header desktop */}
      <div className="hidden sm:grid grid-cols-[1fr_52px_88px_56px_60px_80px_32px] gap-1.5 px-1">
        {['Désignation', 'Qté', 'P.U. HT', 'TVA%', 'Remise%', 'Total HT', ''].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase">{h}</span>
        ))}
      </div>

      {/* Lignes */}
      {lines.map((line, i) => {
        const { ht } = calcLine(line);
        return (
          <div key={i} className="space-y-1.5 sm:space-y-0">
            {/* Mobile : empilé */}
            <div className="sm:hidden space-y-1.5 bg-muted/30 rounded-lg p-2">
              <DesignationCell line={line} index={i} onUpdate={(p) => update(i, p)} />
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Qté</p>
                  <input type="number" min={0.001} step={0.5} value={line.quantity}
                    onChange={(e) => update(i, { quantity: +e.target.value })}
                    className={input('w-full text-right')} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">P.U. HT</p>
                  <input type="number" min={0} step={1} value={line.unitPrice}
                    onChange={(e) => update(i, { unitPrice: +e.target.value })}
                    className={input('w-full text-right')} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">TVA%</p>
                  <input type="number" min={0} max={100} step={1} value={line.taxRate}
                    onChange={(e) => update(i, { taxRate: +e.target.value })}
                    className={input('w-full text-right')} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Remise%</p>
                  <input type="number" min={0} step={0.5} value={line.discountValue ?? 0}
                    onChange={(e) => update(i, { discountValue: +e.target.value })}
                    className={input('w-full text-right')} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">{formatCurrency(ht)}</span>
                <button type="button" onClick={() => remove(i)}
                  className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Desktop : grille */}
            <div className="hidden sm:grid grid-cols-[1fr_52px_88px_56px_60px_80px_32px] gap-1.5 items-center">
              <DesignationCell line={line} index={i} onUpdate={(p) => update(i, p)} />
              <input type="number" min={0.001} step={0.5} value={line.quantity}
                onChange={(e) => update(i, { quantity: +e.target.value })}
                className={input('w-full text-right')} />
              <input type="number" min={0} step={1} value={line.unitPrice}
                onChange={(e) => update(i, { unitPrice: +e.target.value })}
                className={input('w-full text-right')} />
              <input type="number" min={0} max={100} step={1} value={line.taxRate}
                onChange={(e) => update(i, { taxRate: +e.target.value })}
                className={input('w-full text-right')} />
              <input type="number" min={0} step={0.5} value={line.discountValue ?? 0}
                onChange={(e) => update(i, { discountValue: +e.target.value })}
                className={input('w-full text-right')} />
              <span className="text-xs font-medium text-right text-foreground pr-1">
                {formatCurrency(ht)}
              </span>
              <button type="button" onClick={() => remove(i)}
                className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Ajouter ligne */}
      <button type="button" onClick={add}
        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors mt-1">
        <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
      </button>

      {/* Totaux */}
      {lines.length > 0 && (
        <div className="border-t border-border pt-3 mt-3 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium w-32 text-right">{formatCurrency(totalHT)}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground">TVA</span>
            <span className="font-medium w-32 text-right">{formatCurrency(totalTTC - totalHT)}</span>
          </div>
          <div className="flex gap-8 font-bold text-base">
            <span>Total TTC</span>
            <span className="w-32 text-right text-primary">{formatCurrency(totalTTC)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

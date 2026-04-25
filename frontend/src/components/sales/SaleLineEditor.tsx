'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Package, X } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useProducts } from '@/hooks/useInventory';
import type { SaleLine } from '@/types/sales.types';

interface SaleLineEditorProps {
  lines:    Omit<SaleLine, 'id'>[];
  onChange: (lines: Omit<SaleLine, 'id'>[]) => void;
}

const emptyLine = (): Omit<SaleLine, 'id'> => ({
  productId:    undefined,
  description:  '',
  quantity:     1,
  unitPrice:    0,
  taxRate:      18,
  discountType: 'PERCENT',
  discountValue: 0,
});

function calcLine(l: Omit<SaleLine, 'id'>) {
  const base    = Number(l.quantity) * Number(l.unitPrice);
  const discVal = Number(l.discountValue ?? 0);
  const ht  = l.discountType === 'FIXED' ? base - discVal : base * (1 - discVal / 100);
  const ttc = ht * (1 + Number(l.taxRate) / 100);
  return { ht, ttc };
}

/* ─────────────────────────────────────────────────────────────────
   Combobox désignation
   Le dropdown utilise position:fixed + getBoundingClientRect pour
   échapper aux overflow:hidden/auto des conteneurs parents (modal).
   ───────────────────────────────────────────────────────────────── */
function DesignationCell({
  line, index, onUpdate,
}: {
  line:     Omit<SaleLine, 'id'>;
  index:    number;
  onUpdate: (patch: Partial<Omit<SaleLine, 'id'>>) => void;
}) {
  const { data: productsData } = useProducts();
  const products = productsData?.items ?? [];

  const [open,        setOpen]        = useState(false);
  const [inputValue,  setInputValue]  = useState(line.description);
  const [highlighted, setHighlighted] = useState(0);
  /* Coordonnées fixes du dropdown */
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 320 });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  /* Sync description depuis l'extérieur */
  useEffect(() => { setInputValue(line.description); }, [line.description]);

  /* Calcul des coordonnées viewport au moment d'ouvrir */
  const openDropdown = useCallback(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
    }
    setOpen(true);
    setHighlighted(0);
  }, []);

  /* Fermer au clic extérieur */
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      /* Ignore les clics dans le container ou dans le dropdown (fixed) */
      const dropdown = document.getElementById(`sl-dropdown-${index}`);
      if (containerRef.current?.contains(target) || dropdown?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, index]);

  /* Recalculer position si la fenêtre scrolle / est redimensionnée */
  useEffect(() => {
    if (!open) return;
    const recalc = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setCoords({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
      }
    };
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => { window.removeEventListener('scroll', recalc, true); window.removeEventListener('resize', recalc); };
  }, [open]);

  /* Filtrage */
  const query    = inputValue.trim().toLowerCase();
  const filtered = query
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query),
      )
    : products;

  /* Sélectionner un produit */
  const selectProduct = (p: (typeof products)[0]) => {
    onUpdate({ productId: p.id, description: p.name, unitPrice: p.sellingPrice, taxRate: p.taxRate });
    setInputValue(p.name);
    setOpen(false);
  };

  /* Clavier */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { openDropdown(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, Math.min(filtered.length, 50) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlighted]) selectProduct(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">

      {/* ── Champ de saisie ─────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-8 rounded border border-input bg-background overflow-hidden',
        open && 'ring-1 ring-ring border-ring',
      )}>
        {line.productId && (
          <span className="pl-2 text-primary flex-shrink-0">
            <Package className="w-3 h-3" />
          </span>
        )}
        <input
          ref={inputRef}
          value={inputValue}
          placeholder="Désignation ou rechercher un produit…"
          autoComplete="off"
          className="flex-1 h-full px-2 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground min-w-0"
          onChange={(e) => {
            const v = e.target.value;
            setInputValue(v);
            onUpdate({ description: v, productId: undefined });
            openDropdown();
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />
        {(inputValue || line.productId) && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue('');
              onUpdate({ description: '', productId: undefined, unitPrice: 0, taxRate: 18 });
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="px-2 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Dropdown (position:fixed pour sortir des overflow) ──── */}
      {open && (
        <div
          id={`sl-dropdown-${index}`}
          className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-2xl overflow-hidden"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              {products.length === 0
                ? 'Aucun produit dans le catalogue — créez-en dans la rubrique Produits'
                : 'Aucun produit trouvé — la saisie sera enregistrée telle quelle'}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {filtered.slice(0, 50).map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectProduct(p); }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors',
                    idx === highlighted ? 'bg-accent' : 'hover:bg-accent/60',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <HighlightMatch text={p.name} query={query} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.sku} · {p.unit}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary flex-shrink-0 whitespace-nowrap">
                    {formatCurrency(p.sellingPrice)}
                  </span>
                </button>
              ))}
              {filtered.length > 50 && (
                <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border text-center">
                  +{filtered.length - 50} résultats — affinez la recherche
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Surligne la correspondance dans le texte */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) {
    return <p className="text-xs font-medium text-foreground truncate">{text}</p>;
  }
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) {
    return <p className="text-xs font-medium text-foreground truncate">{text}</p>;
  }
  return (
    <p className="text-xs font-medium text-foreground truncate">
      {text.slice(0, i)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 text-foreground rounded-[2px] not-italic">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Composant principal
   ───────────────────────────────────────────────────────────────── */
export function SaleLineEditor({ lines, onChange }: SaleLineEditorProps) {
  const update = (i: number, patch: Partial<Omit<SaleLine, 'id'>>) =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const add    = () => onChange([...lines, emptyLine()]);
  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));

  const totalHT  = lines.reduce((s, l) => s + calcLine(l).ht,  0);
  const totalTTC = lines.reduce((s, l) => s + calcLine(l).ttc, 0);

  const inp = (cls?: string) =>
    cn('h-8 px-2 rounded border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring', cls);

  return (
    <div className="space-y-2">

      {/* ── En-tête desktop ─────────────────────────────────────── */}
      <div className="hidden sm:grid grid-cols-[1fr_52px_92px_52px_60px_84px_32px] gap-1.5 px-1">
        {['Désignation', 'Qté', 'P.U. HT', 'TVA%', 'Remise%', 'Total HT', ''].map((h) => (
          <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase">{h}</span>
        ))}
      </div>

      {/* ── Lignes ──────────────────────────────────────────────── */}
      {lines.map((line, i) => {
        const { ht } = calcLine(line);
        return (
          <div key={i}>

            {/* Mobile */}
            <div className="sm:hidden space-y-1.5 bg-muted/30 rounded-lg p-2">
              <DesignationCell line={line} index={i} onUpdate={(p) => update(i, p)} />
              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Qté</p>
                  <input type="number" min={0.001} step={0.5} value={line.quantity}
                    onChange={(e) => update(i, { quantity: +e.target.value })}
                    className={inp('w-full text-right')} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">P.U. HT</p>
                  <input type="number" min={0} step={1} value={line.unitPrice}
                    onChange={(e) => update(i, { unitPrice: +e.target.value })}
                    className={inp('w-full text-right')} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">TVA%</p>
                  <input type="number" min={0} max={100} step={1} value={line.taxRate}
                    onChange={(e) => update(i, { taxRate: +e.target.value })}
                    className={inp('w-full text-right')} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Remise%</p>
                  <input type="number" min={0} step={0.5} value={line.discountValue ?? 0}
                    onChange={(e) => update(i, { discountValue: +e.target.value })}
                    className={inp('w-full text-right')} />
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

            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-[1fr_52px_92px_52px_60px_84px_32px] gap-1.5 items-center">
              <DesignationCell line={line} index={i} onUpdate={(p) => update(i, p)} />
              <input type="number" min={0.001} step={0.5} value={line.quantity}
                onChange={(e) => update(i, { quantity: +e.target.value })}
                className={inp('w-full text-right')} />
              <input type="number" min={0} step={1} value={line.unitPrice}
                onChange={(e) => update(i, { unitPrice: +e.target.value })}
                className={inp('w-full text-right')} />
              <input type="number" min={0} max={100} step={1} value={line.taxRate}
                onChange={(e) => update(i, { taxRate: +e.target.value })}
                className={inp('w-full text-right')} />
              <input type="number" min={0} step={0.5} value={line.discountValue ?? 0}
                onChange={(e) => update(i, { discountValue: +e.target.value })}
                className={inp('w-full text-right')} />
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

      {/* ── Ajouter une ligne ────────────────────────────────────── */}
      <button type="button" onClick={add}
        className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors mt-1 ml-1">
        <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
      </button>

      {/* ── Totaux ──────────────────────────────────────────────── */}
      {lines.length > 0 && (
        <div className="border-t border-border pt-3 mt-3 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium w-36 text-right">{formatCurrency(totalHT)}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-muted-foreground">TVA</span>
            <span className="font-medium w-36 text-right">{formatCurrency(totalTTC - totalHT)}</span>
          </div>
          <div className="flex gap-8 font-bold text-base">
            <span>Total TTC</span>
            <span className="w-36 text-right text-primary">{formatCurrency(totalTTC)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

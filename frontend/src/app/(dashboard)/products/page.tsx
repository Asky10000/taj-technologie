'use client';

import { useState } from 'react';
import { Plus, Package, Loader2, Pencil, Trash2, Warehouse, Check, FolderPlus } from 'lucide-react';
import Link from 'next/link';
import {
  useProductsList, useCreateProduct, useUpdateProduct,
  useDeleteProduct, useUpdateProductStatus, useCategories, useCreateCategory,
} from '@/hooks/useProducts';
import { useStocks } from '@/hooks/useInventory';
import { Badge }       from '@/components/ui/Badge';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatCurrency, cn } from '@/lib/utils';
import type {
  ProductType, ProductStatus, StockPolicy, PriceType, CreateProductPayload, Product,
} from '@/types/product.types';

// ── Configs ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<ProductType, string> = {
  HARDWARE:     'Matériel',
  CONSUMABLE:   'Consommable',
  SOFTWARE:     'Logiciel',
  SERVICE:      'Service',
  SUBSCRIPTION: 'Abonnement',
};

const TYPE_COLORS: Record<ProductType, string> = {
  HARDWARE:     'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  CONSUMABLE:   'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  SOFTWARE:     'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  SERVICE:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  SUBSCRIPTION: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
};

const STATUS_CONFIG: Record<ProductStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'outline' }> = {
  ACTIVE:       { label: 'Actif',        variant: 'success'  },
  INACTIVE:     { label: 'Inactif',      variant: 'outline'  },
  DISCONTINUED: { label: 'Arrêté',       variant: 'danger'   },
  OUT_OF_STOCK: { label: 'Rupture',      variant: 'warning'  },
};

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  FIXED:    'Prix fixe',
  HOURLY:   'À l\'heure',
  DAILY:    'À la journée',
  MONTHLY:  'Mensuel',
  ANNUAL:   'Annuel',
};

const STOCK_POLICY_LABELS: Record<StockPolicy, string> = {
  TRACKED:   'Stock géré',
  UNTRACKED: 'Stock non géré',
};

// ── Valeur initiale du formulaire ────────────────────────────────

const emptyForm = (): CreateProductPayload => ({
  name:         '',
  type:         'HARDWARE',
  sellingPrice: 0,
  taxRate:      18,
  costPrice:    0,
  unit:         'pièce',
  stockPolicy:  'TRACKED',
  priceType:    'FIXED',
});

// ── Composant principal ──────────────────────────────────────────

export default function ProductsPage() {
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Product | null>(null);
  const [form,      setForm]      = useState<CreateProductPayload>(emptyForm());
  const [deleting,  setDeleting]  = useState<Product | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const { data, isLoading, isFetching } = useProductsList({
    page, limit: 20,
    search:  search    || undefined,
    type:    typeFilter || undefined,
  });
  const { data: categories } = useCategories();
  const { data: stocksData }  = useStocks({ limit: 100 });

  // Map productId → stock disponible
  const stockMap = new Map<string, number>(
    (stocksData?.items ?? []).map((s) => [s.productId, s.availableQuantity]),
  );

  const createMutation    = useCreateProduct();
  const updateMutation    = useUpdateProduct();
  const deleteMutation    = useDeleteProduct();
  const statusMutation    = useUpdateProductStatus();
  const createCatMutation = useCreateCategory();

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name:             p.name,
      type:             p.type,
      sellingPrice:     p.sellingPrice,
      taxRate:          p.taxRate,
      costPrice:        p.costPrice ?? 0,
      sku:              p.sku,
      shortDescription: p.shortDescription,
      brand:            p.brand,
      model:            p.model,
      unit:             p.unit,
      barcode:          p.barcode,
      warrantyMonths:   p.warrantyMonths,
      stockPolicy:      p.stockPolicy,
      priceType:        p.priceType,
      categoryId:       p.categoryId,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      sellingPrice:   Number(form.sellingPrice),
      costPrice:      form.costPrice ? Number(form.costPrice) : undefined,
      taxRate:        Number(form.taxRate),
      warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : undefined,
      categoryId:     form.categoryId || undefined,
      sku:            form.sku        || undefined,
      brand:          form.brand      || undefined,
      model:          form.model      || undefined,
      barcode:        form.barcode    || undefined,
      shortDescription: form.shortDescription || undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteMutation.mutateAsync(deleting.id);
    setDeleting(null);
  };

  const set = (k: keyof CreateProductPayload, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const inputCls = 'w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const selectCls = inputCls;

  const TYPE_FILTER_OPTIONS: { label: string; value: ProductType | '' }[] = [
    { label: 'Tous',         value: '' },
    { label: 'Matériel',     value: 'HARDWARE' },
    { label: 'Consommable',  value: 'CONSUMABLE' },
    { label: 'Logiciel',     value: 'SOFTWARE' },
    { label: 'Service',      value: 'SERVICE' },
    { label: 'Abonnement',   value: 'SUBSCRIPTION' },
  ];

  return (
    <div className="space-y-5">

      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={handleSearch} placeholder="Nom, SKU…" className="w-full sm:w-56" />
          <div className="flex items-center gap-1 border border-input rounded-md p-0.5 bg-background flex-wrap">
            {TYPE_FILTER_OPTIONS.map((f) => (
              <button key={f.value} onClick={() => { setTypeFilter(f.value); setPage(1); }}
                className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  typeFilter === f.value ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}>
                {f.label}
              </button>
            ))}
          </div>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0">
          <Plus className="w-4 h-4" /> Nouveau produit
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 items-center">
                <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-40 bg-muted rounded animate-pulse flex-1" />
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={Package} title="Aucun produit" description="Créez votre premier produit."
            action={
              <button onClick={openCreate}
                className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> Nouveau produit
              </button>
            } />
        ) : (
          <>
            {/* Header desktop */}
            <div className="hidden sm:grid grid-cols-[80px_1fr_130px_110px_60px_80px_110px_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['SKU', 'PRODUIT', 'TYPE', 'PRIX HT', 'TVA', 'STOCK', 'STATUT', 'ACTIONS'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-border">
              {data.items.map((product) => {
                const sc = STATUS_CONFIG[product.status];
                return (
                  <div key={product.id}>
                    {/* Mobile card */}
                    <div className="sm:hidden px-4 py-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                        </div>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', TYPE_COLORS[product.type])}>
                          {TYPE_LABELS[product.type]}
                        </span>
                        <span className="text-sm font-semibold text-primary">{formatCurrency(product.sellingPrice)}</span>
                        <span className="text-xs text-muted-foreground">TVA {product.taxRate}%</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => openEdit(product)}
                          className="flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border border-input hover:bg-accent transition-colors">
                          <Pencil className="w-3 h-3" /> Modifier
                        </button>
                        <button onClick={() => setDeleting(product)}
                          className="flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </div>
                    </div>

                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-[80px_1fr_130px_110px_60px_80px_110px_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors">
                      <span className="text-xs font-mono text-muted-foreground truncate">{product.sku}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground truncate">{product.brand}{product.model ? ` — ${product.model}` : ''}</p>
                        )}
                      </div>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit', TYPE_COLORS[product.type])}>
                        {TYPE_LABELS[product.type]}
                      </span>
                      <span className="text-sm font-semibold">{formatCurrency(product.sellingPrice)}</span>
                      <span className="text-sm text-muted-foreground">{product.taxRate} %</span>
                      {/* Stock dispo */}
                      {product.stockPolicy === 'TRACKED' ? (
                        <Link href="/inventory" className="group flex items-center gap-1">
                          <span className={cn('text-sm font-semibold tabular-nums',
                            (stockMap.get(product.id) ?? 0) === 0
                              ? 'text-red-500'
                              : (stockMap.get(product.id) ?? 0) <= 5
                                ? 'text-amber-500'
                                : 'text-emerald-600',
                          )}>
                            {stockMap.get(product.id) ?? 0}
                          </span>
                          <Warehouse className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(product)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors" title="Modifier">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleting(product)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border border-input hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {data.totalPages > 1 && (
              <div className="border-t border-border px-5">
                <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Création / Édition ── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Modifier — ${editing.name}` : 'Nouveau produit'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Ligne 1 : Nom + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Nom du produit <span className="text-destructive">*</span></label>
              <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Ex : HP LaserJet Pro M404n"
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type <span className="text-destructive">*</span></label>
              <select required value={form.type} onChange={(e) => set('type', e.target.value as ProductType)}
                className={selectCls}>
                {(Object.entries(TYPE_LABELS) as [ProductType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ligne 2 : Prix vente + Coût + TVA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prix de vente HT (FCFA) <span className="text-destructive">*</span></label>
              <input required type="number" min={0} step={1} value={form.sellingPrice}
                onChange={(e) => set('sellingPrice', e.target.value)}
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prix d'achat HT (FCFA)</label>
              <input type="number" min={0} step={1} value={form.costPrice ?? ''}
                onChange={(e) => set('costPrice', e.target.value)}
                placeholder="Optionnel"
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">TVA (%)</label>
              <input type="number" min={0} max={100} step={1} value={form.taxRate}
                onChange={(e) => set('taxRate', e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Ligne 3 : SKU + Marque + Modèle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SKU</label>
              <input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)}
                placeholder="Auto-généré si vide"
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Marque</label>
              <input value={form.brand ?? ''} onChange={(e) => set('brand', e.target.value)}
                placeholder="Ex : HP, Canon…"
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Modèle</label>
              <input value={form.model ?? ''} onChange={(e) => set('model', e.target.value)}
                placeholder="Ex : M404n"
                className={inputCls} />
            </div>
          </div>

          {/* Ligne 4 : Unité + Catégorie + Stock policy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unité</label>
              <input value={form.unit ?? 'pièce'} onChange={(e) => set('unit', e.target.value)}
                placeholder="pièce, licence, heure…"
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Catégorie</label>
                <button
                  type="button"
                  onClick={() => { setShowNewCat((v) => !v); setNewCatName(''); }}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Nouvelle
                </button>
              </div>

              {/* Création inline */}
              {showNewCat && (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Nom de la catégorie"
                    className="flex-1 h-8 px-2 rounded-md border border-primary bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!newCatName.trim()) return;
                        const cat = await createCatMutation.mutateAsync(newCatName.trim());
                        set('categoryId', cat.id);
                        setNewCatName('');
                        setShowNewCat(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!newCatName.trim() || createCatMutation.isPending}
                    onClick={async () => {
                      if (!newCatName.trim()) return;
                      const cat = await createCatMutation.mutateAsync(newCatName.trim());
                      set('categoryId', cat.id);
                      setNewCatName('');
                      setShowNewCat(false);
                    }}
                    className="h-8 px-3 rounded-md bg-primary text-white text-xs disabled:opacity-50 flex items-center gap-1"
                  >
                    {createCatMutation.isPending
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Check className="w-3 h-3" />}
                  </button>
                </div>
              )}

              <select value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value)}
                className={selectCls}>
                <option value="">— Sans catégorie —</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {(!categories || categories.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Aucune catégorie — cliquez sur <strong>Nouvelle</strong> pour en créer une.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Gestion du stock</label>
              <select value={form.stockPolicy} onChange={(e) => set('stockPolicy', e.target.value as StockPolicy)}
                className={selectCls}>
                {(Object.entries(STOCK_POLICY_LABELS) as [StockPolicy, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ligne 5 : Type de prix + Garantie + Code-barres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type de tarification</label>
              <select value={form.priceType} onChange={(e) => set('priceType', e.target.value as PriceType)}
                className={selectCls}>
                {(Object.entries(PRICE_TYPE_LABELS) as [PriceType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Garantie (mois)</label>
              <input type="number" min={0} step={1} value={form.warrantyMonths ?? ''}
                onChange={(e) => set('warrantyMonths', e.target.value)}
                placeholder="Ex : 12, 24…"
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Code-barres</label>
              <input value={form.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)}
                placeholder="EAN-13, QR…"
                className={inputCls} />
            </div>
          </div>

          {/* Description courte */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description courte</label>
            <textarea rows={2} value={form.shortDescription ?? ''}
              onChange={(e) => set('shortDescription', e.target.value)}
              placeholder="Résumé affiché dans les listes…"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)}
              className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">
              Annuler
            </button>
            <button type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="h-9 px-5 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {editing ? 'Enregistrer' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal confirmation suppression ── */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Supprimer le produit" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Voulez-vous supprimer <span className="font-semibold text-foreground">{deleting?.name}</span> ?
            Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleting(null)}
              className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">
              Annuler
            </button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending}
              className="h-9 px-4 rounded-md bg-destructive text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

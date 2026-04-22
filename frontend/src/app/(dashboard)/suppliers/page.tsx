'use client';

import { useState } from 'react';
import { Building2, Plus, Loader2, Mail, Phone, Clock } from 'lucide-react';
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '@/hooks/useSuppliers';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatRelativeTime } from '@/lib/utils';
import type { Supplier } from '@/types/supplier.types';

const EMPTY_FORM = { companyName: '', contactName: '', email: '', phone: '', address: '', siret: '', paymentTerms: 30, notes: '' };

export default function SuppliersPage() {
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [modal,  setModal]  = useState<'create' | Supplier | null>(null);
  const [form,   setForm]   = useState(EMPTY_FORM);

  const { data, isLoading, isFetching } = useSuppliers({ page, limit: 20, search: search || undefined });
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit   = (s: Supplier) => {
    setForm({
      companyName:  s.companyName,
      contactName:  s.contactName  ?? '',
      email:        s.email        ?? '',
      phone:        s.phone        ?? '',
      address:      s.address      ?? '',
      siret:        s.siret        ?? '',
      paymentTerms: s.paymentTerms ?? 30,
      notes:        s.notes        ?? '',
    });
    setModal(s);
  };

  const isEditing = modal && modal !== 'create';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, paymentTerms: Number(form.paymentTerms) };
    if (isEditing) {
      await updateMutation.mutateAsync({ id: (modal as Supplier).id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setModal(null);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Nom, SIRET…" className="w-56" />
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nouveau fournisseur
        </button>
      </div>

      {/* Grille */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="bg-card border rounded-xl">
          <EmptyState icon={Building2} title="Aucun fournisseur"
            description="Ajoutez vos fournisseurs pour gérer vos achats."
            action={<button onClick={openCreate} className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> Nouveau fournisseur</button>} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((supplier) => (
              <button
                key={supplier.id}
                onClick={() => openEdit(supplier)}
                className="bg-card border rounded-xl p-5 text-left hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {supplier.companyName}
                    </p>
                    {supplier.contactName && (
                      <p className="text-xs text-muted-foreground truncate">{supplier.contactName}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.paymentTerms && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Délai {supplier.paymentTerms} j</span>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">{formatRelativeTime(supplier.createdAt)}</p>
              </button>
            ))}
          </div>
          <div className="bg-card border rounded-xl px-5">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={isEditing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Raison sociale <span className="text-destructive">*</span></label>
              <input required value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contact</label>
              <input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">SIRET</label>
              <input value={form.siret} onChange={(e) => setForm((p) => ({ ...p, siret: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Téléphone</label>
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Délai de paiement (jours)</label>
              <input type="number" min={0} value={form.paymentTerms}
                onChange={(e) => setForm((p) => ({ ...p, paymentTerms: +e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Adresse</label>
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setModal(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

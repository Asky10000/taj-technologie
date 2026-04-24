'use client';

import { useState } from 'react';
import { Users, Plus, Loader2, Shield, UserCheck, UserX, Pencil, Trash2 } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useToggleUserStatus, useDeleteUser } from '@/hooks/useUsers';
import { Badge }       from '@/components/ui/Badge';
import { Pagination }  from '@/components/ui/Pagination';
import { EmptyState }  from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal }       from '@/components/ui/Modal';
import { formatRelativeTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import type { User, UserRole } from '@/types/user.types';

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline'; level: number }> = {
  SUPER_ADMIN: { label: 'Super Admin', variant: 'danger',  level: 100 },
  ADMIN:       { label: 'Admin',       variant: 'danger',  level: 90 },
  MANAGER:     { label: 'Manager',     variant: 'info',    level: 70 },
  ACCOUNTANT:  { label: 'Comptable',   variant: 'warning', level: 60 },
  SALES:       { label: 'Commercial',  variant: 'success', level: 50 },
  TECHNICIAN:  { label: 'Technicien',  variant: 'success', level: 50 },
  USER:        { label: 'Utilisateur', variant: 'outline', level: 10 },
};

const ROLES_OPTIONS: UserRole[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'TECHNICIAN', 'USER'];

const EMPTY_CREATE = { firstName: '', lastName: '', email: '', password: '', role: 'USER' as UserRole };

function initials(u: User) {
  return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
}

export default function UsersPage() {
  const me = useAuthStore((s) => s.user);

  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  const [createModal, setCreateModal] = useState(false);
  const [createForm,  setCreateForm]  = useState(EMPTY_CREATE);

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm,   setEditForm]   = useState({ firstName: '', lastName: '', role: 'USER' as UserRole });

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data, isLoading, isFetching } = useUsers({
    page, limit: 20,
    search: search || undefined,
    role:   roleFilter || undefined,
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const toggleMutation = useToggleUserStatus();
  const deleteMutation = useDeleteUser();

  const openEdit = (u: User) => {
    setEditTarget(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, role: u.role });
  };

  const myLevel = me ? (ROLE_CONFIG[me.role as UserRole]?.level ?? 0) : 0;
  const canManage = (target: User) => ROLE_CONFIG[target.role]?.level < myLevel;

  return (
    <div className="space-y-5">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Nom, email…" className="w-full sm:w-56" />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as UserRole | ''); setPage(1); }}
            className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Tous les rôles</option>
            {ROLES_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
            ))}
          </select>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <button
          onClick={() => { setCreateForm(EMPTY_CREATE); setCreateModal(true); }}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 items-center">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={Users} title="Aucun utilisateur" description="Créez le premier utilisateur."
            action={
              <button onClick={() => { setCreateForm(EMPTY_CREATE); setCreateModal(true); }}
                className="flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm font-medium">
                <Plus className="w-4 h-4" /> Nouvel utilisateur
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b bg-muted/30">
              {['UTILISATEUR', 'EMAIL / DATE', 'RÔLE', 'STATUT', 'ACTIONS'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {data.items.map((user) => {
                const rc  = ROLE_CONFIG[user.role];
                const isMe = user.id === me?.id;
                const manageable = canManage(user) && !isMe;
                return (
                  <div key={user.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-accent/30 transition-colors">
                    {/* Avatar */}
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                      user.isActive ? 'bg-primary' : 'bg-muted-foreground',
                    )}>
                      {initials(user)}
                    </div>

                    {/* Nom / Email */}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.firstName} {user.lastName}
                        {isMe && <span className="ml-2 text-[10px] text-muted-foreground font-normal">(moi)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email} · {formatRelativeTime(user.createdAt)}</p>
                    </div>

                    {/* Rôle */}
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-muted-foreground" />
                      <Badge variant={rc.variant}>{rc.label}</Badge>
                    </div>

                    {/* Statut */}
                    <span className={cn('text-xs font-medium', user.isActive ? 'text-emerald-600' : 'text-muted-foreground')}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {manageable && (
                        <>
                          <button
                            onClick={() => openEdit(user)}
                            className="w-7 h-7 flex items-center justify-center rounded border border-input hover:bg-accent transition-colors text-muted-foreground"
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate({ id: user.id, isActive: !user.isActive })}
                            disabled={toggleMutation.isPending}
                            className={cn(
                              'w-7 h-7 flex items-center justify-center rounded border transition-colors disabled:opacity-50',
                              user.isActive
                                ? 'border-input text-muted-foreground hover:text-amber-600 hover:border-amber-300'
                                : 'border-input text-muted-foreground hover:text-emerald-600 hover:border-emerald-300',
                            )}
                            title={user.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="w-7 h-7 flex items-center justify-center rounded border border-input hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-colors text-muted-foreground"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border px-5">
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* ── Modal création ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nouvel utilisateur" size="sm">
        <form onSubmit={async (e) => {
          e.preventDefault();
          await createMutation.mutateAsync(createForm);
          setCreateModal(false);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prénom <span className="text-destructive">*</span></label>
              <input required value={createForm.firstName}
                onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom <span className="text-destructive">*</span></label>
              <input required value={createForm.lastName}
                onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
            <input required type="email" value={createForm.email}
              onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mot de passe <span className="text-destructive">*</span></label>
            <input required type="password" minLength={8} value={createForm.password}
              onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Minimum 8 caractères"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rôle</label>
            <select value={createForm.role}
              onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as UserRole }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {ROLES_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setCreateModal(false)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={createMutation.isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal édition ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Modifier l'utilisateur" size="sm">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!editTarget) return;
          await updateMutation.mutateAsync({ id: editTarget.id, ...editForm });
          setEditTarget(null);
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prénom</label>
              <input value={editForm.firstName}
                onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom</label>
              <input value={editForm.lastName}
                onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rôle</label>
            <select value={editForm.role}
              onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {ROLES_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setEditTarget(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button type="submit" disabled={updateMutation.isPending}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm disabled:opacity-50 flex items-center gap-2">
              {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal suppression ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer l'utilisateur" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Voulez-vous vraiment supprimer <span className="font-semibold text-foreground">{deleteTarget?.firstName} {deleteTarget?.lastName}</span> ?
            Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button onClick={() => setDeleteTarget(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent transition-colors">Annuler</button>
            <button
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteMutation.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
              disabled={deleteMutation.isPending}
              className="h-9 px-4 rounded-md bg-destructive text-white text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

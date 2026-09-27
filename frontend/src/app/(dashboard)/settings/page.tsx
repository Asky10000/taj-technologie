'use client';

import { Settings, User, Shield, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Paramètres</h2>
      </div>

      {/* Profil */}
      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Mon profil</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Prénom</p>
            <p className="font-medium">{user?.firstName ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Nom</p>
            <p className="font-medium">{user?.lastName ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Email</p>
            <p className="font-medium">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Rôle</p>
            <p className="font-medium">{user?.role ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Sécurité */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Sécurité</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          La gestion des mots de passe et des accès sera disponible prochainement.
        </p>
      </div>

      {/* Notifications */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Les préférences de notification seront disponibles prochainement.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, User, Shield, CheckCircle, XCircle,
  Monitor, Smartphone, Globe, Loader2, Clock,
} from 'lucide-react';
import { useUser, useUserLoginHistory } from '@/hooks/useUsers';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate, formatRelativeTime, cn, getInitials } from '@/lib/utils';
import type { UserRole, LoginHistory } from '@/types/user.types';

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'outline' }> = {
  SUPER_ADMIN: { label: 'Super Admin', variant: 'danger'  },
  ADMIN:       { label: 'Admin',       variant: 'danger'  },
  MANAGER:     { label: 'Manager',     variant: 'info'    },
  ACCOUNTANT:  { label: 'Comptable',   variant: 'warning' },
  SALES:       { label: 'Commercial',  variant: 'success' },
  TECHNICIAN:  { label: 'Technicien',  variant: 'success' },
  USER:        { label: 'Utilisateur', variant: 'outline' },
};

function parseUserAgent(ua?: string): { browser: string; os: string; isMobile: boolean } {
  if (!ua) return { browser: 'Inconnu', os: 'Inconnu', isMobile: false };
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  let browser = 'Autre';
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua))  browser = 'Chrome';
  else if (/firefox/i.test(ua))  browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua))     browser = 'Edge';
  let os = 'Autre';
  if (/windows/i.test(ua))      os = 'Windows';
  else if (/mac os/i.test(ua))  os = 'macOS';
  else if (/linux/i.test(ua))   os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';
  return { browser, os, isMobile };
}

function LoginRow({ entry }: { entry: LoginHistory }) {
  const { browser, os, isMobile } = parseUserAgent(entry.userAgent);
  const isSuccess = entry.status === 'SUCCESS';

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 border-b border-border last:border-0',
      !isSuccess && 'bg-red-50/40 dark:bg-red-950/20',
    )}>
      {/* Icône statut */}
      <div className="flex-shrink-0 mt-0.5">
        {isSuccess
          ? <CheckCircle className="w-4 h-4 text-emerald-500" />
          : <XCircle    className="w-4 h-4 text-destructive" />}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-medium', isSuccess ? 'text-foreground' : 'text-destructive')}>
            {isSuccess ? 'Connexion réussie' : 'Tentative échouée'}
          </span>
          {entry.failureReason && (
            <span className="text-xs text-muted-foreground">— {entry.failureReason}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {entry.ipAddress && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="w-3 h-3" /> {entry.ipAddress}
            </span>
          )}
          {entry.userAgent && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {isMobile
                ? <Smartphone className="w-3 h-3" />
                : <Monitor    className="w-3 h-3" />}
              {browser} · {os}
            </span>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-muted-foreground">{formatRelativeTime(entry.createdAt)}</p>
        <p className="text-[10px] text-muted-foreground/60">{formatDate(entry.createdAt)}</p>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [historyPage, setHistoryPage] = useState(1);

  const { data: user, isLoading: userLoading } = useUser(id);
  const { data: history, isLoading: historyLoading } = useUserLoginHistory(id, historyPage);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const rc = ROLE_CONFIG[user.role as UserRole];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/users" className="w-8 h-8 flex items-center justify-center rounded-md border border-input hover:bg-accent transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {getInitials(user.firstName, user.lastName)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infos utilisateur */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations</h3>
          <div className="space-y-3">
            {[
              { icon: User,   label: 'Nom',    value: `${user.firstName} ${user.lastName}` },
              { icon: Shield, label: 'Rôle',   value: <Badge variant={rc.variant}>{rc.label}</Badge> },
              { icon: Clock,  label: 'Inscrit', value: formatDate(user.createdAt) },
              { icon: Clock,  label: 'Dernière connexion', value: user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Jamais' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                  <div className="text-sm text-foreground">{item.value}</div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Statut</p>
                <span className={cn('text-sm font-medium', user.isActive ? 'text-emerald-600' : 'text-destructive')}>
                  {user.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Historique de connexion */}
        <div className="lg:col-span-2 bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Historique de connexion
              {history && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({history.total} entrées)
                </span>
              )}
            </h3>
          </div>

          {historyLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-4 h-4 bg-muted rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-2.5 w-48 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : !history?.items.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Aucune connexion enregistrée</p>
            </div>
          ) : (
            <>
              <div>
                {history.items.map((entry) => (
                  <LoginRow key={entry.id} entry={entry} />
                ))}
              </div>
              {history.totalPages > 1 && (
                <div className="border-t border-border px-4">
                  <Pagination
                    page={history.page}
                    totalPages={history.totalPages}
                    total={history.total}
                    limit={20}
                    onPageChange={setHistoryPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

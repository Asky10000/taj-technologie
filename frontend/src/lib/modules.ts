import type { ComponentType } from 'react';
import {
  Building2, FileText, Package, Warehouse, Truck,
  Wrench, FolderKanban, BarChart3, Users,
} from 'lucide-react';

export interface ModuleItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles?: string[];
}

/** Modules affichés dans les tuiles (accueil) et le dock de navigation. */
export const MODULES: ModuleItem[] = [
  { label: 'CRM',          href: '/crm',       icon: Building2 },
  { label: 'Ventes',       href: '/sales',     icon: FileText },
  { label: 'Produits',     href: '/products',  icon: Package },
  { label: 'Inventaire',   href: '/inventory', icon: Warehouse },
  { label: 'Fournisseurs', href: '/suppliers', icon: Truck },
  { label: 'Interventions', href: '/interventions', icon: Wrench },
  { label: 'Projets',      href: '/projects',  icon: FolderKanban },
  { label: 'Rapports',     href: '/reports',   icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { label: 'Utilisateurs', href: '/users',     icon: Users,     roles: ['SUPER_ADMIN', 'ADMIN'] },
];

/** Clé d'un module = son href sans le « / » (ex. '/suppliers' → 'suppliers'). */
export const moduleKey = (href: string): string => href.replace(/^\//, '');

/** Clé du module depuis un chemin de navigation (1er segment). */
export function moduleKeyFromPath(pathname: string): string | null {
  const seg = pathname.split('?')[0].split('/').filter(Boolean)[0];
  return seg ? seg.toLowerCase() : null;
}

export const ALL_MODULE_KEYS: string[] = MODULES.map((m) => moduleKey(m.href));

/**
 * Modules attribuables à un utilisateur à la création (exclut « users »,
 * géré uniquement par les rôles ADMIN/SUPER_ADMIN).
 */
export const ASSIGNABLE_MODULES: ModuleItem[] = MODULES.filter(
  (m) => moduleKey(m.href) !== 'users',
);

/** Modules pré-cochés par défaut selon le rôle (ajustables à la création). */
export const DEFAULT_MODULES_BY_ROLE: Record<string, string[]> = {
  SUPER_ADMIN: ALL_MODULE_KEYS,
  ADMIN:       ALL_MODULE_KEYS,
  MANAGER:     ['crm', 'sales', 'products', 'inventory', 'suppliers', 'interventions', 'projects', 'reports'],
  ACCOUNTANT:  ['crm', 'sales', 'suppliers', 'reports'],
  SALES:       ['crm', 'sales', 'products'],
  TECHNICIAN:  ['interventions', 'inventory', 'products', 'projects'],
  USER:        [],
};

/**
 * Un utilisateur peut-il accéder à un module ?
 * ADMIN/SUPER_ADMIN : tout. allowedModules null/absent : aucune restriction.
 */
export function canAccessModule(
  user: { role?: string; allowedModules?: string[] | null } | null | undefined,
  key: string | null,
): boolean {
  if (!user || !key) return true;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  if (user.allowedModules == null) return true;
  return user.allowedModules.includes(key);
}

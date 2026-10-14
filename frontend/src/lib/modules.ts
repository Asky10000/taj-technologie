import type { ComponentType } from 'react';
import {
  Building2, FileText, Package, Warehouse, Truck,
  Ticket, FolderKanban, BarChart3, Users,
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
  { label: 'Tickets',      href: '/tickets',   icon: Ticket },
  { label: 'Projets',      href: '/projects',  icon: FolderKanban },
  { label: 'Rapports',     href: '/reports',   icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { label: 'Utilisateurs', href: '/users',     icon: Users,     roles: ['SUPER_ADMIN', 'ADMIN'] },
];

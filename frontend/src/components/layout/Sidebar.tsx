'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, Package, Warehouse, FileText,
  Ticket, FolderKanban, Truck, BarChart3, Settings, Monitor, ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { getInitials } from '@/lib/utils';

interface NavItem {
  label:    string;
  href:     string;
  icon:     React.ComponentType<{ className?: string }>;
  roles?:   string[];
  badge?:   number;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard',          icon: LayoutDashboard },
  { label: 'CRM',              href: '/dashboard/crm',      icon: Building2 },
  { label: 'Produits',         href: '/dashboard/products', icon: Package },
  { label: 'Inventaire',       href: '/dashboard/inventory',icon: Warehouse },
  { label: 'Ventes',           href: '/dashboard/sales',    icon: FileText },
  { label: 'Fournisseurs',     href: '/dashboard/suppliers',icon: Truck },
  { label: 'Tickets',          href: '/dashboard/tickets',  icon: Ticket },
  { label: 'Projets',          href: '/dashboard/projects', icon: FolderKanban },
  { label: 'Utilisateurs',     href: '/dashboard/users',    icon: Users,    roles: ['SUPER_ADMIN','ADMIN'] },
  { label: 'Rapports',         href: '/dashboard/reports',  icon: BarChart3, roles: ['SUPER_ADMIN','ADMIN','MANAGER','ACCOUNTANT'] },
];

export function Sidebar() {
  const pathname  = usePathname();
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="text-sidebar-foreground font-bold text-sm leading-tight truncate">
            TAJ Technologie
          </p>
          <p className="text-sidebar-foreground/40 text-xs">ERP & CRM</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  isActive ? 'text-white' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground',
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-white/60" />}
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — profil + déconnexion */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
          Paramètres
        </Link>

        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">
                {getInitials(user.firstName, user.lastName)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-foreground text-xs font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sidebar-foreground/40 text-[10px] truncate">{user.role}</p>
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              className="text-sidebar-foreground/40 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

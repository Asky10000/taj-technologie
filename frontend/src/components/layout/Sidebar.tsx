'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, Warehouse, FileText,
  Ticket, FolderKanban, Truck, BarChart3, Settings, Monitor, ChevronRight,
  LogOut, X,
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
  { label: 'Tableau de bord', href: '/',           icon: LayoutDashboard },
  { label: 'CRM',              href: '/crm',       icon: Building2 },
  { label: 'Inventaire',       href: '/inventory', icon: Warehouse },
  { label: 'Ventes',           href: '/sales',     icon: FileText },
  { label: 'Fournisseurs',     href: '/suppliers', icon: Truck },
  { label: 'Tickets',          href: '/tickets',   icon: Ticket },
  { label: 'Projets',          href: '/projects',  icon: FolderKanban },
  { label: 'Utilisateurs',     href: '/users',     icon: Users,    roles: ['SUPER_ADMIN','ADMIN'] },
  { label: 'Rapports',         href: '/reports',   icon: BarChart3, roles: ['SUPER_ADMIN','ADMIN','MANAGER','ACCOUNTANT'] },
];

interface SidebarProps {
  open:    boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname  = usePathname();
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col border-r border-sidebar-border',
          'transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sidebar-foreground font-bold text-sm leading-tight truncate">
              TAJ Technologie
            </p>
            <p className="text-sidebar-foreground/40 text-xs">ERP & CRM</p>
          </div>
          {/* Bouton fermer (mobile uniquement) */}
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
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
        <div className="border-t border-sidebar-border p-3 space-y-1 flex-shrink-0">
          <Link
            href="/settings"
            onClick={onClose}
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
    </>
  );
}

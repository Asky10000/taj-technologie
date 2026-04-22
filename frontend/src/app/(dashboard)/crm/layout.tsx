'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Clients',   href: '/dashboard/crm' },
  { label: 'Prospects', href: '/dashboard/crm/prospects' },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isTab = (href: string) =>
    href === '/dashboard/crm'
      ? pathname === '/dashboard/crm'
      : pathname.startsWith(href);

  // Pas de tabs sur la fiche client
  const showTabs = !pathname.match(/\/crm\/[^/]+$/);

  return (
    <div className="space-y-5">
      {showTabs && (
        <div className="flex items-center gap-1 border-b border-border">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                isTab(tab.href)
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

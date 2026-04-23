'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Devis',      href: '/sales' },
  { label: 'Commandes',  href: '/sales/orders' },
  { label: 'Factures',   href: '/sales/invoices' },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isTab = (href: string) =>
    href === '/sales'
      ? pathname === '/sales'
      : pathname.startsWith(href);

  const showTabs = !pathname.match(/\/sales\/(quotes|orders|invoices)\/[^/]+$/);

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

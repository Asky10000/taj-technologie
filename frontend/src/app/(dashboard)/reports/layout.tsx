'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Vue d\'ensemble', href: '/reports' },
  { label: 'Ventes',          href: '/reports/sales' },
  { label: 'Finances',        href: '/reports/financial' },
  { label: 'Inventaire',      href: '/reports/inventory' },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              pathname === tab.href
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}

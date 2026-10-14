'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { MODULES } from '@/lib/modules';
import { cn } from '@/lib/utils';

/**
 * Dock de navigation en bas (sombre) : toutes les tuiles de modules alignées
 * sur une rangée. Remplace le menu latéral sur les pages de module.
 */
export function Dock() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);

  const items = MODULES.filter((m) => !m.roles || (role && m.roles.includes(role)));

  return (
    <nav className="no-print bg-[#0a0f1e] border-t border-[#1e293b] px-3 py-2.5">
      <div className="flex gap-2 justify-center flex-wrap">
        {items.map((m) => {
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                'w-[76px] rounded-xl px-1.5 py-2 text-center border transition-all duration-200',
                active
                  ? 'bg-[#0b2540] border-[#38bdf8] text-sky-100 shadow-[inset_0_0_0_1px_#38bdf8]'
                  : 'bg-[#0f172a] border-[#1e293b] text-slate-400 hover:-translate-y-1 hover:border-[#38bdf8] hover:text-slate-200 hover:shadow-[0_10px_22px_-10px_rgba(56,189,248,0.5)]',
              )}
            >
              <m.icon className="w-5 h-5 mx-auto text-[#38bdf8]" />
              <span className="block text-[10px] mt-1 whitespace-nowrap">{m.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

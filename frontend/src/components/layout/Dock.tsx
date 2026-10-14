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
    <nav className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)]">
      <div className="flex gap-2 justify-center flex-nowrap overflow-x-auto px-1 py-1">
        {items.map((m) => {
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                'w-[76px] rounded-xl px-1.5 py-2 text-center border transition-all duration-200',
                active
                  ? 'bg-[#0b2540]/85 backdrop-blur-md border-[#38bdf8] text-sky-100 shadow-[inset_0_0_0_1px_#38bdf8]'
                  : 'bg-[#0f172a]/55 backdrop-blur-md border-[#223049] text-slate-300 hover:-translate-y-1 hover:border-[#38bdf8] hover:text-white hover:shadow-[0_10px_22px_-10px_rgba(56,189,248,0.5)]',
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

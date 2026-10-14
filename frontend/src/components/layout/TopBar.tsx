'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { getInitials } from '@/lib/utils';

/**
 * Barre du haut (sombre) : logo + nom à gauche (retour à l'accueil),
 * thème + compte + déconnexion à droite. Remplace l'ancienne sidebar.
 */
export function TopBar() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Compte';
  const initials = user ? getInitials(user.firstName, user.lastName) : '··';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="no-print sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-[#0a0f1e] border-b border-[#1e293b]">
      <Link href="/" className="flex items-center gap-2.5 group">
        <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
          <Image src="/logo-mark.png" alt="TAJ Technologie" width={36} height={36} className="w-full h-full object-contain p-0.5" priority />
        </span>
        <span className="text-slate-100 font-semibold group-hover:text-white transition-colors">TAJ Technologie</span>
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#162133] transition-colors"
          title="Changer de thème"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] rounded-full pl-1 py-1 pr-1">
          <span className="w-7 h-7 rounded-full bg-[#0b2540] text-[#38bdf8] text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </span>
          <span className="text-sm text-slate-300 hidden sm:block">{fullName}</span>
          <button
            onClick={handleLogout}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-[#1a2332] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Filet de sécurité : capture tout crash de rendu d'une page du dashboard
 * et affiche un fallback (au lieu d'un écran blanc), en conservant le menu.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Trace en console pour le diagnostic (visible dans les logs du navigateur)
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Une erreur est survenue</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        Cette section n'a pas pu s'afficher correctement. Vous pouvez réessayer
        ou revenir au tableau de bord.
      </p>
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center h-9 px-4 rounded-md border border-input text-sm hover:bg-accent transition-colors"
        >
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}

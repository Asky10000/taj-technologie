'use client';

import { useEffect } from 'react';

/**
 * Filet de sécurité ultime : capture une erreur survenant jusque dans le
 * layout racine. Remplace tout l'arbre → doit fournir <html>/<body> et des
 * styles inline (le CSS global n'est pas garanti disponible ici).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080B14',
          color: '#E7ECF3',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: '24px', maxWidth: '420px' }}>
          <div style={{ fontSize: '40px', lineHeight: 1 }}>⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '14px 0 6px' }}>
            Une erreur inattendue est survenue
          </h2>
          <p style={{ fontSize: '14px', color: '#8B98AE', margin: '0 0 20px' }}>
            L&apos;application a rencontré un problème. Réessayez, et si cela persiste,
            rechargez la page.
          </p>
          <button
            onClick={reset}
            style={{
              height: '38px',
              padding: '0 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#3B82F6',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}

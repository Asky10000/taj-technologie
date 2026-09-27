import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <p className="text-5xl font-bold text-primary font-display">404</p>
      <h1 className="text-lg font-semibold text-foreground mt-3">Page introuvable</h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="inline-flex items-center h-9 px-4 rounded-md bg-primary text-white text-sm hover:bg-primary/90 transition-colors mt-5"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}

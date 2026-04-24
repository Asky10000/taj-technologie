import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default' | 'success' | 'warning' | 'danger'
  | 'info'    | 'outline' | 'purple';

interface BadgeProps {
  children:  React.ReactNode;
  variant?:  BadgeVariant;
  size?:     'sm' | 'md';
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  danger:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  outline: 'border border-border text-foreground',
  purple:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Helpers pour les statuts métier
export function CustomerStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    ACTIVE:     { label: 'Actif',      variant: 'success' },
    INACTIVE:   { label: 'Inactif',    variant: 'warning' },
    BLACKLISTED:{ label: 'Bloqué',     variant: 'danger'  },
    ARCHIVED:   { label: 'Archivé',    variant: 'default' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}

export function ProspectStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    NEW:           { label: 'Nouveau',      variant: 'info'    },
    CONTACTED:     { label: 'Contacté',     variant: 'info'    },
    QUALIFIED:     { label: 'Qualifié',     variant: 'purple'  },
    PROPOSAL_SENT: { label: 'Devis envoyé', variant: 'warning' },
    NEGOTIATION:   { label: 'Négociation',  variant: 'warning' },
    WON:           { label: 'Gagné',        variant: 'success' },
    LOST:          { label: 'Perdu',        variant: 'danger'  },
    ON_HOLD:       { label: 'En attente',   variant: 'default' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}

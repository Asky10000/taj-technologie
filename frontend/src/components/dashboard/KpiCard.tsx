import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title:       string;
  value:       string;
  subtitle?:   string;
  icon:        LucideIcon;
  iconColor?:  string;
  trend?:      { value: number; label: string };
  alert?:      boolean;
  className?:  string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  alert,
  className,
}: KpiCardProps) {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
        ? TrendingDown
        : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? 'text-emerald-600'
      : trend.value < 0
        ? 'text-destructive'
        : 'text-muted-foreground'
    : '';

  return (
    <div
      className={cn(
        'bg-card border rounded-xl p-5 flex flex-col gap-4',
        alert && 'border-destructive/50 bg-destructive/5',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center',
            alert ? 'bg-destructive/10' : 'bg-primary/10',
          )}
        >
          <Icon className={cn('w-4 h-4', alert ? 'text-destructive' : iconColor)} />
        </div>
      </div>

      <div>
        <p
          className={cn(
            'text-2xl font-bold',
            alert ? 'text-destructive' : 'text-foreground',
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {trend && TrendIcon && (
        <div className={cn('flex items-center gap-1.5 text-xs', trendColor)}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>
            {Math.abs(trend.value)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

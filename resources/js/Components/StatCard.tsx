import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/Components/ui/card';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  sub?: string;
  icon?: LucideIcon;
  tone?: 'primary' | 'success' | 'warning' | 'neutral';
}

const toneStyles = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success-foreground',
  warning: 'bg-warning/15 text-warning-foreground',
  neutral: 'bg-muted text-muted-foreground',
};

export function StatCard({ label, value, trend, sub, icon: Icon, tone = 'neutral' }: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm ring-1 ring-border/70">
      <CardContent className="py-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
          {Icon && (
            <span className={cn('flex size-8 items-center justify-center rounded-xl', toneStyles[tone])}>
              <Icon className="size-4" />
            </span>
          )}
          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                isPositive ? 'bg-success/10 text-success-foreground' : 'bg-destructive/10 text-destructive'
              )}
            >
              {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {isPositive ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <p className="mt-4 font-heading text-2xl font-semibold tracking-[-0.04em] tabular-nums sm:text-3xl">{value}</p>
        {sub && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

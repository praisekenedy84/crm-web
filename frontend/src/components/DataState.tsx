import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataStateProps {
  tone?: 'empty' | 'error';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function DataState({
  tone = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: DataStateProps) {
  const Icon = tone === 'error' ? AlertCircle : Inbox;

  return (
    <div className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'py-8' : 'py-14')}>
      <div
        className={cn(
          'mb-4 flex size-11 items-center justify-center rounded-2xl',
          tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="size-5" />
      </div>
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant={tone === 'error' ? 'outline' : 'default'} className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

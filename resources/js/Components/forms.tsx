import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';

interface FormCardProps {
  title: string;
  description?: string;
  onClose?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormCard({
  title,
  description,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  children,
  className,
}: FormCardProps) {
  return (
    <Card className={cn('overflow-hidden border-0 shadow-lg shadow-foreground/5 ring-1 ring-border/70', className)}>
      <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-muted/35 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <X className="size-4" />
          </Button>
        )}
      </CardHeader>

      <form onSubmit={onSubmit}>
        <CardContent className="space-y-7 pt-6">{children}</CardContent>

        <div className="flex flex-col-reverse gap-3 border-t bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

interface FormGridProps {
  cols?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

export function FormGrid({ cols = 2, children, className }: FormGridProps) {
  return (
    <div className={cn('grid gap-4', gridCols[cols], className)}>
      {children}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, hint, required, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

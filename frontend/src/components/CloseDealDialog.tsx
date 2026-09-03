import { useEffect, useId, useRef } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface CloseDealDialogProps {
  open: boolean;
  dealName?: string;
  stageName?: string;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CloseDealDialog({
  open,
  dealName,
  stageName,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: CloseDealDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isSubmitting) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/45 backdrop:backdrop-blur-[2px]"
    >
      <form
        className="p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (reason.trim()) onConfirm();
        }}
      >
        <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-warning/15 text-warning-foreground">
          <Flag className="size-5" />
        </div>
        <h2 id={titleId} className="font-heading text-xl font-semibold tracking-tight">
          Move “{dealName}” to {stageName}?
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted-foreground">
          Closed deals need a short outcome note so the team can learn from the result.
        </p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="close-deal-reason">Win or loss reason</Label>
          <textarea
            id="close-deal-reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Summarize what determined the outcome"
            rows={4}
            autoFocus
            required
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={!reason.trim() || isSubmitting}>
            {isSubmitting ? 'Moving deal...' : `Move to ${stageName}`}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

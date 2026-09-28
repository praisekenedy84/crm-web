import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { TableHead } from '@/Components/ui/table';

interface RowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  disableEdit?: boolean;
  disableDelete?: boolean;
  extra?: React.ReactNode;
}

export function ActionsTableHead({ className }: { className?: string }) {
  return (
    <TableHead className={cn('w-[88px] text-right', className)}>
      Actions
    </TableHead>
  );
}

export function RowActions({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  disableEdit = false,
  disableDelete = false,
  extra,
}: RowActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1 md:gap-0.5">
      {extra}
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          disabled={disableEdit}
          aria-label={editLabel}
        >
          <Pencil className="size-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={disableDelete}
          aria-label={deleteLabel}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

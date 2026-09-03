import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/Components/ui/button';

interface DataPaginationProps {
  page: number;
  lastPage: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function DataPagination({
  page,
  lastPage,
  total,
  pageSize = 20,
  onPageChange,
}: DataPaginationProps) {
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{first}â€“{last}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
          Previous
        </Button>
        <span className="min-w-20 text-center text-xs font-medium text-muted-foreground">
          Page {page} of {Math.max(lastPage, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

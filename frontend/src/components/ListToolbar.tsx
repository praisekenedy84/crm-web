import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ListToolbarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value?: string) => void;
  placeholder: string;
  resultLabel?: string;
  children?: React.ReactNode;
}

export function ListToolbar({
  value,
  onChange,
  onSearch,
  placeholder,
  resultLabel,
  children,
}: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <form
        className="flex w-full max-w-md items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(value);
        }}
        role="search"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-9 pl-9 pr-9"
            aria-label={placeholder}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                onSearch('');
              }}
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" variant="outline" className="h-9">Search</Button>
      </form>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        {resultLabel && <p className="text-xs font-medium text-muted-foreground">{resultLabel}</p>}
        {children}
      </div>
    </div>
  );
}

/* eslint-disable react-refresh/only-export-components */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, type Area } from '@/lib/api';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { Label } from '@/Components/ui/label';

const LEVELS = ['region', 'district', 'ward', 'street'] as const;
type AreaLevel = (typeof LEVELS)[number];

interface AreaPickerProps {
  value?: number | null;
  onChange: (areaId: number | null) => void;
  idPrefix?: string;
}

function resolveChain(area: Area): Partial<Record<AreaLevel, { id: number; name: string }>> {
  const chain: Partial<Record<AreaLevel, { id: number; name: string }>> = {
    [area.level]: { id: area.id, name: area.name },
  };
  let current = area.parent;

  while (current) {
    chain[current.level] = { id: current.id, name: current.name };
    current = current.parent;
  }

  return chain;
}

function deepestAreaId(selection: Partial<Record<AreaLevel, { id: number; name: string }>>): number | null {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const entry = selection[LEVELS[i]];
    if (entry) return entry.id;
  }
  return null;
}

function AreaSelect({
  level,
  parentId,
  selected,
  onChange,
  id,
  label,
}: {
  level: AreaLevel;
  parentId: number | null;
  selected: { id: number; name: string } | undefined;
  onChange: (area: { id: number; name: string }) => void;
  id: string;
  label: string;
}) {
  const enabled = level === 'region' || parentId !== null;

  const { data, isLoading } = useQuery({
    queryKey: ['areas', level, parentId],
    queryFn: () =>
      api.getAreas({
        level,
        ...(parentId ? { parent_id: String(parentId) } : {}),
      }),
    enabled,
  });

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium capitalize text-muted-foreground">{label}</Label>
      <Select
        value={selected ? String(selected.id) : ''}
        onValueChange={(v) => {
          const area = data?.data.find((a) => String(a.id) === v);
          if (area) onChange({ id: area.id, name: area.name });
        }}
        disabled={!enabled || isLoading}
      >
        <SelectTrigger id={id} className="w-full" aria-label={`Select ${label}`}>
          <SelectValue placeholder={isLoading ? `Loading ${label}s...` : `Select ${label}`}>
            {selected?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {data?.data.map((area) => (
            <SelectItem key={area.id} value={String(area.id)}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AreaPicker({ value, onChange, idPrefix = 'area' }: AreaPickerProps) {
  const [selection, setSelection] = useState<Partial<Record<AreaLevel, { id: number; name: string }>>>({});

  const { data: initialArea } = useQuery({
    queryKey: ['area', value],
    queryFn: () => api.getArea(value!),
    enabled: !!value && Object.keys(selection).length === 0,
  });

  useEffect(() => {
    if (initialArea) {
      setSelection(resolveChain(initialArea));
    }
  }, [initialArea]);

  useEffect(() => {
    if (value == null) {
      setSelection({});
    }
  }, [value]);

  const updateLevel = (level: AreaLevel, area: { id: number; name: string }) => {
    const levelIndex = LEVELS.indexOf(level);
    const next: Partial<Record<AreaLevel, { id: number; name: string }>> = {};

    for (let i = 0; i <= levelIndex; i++) {
      const key = LEVELS[i];
      next[key] = key === level ? area : selection[key];
    }

    setSelection(next);
    onChange(deepestAreaId(next));
  };

  const labels: Record<AreaLevel, string> = {
    region: 'region',
    district: 'district',
    ward: 'ward',
    street: 'street',
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {LEVELS.map((level) => (
        <AreaSelect
          key={level}
          level={level}
          parentId={
            level === 'region'
              ? null
              : selection[LEVELS[LEVELS.indexOf(level) - 1]]?.id ?? null
          }
          selected={selection[level]}
          onChange={(area) => updateLevel(level, area)}
          id={`${idPrefix}-${level}`}
          label={labels[level]}
        />
      ))}
    </div>
  );
}

export function formatAreaLocation(area?: Area | null): string {
  if (!area) return 'â€”';

  const parts: string[] = [area.name];
  let current = area.parent;

  while (current) {
    parts.unshift(current.name);
    current = current.parent;
  }

  return parts.join(', ');
}

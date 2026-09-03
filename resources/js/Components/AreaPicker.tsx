/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { usePage } from '@inertiajs/react'
import type { Area, SharedPageProps } from '@/types'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select'
import { Label } from '@/Components/ui/label'

const LEVELS = ['region', 'district', 'ward', 'street'] as const
type AreaLevel = (typeof LEVELS)[number]

interface AreaPickerProps {
  value?: number | null
  onChange: (areaId: number | null) => void
  idPrefix?: string
}

function resolveChain(
  area: Area,
  byId: Map<number, Area>,
): Partial<Record<AreaLevel, { id: number; name: string }>> {
  const chain: Partial<Record<AreaLevel, { id: number; name: string }>> = {
    [area.level]: { id: area.id, name: area.name },
  }

  let parentId = area.parent_area_id
  while (parentId) {
    const parent = byId.get(parentId)
    if (!parent) break
    chain[parent.level] = { id: parent.id, name: parent.name }
    parentId = parent.parent_area_id
  }

  return chain
}

function deepestAreaId(selection: Partial<Record<AreaLevel, { id: number; name: string }>>): number | null {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const entry = selection[LEVELS[i]]
    if (entry) return entry.id
  }
  return null
}

function AreaSelect({
  level,
  parentId,
  selected,
  onChange,
  id,
  label,
  areas,
}: {
  level: AreaLevel
  parentId: number | null
  selected: { id: number; name: string } | undefined
  onChange: (area: { id: number; name: string }) => void
  id: string
  label: string
  areas: Area[]
}) {
  const options = useMemo(() => {
    return areas.filter((area) => {
      if (area.level !== level) return false
      if (level === 'region') return true
      return parentId != null && area.parent_area_id === parentId
    })
  }, [areas, level, parentId])

  const enabled = level === 'region' || parentId !== null

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium capitalize text-muted-foreground">{label}</Label>
      <Select
        value={selected ? String(selected.id) : ''}
        onValueChange={(v) => {
          const area = options.find((a) => String(a.id) === v)
          if (area) onChange({ id: area.id, name: area.name })
        }}
        disabled={!enabled}
        items={options.map((area) => ({ value: String(area.id), label: area.name }))}
      >
        <SelectTrigger id={id} className="w-full" aria-label={`Select ${label}`}>
          <SelectValue placeholder={`Select ${label}`}>
            {selected?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((area) => (
            <SelectItem key={area.id} value={String(area.id)}>
              {area.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function AreaPicker({ value, onChange, idPrefix = 'area' }: AreaPickerProps) {
  const areas = usePage<SharedPageProps>().props.areas ?? []
  const byId = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas])
  const [selection, setSelection] = useState<Partial<Record<AreaLevel, { id: number; name: string }>>>({})

  useEffect(() => {
    if (value == null) {
      setSelection({})
      return
    }
    const area = byId.get(value)
    if (area) setSelection(resolveChain(area, byId))
  }, [value, byId])

  const updateLevel = (level: AreaLevel, area: { id: number; name: string }) => {
    const levelIndex = LEVELS.indexOf(level)
    const next: Partial<Record<AreaLevel, { id: number; name: string }>> = {}

    for (let i = 0; i <= levelIndex; i++) {
      const key = LEVELS[i]
      next[key] = key === level ? area : selection[key]
    }

    setSelection(next)
    onChange(deepestAreaId(next))
  }

  const labels: Record<AreaLevel, string> = {
    region: 'region',
    district: 'district',
    ward: 'ward',
    street: 'street',
  }

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
          areas={areas}
        />
      ))}
    </div>
  )
}

export function formatAreaLocation(area?: Area | null): string {
  if (!area) return '-'

  const parts: string[] = [area.name]
  let current = area.parent

  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }

  return parts.join(', ')
}

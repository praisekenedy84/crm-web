import { useMemo, useState } from 'react';
import { ChevronRight, MapPin, Plus } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import type { Area } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { DataState } from '@/Components/DataState';

const LEVELS = ['region', 'district', 'ward', 'street'] as const;

interface AreasPageProps {
  areas: Area[];
}

export default function AreasPage({ areas }: AreasPageProps) {
  const { processing, submit } = useSubmit();
  const [path, setPath] = useState<Area[]>([]);
  const [showStreetForm, setShowStreetForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editName, setEditName] = useState('');
  const [streetName, setStreetName] = useState('');
  const level = LEVELS[path.length] ?? 'street';
  const parent = path[path.length - 1] ?? null;
  const parentId = parent?.id ?? null;

  const filtered = useMemo(
    () =>
      areas.filter(
        (a) =>
          a.level === level &&
          (parentId === null ? !a.parent_area_id : a.parent_area_id === parentId),
      ),
    [areas, level, parentId],
  );

  const handleCreateStreet = () => {
    submit('post', '/areas/streets', {
      name: streetName,
      parent_area_id: parentId,
    }, {
      onSuccess: () => {
        setShowStreetForm(false);
        setStreetName('');
      },
    });
  };

  const handleUpdateArea = () => {
    if (!editingArea) return;
    submit('put', `/areas/${editingArea.id}`, { name: editName }, {
      onSuccess: () => {
        setEditingArea(null);
        setEditName('');
      },
    });
  };

  const drillDown = (area: Area) => {
    const idx = LEVELS.indexOf(area.level);
    if (idx < LEVELS.length - 1) {
      setPath((current) => [...current.slice(0, idx), area]);
      setShowStreetForm(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Geography"
        title="Service areas"
        description="Each street belongs to one ward, each ward to one district, and each district to one region."
        action={
          level === 'street' && parent?.level === 'ward' ? (
            <Button onClick={() => setShowStreetForm(!showStreetForm)}>
              <Plus size={16} />
              Add street to {parent.name}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm shadow-sm">
        <button
          type="button"
          onClick={() => {
            setPath([]);
            setShowStreetForm(false);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-primary hover:bg-primary/10"
        >
          <MapPin className="size-4" />
          Regions
        </button>
        {path.map((area, index) => (
          <div key={area.id} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => {
                setPath(path.slice(0, index + 1));
                setShowStreetForm(false);
              }}
              className="rounded-lg px-2 py-1 font-medium hover:bg-muted"
            >
              {area.name}
            </button>
          </div>
        ))}
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="rounded-lg bg-muted px-2 py-1 text-xs font-semibold capitalize text-muted-foreground">
          {level}s
        </span>
      </div>

      {showStreetForm && (
        <FormCard
          title="Create Street"
          description={`This street will belong to ${parent?.name} ward and inherit its district and region.`}
          onClose={() => setShowStreetForm(false)}
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateStreet();
          }}
          submitLabel="Save Street"
          isSubmitting={processing}
        >
          <FormSection title="Location Details">
            <FormGrid cols={1}>
              <FormField label="Street name" htmlFor="street_name" required>
                <Input
                  id="street_name"
                  placeholder="Main Street"
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  required
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      {editingArea && (
        <FormCard
          title="Edit Area"
          description="Update the name of this custom area."
          onClose={() => {
            setEditingArea(null);
            setEditName('');
          }}
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateArea();
          }}
          submitLabel="Update Area"
          isSubmitting={processing}
        >
          <FormSection>
            <FormField label="Name" htmlFor="edit_area_name" required>
              <Input
                id="edit_area_name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </FormField>
          </FormSection>
        </FormCard>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Custom</TableHead>
                <ActionsTableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <DataState
                      compact
                      title={`No ${level}s found`}
                      description={parent ? `${parent.name} does not have any ${level}s yet.` : `No ${level}s have been configured.`}
                      actionLabel={level === 'street' ? 'Add street' : undefined}
                      onAction={level === 'street' ? () => setShowStreetForm(true) : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{a.level}</TableCell>
                  <TableCell className="text-muted-foreground">{a.parent?.name ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{a.is_custom ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={
                        a.is_custom
                          ? () => {
                              setEditingArea(a);
                              setEditName(a.name);
                            }
                          : undefined
                      }
                      extra={
                        a.level !== 'street' ? (
                          <Button variant="ghost" size="sm" onClick={() => drillDown(a)}>
                            View →
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

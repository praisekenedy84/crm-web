import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronRight, MapPin, Plus } from 'lucide-react';
import { api, getApiErrorMessage, type Area } from '../lib/api';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { Skeleton } from '@/Components/ui/skeleton';
import { DataState } from '@/Components/DataState';
import { useFeedback } from '@/Components/Feedback';

const LEVELS = ['region', 'district', 'ward', 'street'] as const;

export default function AreasPage() {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [path, setPath] = useState<Area[]>([]);
  const [showStreetForm, setShowStreetForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editName, setEditName] = useState('');
  const [streetName, setStreetName] = useState('');
  const level = LEVELS[path.length] ?? 'street';
  const parent = path[path.length - 1] ?? null;
  const parentId = parent?.id ?? null;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['areas', level, parentId],
    queryFn: () =>
      api.getAreas({
        level,
        ...(parentId ? { parent_id: String(parentId) } : {}),
      }),
  });

  const createStreetMutation = useMutation({
    mutationFn: () =>
      api.createInlineStreet({
        name: streetName,
        parent_area_id: parentId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      notify(`Street added to ${parent?.name}.`);
      setShowStreetForm(false);
      setStreetName('');
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Street could not be created.'), 'error'),
  });

  const updateAreaMutation = useMutation({
    mutationFn: () => api.updateArea(editingArea!.id, { name: editName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      notify('Area name updated.');
      setEditingArea(null);
      setEditName('');
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Area could not be updated.'), 'error'),
  });

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
            createStreetMutation.mutate();
          }}
          submitLabel="Save Street"
          isSubmitting={createStreetMutation.isPending}
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
            updateAreaMutation.mutate();
          }}
          submitLabel="Update Area"
          isSubmitting={updateAreaMutation.isPending}
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
          {isError ? (
            <DataState
              tone="error"
              title={`${level}s could not be loaded`}
              description="The selected branch of the area hierarchy is unavailable."
              actionLabel="Try again"
              onAction={() => refetch()}
            />
          ) : (
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
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
              ) : data?.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{a.level}</TableCell>
                  <TableCell className="text-muted-foreground">{a.parent?.name ?? 'â€”'}</TableCell>
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
                            View â†’
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

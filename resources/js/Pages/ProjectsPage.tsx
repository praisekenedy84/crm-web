import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api, type Project } from '../lib/api';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { Skeleton } from '@/Components/ui/skeleton';

const emptyForm = {
  name: '',
  description: '',
  budget: '',
  status: 'planning',
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  const resetForm = () => setForm(emptyForm);

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    resetForm();
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (project: Project) => {
    setShowForm(false);
    setEditing(project);
    setForm({
      name: project.name,
      description: project.description ?? '',
      budget: project.budget != null ? String(project.budget) : '',
      status: project.status,
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        status: form.status,
      };
      return editing
        ? api.updateProject(editing.id, payload)
        : api.createProject(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteTarget(null);
    },
  });

  const fmt = (n: number, currency = 'TZS') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track project budgets and status"
        action={
          <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            <Plus size={16} />
            New Project
          </Button>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Project' : 'Add Project'}
          description={editing ? 'Update project details.' : 'Create a new project.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update Project' : 'Save Project'}
          isSubmitting={saveMutation.isPending}
        >
          <FormSection title="Project Details">
            <FormGrid cols={2}>
              <FormField label="Name" htmlFor="project_name" required className="sm:col-span-2">
                <Input
                  id="project_name"
                  placeholder="Website redesign"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Budget (TZS)" htmlFor="project_budget">
                <Input
                  id="project_budget"
                  type="number"
                  placeholder="0"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </FormField>
              <FormField label="Status" htmlFor="project_status">
                <Select
                  value={form.status}
                  onValueChange={(value) => value && setForm({ ...form, status: value })}
                >
                  <SelectTrigger id="project_status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Description" htmlFor="project_description" className="sm:col-span-2">
                <Input
                  id="project_description"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Actual Cost</TableHead>
                <TableHead>Status</TableHead>
                <ActionsTableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ) : data?.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.manager?.name ?? 'â€”'}</TableCell>
                  <TableCell>{p.budget != null ? fmt(p.budget, p.currency) : 'â€”'}</TableCell>
                  <TableCell>{fmt(p.actual_cost ?? 0, p.currency)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{p.status}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => openEdit(p)}
                      onDelete={() => setDeleteTarget(p)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.name}?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

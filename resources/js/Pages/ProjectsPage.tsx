import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import type { Paginated, Project } from '@/types';
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

const emptyForm = {
  name: '',
  description: '',
  budget: '',
  status: 'planning',
};

interface ProjectsPageProps {
  projects: Paginated<Project>;
}

export default function ProjectsPage({ projects }: ProjectsPageProps) {
  const { processing, submit } = useSubmit();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const handleSave = () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      status: form.status,
    };
    if (editing) {
      submit('put', `/projects/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/projects', payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    submit('delete', `/projects/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

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
            handleSave();
          }}
          submitLabel={editing ? 'Update Project' : 'Save Project'}
          isSubmitting={processing}
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
                  items={[
                    { value: 'planning', label: 'Planning' },
                    { value: 'active', label: 'Active' },
                    { value: 'on_hold', label: 'On hold' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
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
              {projects.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.manager?.name ?? '-'}</TableCell>
                  <TableCell>{p.budget != null ? fmt(p.budget, p.currency) : '-'}</TableCell>
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
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={processing}
      />
    </div>
  );
}

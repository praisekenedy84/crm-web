import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { api, type Task } from '../lib/api';
import { PageHeader } from '@/components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/components/forms';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const emptyForm = { title: '', due_date: '', priority: 'medium' };

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
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

  const openEdit = (task: Task) => {
    setShowForm(false);
    setEditing(task);
    setForm({
      title: task.title,
      due_date: task.due_date?.slice(0, 10) ?? '',
      priority: task.priority,
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? api.updateTask(editing.id, {
            title: form.title,
            due_date: form.due_date || undefined,
            priority: form.priority,
          })
        : api.createTask(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeleteTarget(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => api.updateTask(id, { status: 'completed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const priorityVariant: Record<string, 'secondary' | 'outline' | 'destructive'> = {
    low: 'secondary',
    medium: 'outline',
    high: 'destructive',
  };

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Follow-ups and to-dos"
        action={
          <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            <Plus size={16} />
            New Task
          </Button>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Task' : 'Add Task'}
          description={editing ? 'Update task details.' : 'Create a follow-up or to-do item.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update Task' : 'Save Task'}
          isSubmitting={saveMutation.isPending}
        >
          <FormSection title="Task Details">
            <FormGrid cols={2}>
              <FormField label="Title" htmlFor="task_title" required className="sm:col-span-2">
                <Input
                  id="task_title"
                  placeholder="Follow up with client"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Priority" htmlFor="task_priority">
                <Select
                  value={form.priority}
                  onValueChange={(value) => value && setForm({ ...form, priority: value })}
                >
                  <SelectTrigger id="task_priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Due date" htmlFor="task_due_date">
                <Input
                  id="task_due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : data?.data.map((task) => (
          <Card
            key={task.id}
            className={cn('border-0 shadow-sm ring-1 ring-border/60', task.status === 'completed' && 'opacity-60')}
          >
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {task.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => completeMutation.mutate(task.id)}
                    aria-label="Complete task"
                  >
                    <Check size={14} />
                  </Button>
                )}
                <div>
                  <p className={cn('font-medium', task.status === 'completed' && 'line-through')}>
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                    {' · '}
                    <Badge variant={priorityVariant[task.priority]} className="ml-1">
                      {task.priority}
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                  {task.status}
                </Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(task)} aria-label="Edit task">
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(task)}
                  aria-label="Delete task"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.title}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

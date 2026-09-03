import { useMemo, useState } from 'react';
import {
  Plus, Check, Pencil, Trash2, ChevronLeft, ChevronRight,
  CalendarDays, RotateCcw, CircleDot, Clock3,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useSubmit } from '@/lib/submit';
import { useCan } from '@/hooks/useCan';
import type { Task } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { DataState } from '@/Components/DataState';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { cn } from '@/lib/utils';

type TaskScope = 'day' | 'undated' | 'overdue';

interface CalendarDaySummary {
  total: number;
  open: number;
  completed: number;
}

interface TasksPageProps {
  tasks: Task[];
  filters: {
    date: string;
    scope: TaskScope;
  };
  calendar: {
    month: string;
    days: Record<string, CalendarDaySummary>;
    undated_count: number;
    overdue_count: number;
  };
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(value: string, amount: number) {
  const next = parseDateKey(value);
  next.setDate(next.getDate() + amount);
  return toDateKey(next);
}

function shiftMonth(value: string, amount: number) {
  const current = parseDateKey(value);
  const next = new Date(current.getFullYear(), current.getMonth() + amount, 1);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(current.getDate(), daysInMonth));
  return toDateKey(next);
}

function buildMonthCells(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const cells: Array<{ key: string | null; label: number | null }> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push({ key: null, label: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ key, label: day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: null, label: null });
  }

  return cells;
}

function toTimeInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 5);
}

function formatDueLabel(task: Task) {
  if (!task.due_date) return 'No due date';

  const dateLabel = new Date(`${task.due_date.slice(0, 10)}T00:00:00`).toLocaleDateString();
  const time = toTimeInput(task.due_time);
  if (!time) return `Due ${dateLabel}`;

  const timeLabel = new Date(`1970-01-01T${time}:00`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `Due ${dateLabel} · ${timeLabel}`;
}

export default function TasksPage({ tasks, filters, calendar }: TasksPageProps) {
  const { processing, submit } = useSubmit();
  const { can } = useCan();
  const canCreate = can('tasks.create');
  const canUpdate = can('tasks.update');
  const canDelete = can('tasks.delete');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: '',
    due_date: filters.date,
    due_time: '',
    priority: 'medium',
  });

  const selectedDate = parseDateKey(filters.date);
  const todayKey = toDateKey(new Date());
  const monthCells = useMemo(() => buildMonthCells(calendar.month), [calendar.month]);
  const isFormOpen = showForm || editing !== null;

  const applyFilters = (next: Partial<{ date: string; scope: TaskScope }>) => {
    router.get('/tasks', {
      date: next.date ?? filters.date,
      scope: next.scope ?? filters.scope,
    }, {
      preserveScroll: true,
      replace: true,
    });
  };

  const resetForm = (dueDate = filters.date, dueTime = '') => {
    setForm({
      title: '',
      due_date: dueDate,
      due_time: dueTime,
      priority: 'medium',
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    resetForm(filters.scope === 'day' ? filters.date : filters.scope === 'undated' ? '' : todayKey);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm(
      filters.scope === 'day'
        ? filters.date
        : filters.scope === 'undated'
          ? ''
          : todayKey,
    );
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setShowForm(false);
    setEditing(task);
    setForm({
      title: task.title,
      due_date: task.due_date?.slice(0, 10) ?? '',
      due_time: toTimeInput(task.due_time),
      priority: task.priority,
    });
  };

  const handleSave = () => {
    const payload = {
      title: form.title,
      // Always send these so clearing a date moves the task into Undated.
      due_date: form.due_date || null,
      due_time: form.due_date && form.due_time ? form.due_time : null,
      priority: form.priority,
    };

    if (editing) {
      submit('put', `/tasks/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/tasks', payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    submit('delete', `/tasks/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const toggleStatus = (task: Task) => {
    if (!canUpdate || processing) return;
    submit('put', `/tasks/${task.id}`, {
      status: task.status === 'completed' ? 'open' : 'completed',
    });
  };

  const priorityVariant: Record<string, 'secondary' | 'outline' | 'destructive'> = {
    low: 'secondary',
    medium: 'outline',
    high: 'destructive',
  };

  const scopeTitle = filters.scope === 'undated'
    ? 'Undated tasks'
    : filters.scope === 'overdue'
      ? 'Overdue tasks'
      : selectedDate.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

  const scopeHint = filters.scope === 'undated'
    ? 'Open tasks with no due date. Add a date to place them on the calendar.'
    : filters.scope === 'overdue'
      ? 'Open tasks past their due date or time. Mark done or reschedule them.'
      : filters.date === todayKey
        ? 'Your plan for today. Tap Mark done to complete without opening edit.'
        : 'Plan for this day. Use the calendar to jump to other days.';

  const openCount = tasks.filter((task) => task.status !== 'completed').length;
  const doneCount = tasks.length - openCount;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planner"
        title="Tasks"
        description="Day-to-day planner for follow-ups and to-dos - navigate by date, set a time, then tap to flip status."
        action={
          (canCreate || isFormOpen) && (
            <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
              <Plus size={16} />
              {isFormOpen ? 'Close' : 'New Task'}
            </Button>
          )
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Task' : 'Add Task'}
          description={editing ? 'Update task details.' : 'Schedule a follow-up on a day and optional time, or leave the date blank.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          submitLabel={editing ? 'Update Task' : 'Save Task'}
          isSubmitting={processing}
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
                  items={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
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
              <FormField label="Due date" htmlFor="task_due_date" hint="Leave blank for the undated list">
                <Input
                  id="task_due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({
                    ...form,
                    due_date: e.target.value,
                    due_time: e.target.value ? form.due_time : '',
                  })}
                />
              </FormField>
              <FormField
                label="Due time"
                htmlFor="task_due_time"
                hint="Optional. Overdue uses this time on the due day."
              >
                <Input
                  id="task_due_time"
                  type="time"
                  value={form.due_time}
                  disabled={!form.due_date}
                  onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit border-0 shadow-sm ring-1 ring-border/70">
          <CardHeader className="gap-4 border-b border-border/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg">
                    {parseDateKey(`${calendar.month}-01`).toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Pick a day to plan</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => applyFilters({ date: shiftMonth(filters.date, -1), scope: 'day' })}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => applyFilters({ date: shiftMonth(filters.date, 1), scope: 'day' })}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, index) => {
                if (!cell.key) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const summary = calendar.days[cell.key];
                const isSelected = filters.scope === 'day' && filters.date === cell.key;
                const isToday = cell.key === todayKey;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => applyFilters({ date: cell.key!, scope: 'day' })}
                    className={cn(
                      'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/70',
                      isToday && !isSelected && 'ring-1 ring-primary/40',
                    )}
                    aria-label={`Plan ${cell.key}`}
                    aria-pressed={isSelected}
                  >
                    <span className="font-medium">{cell.label}</span>
                    {summary && summary.total > 0 && (
                      <span
                        className={cn(
                          'mt-0.5 size-1.5 rounded-full',
                          isSelected
                            ? 'bg-primary-foreground'
                            : summary.open > 0
                              ? 'bg-primary'
                              : 'bg-muted-foreground/50',
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2">
              <Button
                variant={filters.scope === 'day' && filters.date === todayKey ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => applyFilters({ date: todayKey, scope: 'day' })}
              >
                <CircleDot className="size-4" />
                Today
              </Button>
              <Button
                variant={filters.scope === 'overdue' ? 'default' : 'outline'}
                className="justify-between"
                onClick={() => applyFilters({ scope: 'overdue' })}
              >
                <span>Overdue</span>
                <Badge variant={filters.scope === 'overdue' ? 'secondary' : 'outline'}>
                  {calendar.overdue_count}
                </Badge>
              </Button>
              <Button
                variant={filters.scope === 'undated' ? 'default' : 'outline'}
                className="justify-between"
                onClick={() => applyFilters({ scope: 'undated' })}
              >
                <span>Undated</span>
                <Badge variant={filters.scope === 'undated' ? 'secondary' : 'outline'}>
                  {calendar.undated_count}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-0 shadow-sm ring-1 ring-border/70">
            <CardHeader className="gap-4 border-b border-border/70">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">{scopeTitle}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{scopeHint}</p>
                </div>
                {filters.scope === 'day' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => applyFilters({ date: shiftDate(filters.date, -1), scope: 'day' })}
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyFilters({ date: todayKey, scope: 'day' })}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => applyFilters({ date: shiftDate(filters.date, 1), scope: 'day' })}
                      aria-label="Next day"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{tasks.length} total</Badge>
                <Badge variant="secondary">{openCount} open</Badge>
                {filters.scope === 'day' && (
                  <Badge variant="outline">{doneCount} done</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {tasks.length === 0 ? (
                <DataState
                  title={filters.scope === 'day' ? 'Nothing planned for this day' : 'No tasks here'}
                  description={
                    filters.scope === 'day'
                      ? 'Add a task for this date, or jump to another day on the calendar.'
                      : filters.scope === 'overdue'
                        ? 'You are caught up - no open overdue tasks.'
                        : 'Every open task currently has a due date.'
                  }
                />
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === 'completed';

                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        'border-0 shadow-none ring-1 ring-border/60',
                        isDone && 'bg-muted/30',
                      )}
                    >
                      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                          <p className={cn('font-medium', isDone && 'text-muted-foreground line-through')}>
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={priorityVariant[task.priority]} className="capitalize">
                              {task.priority}
                            </Badge>
                            <span className="inline-flex items-center gap-1">
                              {task.due_time ? <Clock3 className="size-3.5" /> : null}
                              {formatDueLabel(task)}
                            </span>
                            {task.assignee?.name && <span>· {task.assignee.name}</span>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {canUpdate && (
                            <Button
                              variant={isDone ? 'outline' : 'default'}
                              size="sm"
                              onClick={() => toggleStatus(task)}
                              disabled={processing}
                              aria-label={isDone ? 'Reopen task' : 'Mark task complete'}
                            >
                              {isDone ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                              {isDone ? 'Reopen' : 'Mark done'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(task)}
                            aria-label="Edit task"
                            disabled={!canUpdate}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(task)}
                            aria-label="Delete task"
                            className="text-destructive hover:text-destructive"
                            disabled={!canDelete}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={processing}
      />
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, Lightbulb, Pencil,
  Plus, Send, Sparkles, Trash2, UserRound,
} from 'lucide-react';
import {
  api, getApiErrorMessage, type MarketingContentItem, type MarketingContentStatus,
  type MarketingContentSubmission, type MarketingContentType, type MarketingPlatform,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useFeedback } from '@/Components/Feedback';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { DataState } from '@/Components/DataState';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { Skeleton } from '@/Components/ui/skeleton';
import { cn } from '@/lib/utils';

const platforms: { value: MarketingPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Other' },
];

const statuses: { value: MarketingContentStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'published', label: 'Published' },
];

const contentTypes: { value: MarketingContentType; label: string }[] = [
  { value: 'post', label: 'Post' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'reel', label: 'Reel' },
  { value: 'story', label: 'Story' },
  { value: 'video', label: 'Video' },
];

const statusStyles: Record<MarketingContentStatus, string> = {
  idea: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300',
  planned: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  published: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

const emptySubmission: MarketingContentSubmission = {
  title: '',
  brief: '',
  content_type: 'post',
  platforms: [],
  proposed_date: '',
};

interface ManagementForm extends MarketingContentSubmission {
  proposed_date: string;
  scheduled_at: string;
  status: MarketingContentStatus;
  assigned_to: string;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function PlatformPicker({
  value,
  onChange,
}: {
  value: MarketingPlatform[];
  onChange: (platforms: MarketingPlatform[]) => void;
}) {
  const toggle = (platform: MarketingPlatform) => {
    onChange(
      value.includes(platform)
        ? value.filter((item) => item !== platform)
        : [...value, platform]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => {
        const selected = value.includes(platform.value);
        return (
          <Button
            key={platform.value}
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            className={cn('rounded-full', selected && 'shadow-sm')}
            aria-pressed={selected}
            onClick={() => toggle(platform.value)}
          >
            {platform.label}
          </Button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: MarketingContentStatus }) {
  return (
    <Badge variant="outline" className={cn('capitalize', statusStyles[status])}>
      {statuses.find((item) => item.value === status)?.label ?? status}
    </Badge>
  );
}

function ContentSummary({
  item,
  compact = false,
  onEdit,
}: {
  item: MarketingContentItem;
  compact?: boolean;
  onEdit?: (item: MarketingContentItem) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-xl border border-border/70 bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md',
        compact ? 'p-2.5' : 'p-3.5',
        !onEdit && 'cursor-default hover:translate-y-0'
      )}
      onClick={() => onEdit?.(item)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('font-medium leading-snug text-foreground', compact ? 'text-xs' : 'text-sm')}>
          {item.title}
        </p>
        {onEdit && <Pencil className="mt-0.5 size-3 shrink-0 text-muted-foreground" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={item.status} />
        {!compact && (
          <Badge variant="secondary" className="capitalize">
            {item.content_type}
          </Badge>
        )}
      </div>
      {!compact && (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {item.platforms.map((platform) => platforms.find((entry) => entry.value === platform)?.label).join(' Â· ')}
        </p>
      )}
    </button>
  );
}

export default function MarketingPage() {
  const { user } = useAuth();
  const { notify } = useFeedback();
  const queryClient = useQueryClient();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showSubmission, setShowSubmission] = useState(false);
  const [submission, setSubmission] = useState<MarketingContentSubmission>(emptySubmission);
  const [editing, setEditing] = useState<MarketingContentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketingContentItem | null>(null);
  const [management, setManagement] = useState<ManagementForm | null>(null);

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const queryParams = {
    from: dateKey(monthStart),
    to: dateKey(monthEnd),
    include_unscheduled: '1',
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(platformFilter !== 'all' ? { platform: platformFilter } : {}),
  };

  const contentQuery = useQuery({
    queryKey: ['marketing-content', queryParams],
    queryFn: () => api.getMarketingContent(queryParams),
  });

  const contributorsQuery = useQuery({
    queryKey: ['marketing-contributors'],
    queryFn: () => api.getMarketingContributors(),
    enabled: canManage,
  });

  const items = contentQuery.data?.data ?? [];
  const backlog = items.filter((item) => !item.scheduled_at);
  const scheduled = items.filter((item) => item.scheduled_at);
  const days = useMemo(() => calendarDays(month), [month]);
  const itemsByDay = useMemo(
    () => scheduled.reduce<Record<string, MarketingContentItem[]>>((groups, item) => {
      const key = dateKey(new Date(item.scheduled_at as string));
      (groups[key] ??= []).push(item);
      return groups;
    }, {}),
    [scheduled]
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['marketing-content'] });

  const submitMutation = useMutation({
    mutationFn: () => api.createMarketingContent({
      ...submission,
      proposed_date: submission.proposed_date || undefined,
    }),
    onSuccess: () => {
      refresh();
      setSubmission(emptySubmission);
      setShowSubmission(false);
      notify('Idea added to the marketing backlog.');
    },
    onError: (error) => notify(getApiErrorMessage(error, 'The idea could not be saved.'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing || !management) throw new Error('No content item selected.');
      return api.updateMarketingContent(editing.id, {
        ...management,
        proposed_date: management.proposed_date || null,
        assigned_to: management.assigned_to === 'unassigned'
          ? null
          : Number(management.assigned_to),
        scheduled_at: management.scheduled_at
          ? new Date(management.scheduled_at).toISOString()
          : null,
      });
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
      setManagement(null);
      notify('Content plan updated.');
    },
    onError: (error) => notify(getApiErrorMessage(error, 'The content plan could not be updated.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteMarketingContent(id),
    onSuccess: () => {
      refresh();
      setDeleteTarget(null);
      setEditing(null);
      setManagement(null);
      notify('Content item deleted.');
    },
    onError: (error) => notify(getApiErrorMessage(error, 'The content item could not be deleted.'), 'error'),
  });

  const openEdit = (item: MarketingContentItem) => {
    if (!canManage) return;
    setShowSubmission(false);
    setEditing(item);
    setManagement({
      title: item.title,
      brief: item.brief ?? '',
      content_type: item.content_type,
      platforms: item.platforms,
      proposed_date: item.proposed_date?.slice(0, 10) ?? '',
      scheduled_at: toLocalDateTime(item.scheduled_at),
      status: item.status,
      assigned_to: item.assigned_to ? String(item.assigned_to) : 'unassigned',
    });
  };

  const closeManagement = () => {
    setEditing(null);
    setManagement(null);
  };

  const shiftMonth = (amount: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Turn team ideas into a visible, shared social publishing plan."
        action={
          <Button onClick={() => {
            closeManagement();
            setShowSubmission((open) => !open);
          }}>
            <Plus className="size-4" />
            Add idea
          </Button>
        }
      />

      <Card className="overflow-hidden border-0 bg-[linear-gradient(120deg,var(--card),color-mix(in_oklch,var(--primary)_8%,var(--card)))] shadow-sm ring-1 ring-border/70">
        <CardContent className="grid gap-5 py-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold">One room for every campaign thought</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Anyone can add the spark. Marketing managers shape the schedule and carry each idea through to publish.
              </p>
            </div>
          </div>
          <div className="flex gap-5 border-t border-border/60 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <div>
              <p className="font-heading text-2xl font-semibold">{backlog.length}</p>
              <p className="text-xs text-muted-foreground">Ideas waiting</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-semibold">{scheduled.length}</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showSubmission && (
        <FormCard
          title="Share a content idea"
          description="Add enough context for the marketing team to understand and shape it."
          onClose={() => setShowSubmission(false)}
          onSubmit={(event) => {
            event.preventDefault();
            if (submission.platforms.length === 0) {
              notify('Choose at least one social platform.', 'error');
              return;
            }
            submitMutation.mutate();
          }}
          submitLabel="Add to ideas"
          isSubmitting={submitMutation.isPending}
        >
          <FormSection title="The idea">
            <FormGrid cols={2}>
              <FormField label="Title" htmlFor="marketing_title" required className="sm:col-span-2">
                <Input
                  id="marketing_title"
                  value={submission.title}
                  onChange={(event) => setSubmission({ ...submission, title: event.target.value })}
                  placeholder="Customer story: from first call to launch"
                  required
                />
              </FormField>
              <FormField label="What should we create?" htmlFor="marketing_brief" className="sm:col-span-2">
                <textarea
                  id="marketing_brief"
                  value={submission.brief}
                  onChange={(event) => setSubmission({ ...submission, brief: event.target.value })}
                  placeholder="Describe the angle, audience, key message, or assets we could use."
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </FormField>
              <FormField label="Format" htmlFor="marketing_type">
                <Select
                  value={submission.content_type}
                  onValueChange={(value) => value && setSubmission({
                    ...submission,
                    content_type: value as MarketingContentType,
                  })}
                >
                  <SelectTrigger id="marketing_type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Preferred publish date" htmlFor="marketing_proposed_date">
                <Input
                  id="marketing_proposed_date"
                  type="date"
                  value={submission.proposed_date ?? ''}
                  onChange={(event) => setSubmission({ ...submission, proposed_date: event.target.value })}
                />
              </FormField>
              <FormField label="Social platforms" required className="sm:col-span-2">
                <PlatformPicker
                  value={submission.platforms}
                  onChange={(value) => setSubmission({ ...submission, platforms: value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      {editing && management && (
        <FormCard
          title="Plan content"
          description={`Submitted by ${editing.submitter?.name ?? 'a team member'}.`}
          onClose={closeManagement}
          onSubmit={(event) => {
            event.preventDefault();
            if (management.platforms.length === 0) {
              notify('Choose at least one social platform.', 'error');
              return;
            }
            updateMutation.mutate();
          }}
          submitLabel="Save content plan"
          isSubmitting={updateMutation.isPending}
        >
          <FormSection title="Creative direction">
            <FormGrid cols={2}>
              <FormField label="Title" htmlFor="manage_title" required className="sm:col-span-2">
                <Input
                  id="manage_title"
                  value={management.title}
                  onChange={(event) => setManagement({ ...management, title: event.target.value })}
                  required
                />
              </FormField>
              <FormField label="Brief" htmlFor="manage_brief" className="sm:col-span-2">
                <textarea
                  id="manage_brief"
                  value={management.brief}
                  onChange={(event) => setManagement({ ...management, brief: event.target.value })}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </FormField>
              <FormField label="Format" htmlFor="manage_type">
                <Select
                  value={management.content_type}
                  onValueChange={(value) => value && setManagement({
                    ...management,
                    content_type: value as MarketingContentType,
                  })}
                >
                  <SelectTrigger id="manage_type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Preferred date" htmlFor="manage_proposed_date">
                <Input
                  id="manage_proposed_date"
                  type="date"
                  value={management.proposed_date}
                  onChange={(event) => setManagement({ ...management, proposed_date: event.target.value })}
                />
              </FormField>
              <FormField label="Social platforms" required className="sm:col-span-2">
                <PlatformPicker
                  value={management.platforms}
                  onChange={(value) => setManagement({ ...management, platforms: value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>
          <FormSection title="Publishing plan" description="A scheduled date is required after the idea stage.">
            <FormGrid cols={3}>
              <FormField label="Schedule" htmlFor="manage_schedule">
                <Input
                  id="manage_schedule"
                  type="datetime-local"
                  value={management.scheduled_at}
                  onChange={(event) => setManagement({ ...management, scheduled_at: event.target.value })}
                />
              </FormField>
              <FormField label="Status" htmlFor="manage_status">
                <Select
                  value={management.status}
                  onValueChange={(value) => value && setManagement({
                    ...management,
                    status: value as MarketingContentStatus,
                  })}
                >
                  <SelectTrigger id="manage_status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Owner" htmlFor="manage_owner">
                <Select
                  value={management.assigned_to}
                  onValueChange={(value) => value && setManagement({ ...management, assigned_to: value })}
                >
                  <SelectTrigger id="manage_owner" className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {contributorsQuery.data?.map((contributor) => (
                      <SelectItem key={contributor.id} value={String(contributor.id)}>
                        {contributor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>
          <div className="flex justify-start">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(editing)}
            >
              <Trash2 className="size-4" />
              Delete content item
            </Button>
          </div>
        </FormCard>
      )}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit border-0 shadow-sm ring-1 ring-border/70">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4 text-violet-500" />
                  Idea backlog
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Unscheduled contributions from the team</p>
              </div>
              <Badge variant="secondary">{backlog.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {contentQuery.isLoading ? (
              <>
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </>
            ) : backlog.length === 0 ? (
              <DataState
                compact
                title="The backlog is clear"
                description="Share an idea whenever inspiration strikes."
                actionLabel="Add idea"
                onAction={() => setShowSubmission(true)}
              />
            ) : backlog.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <ContentSummary item={item} onEdit={canManage ? openEdit : undefined} />
                <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserRound className="size-3" />
                    {item.submitter?.name ?? 'Team member'}
                  </span>
                  {item.proposed_date && (
                    <span>Prefers {new Date(`${item.proposed_date.slice(0, 10)}T00:00:00`).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-0 shadow-sm ring-1 ring-border/70">
          <CardHeader className="gap-4 border-b border-border/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-4" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg">
                    {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Social publishing calendar</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                  Today
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={platformFilter} onValueChange={(value) => value && setPlatformFilter(value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>{platform.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {contentQuery.isError ? (
              <DataState
                tone="error"
                title="Calendar unavailable"
                description={getApiErrorMessage(contentQuery.error, 'The content calendar could not be loaded.')}
                actionLabel="Try again"
                onAction={() => contentQuery.refetch()}
              />
            ) : (
              <>
                <div className="hidden lg:block">
                  <div className="grid grid-cols-7 border-b border-border/70 bg-muted/25">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {days.map((day) => {
                      const key = dateKey(day);
                      const dayItems = itemsByDay[key] ?? [];
                      const inMonth = day.getMonth() === month.getMonth();
                      const isToday = key === dateKey(new Date());
                      return (
                        <div
                          key={key}
                          className={cn(
                            'min-h-32 border-b border-r border-border/60 p-2 last:border-r-0',
                            !inMonth && 'bg-muted/25 text-muted-foreground'
                          )}
                        >
                          <div className={cn(
                            'mb-2 flex size-7 items-center justify-center rounded-full text-xs font-medium',
                            isToday && 'bg-primary text-primary-foreground'
                          )}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1.5">
                            {contentQuery.isLoading && inMonth ? (
                              <Skeleton className="h-12 w-full rounded-lg" />
                            ) : dayItems.slice(0, 3).map((item) => (
                              <ContentSummary
                                key={item.id}
                                item={item}
                                compact
                                onEdit={canManage ? openEdit : undefined}
                              />
                            ))}
                            {dayItems.length > 3 && (
                              <p className="px-1 text-[11px] font-medium text-muted-foreground">
                                +{dayItems.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="divide-y divide-border/70 lg:hidden">
                  {contentQuery.isLoading ? (
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-20 w-full rounded-xl" />
                      <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                  ) : scheduled.length === 0 ? (
                    <DataState
                      title="Nothing scheduled this month"
                      description="Managers can open an idea from the backlog and give it a publish date."
                    />
                  ) : scheduled.map((item) => (
                    <div key={item.id} className="flex gap-3 p-4">
                      <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="text-[9px] font-semibold uppercase">
                          {new Date(item.scheduled_at as string).toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="font-heading text-base font-semibold leading-none">
                          {new Date(item.scheduled_at as string).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <ContentSummary item={item} onEdit={canManage ? openEdit : undefined} />
                        <p className="mt-1.5 flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
                          <Clock3 className="size-3" />
                          {new Date(item.scheduled_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {item.assignee && <> Â· {item.assignee.name}</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Send className="size-4 text-primary" />
          Your ideas are visible to the whole workspace. Managers handle scheduling and publishing updates.
        </div>
      )}

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

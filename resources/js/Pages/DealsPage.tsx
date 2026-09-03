import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api, getApiErrorMessage, type Deal, type Pipeline, type PipelineStage } from '../lib/api';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { Skeleton } from '@/Components/ui/skeleton';
import { DataState } from '@/Components/DataState';
import { PageHeader } from '@/Components/PageHeader';
import { CloseDealDialog } from '@/Components/CloseDealDialog';
import { useFeedback } from '@/Components/Feedback';

const emptyForm = {
  name: '',
  value: '',
  expected_close_date: '',
  stage_id: '',
};

export default function DealsPage() {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingMove, setPendingMove] = useState<{ deal: Deal; stage: PipelineStage } | null>(null);
  const [closeReason, setCloseReason] = useState('');

  const { data: pipelines, isLoading: pipelinesLoading, isError: pipelinesError, refetch: refetchPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: api.getPipelines,
  });

  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  const pipelineId = selectedPipeline ?? pipelines?.[0]?.id;
  const currentPipeline = pipelines?.find((p) => p.id === pipelineId);

  const { data: kanban, isLoading, isError: kanbanError, refetch: refetchKanban } = useQuery({
    queryKey: ['deals-kanban', pipelineId],
    queryFn: () => api.getDealsKanban(pipelineId!),
    enabled: !!pipelineId,
  });

  const resetForm = () => {
    const firstStage = currentPipeline?.stages?.[0];
    setForm({
      name: '',
      value: '',
      expected_close_date: '',
      stage_id: firstStage ? String(firstStage.id) : '',
    });
  };

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

  const openEdit = (deal: Deal) => {
    setShowForm(false);
    setEditing(deal);
    setForm({
      name: deal.name,
      value: String(deal.value),
      expected_close_date: deal.expected_close_date?.slice(0, 10) ?? '',
      stage_id: String(deal.stage_id),
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        value: Number(form.value) || 0,
        expected_close_date: form.expected_close_date || undefined,
      };
      if (editing) {
        return api.updateDeal(editing.id, payload);
      }
      return api.createDeal({
        pipeline_id: pipelineId!,
        stage_id: Number(form.stage_id),
        ...payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] });
      notify(editing ? 'Deal updated.' : 'Deal created.');
      closeForm();
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Deal could not be saved.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] });
      notify('Deal deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Deal could not be deleted.'), 'error'),
  });

  const moveMutation = useMutation({
    mutationFn: ({ dealId, stageId, reason }: { dealId: number; stageId: number; reason?: string }) =>
      api.updateDealStage(dealId, stageId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] });
      notify('Deal stage updated.');
      setPendingMove(null);
      setCloseReason('');
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Deal stage could not be updated.'), 'error'),
  });

  const formatCurrency = (n: number, currency = 'TZS') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const requestMove = (deal: Deal, stageId: number) => {
    if (deal.stage_id === stageId) return;
    const stage = currentPipeline?.stages.find((item) => item.id === stageId);
    if (!stage) return;
    if (stage.is_closed) {
      setPendingMove({ deal, stage });
      setCloseReason('');
      return;
    }
    moveMutation.mutate({ dealId: deal.id, stageId });
  };

  const handleDrop = (stageId: number) => {
    if (draggedDeal) requestMove(draggedDeal, stageId);
    setDraggedDeal(null);
  };

  const isFormOpen = showForm || editing !== null;

  if (pipelinesLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col gap-4 lg:flex-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl lg:flex-1" />
          ))}
        </div>
      </div>
    );
  }

  if (pipelinesError || kanbanError) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Revenue" title="Sales pipeline" description="Move opportunities forward and keep every outcome accountable." />
        <Card className="border-0 ring-1 ring-border/70">
          <DataState
            tone="error"
            title="Pipeline could not be loaded"
            description="Check your connection and try loading the pipeline again."
            actionLabel="Try again"
            onAction={() => pipelinesError ? refetchPipelines() : refetchKanban()}
          />
        </Card>
      </div>
    );
  }

  if (!pipelineId || !currentPipeline) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Revenue" title="Sales pipeline" description="Move opportunities forward and keep every outcome accountable." />
        <Card className="border-0 ring-1 ring-border/70">
          <DataState
            title="No pipeline is configured"
            description="An administrator needs to create a pipeline and its stages before your team can add deals."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Revenue"
        title="Sales pipeline"
        description="Move opportunities forward by drag, touch, or keyboardâ€”and capture why every deal closes."
        action={
          <>
          {pipelines && pipelines.length > 1 && (
            <Select
              value={String(pipelineId)}
              onValueChange={(value) => setSelectedPipeline(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p: Pipeline) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant={isFormOpen ? 'outline' : 'default'} onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            {isFormOpen ? <X size={16} /> : <Plus size={16} />}
            {isFormOpen ? 'Close form' : 'New deal'}
          </Button>
          </>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Deal' : 'Add Deal'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update Deal' : 'Save Deal'}
          isSubmitting={saveMutation.isPending}
        >
          <FormSection title="Deal Details">
            <FormGrid cols={2}>
              <FormField label="Name" htmlFor="deal_name" required className="sm:col-span-2">
                <Input
                  id="deal_name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Value" htmlFor="deal_value" required>
                <Input
                  id="deal_value"
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Expected close" htmlFor="deal_close">
                <Input
                  id="deal_close"
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                />
              </FormField>
              {!editing && currentPipeline && (
                <FormField label="Stage" htmlFor="deal_stage" required>
                  <Select
                    value={form.stage_id}
                    onValueChange={(value) => value && setForm({ ...form, stage_id: value })}
                  >
                    <SelectTrigger id="deal_stage" className="w-full">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentPipeline.stages.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {kanban?.stages.map((stage) => {
          const deals = kanban.deals_by_stage[stage.id] ?? kanban.deals_by_stage[String(stage.id)] ?? [];

          return (
            <div
              key={stage.id}
              className="flex w-[86vw] shrink-0 snap-start flex-col rounded-2xl border border-border/70 bg-muted/45 p-3 sm:w-[360px] lg:min-w-[230px] lg:flex-1"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">{stage.name}</h3>
                <Badge variant="secondary">{deals.length}</Badge>
              </div>

              <div className="flex flex-col gap-2">
                {deals.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                    No deals in this stage
                  </p>
                ) : (
                  deals.map((deal: Deal) => (
                    <Card
                      key={deal.id}
                      draggable
                      onDragStart={() => setDraggedDeal(deal)}
                      className="cursor-grab border-0 shadow-sm ring-1 ring-border/70 active:cursor-grabbing"
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{deal.name}</p>
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(deal)}
                              aria-label="Edit deal"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteTarget(deal)}
                              aria-label="Delete deal"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {formatCurrency(Number(deal.value), deal.currency)}
                        </p>
                        {deal.account && (
                          <p className="mt-2 text-xs text-muted-foreground">{deal.account.name}</p>
                        )}
                        {deal.expected_close_date && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Close: {new Date(deal.expected_close_date).toLocaleDateString()}
                          </p>
                        )}
                        <div className="mt-3 border-t border-border/70 pt-3">
                          <Select
                            value={String(deal.stage_id)}
                            onValueChange={(value) => value && requestMove(deal, Number(value))}
                            disabled={moveMutation.isPending}
                          >
                            <SelectTrigger className="h-8 w-full text-xs" aria-label={`Move ${deal.name} to another stage`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {currentPipeline.stages.map((item) => (
                                <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleteMutation.isPending}
      />
      <CloseDealDialog
        open={pendingMove !== null}
        dealName={pendingMove?.deal.name}
        stageName={pendingMove?.stage.name}
        reason={closeReason}
        onReasonChange={setCloseReason}
        onCancel={() => {
          setPendingMove(null);
          setCloseReason('');
        }}
        onConfirm={() => {
          if (!pendingMove) return;
          moveMutation.mutate({
            dealId: pendingMove.deal.id,
            stageId: pendingMove.stage.id,
            reason: closeReason.trim(),
          });
        }}
        isSubmitting={moveMutation.isPending}
      />
    </div>
  );
}

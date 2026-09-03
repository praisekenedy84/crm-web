import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useSubmit, visitFilters } from '@/lib/submit';
import { useCan } from '@/hooks/useCan';
import type { Deal, DealLineItem, KanbanData, Pipeline, PipelineStage, Product, Service } from '@/types';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { DataState } from '@/Components/DataState';
import { PageHeader } from '@/Components/PageHeader';
import { CloseDealDialog } from '@/Components/CloseDealDialog';

type LineDraft = {
  key: string;
  kind: 'custom' | 'product' | 'service';
  description: string;
  quantity: string;
  unit_price: string;
  product_id: string;
  service_id: string;
};

const emptyLine = (): LineDraft => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  kind: 'custom',
  description: '',
  quantity: '1',
  unit_price: '',
  product_id: '',
  service_id: '',
});

const emptyForm = {
  name: '',
  expected_close_date: '',
  stage_id: '',
  lines: [emptyLine()] as LineDraft[],
};

interface DealsPageProps {
  pipelines: Pipeline[];
  pipelineId: number | null;
  kanban: KanbanData | null;
  products: Product[];
  services: Service[];
}

function lineTotal(line: LineDraft): number {
  return (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
}

export default function DealsPage({
  pipelines,
  pipelineId,
  kanban,
  products = [],
  services = [],
}: DealsPageProps) {
  const { processing, submit } = useSubmit();
  const { can } = useCan();
  const canCreate = can('deals.create');
  const canUpdate = can('deals.update');
  const canDelete = can('deals.delete');
  const canMove = can('deals.move_stage');
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingMove, setPendingMove] = useState<{ deal: Deal; stage: PipelineStage } | null>(null);
  const [closeReason, setCloseReason] = useState('');

  const currentPipeline = pipelines.find((p) => p.id === pipelineId);
  const dealValue = useMemo(
    () => form.lines.reduce((sum, line) => sum + lineTotal(line), 0),
    [form.lines],
  );

  const resetForm = () => {
    const firstStage = currentPipeline?.stages?.[0];
    setForm({
      name: '',
      expected_close_date: '',
      stage_id: firstStage ? String(firstStage.id) : '',
      lines: [emptyLine()],
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

  const toLineDraft = (line: DealLineItem): LineDraft => ({
    key: String(line.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    kind: line.product_id ? 'product' : line.service_id ? 'service' : 'custom',
    description: line.description,
    quantity: String(line.quantity ?? 1),
    unit_price: String(line.unit_price ?? 0),
    product_id: line.product_id ? String(line.product_id) : '',
    service_id: line.service_id ? String(line.service_id) : '',
  });

  const openEdit = (deal: Deal) => {
    setShowForm(false);
    setEditing(deal);
    setForm({
      name: deal.name,
      expected_close_date: deal.expected_close_date?.slice(0, 10) ?? '',
      stage_id: String(deal.stage_id),
      lines: deal.line_items?.length
        ? deal.line_items.map(toLineDraft)
        : [emptyLine()],
    });
  };

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    }));
  };

  const applyCatalog = (key: string, kind: 'product' | 'service', id: string) => {
    if (kind === 'product') {
      const product = products.find((p) => String(p.id) === id);
      updateLine(key, {
        kind: 'product',
        product_id: id,
        service_id: '',
        description: product?.name ?? '',
        unit_price: product ? String(product.unit_price) : '',
      });
      return;
    }

    const service = services.find((s) => String(s.id) === id);
    updateLine(key, {
      kind: 'service',
      service_id: id,
      product_id: '',
      description: service?.name ?? '',
      unit_price: service ? String(service.price) : '',
    });
  };

  const handleSave = () => {
    const lines = form.lines
      .filter((line) => line.description.trim() || line.product_id || line.service_id)
      .map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantity) || 0,
        unit_price: Number(line.unit_price) || 0,
        product_id: line.kind === 'product' && line.product_id ? Number(line.product_id) : undefined,
        service_id: line.kind === 'service' && line.service_id ? Number(line.service_id) : undefined,
      }));

    const payload = {
      name: form.name,
      value: dealValue,
      expected_close_date: form.expected_close_date || undefined,
      lines,
    };

    if (editing) {
      submit('put', `/deals/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/deals', {
        pipeline_id: pipelineId,
        stage_id: Number(form.stage_id),
        ...payload,
      }, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    submit('delete', `/deals/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const moveDeal = (dealId: number, stageId: number, reason?: string) => {
    submit('patch', `/deals/${dealId}/stage`, {
      stage_id: stageId,
      win_loss_reason: reason || undefined,
    }, {
      onSuccess: () => {
        setPendingMove(null);
        setCloseReason('');
      },
    });
  };

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
    moveDeal(deal.id, stageId);
  };

  const handleDrop = (stageId: number) => {
    if (draggedDeal) requestMove(draggedDeal, stageId);
    setDraggedDeal(null);
  };

  const isFormOpen = showForm || editing !== null;

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
        description="Attach products or services to each deal, then move it to Won to record the sale."
        action={
          <>
          {pipelines.length > 1 && (
            <Select
              value={String(pipelineId)}
              onValueChange={(value) => visitFilters('/deals', { pipeline_id: Number(value) })}
              items={pipelines.map((p) => ({ value: String(p.id), label: p.name }))}
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
          {(canCreate || isFormOpen) && (
            <Button variant={isFormOpen ? 'outline' : 'default'} onClick={() => (isFormOpen ? closeForm() : openCreate())}>
              {isFormOpen ? <X size={16} /> : <Plus size={16} />}
              {isFormOpen ? 'Close form' : 'New deal'}
            </Button>
          )}
          </>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Deal' : 'Add Deal'}
          description="Add line items for software or services. Deal value is the sum of the lines."
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          submitLabel={editing ? 'Update Deal' : 'Save Deal'}
          isSubmitting={processing}
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
              <FormField label="Deal value" hint="Calculated from line items">
                <Input value={formatCurrency(dealValue)} readOnly />
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
                    items={currentPipeline.stages.map((s) => ({ value: String(s.id), label: s.name }))}
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

          <FormSection title="What is being sold">
            <div className="space-y-3">
              {form.lines.map((line, index) => (
                <div key={line.key} className="rounded-xl border border-border/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Line {index + 1}</p>
                    {form.lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove line"
                        onClick={() => setForm({ ...form, lines: form.lines.filter((l) => l.key !== line.key) })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  <FormGrid cols={2}>
                    <FormField label="Type" htmlFor={`line_kind_${line.key}`}>
                      <Select
                        value={line.kind}
                        onValueChange={(value) => {
                          if (!value) return;
                          updateLine(line.key, {
                            kind: value as LineDraft['kind'],
                            product_id: '',
                            service_id: '',
                            description: value === 'custom' ? line.description : '',
                            unit_price: value === 'custom' ? line.unit_price : '',
                          });
                        }}
                        items={[
                          { value: 'product', label: 'Product (software / goods)' },
                          { value: 'service', label: 'Service' },
                          { value: 'custom', label: 'Custom line' },
                        ]}
                      >
                        <SelectTrigger id={`line_kind_${line.key}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product">Product (software / goods)</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="custom">Custom line</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    {line.kind === 'product' && (
                      <FormField label="Product" htmlFor={`line_product_${line.key}`}>
                        <Select
                          value={line.product_id}
                          onValueChange={(value) => value && applyCatalog(line.key, 'product', value)}
                          items={products.map((p) => ({
                            value: String(p.id),
                            label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
                          }))}
                        >
                          <SelectTrigger id={`line_product_${line.key}`} className="w-full">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}{p.sku ? ` (${p.sku})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    )}

                    {line.kind === 'service' && (
                      <FormField label="Service" htmlFor={`line_service_${line.key}`}>
                        <Select
                          value={line.service_id}
                          onValueChange={(value) => value && applyCatalog(line.key, 'service', value)}
                          items={services.map((s) => ({
                            value: String(s.id),
                            label: `${s.name} · ${s.billing_cycle}`,
                          }))}
                        >
                          <SelectTrigger id={`line_service_${line.key}`} className="w-full">
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name} · {s.billing_cycle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    )}

                    <FormField
                      label="Description"
                      htmlFor={`line_desc_${line.key}`}
                      className={line.kind === 'custom' ? 'sm:col-span-2' : undefined}
                    >
                      <Input
                        id={`line_desc_${line.key}`}
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        placeholder="What is being sold"
                      />
                    </FormField>
                    <FormField label="Qty" htmlFor={`line_qty_${line.key}`}>
                      <Input
                        id={`line_qty_${line.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Unit price" htmlFor={`line_price_${line.key}`}>
                      <Input
                        id={`line_price_${line.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) => updateLine(line.key, { unit_price: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Line total">
                      <Input value={formatCurrency(lineTotal(line))} readOnly />
                    </FormField>
                  </FormGrid>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })}
              >
                <Plus size={14} />
                Add line
              </Button>
            </div>
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
                      draggable={canMove}
                      onDragStart={() => canMove && setDraggedDeal(deal)}
                      className={canMove ? 'cursor-grab border-0 shadow-sm ring-1 ring-border/70 active:cursor-grabbing' : 'border-0 shadow-sm ring-1 ring-border/70'}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{deal.name}</p>
                          <div className="flex shrink-0 gap-0.5">
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEdit(deal)}
                                aria-label="Edit deal"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteTarget(deal)}
                                aria-label="Delete deal"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {formatCurrency(Number(deal.value), deal.currency)}
                        </p>
                        {deal.line_items && deal.line_items.length > 0 && (
                          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                            {deal.line_items.slice(0, 3).map((line) => (
                              <li key={line.id ?? line.description}>
                                {line.quantity} × {line.description}
                              </li>
                            ))}
                            {deal.line_items.length > 3 && (
                              <li>+{deal.line_items.length - 3} more</li>
                            )}
                          </ul>
                        )}
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
                            disabled={processing}
                            items={(currentPipeline?.stages ?? []).map((item) => ({
                              value: String(item.id),
                              label: item.name,
                            }))}
                          >
                            <SelectTrigger className="h-8 w-full text-xs" aria-label={`Move ${deal.name} to another stage`}>
                              <SelectValue>
                                {(currentPipeline?.stages ?? []).find((item) => item.id === deal.stage_id)?.name
                                  ?? deal.stage?.name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(currentPipeline?.stages ?? []).map((item) => (
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
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={processing}
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
          moveDeal(pendingMove.deal.id, pendingMove.stage.id, closeReason.trim());
        }}
        isSubmitting={processing}
      />
    </div>
  );
}

<?php

namespace App\Services;

use App\Models\Deal;
use App\Models\DealLineItem;
use App\Models\DealStageHistory;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Product;
use App\Models\Service;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DealService
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function pipelines()
    {
        return Pipeline::with(['stages' => fn ($q) => $q->orderBy('sort_order')])->get();
    }

    public function kanban(int $pipelineId): array
    {
        $stages = PipelineStage::where('pipeline_id', $pipelineId)
            ->orderBy('sort_order')
            ->get();

        $query = Deal::with(['stage', 'account', 'contact', 'owner', 'lineItems.product', 'lineItems.service'])
            ->where('pipeline_id', $pipelineId)
            ->latest();

        if ($user = Auth::user()) {
            $this->permissions->applyOwnerScope($query, $user, 'deals');
        }

        $deals = $query->get()->groupBy('stage_id');

        return [
            'stages' => $stages,
            'deals_by_stage' => $deals,
        ];
    }

    public function catalog(): array
    {
        return [
            'products' => Product::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'sku', 'name', 'unit_price', 'currency']),
            'services' => Service::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'currency', 'billing_cycle']),
        ];
    }

    public function store(array $data): Deal
    {
        $lines = $data['lines'] ?? null;
        unset($data['lines']);

        $data['currency'] ??= 'TZS';
        $data['owner_id'] ??= Auth::id();

        return DB::transaction(function () use ($data, $lines) {
            $normalized = is_array($lines) ? $this->normalizeLines($lines) : [];
            if ($normalized !== []) {
                $data['value'] = collect($normalized)->sum('total');
            } else {
                $data['value'] ??= 0;
            }

            $deal = Deal::create($data);

            if ($normalized !== []) {
                $this->syncLines($deal, $normalized);
            }

            DealStageHistory::create([
                'deal_id' => $deal->id,
                'from_stage_id' => null,
                'to_stage_id' => $deal->stage_id,
                'changed_by' => Auth::id(),
                'changed_at' => now(),
            ]);

            AuditService::log('created', $deal);

            return $deal->load(['stage', 'account', 'contact', 'owner', 'lineItems.product', 'lineItems.service']);
        });
    }

    public function update(Deal $deal, array $data): Deal
    {
        $lines = array_key_exists('lines', $data) ? $data['lines'] : null;
        unset($data['lines']);

        return DB::transaction(function () use ($deal, $data, $lines) {
            if (is_array($lines)) {
                $normalized = $this->normalizeLines($lines);
                $this->syncLines($deal, $normalized);
                $data['value'] = collect($normalized)->sum('total');
            }

            if ($data !== []) {
                $deal->update($data);
            }

            AuditService::log('updated', $deal, $data);

            return $deal->fresh()->load(['stage', 'account', 'contact', 'owner', 'lineItems.product', 'lineItems.service']);
        });
    }

    public function updateStage(Deal $deal, int $stageId, ?string $winLossReason = null): Deal
    {
        $newStage = PipelineStage::findOrFail($stageId);

        if ($newStage->is_closed && empty($winLossReason)) {
            throw ValidationException::withMessages([
                'win_loss_reason' => ['Win/loss reason is required when closing a deal.'],
            ]);
        }

        DB::transaction(function () use ($deal, $newStage, $winLossReason) {
            $fromStageId = $deal->stage_id;

            $deal->update([
                'stage_id' => $newStage->id,
                'probability' => $newStage->probability,
                'status' => $newStage->is_closed ? ($newStage->is_won ? 'won' : 'lost') : 'open',
                'win_loss_reason' => $newStage->is_closed ? $winLossReason : null,
                'closed_at' => $newStage->is_closed ? now() : null,
            ]);

            DealStageHistory::create([
                'deal_id' => $deal->id,
                'from_stage_id' => $fromStageId,
                'to_stage_id' => $newStage->id,
                'changed_by' => Auth::id(),
                'changed_at' => now(),
            ]);

            AuditService::log('stage_changed', $deal, [
                'from_stage_id' => $fromStageId,
                'to_stage_id' => $newStage->id,
            ]);
        });

        $deal = $deal->fresh();
        app(AutomationEngine::class)->dispatch('stage.changed', $deal);

        if ($deal->status === 'won') {
            app(CrossModuleAutomationService::class)->onDealWon($deal);
            app(WebhookDispatcher::class)->emit('deal.won', $deal);
        } elseif ($deal->status === 'lost') {
            app(WebhookDispatcher::class)->emit('deal.lost', $deal);
        }

        return $deal->load(['stage', 'account', 'contact', 'owner', 'lineItems.product', 'lineItems.service']);
    }

    public function destroy(Deal $deal): void
    {
        AuditService::log('deleted', $deal);
        $deal->delete();
    }

    /**
     * @param  list<array<string, mixed>>  $lines
     * @return list<array{description: string, quantity: float, unit_price: float, total: float, product_id: ?int, service_id: ?int, sort_order: int}>
     */
    private function normalizeLines(array $lines): array
    {
        $normalized = [];

        foreach (array_values($lines) as $index => $line) {
            $description = trim((string) ($line['description'] ?? ''));
            $productId = isset($line['product_id']) && $line['product_id'] !== ''
                ? (int) $line['product_id']
                : null;
            $serviceId = isset($line['service_id']) && $line['service_id'] !== ''
                ? (int) $line['service_id']
                : null;

            if ($productId && $serviceId) {
                throw ValidationException::withMessages([
                    "lines.{$index}" => ['A line can link to a product or a service, not both.'],
                ]);
            }

            if ($productId) {
                $product = Product::find($productId);
                if (! $product) {
                    throw ValidationException::withMessages([
                        "lines.{$index}.product_id" => ['Selected product was not found.'],
                    ]);
                }
                if ($description === '') {
                    $description = $product->name;
                }
                if (! isset($line['unit_price']) || $line['unit_price'] === '' || $line['unit_price'] === null) {
                    $line['unit_price'] = $product->unit_price;
                }
            }

            if ($serviceId) {
                $service = Service::find($serviceId);
                if (! $service) {
                    throw ValidationException::withMessages([
                        "lines.{$index}.service_id" => ['Selected service was not found.'],
                    ]);
                }
                if ($description === '') {
                    $description = $service->name;
                }
                if (! isset($line['unit_price']) || $line['unit_price'] === '' || $line['unit_price'] === null) {
                    $line['unit_price'] = $service->price;
                }
            }

            if ($description === '') {
                continue;
            }

            $quantity = max(0, (float) ($line['quantity'] ?? 1));
            $unitPrice = max(0, (float) ($line['unit_price'] ?? 0));
            $total = round($quantity * $unitPrice, 2);

            $normalized[] = [
                'description' => $description,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total' => $total,
                'product_id' => $productId,
                'service_id' => $serviceId,
                'sort_order' => $index,
            ];
        }

        return $normalized;
    }

    /**
     * @param  list<array{description: string, quantity: float, unit_price: float, total: float, product_id: ?int, service_id: ?int, sort_order: int}>  $lines
     */
    private function syncLines(Deal $deal, array $lines): void
    {
        $deal->lineItems()->delete();

        foreach ($lines as $line) {
            DealLineItem::create([
                'deal_id' => $deal->id,
                ...$line,
            ]);
        }
    }
}

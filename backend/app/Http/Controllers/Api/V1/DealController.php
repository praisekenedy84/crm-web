<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use App\Models\DealStageHistory;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Services\AuditService;
use App\Services\AutomationEngine;
use App\Services\CrossModuleAutomationService;
use App\Services\WebhookDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DealController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Deal::with(['stage', 'account', 'contact', 'owner'])->latest();

        if ($pipelineId = $request->query('pipeline_id')) {
            $query->where('pipeline_id', $pipelineId);
        }

        if ($stageId = $request->query('stage_id')) {
            $query->where('stage_id', $stageId);
        }

        if ($view = $request->query('view')) {
            if ($view === 'kanban' && $pipelineId) {
                $stages = PipelineStage::where('pipeline_id', $pipelineId)
                    ->orderBy('sort_order')
                    ->get();

                $deals = $query->get()->groupBy('stage_id');

                return response()->json([
                    'stages' => $stages,
                    'deals_by_stage' => $deals,
                ]);
            }
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pipeline_id' => ['required', 'exists:pipelines,id'],
            'stage_id' => ['required', 'exists:pipeline_stages,id'],
            'name' => ['required', 'string', 'max:255'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'expected_close_date' => ['nullable', 'date'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        $data['currency'] ??= 'TZS';

        $deal = Deal::create($data);

        DealStageHistory::create([
            'deal_id' => $deal->id,
            'from_stage_id' => null,
            'to_stage_id' => $deal->stage_id,
            'changed_by' => Auth::id(),
            'changed_at' => now(),
        ]);

        AuditService::log('created', $deal);

        return response()->json($deal->load(['stage', 'account', 'contact', 'owner']), 201);
    }

    public function show(Deal $deal): JsonResponse
    {
        return response()->json($deal->load([
            'stage', 'pipeline', 'account', 'contact', 'owner', 'stageHistory.toStage', 'stageHistory.changedBy',
        ]));
    }

    public function update(Request $request, Deal $deal): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'expected_close_date' => ['nullable', 'date'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        $deal->update($data);
        AuditService::log('updated', $deal, $data);

        return response()->json($deal->load(['stage', 'account', 'contact', 'owner']));
    }

    public function updateStage(Request $request, Deal $deal): JsonResponse
    {
        $data = $request->validate([
            'stage_id' => ['required', 'exists:pipeline_stages,id'],
            'win_loss_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $newStage = PipelineStage::findOrFail($data['stage_id']);

        if ($newStage->is_closed && empty($data['win_loss_reason'])) {
            return response()->json([
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Win/loss reason is required when closing a deal.',
                ],
            ], 422);
        }

        DB::transaction(function () use ($deal, $newStage, $data) {
            $fromStageId = $deal->stage_id;

            $deal->update([
                'stage_id' => $newStage->id,
                'probability' => $newStage->probability,
                'status' => $newStage->is_closed ? ($newStage->is_won ? 'won' : 'lost') : 'open',
                'win_loss_reason' => $newStage->is_closed ? ($data['win_loss_reason'] ?? null) : null,
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

        return response()->json($deal->load(['stage', 'account', 'contact', 'owner']));
    }

    public function destroy(Deal $deal): JsonResponse
    {
        AuditService::log('deleted', $deal);
        $deal->delete();

        return response()->json(['message' => 'Deal deleted.']);
    }

    public function pipelines(): JsonResponse
    {
        return response()->json(
            Pipeline::with('stages')->get()
        );
    }
}

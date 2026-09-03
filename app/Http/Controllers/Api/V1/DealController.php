<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Deal;
use App\Services\DealService;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DealController extends Controller
{
    public function __construct(
        private readonly DealService $deals,
        private readonly PermissionService $permissions,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Deal::class);

        if ($request->query('view') === 'kanban' && $request->query('pipeline_id')) {
            return response()->json($this->deals->kanban((int) $request->query('pipeline_id')));
        }

        $query = Deal::with(['stage', 'account', 'contact', 'owner'])->latest();
        $this->permissions->applyOwnerScope($query, $request->user(), 'deals');

        if ($pipelineId = $request->query('pipeline_id')) {
            $query->where('pipeline_id', $pipelineId);
        }

        if ($stageId = $request->query('stage_id')) {
            $query->where('stage_id', $stageId);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Deal::class);

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
            'lines' => ['nullable', 'array'],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'lines.*.product_id' => ['nullable', 'exists:products,id'],
            'lines.*.service_id' => ['nullable', 'exists:services,id'],
        ]);

        return response()->json($this->deals->store($data), 201);
    }

    public function show(Deal $deal): JsonResponse
    {
        $this->authorize('view', $deal);

        return response()->json($deal->load([
            'stage', 'pipeline', 'account', 'contact', 'owner', 'lineItems.product', 'lineItems.service',
            'stageHistory.toStage', 'stageHistory.changedBy',
        ]));
    }

    public function update(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('update', $deal);

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
            'lines' => ['nullable', 'array'],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'lines.*.product_id' => ['nullable', 'exists:products,id'],
            'lines.*.service_id' => ['nullable', 'exists:services,id'],
        ]);

        return response()->json($this->deals->update($deal, $data));
    }

    public function updateStage(Request $request, Deal $deal): JsonResponse
    {
        $this->authorize('moveStage', $deal);

        $data = $request->validate([
            'stage_id' => ['required', 'exists:pipeline_stages,id'],
            'win_loss_reason' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json($this->deals->updateStage(
            $deal,
            (int) $data['stage_id'],
            $data['win_loss_reason'] ?? null,
        ));
    }

    public function destroy(Deal $deal): JsonResponse
    {
        $this->authorize('delete', $deal);

        $this->deals->destroy($deal);

        return response()->json(['message' => 'Deal deleted.']);
    }

    public function pipelines(): JsonResponse
    {
        return response()->json($this->deals->pipelines());
    }
}

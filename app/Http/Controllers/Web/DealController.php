<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Deal;
use App\Services\DealService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DealController extends Controller
{
    use Flashes;

    public function __construct(private readonly DealService $deals) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', \App\Models\Deal::class);
        $pipelines = $this->deals->pipelines();
        $pipelineId = (int) ($request->query('pipeline_id') ?: $pipelines->first()?->id);
        $catalog = $this->deals->catalog();

        return Inertia::render('DealsPage', [
            'pipelines' => $pipelines,
            'pipelineId' => $pipelineId ?: null,
            'kanban' => $pipelineId ? $this->deals->kanban($pipelineId) : null,
            'products' => $catalog['products'],
            'services' => $catalog['services'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', \App\Models\Deal::class);
        $data = $request->validate([
            'pipeline_id' => ['required', 'exists:pipelines,id'],
            'stage_id' => ['required', 'exists:pipeline_stages,id'],
            'name' => ['required', 'string', 'max:255'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['nullable', 'date'],
            'lines' => ['nullable', 'array'],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'lines.*.product_id' => ['nullable', 'exists:products,id'],
            'lines.*.service_id' => ['nullable', 'exists:services,id'],
        ]);

        $this->deals->store($data);

        return $this->saved('Deal created.');
    }

    public function update(Request $request, Deal $deal): RedirectResponse
    {
        $this->authorize('update', $deal);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'value' => ['nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['nullable', 'date'],
            'lines' => ['nullable', 'array'],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
            'lines.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'lines.*.product_id' => ['nullable', 'exists:products,id'],
            'lines.*.service_id' => ['nullable', 'exists:services,id'],
        ]);

        $this->deals->update($deal, $data);

        return $this->saved('Deal updated.');
    }

    public function updateStage(Request $request, Deal $deal): RedirectResponse
    {
        $this->authorize('moveStage', $deal);
        $data = $request->validate([
            'stage_id' => ['required', 'exists:pipeline_stages,id'],
            'win_loss_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $this->deals->updateStage($deal, (int) $data['stage_id'], $data['win_loss_reason'] ?? null);

        return $this->saved('Deal stage updated.');
    }

    public function destroy(Deal $deal): RedirectResponse
    {
        $this->authorize('delete', $deal);
        $this->deals->destroy($deal);

        return $this->saved('Deal deleted.');
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityType;
use App\Enums\AreaLevel;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Area;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function pipelineSummary(): JsonResponse
    {
        $stages = PipelineStage::query()
            ->join('pipelines', 'pipelines.id', '=', 'pipeline_stages.pipeline_id')
            ->select('pipeline_stages.*', 'pipelines.name as pipeline_name')
            ->orderBy('pipeline_stages.sort_order')
            ->get();

        $dealCounts = Deal::query()
            ->select('stage_id', DB::raw('COUNT(*) as count'), DB::raw('SUM(value) as total_value'))
            ->where('status', 'open')
            ->groupBy('stage_id')
            ->get()
            ->keyBy('stage_id');

        $summary = $stages->map(function ($stage) use ($dealCounts) {
            $stats = $dealCounts->get($stage->id);
            $totalValue = (float) ($stats->total_value ?? 0);
            $count = (int) ($stats->count ?? 0);

            return [
                'stage_id' => $stage->id,
                'stage_name' => $stage->name,
                'pipeline_name' => $stage->pipeline_name,
                'deal_count' => $count,
                'total_value' => $totalValue,
                'weighted_value' => $totalValue * ($stage->probability / 100),
                'probability' => $stage->probability,
            ];
        });

        return response()->json([
            'stages' => $summary,
            'totals' => [
                'deal_count' => $summary->sum('deal_count'),
                'total_value' => $summary->sum('total_value'),
                'weighted_value' => $summary->sum('weighted_value'),
            ],
        ]);
    }

    public function conversionRate(): JsonResponse
    {
        $sources = Lead::query()
            ->select('source', DB::raw('COUNT(*) as total'))
            ->groupBy('source')
            ->get();

        $converted = Lead::query()
            ->where('status', LeadStatus::Converted)
            ->select('source', DB::raw('COUNT(*) as converted'))
            ->groupBy('source')
            ->get()
            ->keyBy('source');

        $rates = $sources->map(function ($row) use ($converted) {
            $convertedCount = (int) ($converted->get($row->source)?->converted ?? 0);
            $total = (int) $row->total;

            return [
                'source' => $row->source ?? 'Unknown',
                'total' => $total,
                'converted' => $convertedCount,
                'conversion_rate' => $total > 0 ? round(($convertedCount / $total) * 100, 1) : 0,
            ];
        });

        return response()->json(['sources' => $rates]);
    }

    public function leaderboard(): JsonResponse
    {
        $reps = User::query()
            ->select('users.id', 'users.name')
            ->get()
            ->map(function ($user) {
                $wonDeals = Deal::where('owner_id', $user->id)->where('status', 'won')->count();
                $revenue = (float) Deal::where('owner_id', $user->id)->where('status', 'won')->sum('value');
                $activities = DB::table('activities')->where('owner_id', $user->id)->count();

                return [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'deals_won' => $wonDeals,
                    'revenue' => $revenue,
                    'activity_count' => $activities,
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        return response()->json(['leaderboard' => $reps]);
    }

    public function visitsByArea(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'level' => ['nullable', Rule::enum(AreaLevel::class)],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        $aggregateLevel = match (true) {
            ! isset($data['level']) => AreaLevel::Street,
            $data['level'] instanceof AreaLevel => $data['level'],
            default => AreaLevel::from($data['level']),
        };

        $areas = Area::all()->keyBy('id');
        $areaRollupMap = $this->buildAreaRollupMap($areas, $aggregateLevel);

        $query = Activity::query()
            ->where('type', ActivityType::FieldVisit)
            ->whereBetween('occurred_at', [
                Carbon::parse($data['from'])->startOfDay(),
                Carbon::parse($data['to'])->endOfDay(),
            ])
            ->whereNotNull('area_id');

        if (! empty($data['owner_id'])) {
            $query->where('owner_id', $data['owner_id']);
        }

        $visits = $query
            ->select('area_id', 'owner_id', DB::raw('COUNT(*) as visit_count'))
            ->groupBy('area_id', 'owner_id')
            ->get();

        $users = User::query()->whereIn('id', $visits->pluck('owner_id')->unique())->get()->keyBy('id');
        $aggregated = [];

        foreach ($visits as $visit) {
            $rollupAreaId = $areaRollupMap[$visit->area_id] ?? $visit->area_id;
            $key = "{$rollupAreaId}:{$visit->owner_id}";

            if (! isset($aggregated[$key])) {
                $aggregated[$key] = [
                    'area_id' => $rollupAreaId,
                    'area_name' => $areas->get($rollupAreaId)?->name ?? 'Unknown',
                    'owner_id' => $visit->owner_id,
                    'owner_name' => $users->get($visit->owner_id)?->name ?? 'Unknown',
                    'visit_count' => 0,
                ];
            }

            $aggregated[$key]['visit_count'] += (int) $visit->visit_count;
        }

        return response()->json([
            'period' => ['from' => $data['from'], 'to' => $data['to']],
            'level' => $aggregateLevel->value,
            'visits' => array_values($aggregated),
        ]);
    }

    public function leadsPerRepPerDay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        $query = Lead::query()
            ->whereBetween('created_at', [
                Carbon::parse($data['from'])->startOfDay(),
                Carbon::parse($data['to'])->endOfDay(),
            ]);

        if (! empty($data['owner_id'])) {
            $query->where('owner_id', $data['owner_id']);
        }

        $rows = $query
            ->select(
                'owner_id',
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as lead_count'),
            )
            ->groupBy('owner_id', DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        $users = User::query()->whereIn('id', $rows->pluck('owner_id')->unique())->get()->keyBy('id');

        $report = $rows->map(fn ($row) => [
            'owner_id' => $row->owner_id,
            'owner_name' => $users->get($row->owner_id)?->name ?? 'Unassigned',
            'date' => $row->date,
            'lead_count' => (int) $row->lead_count,
        ]);

        return response()->json([
            'period' => ['from' => $data['from'], 'to' => $data['to']],
            'leads' => $report->values(),
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Area>  $areas
     * @return array<int, int>
     */
    private function buildAreaRollupMap($areas, AreaLevel $targetLevel): array
    {
        $map = [];

        foreach ($areas as $area) {
            $current = $area;

            while ($current && $current->level !== $targetLevel) {
                $current = $current->parent_area_id ? $areas->get($current->parent_area_id) : null;
            }

            $map[$area->id] = $current?->id ?? $area->id;
        }

        return $map;
    }
}

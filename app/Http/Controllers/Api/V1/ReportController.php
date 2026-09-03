<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityType;
use App\Enums\AreaLevel;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Area;
use App\Models\User;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function pipelineSummary(): JsonResponse
    {
        return response()->json($this->reports->pipelineSummary());
    }

    public function conversionRate(): JsonResponse
    {
        return response()->json($this->reports->conversionRate());
    }

    public function leaderboard(): JsonResponse
    {
        return response()->json($this->reports->leaderboard());
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

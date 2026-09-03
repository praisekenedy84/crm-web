<?php

namespace App\Services;

use App\Enums\ActivityType;
use App\Enums\AreaLevel;
use App\Enums\LeadStatus;
use App\Models\Activity;
use App\Models\Area;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Reporting aggregates shared by the token API (Api\V1\ReportController) and the
 * Inertia dashboard (Web\DashboardController).
 *
 * Each method returns plain arrays so the API can wrap them in JSON and the web
 * controller can pass them straight through as Inertia props, without the two
 * paths drifting apart.
 */
class ReportService
{
    public function pipelineSummary(): array
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

        return [
            'stages' => $summary,
            'totals' => [
                'deal_count' => $summary->sum('deal_count'),
                'total_value' => $summary->sum('total_value'),
                'weighted_value' => $summary->sum('weighted_value'),
            ],
        ];
    }

    public function conversionRate(): array
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

        return ['sources' => $rates];
    }

    public function leaderboard(): array
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

        return ['leaderboard' => $reps];
    }

    public function visitsByArea(string $from, string $to, ?AreaLevel $level = null, ?int $ownerId = null): array
    {
        $aggregateLevel = $level ?? AreaLevel::Street;
        $areas = Area::all()->keyBy('id');
        $areaRollupMap = $this->buildAreaRollupMap($areas, $aggregateLevel);

        $query = Activity::query()
            ->where('type', ActivityType::FieldVisit)
            ->whereBetween('occurred_at', [
                Carbon::parse($from)->startOfDay(),
                Carbon::parse($to)->endOfDay(),
            ])
            ->whereNotNull('area_id');

        if ($ownerId) {
            $query->where('owner_id', $ownerId);
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

        return [
            'period' => ['from' => $from, 'to' => $to],
            'level' => $aggregateLevel->value,
            'visits' => array_values($aggregated),
        ];
    }

    public function leadsPerRepPerDay(string $from, string $to, ?int $ownerId = null): array
    {
        $query = Lead::query()
            ->whereBetween('created_at', [
                Carbon::parse($from)->startOfDay(),
                Carbon::parse($to)->endOfDay(),
            ]);

        if ($ownerId) {
            $query->where('owner_id', $ownerId);
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

        return [
            'period' => ['from' => $from, 'to' => $to],
            'leads' => $report->values(),
        ];
    }

    public function salesDone(string $from, string $to, ?int $ownerId = null): array
    {
        $query = Deal::query()
            ->with(['owner', 'account', 'contact', 'lineItems.product', 'lineItems.service'])
            ->where('status', 'won')
            ->whereNotNull('closed_at')
            ->whereBetween('closed_at', [
                Carbon::parse($from)->startOfDay(),
                Carbon::parse($to)->endOfDay(),
            ])
            ->orderByDesc('closed_at');

        if ($ownerId) {
            $query->where('owner_id', $ownerId);
        }

        $deals = $query->get();

        $sales = $deals->map(fn (Deal $deal) => [
            'id' => $deal->id,
            'name' => $deal->name,
            'value' => (float) $deal->value,
            'currency' => $deal->currency,
            'closed_at' => $deal->closed_at?->toDateString(),
            'owner_id' => $deal->owner_id,
            'owner_name' => $deal->owner?->name ?? 'Unassigned',
            'account_name' => $deal->account?->name,
            'contact_name' => $deal->contact
                ? trim("{$deal->contact->first_name} {$deal->contact->last_name}")
                : null,
            'lines' => $deal->lineItems->map(fn ($line) => [
                'id' => $line->id,
                'description' => $line->description,
                'quantity' => (float) $line->quantity,
                'unit_price' => (float) $line->unit_price,
                'total' => (float) $line->total,
                'product_id' => $line->product_id,
                'product_name' => $line->product?->name,
                'service_id' => $line->service_id,
                'service_name' => $line->service?->name,
            ])->values(),
        ])->values();

        return [
            'period' => ['from' => $from, 'to' => $to],
            'totals' => [
                'deal_count' => $sales->count(),
                'revenue' => (float) $sales->sum('value'),
            ],
            'sales' => $sales,
        ];
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

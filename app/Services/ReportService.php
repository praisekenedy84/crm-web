<?php

namespace App\Services;

use App\Enums\LeadStatus;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
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
}

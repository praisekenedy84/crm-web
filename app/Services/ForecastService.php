<?php

namespace App\Services;

use App\Models\Deal;
use Illuminate\Support\Facades\DB;

class ForecastService
{
    public function summary(): array
    {
        $deals = Deal::with('stage')
            ->where('status', 'open')
            ->whereNotNull('expected_close_date')
            ->get();

        $monthly = $deals->groupBy(fn ($d) => $d->expected_close_date->format('Y-m'))
            ->map(function ($group, $month) {
                return [
                    'month' => $month,
                    'deal_count' => $group->count(),
                    'total_value' => $group->sum('value'),
                    'weighted_value' => $group->sum(fn ($d) => $d->weighted_value),
                ];
            })
            ->sortKeys()
            ->values();

        $byRep = Deal::where('deals.status', 'open')
            ->join('users', 'users.id', '=', 'deals.owner_id')
            ->select(
                'users.name',
                DB::raw('count(*) as deals'),
                DB::raw('sum(deals.value) as total'),
                DB::raw('sum(deals.value * COALESCE(deals.probability, 0) / 100) as weighted'),
            )
            ->groupBy('users.name')
            ->get();

        return [
            'monthly' => $monthly,
            'by_rep' => $byRep,
            'totals' => [
                'pipeline' => $deals->sum('value'),
                'weighted' => $deals->sum(fn ($d) => $d->weighted_value),
                'deal_count' => $deals->count(),
            ],
        ];
    }
}

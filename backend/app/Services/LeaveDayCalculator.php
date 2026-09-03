<?php

namespace App\Services;

use App\Models\PublicHoliday;
use Carbon\Carbon;

class LeaveDayCalculator
{
    public function calculateBusinessDays(Carbon $start, Carbon $end, ?int $tenantId = null): float
    {
        if ($end->lt($start)) {
            return 0;
        }

        $tenantId ??= TenantContext::id();
        $holidays = $this->loadHolidayDates($start, $end, $tenantId);

        $days = 0.0;
        $current = $start->copy()->startOfDay();
        $last = $end->copy()->startOfDay();

        while ($current->lte($last)) {
            if (! $current->isWeekend() && ! $this->isHoliday($current, $holidays)) {
                $days += 1;
            }

            $current->addDay();
        }

        return $days;
    }

    /**
     * @return array<string, true>
     */
    private function loadHolidayDates(Carbon $start, Carbon $end, ?int $tenantId): array
    {
        $query = PublicHoliday::query()->withoutGlobalScope('tenant');

        if ($tenantId) {
            $query->where(function ($q) use ($tenantId): void {
                $q->where('tenant_id', $tenantId)
                    ->orWhereNull('tenant_id');
            });
        } else {
            $query->whereNull('tenant_id');
        }

        $holidays = [];
        $years = range($start->year, $end->year);

        foreach ($query->get() as $holiday) {
            if ($holiday->is_recurring_annually) {
                foreach ($years as $year) {
                    $date = Carbon::create($year, $holiday->date->month, $holiday->date->day);
                    if ($date->betweenIncluded($start->copy()->startOfDay(), $end->copy()->startOfDay())) {
                        $holidays[$date->toDateString()] = true;
                    }
                }
            } elseif ($holiday->date->betweenIncluded($start->copy()->startOfDay(), $end->copy()->startOfDay())) {
                $holidays[$holiday->date->toDateString()] = true;
            }
        }

        return $holidays;
    }

    /**
     * @param  array<string, true>  $holidays
     */
    private function isHoliday(Carbon $date, array $holidays): bool
    {
        return isset($holidays[$date->toDateString()]);
    }
}

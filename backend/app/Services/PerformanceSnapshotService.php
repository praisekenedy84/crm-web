<?php

namespace App\Services;

use App\Enums\ActivityType;
use App\Enums\LeaveRequestStatus;
use App\Models\Activity;
use App\Models\Employee;
use App\Models\Expense;
use App\Models\Lead;
use App\Models\LeaveRequest;
use App\Models\Party;
use App\Models\PerformanceSnapshot;
use Carbon\Carbon;

class PerformanceSnapshotService
{
    public function generateForEmployee(Party $employee, Carbon $start, Carbon $end): PerformanceSnapshot
    {
        $employeeRecord = Employee::query()
            ->where('party_id', $employee->id)
            ->first();

        $userId = $employeeRecord?->user_id;

        $visitsLogged = 0;
        $leadsCreated = 0;
        $expensesSubmitted = 0;
        $expensesTotal = 0.0;

        if ($userId) {
            $visitsLogged = Activity::query()
                ->where('type', ActivityType::FieldVisit)
                ->where('owner_id', $userId)
                ->whereBetween('occurred_at', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
                ->count();

            $leadsCreated = Lead::query()
                ->where('owner_id', $userId)
                ->whereBetween('created_at', [$start->copy()->startOfDay(), $end->copy()->endOfDay()])
                ->count();

            $expenseQuery = Expense::query()
                ->where('submitted_by', $userId)
                ->whereBetween('expensed_at', [$start->toDateString(), $end->toDateString()]);

            $expensesSubmitted = (clone $expenseQuery)->count();
            $expensesTotal = (float) (clone $expenseQuery)->sum('amount');
        }

        $leaveDaysTaken = (float) LeaveRequest::query()
            ->where('employee_party_id', $employee->id)
            ->where('status', LeaveRequestStatus::Approved)
            ->where('start_date', '<=', $end->toDateString())
            ->where('end_date', '>=', $start->toDateString())
            ->sum('days_requested');

        return PerformanceSnapshot::create([
            'employee_party_id' => $employee->id,
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'metrics' => [
                'visits_logged' => $visitsLogged,
                'leads_created' => $leadsCreated,
                'leave_days_taken' => $leaveDaysTaken,
                'expenses_submitted' => $expensesSubmitted,
                'expenses_total' => $expensesTotal,
            ],
            'generated_at' => now(),
        ]);
    }
}

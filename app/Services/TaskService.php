<?php

namespace App\Services;

use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class TaskService
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function paginate(?string $status = null, ?int $assigneeId = null, int $perPage = 20)
    {
        $query = $this->scopedQuery()->with('assignee')->latest();

        if ($status) {
            $query->where('status', $status);
        }

        if ($assigneeId) {
            $query->where('assignee_id', $assigneeId);
        }

        return $query->paginate($perPage)->withQueryString();
    }

    public function planner(?string $date = null, string $scope = 'day'): array
    {
        $day = Carbon::parse($date ?: now()->toDateString())->startOfDay();
        $scope = in_array($scope, ['day', 'undated', 'overdue'], true) ? $scope : 'day';

        $monthStart = $day->copy()->startOfMonth();
        $monthEnd = $day->copy()->endOfMonth();
        $today = now()->toDateString();
        $nowTime = now()->format('H:i:s');

        $calendarRows = $this->scopedQuery()
            ->whereBetween('due_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get(['id', 'due_date', 'status']);

        $days = $calendarRows
            ->groupBy(fn (Task $task) => $task->due_date?->format('Y-m-d'))
            ->map(fn (Collection $group) => [
                'total' => $group->count(),
                'open' => $group->where('status', 'open')->count(),
                'completed' => $group->where('status', 'completed')->count(),
            ]);

        $tasksQuery = $this->scopedQuery()->with('assignee');

        match ($scope) {
            'undated' => $this->applyUndatedScope($tasksQuery)
                ->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
                ->latest('id'),
            'overdue' => $this->applyOverdueScope($tasksQuery, $today, $nowTime)
                ->orderBy('due_date')
                ->orderByRaw('due_time nulls last')
                ->orderBy('id'),
            default => $tasksQuery
                ->whereDate('due_date', $day->toDateString())
                ->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
                ->orderByRaw('due_time nulls last')
                ->orderByRaw("CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END")
                ->latest('id'),
        };

        return [
            'tasks' => $tasksQuery->get(),
            'filters' => [
                'date' => $day->toDateString(),
                'scope' => $scope,
            ],
            'calendar' => [
                'month' => $day->format('Y-m'),
                'days' => $days->toArray(),
                'undated_count' => $this->applyUndatedScope($this->scopedQuery())->count(),
                'overdue_count' => $this->applyOverdueScope($this->scopedQuery(), $today, $nowTime)->count(),
            ],
        ];
    }

    public function store(array $data, int $defaultAssigneeId): Task
    {
        $data = $this->normalizeDueFields($data);
        $data['assignee_id'] ??= $defaultAssigneeId;
        $data['priority'] ??= 'medium';
        $data['status'] ??= 'open';

        $task = Task::create($data);
        AuditService::log('created', $task);

        return $task->load('assignee');
    }

    public function update(Task $task, array $data): Task
    {
        $data = $this->normalizeDueFields($data);

        if (($data['status'] ?? null) === 'completed' && $task->status !== 'completed') {
            $data['completed_at'] = now();
        }

        if (($data['status'] ?? null) === 'open' && $task->status !== 'open') {
            $data['completed_at'] = null;
        }

        $task->update($data);
        AuditService::log('updated', $task, $data);

        return $task->load('assignee');
    }

    public function destroy(Task $task): void
    {
        AuditService::log('deleted', $task);
        $task->delete();
    }

    /**
     * Open tasks with no due date.
     */
    private function applyUndatedScope(Builder $query): Builder
    {
        return $query
            ->whereNull('due_date')
            ->where('status', 'open');
    }

    /**
     * Open tasks past their due date, or past due time on today.
     */
    private function applyOverdueScope(Builder $query, string $today, string $nowTime): Builder
    {
        return $query
            ->where('status', 'open')
            ->whereNotNull('due_date')
            ->where(function (Builder $builder) use ($today, $nowTime) {
                $builder
                    ->whereDate('due_date', '<', $today)
                    ->orWhere(function (Builder $sameDay) use ($today, $nowTime) {
                        $sameDay
                            ->whereDate('due_date', '=', $today)
                            ->whereNotNull('due_time')
                            ->where('due_time', '<', $nowTime);
                    });
            });
    }

    private function normalizeDueFields(array $data): array
    {
        if (array_key_exists('due_date', $data)) {
            $data['due_date'] = ($data['due_date'] === null || $data['due_date'] === '')
                ? null
                : $data['due_date'];

            if ($data['due_date'] === null) {
                $data['due_time'] = null;
            }
        }

        if (array_key_exists('due_time', $data)) {
            $data['due_time'] = ($data['due_time'] === null || $data['due_time'] === '')
                ? null
                : $data['due_time'];
        }

        return $data;
    }

    private function scopedQuery(): Builder
    {
        $query = Task::query();

        if ($user = Auth::user()) {
            $this->permissions->applyOwnerScope($query, $user, 'tasks', 'assignee_id');
        }

        return $query;
    }
}

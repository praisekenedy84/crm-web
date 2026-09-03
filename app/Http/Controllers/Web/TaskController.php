<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    use Flashes;

    public function __construct(private readonly TaskService $tasks) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Task::class);

        $date = $request->query('date');
        $scope = (string) $request->query('scope', 'day');

        $planner = $this->tasks->planner(
            is_string($date) ? $date : null,
            $scope,
        );

        return Inertia::render('TasksPage', $planner);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Task::class);
        $data = $this->validatedTask($request);

        $this->tasks->store($data, $request->user()->id);

        return $this->saved('Task created.');
    }

    public function update(Request $request, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);
        $data = $this->validatedTask($request, updating: true);

        $this->tasks->update($task, $data);

        $message = match ($data['status'] ?? null) {
            'completed' => 'Task completed.',
            'open' => 'Task reopened.',
            default => 'Task updated.',
        };

        return $this->saved($message);
    }

    public function destroy(Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);
        $this->tasks->destroy($task);

        return $this->saved('Task deleted.');
    }

    private function validatedTask(Request $request, bool $updating = false): array
    {
        $titleRules = $updating
            ? ['sometimes', 'string', 'max:255']
            : ['required', 'string', 'max:255'];

        return $request->validate([
            'title' => $titleRules,
            'due_date' => ['nullable', 'date'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'status' => ['nullable', 'in:open,completed'],
        ]);
    }
}

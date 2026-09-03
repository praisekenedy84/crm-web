<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(private readonly TaskService $tasks) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Task::class);

        return response()->json($this->tasks->paginate(
            $request->query('status'),
            $request->query('assignee_id') ? (int) $request->query('assignee_id') : null,
        ));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Task::class);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'status' => ['nullable', 'in:open,completed'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'related_type' => ['nullable', 'string'],
            'related_id' => ['nullable', 'integer'],
        ]);

        return response()->json($this->tasks->store($data, $request->user()->id), 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'status' => ['nullable', 'in:open,completed'],
            'assignee_id' => ['nullable', 'exists:users,id'],
        ]);

        return response()->json($this->tasks->update($task, $data));
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $this->tasks->destroy($task);

        return response()->json(['message' => 'Task deleted.']);
    }
}

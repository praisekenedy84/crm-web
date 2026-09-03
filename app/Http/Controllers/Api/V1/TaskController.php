<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Task::with('assignee')->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($assigneeId = $request->query('assignee_id')) {
            $query->where('assignee_id', $assigneeId);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'status' => ['nullable', 'in:open,completed'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'related_type' => ['nullable', 'string'],
            'related_id' => ['nullable', 'integer'],
        ]);

        $data['assignee_id'] ??= $request->user()->id;
        $data['priority'] ??= 'medium';
        $data['status'] ??= 'open';

        $task = Task::create($data);
        AuditService::log('created', $task);

        return response()->json($task->load('assignee'), 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'status' => ['nullable', 'in:open,completed'],
            'assignee_id' => ['nullable', 'exists:users,id'],
        ]);

        if (($data['status'] ?? null) === 'completed' && $task->status !== 'completed') {
            $data['completed_at'] = now();
        }

        $task->update($data);
        AuditService::log('updated', $task, $data);

        return response()->json($task->load('assignee'));
    }

    public function destroy(Task $task): JsonResponse
    {
        AuditService::log('deleted', $task);
        $task->delete();

        return response()->json(['message' => 'Task deleted.']);
    }
}

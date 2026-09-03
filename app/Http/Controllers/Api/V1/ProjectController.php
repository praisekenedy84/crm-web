<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\TimeEntry;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function indexProjects(Request $request): JsonResponse
    {
        $query = Project::with(['manager', 'account', 'deal'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($managerId = $request->query('manager_id')) {
            $query->where('manager_id', $managerId);
        }

        return response()->json($query->paginate(20));
    }

    public function storeProject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deal_id' => ['nullable', 'exists:deals,id'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['nullable', 'string', 'in:planning,active,on_hold,completed,cancelled'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'manager_id' => ['nullable', 'exists:users,id'],
        ]);

        $data['currency'] ??= 'TZS';
        $data['status'] ??= 'planning';
        $data['actual_cost'] = 0;

        $project = Project::create($data);
        AuditService::log('created', $project);

        return response()->json($project->load(['manager', 'account', 'deal']), 201);
    }

    public function showProject(Project $project): JsonResponse
    {
        return response()->json($project->load(['manager', 'account', 'deal', 'tasks.assignee']));
    }

    public function updateProject(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'deal_id' => ['nullable', 'exists:deals,id'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'actual_cost' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['nullable', 'string', 'in:planning,active,on_hold,completed,cancelled'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'manager_id' => ['nullable', 'exists:users,id'],
        ]);

        $before = $project->only(array_keys($data));
        $project->update($data);
        AuditService::log('updated', $project, ['before' => $before, 'after' => $data]);

        return response()->json($project->load(['manager', 'account', 'deal']));
    }

    public function destroyProject(Project $project): JsonResponse
    {
        AuditService::log('deleted', $project);
        $project->delete();

        return response()->json(['message' => 'Project deleted.']);
    }

    public function indexTasks(Request $request): JsonResponse
    {
        $query = ProjectTask::with(['project', 'assignee'])->latest();

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(20));
    }

    public function storeTask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:todo,in_progress,done,cancelled'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
        ]);

        $data['status'] ??= 'todo';

        $task = ProjectTask::create($data);
        AuditService::log('created', $task);

        return response()->json($task->load(['project', 'assignee']), 201);
    }

    public function showTask(ProjectTask $projectTask): JsonResponse
    {
        return response()->json($projectTask->load(['project', 'assignee', 'timeEntries.employee']));
    }

    public function updateTask(Request $request, ProjectTask $projectTask): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:todo,in_progress,done,cancelled'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
        ]);

        $before = $projectTask->only(array_keys($data));
        $projectTask->update($data);
        AuditService::log('updated', $projectTask, ['before' => $before, 'after' => $data]);

        return response()->json($projectTask->load(['project', 'assignee']));
    }

    public function destroyTask(ProjectTask $projectTask): JsonResponse
    {
        AuditService::log('deleted', $projectTask);
        $projectTask->delete();

        return response()->json(['message' => 'Project task deleted.']);
    }

    public function indexTimeEntries(Request $request): JsonResponse
    {
        $query = TimeEntry::with(['project', 'projectTask', 'employee.party'])->latest('entry_date');

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($employeeId = $request->query('employee_id')) {
            $query->where('employee_id', $employeeId);
        }

        return response()->json($query->paginate(20));
    }

    public function storeTimeEntry(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'project_task_id' => ['nullable', 'exists:project_tasks,id'],
            'employee_id' => ['required', 'exists:employees,id'],
            'entry_date' => ['required', 'date'],
            'hours' => ['required', 'numeric', 'min:0.01', 'max:24'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $entry = TimeEntry::create($data);
        AuditService::log('created', $entry);

        return response()->json($entry->load(['project', 'projectTask', 'employee.party']), 201);
    }

    public function showTimeEntry(TimeEntry $timeEntry): JsonResponse
    {
        return response()->json($timeEntry->load(['project', 'projectTask', 'employee.party']));
    }

    public function updateTimeEntry(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        $data = $request->validate([
            'project_task_id' => ['nullable', 'exists:project_tasks,id'],
            'entry_date' => ['sometimes', 'date'],
            'hours' => ['sometimes', 'numeric', 'min:0.01', 'max:24'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $before = $timeEntry->only(array_keys($data));
        $timeEntry->update($data);
        AuditService::log('updated', $timeEntry, ['before' => $before, 'after' => $data]);

        return response()->json($timeEntry->load(['project', 'projectTask', 'employee.party']));
    }

    public function destroyTimeEntry(TimeEntry $timeEntry): JsonResponse
    {
        AuditService::log('deleted', $timeEntry);
        $timeEntry->delete();

        return response()->json(['message' => 'Time entry deleted.']);
    }
}

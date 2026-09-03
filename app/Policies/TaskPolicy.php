<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use App\Services\PermissionService;

class TaskPolicy
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function viewAny(User $user): bool
    {
        return $this->permissions->viewScope($user, 'tasks') !== null;
    }

    public function view(User $user, Task $task): bool
    {
        return $this->permissions->canAccessOwned($user, 'tasks', 'view', $task->assignee_id);
    }

    public function create(User $user): bool
    {
        return $user->can('tasks.create');
    }

    public function update(User $user, Task $task): bool
    {
        return $this->permissions->canAccessOwned($user, 'tasks', 'update', $task->assignee_id);
    }

    public function delete(User $user, Task $task): bool
    {
        return $this->permissions->canAccessOwned($user, 'tasks', 'delete', $task->assignee_id);
    }
}

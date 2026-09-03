<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\User;
use App\Services\PermissionService;

class DealPolicy
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function viewAny(User $user): bool
    {
        return $this->permissions->viewScope($user, 'deals') !== null;
    }

    public function view(User $user, Deal $deal): bool
    {
        return $this->permissions->canAccessOwned($user, 'deals', 'view', $deal->owner_id);
    }

    public function create(User $user): bool
    {
        return $user->can('deals.create');
    }

    public function update(User $user, Deal $deal): bool
    {
        return $this->permissions->canAccessOwned($user, 'deals', 'update', $deal->owner_id);
    }

    public function delete(User $user, Deal $deal): bool
    {
        return $this->permissions->canAccessOwned($user, 'deals', 'delete', $deal->owner_id);
    }

    public function moveStage(User $user, Deal $deal): bool
    {
        return $user->can('deals.move_stage')
            && $this->permissions->canAccessOwned($user, 'deals', 'view', $deal->owner_id);
    }
}

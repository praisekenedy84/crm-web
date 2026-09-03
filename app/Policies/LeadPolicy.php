<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use App\Services\PermissionService;

class LeadPolicy
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function viewAny(User $user): bool
    {
        return $this->permissions->viewScope($user, 'leads') !== null;
    }

    public function view(User $user, Lead $lead): bool
    {
        return $this->permissions->canAccessOwned($user, 'leads', 'view', $lead->owner_id);
    }

    public function create(User $user): bool
    {
        return $user->can('leads.create');
    }

    public function update(User $user, Lead $lead): bool
    {
        return $this->permissions->canAccessOwned($user, 'leads', 'update', $lead->owner_id);
    }

    public function delete(User $user, Lead $lead): bool
    {
        return $this->permissions->canAccessOwned($user, 'leads', 'delete', $lead->owner_id);
    }

    public function convert(User $user, Lead $lead): bool
    {
        return $user->can('leads.convert')
            && $this->permissions->canAccessOwned($user, 'leads', 'view', $lead->owner_id);
    }
}

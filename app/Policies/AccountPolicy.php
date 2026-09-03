<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\User;
use App\Services\PermissionService;

class AccountPolicy
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function viewAny(User $user): bool
    {
        return $this->permissions->viewScope($user, 'accounts') !== null;
    }

    public function view(User $user, Account $account): bool
    {
        return $this->permissions->canAccessOwned($user, 'accounts', 'view', $account->owner_id);
    }

    public function create(User $user): bool
    {
        return $user->can('accounts.create');
    }

    public function update(User $user, Account $account): bool
    {
        return $this->permissions->canAccessOwned($user, 'accounts', 'update', $account->owner_id);
    }

    public function delete(User $user, Account $account): bool
    {
        return $this->permissions->canAccessOwned($user, 'accounts', 'delete', $account->owner_id);
    }
}

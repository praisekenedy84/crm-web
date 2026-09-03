<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;
use App\Services\PermissionService;

class ContactPolicy
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function viewAny(User $user): bool
    {
        return $this->permissions->viewScope($user, 'contacts') !== null;
    }

    public function view(User $user, Contact $contact): bool
    {
        return $this->permissions->canAccessOwned($user, 'contacts', 'view', $contact->owner_id);
    }

    public function create(User $user): bool
    {
        return $user->can('contacts.create');
    }

    public function update(User $user, Contact $contact): bool
    {
        return $this->permissions->canAccessOwned($user, 'contacts', 'update', $contact->owner_id);
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $this->permissions->canAccessOwned($user, 'contacts', 'delete', $contact->owner_id);
    }
}

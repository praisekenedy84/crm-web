<?php

namespace App\Services;

use App\Models\Account;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class AccountService
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function paginate(?string $search = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = Account::with(['owner', 'area.parent.parent.parent'])->latest();

        if ($user = Auth::user()) {
            $this->permissions->applyOwnerScope($query, $user, 'accounts');
        }

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->paginate($perPage)->withQueryString();
    }

    public function lookup()
    {
        $query = Account::with(['area.parent.parent.parent'])->orderBy('name');

        if ($user = Auth::user()) {
            $this->permissions->applyOwnerScope($query, $user, 'accounts');
        }

        return $query->get();
    }

    public function store(array $data): Account
    {
        $data['owner_id'] ??= Auth::id();
        $account = Account::create($data);
        AuditService::log('created', $account);

        return $account->load(['owner', 'area.parent.parent.parent']);
    }

    public function update(Account $account, array $data): Account
    {
        $before = $account->only(array_keys($data));
        $account->update($data);
        AuditService::log('updated', $account, ['before' => $before, 'after' => $data]);

        return $account->load(['owner', 'area.parent.parent.parent']);
    }

    public function destroy(Account $account): void
    {
        AuditService::log('deleted', $account);
        $account->delete();
    }
}

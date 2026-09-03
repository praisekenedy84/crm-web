<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\AccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function __construct(private readonly AccountService $accounts) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Account::class);

        return response()->json($this->accounts->paginate($request->query('search')));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Account::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'area_id' => ['nullable', 'exists:areas,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'tags' => ['nullable', 'array'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        return response()->json($this->accounts->store($data), 201);
    }

    public function show(Account $account): JsonResponse
    {
        $this->authorize('view', $account);

        return response()->json($account->load(['owner', 'area.parent.parent.parent', 'contacts.area', 'deals.stage']));
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        $this->authorize('update', $account);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'area_id' => ['nullable', 'exists:areas,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'tags' => ['nullable', 'array'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        return response()->json($this->accounts->update($account, $data));
    }

    public function destroy(Account $account): JsonResponse
    {
        $this->authorize('delete', $account);

        $this->accounts->destroy($account);

        return response()->json(['message' => 'Account deleted.']);
    }
}

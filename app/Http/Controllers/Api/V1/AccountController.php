<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Account::with(['owner', 'area.parent.parent.parent'])->latest();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
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

        $account = Account::create($data);
        AuditService::log('created', $account);

        return response()->json($account->load(['owner', 'area.parent.parent.parent']), 201);
    }

    public function show(Account $account): JsonResponse
    {
        return response()->json($account->load(['owner', 'area.parent.parent.parent', 'contacts.area', 'deals.stage']));
    }

    public function update(Request $request, Account $account): JsonResponse
    {
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

        $before = $account->only(array_keys($data));
        $account->update($data);
        AuditService::log('updated', $account, ['before' => $before, 'after' => $data]);

        return response()->json($account->load(['owner', 'area.parent.parent.parent']));
    }

    public function destroy(Account $account): JsonResponse
    {
        AuditService::log('deleted', $account);
        $account->delete();

        return response()->json(['message' => 'Account deleted.']);
    }
}

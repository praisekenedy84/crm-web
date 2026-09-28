<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->where('is_platform_admin', false)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'status', 'last_login_at']);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->where(fn ($q) => $q->where('tenant_id', $tenantId)),
            ],
            'password' => ['required', Password::min(8)->mixedCase()->numbers()],
            'role' => ['required', Rule::enum(UserRole::class)],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'tenant_id' => $tenantId,
            'status' => 'active',
            'role' => $data['role'],
            'is_platform_admin' => false,
        ]);

        $user->syncPrimaryRole($data['role']);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->assertSameTenant($request, $user);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->where(fn ($q) => $q->where('tenant_id', $request->user()->tenant_id))
                    ->ignore($user->id),
            ],
            'role' => ['sometimes', Rule::enum(UserRole::class)],
            'status' => ['sometimes', 'in:active,inactive'],
            'password' => ['nullable', Password::min(8)->mixedCase()->numbers()],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $role = $data['role'] ?? null;
        unset($data['role']);

        if ($data !== []) {
            $user->update($data);
        }

        if ($role !== null) {
            $user->syncPrimaryRole($role);
        }

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->assertSameTenant($request, $user);

        if ($user->id === $request->user()->id) {
            return response()->json(['error' => ['message' => 'Cannot delete yourself.']], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    private function assertSameTenant(Request $request, User $user): void
    {
        abort_if($user->is_platform_admin, 404);
        abort_unless((int) $user->tenant_id === (int) $request->user()->tenant_id, 404);
    }
}

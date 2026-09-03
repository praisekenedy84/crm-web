<?php

namespace App\Http\Controllers\Web;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\User;
use App\Services\PermissionService;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    use Flashes;

    public function __construct(private readonly PermissionService $permissions) {}

    public function index(): Response
    {
        $users = User::orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'status', 'last_login_at'])
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role?->value ?? $user->role,
                    'status' => $user->status,
                    'last_login_at' => $user->last_login_at,
                    'direct_permissions' => $this->permissions->directAbilitiesFor($user),
                ];
            });

        return Inertia::render('AdminUsersPage', [
            'users' => $users,
            'permissionGroups' => PermissionCatalog::groups(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', Password::min(8)->mixedCase()->numbers()],
            'role' => ['required', Rule::enum(UserRole::class)],
            'direct_permissions' => ['sometimes', 'array'],
            'direct_permissions.*' => ['string', Rule::in(PermissionCatalog::all())],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'tenant_id' => $request->user()->tenant_id,
            'status' => 'active',
            'role' => $data['role'],
        ]);

        $user->syncPrimaryRole($data['role']);
        $user->syncPermissions($data['direct_permissions'] ?? []);

        return $this->saved('User created.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255'],
            'role' => ['sometimes', Rule::enum(UserRole::class)],
            'status' => ['sometimes', 'in:active,inactive'],
            'password' => ['nullable', Password::min(8)->mixedCase()->numbers()],
            'direct_permissions' => ['sometimes', 'array'],
            'direct_permissions.*' => ['string', Rule::in(PermissionCatalog::all())],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $role = $data['role'] ?? null;
        $direct = array_key_exists('direct_permissions', $data) ? $data['direct_permissions'] : null;
        unset($data['role'], $data['direct_permissions']);

        if ($data !== []) {
            $user->update($data);
        }

        if ($role !== null) {
            $user->syncPrimaryRole($role);
        }

        if ($direct !== null) {
            $user->syncPermissions($direct);
        }

        return $this->saved('User updated.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return $this->failed('Cannot delete yourself.');
        }

        $user->delete();

        return $this->saved('User deleted.');
    }
}

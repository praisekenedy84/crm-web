<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Support\PermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    use Flashes;

    public function index(): Response
    {
        $roles = Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', array_keys(PermissionCatalog::roleDefaults()))
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values()->all(),
            ]);

        return Inertia::render('RolesPage', [
            'roles' => $roles,
            'permissionGroups' => PermissionCatalog::groups(),
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_unless(
            in_array($role->name, array_keys(PermissionCatalog::roleDefaults()), true),
            404
        );

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in(PermissionCatalog::all())],
        ]);

        $role->syncPermissions($data['permissions']);

        return $this->saved('Role permissions updated.');
    }
}

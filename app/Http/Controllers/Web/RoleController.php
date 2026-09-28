<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Services\TenantContext;
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
        $tenant = TenantContext::get();
        $enabled = $tenant?->enabled_modules ?? ['crm'];
        $allowed = PermissionCatalog::permissionsForModules($enabled);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->where('team_id', $tenant?->id)
            ->whereIn('name', array_keys(PermissionCatalog::roleDefaults()))
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions
                    ->pluck('name')
                    ->filter(fn (string $name) => in_array($name, $allowed, true))
                    ->values()
                    ->all(),
            ]);

        return Inertia::render('RolesPage', [
            'roles' => $roles,
            'permissionGroups' => PermissionCatalog::groupsForModules($enabled),
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $tenant = TenantContext::get();
        abort_unless($tenant && (int) $role->team_id === (int) $tenant->id, 404);
        abort_unless(
            in_array($role->name, array_keys(PermissionCatalog::roleDefaults()), true),
            404
        );

        $allowed = PermissionCatalog::permissionsForModules($tenant->enabled_modules ?? ['crm']);

        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in($allowed)],
        ]);

        // Keep permissions for disabled modules so re-enabling a module restores them.
        $retained = $role->permissions
            ->pluck('name')
            ->reject(fn (string $name) => in_array($name, $allowed, true))
            ->values()
            ->all();

        $role->syncPermissions(array_values(array_unique(array_merge($retained, $data['permissions']))));

        return $this->saved('Role permissions updated.');
    }
}

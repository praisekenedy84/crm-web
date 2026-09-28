<?php

namespace App\Services;

use App\Support\PermissionCatalog;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class TenantProvisioningService
{
    /**
     * Ensure permissions exist and seed default roles for a tenant team.
     */
    public function provisionRoles(int $tenantId): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionCatalog::all() as $name) {
            Permission::findOrCreate($name, 'web');
        }

        setPermissionsTeamId($tenantId);

        foreach (PermissionCatalog::roleDefaults() as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->syncPermissions($permissions);
        }

        setPermissionsTeamId(null);
    }
}

<?php

namespace Database\Seeders;

use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (PermissionCatalog::all() as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach (array_keys(PermissionCatalog::roleDefaults()) as $roleName) {
            Role::findOrCreate($roleName, 'web');
        }

        foreach (PermissionCatalog::roleDefaults() as $roleName => $permissions) {
            $role = Role::findByName($roleName, 'web');
            $role->syncPermissions($permissions);
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (PermissionCatalog::all() as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $provisioning = app(TenantProvisioningService::class);

        Tenant::query()->each(function (Tenant $tenant) use ($provisioning) {
            $provisioning->provisionRoles($tenant->id);
        });

        User::query()->firstOrCreate(
            ['email' => 'platform@northstar.com', 'tenant_id' => null],
            [
                'name' => 'Platform Admin',
                'password' => Hash::make('Password1'),
                'role' => 'admin',
                'status' => 'active',
                'is_platform_admin' => true,
            ],
        );
    }
}

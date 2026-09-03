<?php

namespace Tests\Concerns;

use Database\Seeders\PermissionSeeder;
use Spatie\Permission\PermissionRegistrar;

trait SeedsPermissions
{
    protected function seedPermissions(): void
    {
        $this->seed(PermissionSeeder::class);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}

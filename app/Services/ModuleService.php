<?php

namespace App\Services;

use Symfony\Component\HttpKernel\Exception\HttpException;

class ModuleService
{
    public function isEnabled(string $module): bool
    {
        $tenant = TenantContext::get();

        if (! $tenant) {
            return false;
        }

        return $tenant->hasModule($module);
    }

    public function requireModule(string $module): void
    {
        if (! $this->isEnabled($module)) {
            throw new HttpException(403, "Module [{$module}] is not enabled for this tenant.");
        }
    }
}

<?php

namespace App\Http\Middleware;

use App\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class SetTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->tenant) {
            TenantContext::set($user->tenant);
            setPermissionsTeamId($user->tenant_id);
        } else {
            setPermissionsTeamId(null);
        }

        try {
            return $next($request);
        } finally {
            TenantContext::clear();
            app(PermissionRegistrar::class)->setPermissionsTeamId(null);
        }
    }
}

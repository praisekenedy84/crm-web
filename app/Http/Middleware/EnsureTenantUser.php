<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if ($user->is_platform_admin) {
            return redirect()->route('platform.tenants.index');
        }

        if (! $user->tenant_id) {
            abort(403, 'Tenant membership required.');
        }

        return $next($request);
    }
}

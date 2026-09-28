<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        // Leaving impersonation is allowed while acting as a tenant user.
        if ($request->routeIs('platform.impersonation.leave')) {
            return $next($request);
        }

        if (! $user->is_platform_admin) {
            abort(403, 'Platform admin access required.');
        }

        return $next($request);
    }
}

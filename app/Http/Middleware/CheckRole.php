<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /** @param  UserRole[]  $roles */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['error' => ['code' => 'UNAUTHORIZED', 'message' => 'Authentication required.']], 401);
            }

            return redirect()->route('login');
        }

        $allowed = array_map(fn (string $r) => UserRole::from($r), $roles);

        if (! in_array($user->role, $allowed, true)) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['error' => ['code' => 'FORBIDDEN', 'message' => 'Insufficient permissions.']], 403);
            }

            abort(403);
        }

        return $next($request);
    }
}

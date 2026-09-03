<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use App\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()) {
            return $next($request);
        }

        $key = $request->header('X-Api-Key') ?? $request->query('api_key');

        if (! $key || ! str_contains($key, '.')) {
            return $next($request);
        }

        [$prefix, $secret] = explode('.', $key, 2);
        $apiKey = ApiKey::where('key_prefix', $prefix)->first();

        if (! $apiKey || ! hash_equals($apiKey->key_hash, hash('sha256', $secret))) {
            return response()->json(['error' => ['code' => 'INVALID_API_KEY', 'message' => 'Invalid API key.']], 401);
        }

        $apiKey->update(['last_used_at' => now()]);
        Auth::login($apiKey->tenant->users()->where('role', 'admin')->first());
        TenantContext::set($apiKey->tenant);

        return $next($request);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OAuthIdentity;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class SsoController extends Controller
{
    public function redirect(Request $request): JsonResponse
    {
        $request->validate(['provider' => ['required', 'in:google,microsoft']]);

        // In production, redirect to OAuth provider. Return auth URL for SPA.
        $state = Str::random(40);
        session(['oauth_state' => $state]);

        $urls = [
            'google' => 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
                'client_id' => config('services.google.client_id', 'demo'),
                'redirect_uri' => config('app.url').'/api/v1/auth/sso/google/callback',
                'response_type' => 'code',
                'scope' => 'openid email profile',
                'state' => $state,
            ]),
            'microsoft' => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?'.http_build_query([
                'client_id' => config('services.microsoft.client_id', 'demo'),
                'redirect_uri' => config('app.url').'/api/v1/auth/sso/microsoft/callback',
                'response_type' => 'code',
                'scope' => 'openid email profile',
                'state' => $state,
            ]),
        ];

        return response()->json(['url' => $urls[$request->provider]]);
    }

    public function callback(Request $request, string $provider): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string'],
            'email' => ['required', 'email'],
            'provider_id' => ['required', 'string'],
            'name' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json(['error' => ['message' => 'No CRM account found for this email.']], 404);
        }

        OAuthIdentity::updateOrCreate(
            ['provider' => $provider, 'provider_id' => $request->provider_id],
            ['user_id' => $user->id, 'access_token' => $request->code]
        );

        TenantContext::set($user->tenant);
        $token = $user->createToken('sso')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user->load('tenant')]);
    }
}

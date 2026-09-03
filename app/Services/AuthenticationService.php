<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Shared credential handling.
 *
 * Both the token API (Api\V1\AuthController) and session login
 * (Web\AuthenticatedSessionController) resolve credentials through here so the
 * lockout rules and the user payload stay identical across the two entry points.
 */
class AuthenticationService
{
    public const MAX_ATTEMPTS = 5;

    public const LOCKOUT_MINUTES = 15;

    /**
     * Resolve the active user for the given credentials, applying lockout rules.
     *
     * @throws ValidationException when the credentials are invalid or the account is locked.
     */
    public function attempt(string $email, string $password): User
    {
        $user = User::with('tenant')
            ->where('email', $email)
            ->where('status', 'active')
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            if ($user) {
                $user->increment('failed_login_attempts');

                if ($user->failed_login_attempts >= self::MAX_ATTEMPTS) {
                    $user->update(['locked_until' => now()->addMinutes(self::LOCKOUT_MINUTES)]);
                }
            }

            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'email' => ['Account is temporarily locked. Try again later.'],
            ]);
        }

        $user->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
        ]);

        TenantContext::set($user->tenant);

        return $user;
    }

    /**
     * The user payload exposed to clients, as JSON from the API and as an
     * Inertia shared prop from the web routes.
     */
    public function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role->value,
            'tenant' => $user->tenant ? [
                'id' => $user->tenant->id,
                'name' => $user->tenant->name,
                'slug' => $user->tenant->slug,
                'default_currency' => $user->tenant->default_currency,
                'enabled_modules' => $user->tenant->enabled_modules ?? ['crm'],
            ] : null,
        ];
    }
}

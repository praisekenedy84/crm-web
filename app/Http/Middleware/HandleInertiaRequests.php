<?php

namespace App\Http\Middleware;

use App\Services\AuthenticationService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function __construct(private readonly AuthenticationService $auth) {}

    /**
     * Props shared with every Inertia response.
     *
     * `auth.user` is built by the same formatter the token API uses, so pages
     * migrated from the SPA receive exactly the payload they already expect.
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),

            'auth' => [
                'user' => $user
                    ? $this->auth->formatUser($user->loadMissing('tenant'))
                    : null,
            ],

            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}

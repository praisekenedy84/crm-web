<?php

namespace App\Http\Middleware;

use App\Models\Area;
use App\Services\AuthenticationService;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function __construct(
        private readonly AuthenticationService $auth,
        private readonly PermissionService $permissions,
    ) {}

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
                'permissions' => $user ? $this->permissions->abilitiesFor($user) : [],
                'scopes' => $user ? $this->permissions->scopesFor($user) : [],
            ],

            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],

            // Flat area list for AreaPicker / territory UI - lazy so login never hits the table.
            'areas' => fn () => $user
                ? Area::query()->orderBy('name')->get(['id', 'name', 'level', 'parent_area_id'])
                : [],
        ];
    }
}

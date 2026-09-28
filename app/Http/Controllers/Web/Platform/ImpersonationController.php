<?php

namespace App\Http\Controllers\Web\Platform;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ImpersonationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ImpersonationController extends Controller
{
    use Flashes;

    public function __construct(
        private readonly ImpersonationService $impersonation,
    ) {}

    public function start(Request $request, Tenant $tenant, User $user): RedirectResponse
    {
        abort_unless((int) $user->tenant_id === (int) $tenant->id, 404);
        abort_if($user->is_platform_admin, 404);

        $this->impersonation->start($request, $request->user(), $user);

        return redirect()
            ->route('dashboard')
            ->with('success', "Now viewing as {$user->name}.");
    }

    /**
     * Enter the tenant workspace as its primary admin (or first active user).
     */
    public function enter(Request $request, Tenant $tenant): RedirectResponse
    {
        $target = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_platform_admin', false)
            ->where('status', 'active')
            ->orderByRaw("case when role = ? then 0 else 1 end", [UserRole::Admin->value])
            ->orderBy('id')
            ->first();

        if (! $target) {
            return $this->failed('This tenant has no active users to enter as.');
        }

        $this->impersonation->start($request, $request->user(), $target);

        return redirect()
            ->route('dashboard')
            ->with('success', "God-eye: entered {$tenant->name} as {$target->name}.");
    }

    public function leave(Request $request): RedirectResponse
    {
        $this->impersonation->stop($request);

        return redirect()
            ->route('platform.god-eye')
            ->with('success', 'Returned to platform admin.');
    }
}

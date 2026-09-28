<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ImpersonationService
{
    public const SESSION_KEY = 'platform_impersonator_id';

    public function isImpersonating(Request $request): bool
    {
        return $request->session()->has(self::SESSION_KEY);
    }

    public function impersonatorId(Request $request): ?int
    {
        $id = $request->session()->get(self::SESSION_KEY);

        return $id !== null ? (int) $id : null;
    }

    public function impersonator(Request $request): ?User
    {
        $id = $this->impersonatorId($request);

        return $id
            ? User::query()->where('is_platform_admin', true)->find($id)
            : null;
    }

    /**
     * @return array{active: bool, impersonator?: array{id: int, name: string, email: string}, target?: array{id: int, name: string, email: string, tenant: string|null}}
     */
    public function share(Request $request): array
    {
        if (! $this->isImpersonating($request)) {
            return ['active' => false];
        }

        $impersonator = $this->impersonator($request);
        $target = $request->user();

        if (! $impersonator || ! $target) {
            return ['active' => false];
        }

        return [
            'active' => true,
            'impersonator' => [
                'id' => $impersonator->id,
                'name' => $impersonator->name,
                'email' => $impersonator->email,
            ],
            'target' => [
                'id' => $target->id,
                'name' => $target->name,
                'email' => $target->email,
                'tenant' => $target->tenant?->name,
            ],
        ];
    }

    public function start(Request $request, User $actor, User $target): void
    {
        if (! $actor->is_platform_admin) {
            throw new HttpException(403, 'Only platform admins can impersonate.');
        }

        if ($this->isImpersonating($request)) {
            throw new HttpException(422, 'Already impersonating a user. Exit first.');
        }

        if ($target->is_platform_admin || ! $target->tenant_id) {
            throw new HttpException(422, 'Cannot impersonate a platform admin.');
        }

        if ($target->status !== 'active') {
            throw new HttpException(422, 'Cannot impersonate an inactive user.');
        }

        $request->session()->put(self::SESSION_KEY, $actor->id);

        Auth::guard('web')->login($target);
        $request->session()->regenerate();

        AuditService::log('platform.impersonation.started', $target, [
            'impersonator_id' => $actor->id,
            'impersonator_email' => $actor->email,
            'target_id' => $target->id,
            'target_email' => $target->email,
            'tenant_id' => $target->tenant_id,
        ]);
    }

    public function stop(Request $request): User
    {
        $impersonatorId = $this->impersonatorId($request);
        if (! $impersonatorId) {
            throw new HttpException(422, 'Not currently impersonating.');
        }

        $target = $request->user();
        $impersonator = User::query()
            ->where('is_platform_admin', true)
            ->find($impersonatorId);

        if (! $impersonator) {
            $request->session()->forget(self::SESSION_KEY);
            throw new HttpException(422, 'Original platform admin session is no longer valid.');
        }

        $request->session()->forget(self::SESSION_KEY);

        Auth::guard('web')->login($impersonator);
        $request->session()->regenerate();

        if ($target) {
            AuditService::log('platform.impersonation.stopped', $target, [
                'impersonator_id' => $impersonator->id,
                'target_id' => $target->id,
                'tenant_id' => $target->tenant_id,
            ]);
        }

        return $impersonator;
    }

    public function clear(Request $request): void
    {
        $request->session()->forget(self::SESSION_KEY);
    }
}

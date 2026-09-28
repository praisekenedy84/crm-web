<?php

namespace App\Http\Controllers\Web\Platform;

use App\Enums\PlatformModule;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Task;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GodEyeController extends Controller
{
    public function index(): Response
    {
        $tenants = Tenant::query()
            ->withCount('users')
            ->orderBy('name')
            ->get();

        $tenantIds = $tenants->pluck('id');

        $contactCounts = $this->countsByTenant(Contact::class, $tenantIds);
        $dealCounts = $this->countsByTenant(Deal::class, $tenantIds);
        $leadCounts = $this->countsByTenant(Lead::class, $tenantIds);
        $taskCounts = $this->countsByTenant(Task::class, $tenantIds);

        $recentLogins = User::query()
            ->whereIn('tenant_id', $tenantIds)
            ->where('is_platform_admin', false)
            ->whereNotNull('last_login_at')
            ->orderByDesc('last_login_at')
            ->limit(12)
            ->get(['id', 'name', 'email', 'tenant_id', 'role', 'last_login_at'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role?->value ?? (string) $user->role,
                'tenant_id' => $user->tenant_id,
                'tenant_name' => $tenants->firstWhere('id', $user->tenant_id)?->name,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ]);

        $recentAudits = AuditLog::withoutGlobalScope('tenant')
            ->whereIn('tenant_id', $tenantIds)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'tenant_id', 'user_id', 'action', 'object_type', 'object_id', 'created_at'])
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'tenant_id' => $log->tenant_id,
                'tenant_name' => $tenants->firstWhere('id', $log->tenant_id)?->name,
                'user_id' => $log->user_id,
                'action' => $log->action,
                'object_type' => class_basename((string) $log->object_type),
                'object_id' => $log->object_id,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        $rows = $tenants->map(fn (Tenant $tenant) => [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'plan' => $tenant->plan,
            'enabled_modules' => $tenant->enabled_modules ?? [],
            'users_count' => $tenant->users_count,
            'contacts_count' => (int) ($contactCounts[$tenant->id] ?? 0),
            'leads_count' => (int) ($leadCounts[$tenant->id] ?? 0),
            'deals_count' => (int) ($dealCounts[$tenant->id] ?? 0),
            'tasks_count' => (int) ($taskCounts[$tenant->id] ?? 0),
        ]);

        return Inertia::render('Platform/GodEyePage', [
            'summary' => [
                'tenants' => $tenants->count(),
                'users' => (int) $tenants->sum('users_count'),
                'contacts' => (int) array_sum($contactCounts),
                'deals' => (int) array_sum($dealCounts),
            ],
            'tenants' => $rows,
            'recentLogins' => $recentLogins,
            'recentAudits' => $recentAudits,
            'availableModules' => array_column(PlatformModule::cases(), 'value'),
        ]);
    }

    /**
     * @param  class-string  $model
     * @param  \Illuminate\Support\Collection<int, int|string>  $tenantIds
     * @return array<int, int>
     */
    private function countsByTenant(string $model, $tenantIds): array
    {
        if ($tenantIds->isEmpty()) {
            return [];
        }

        return $model::withoutGlobalScope('tenant')
            ->select('tenant_id', DB::raw('count(*) as aggregate'))
            ->whereIn('tenant_id', $tenantIds)
            ->groupBy('tenant_id')
            ->pluck('aggregate', 'tenant_id')
            ->map(fn ($n) => (int) $n)
            ->all();
    }
}

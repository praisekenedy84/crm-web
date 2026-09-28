<?php

namespace App\Http\Controllers\Web\Platform;

use App\Enums\PlatformModule;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Task;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditService;
use App\Services\TenantProvisioningService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    use Flashes;

    public function __construct(
        private readonly TenantProvisioningService $provisioning,
    ) {}

    public function index(): Response
    {
        $tenants = Tenant::query()
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'plan' => $tenant->plan,
                'timezone' => $tenant->timezone,
                'default_currency' => $tenant->default_currency,
                'enabled_modules' => $tenant->enabled_modules ?? [],
                'users_count' => $tenant->users_count,
                'created_at' => $tenant->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Platform/TenantsPage', [
            'tenants' => $tenants,
            'availableModules' => array_column(PlatformModule::cases(), 'value'),
        ]);
    }

    public function show(Tenant $tenant): Response
    {
        $users = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_platform_admin', false)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'status', 'last_login_at'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role?->value ?? (string) $user->role,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ]);

        $audits = AuditLog::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenant->id)
            ->orderByDesc('created_at')
            ->limit(25)
            ->get(['id', 'user_id', 'action', 'object_type', 'object_id', 'created_at'])
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'user_id' => $log->user_id,
                'action' => $log->action,
                'object_type' => class_basename((string) $log->object_type),
                'object_id' => $log->object_id,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Platform/TenantDetailPage', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'plan' => $tenant->plan,
                'timezone' => $tenant->timezone,
                'default_currency' => $tenant->default_currency,
                'enabled_modules' => $tenant->enabled_modules ?? [],
                'created_at' => $tenant->created_at?->toIso8601String(),
            ],
            'stats' => [
                'users' => $users->count(),
                'contacts' => Contact::withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count(),
                'accounts' => Account::withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count(),
                'leads' => Lead::withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count(),
                'deals' => Deal::withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count(),
                'tasks' => Task::withoutGlobalScope('tenant')->where('tenant_id', $tenant->id)->count(),
            ],
            'users' => $users,
            'audits' => $audits,
            'availableModules' => array_column(PlatformModule::cases(), 'value'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'alpha_dash', 'unique:tenants,slug'],
            'plan' => ['nullable', 'string', 'max:50'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'default_currency' => ['nullable', 'string', 'size:3'],
            'enabled_modules' => ['required', 'array', 'min:1'],
            'enabled_modules.*' => ['string', Rule::enum(PlatformModule::class)],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255'],
            'admin_password' => ['required', Password::min(8)->mixedCase()->numbers()],
        ]);

        $slug = $data['slug'] ?: Str::slug($data['name']);
        if (Tenant::query()->where('slug', $slug)->exists()) {
            $slug .= '-'.Str::lower(Str::random(4));
        }

        DB::transaction(function () use ($data, $slug) {
            $tenant = Tenant::query()->create([
                'name' => $data['name'],
                'slug' => $slug,
                'plan' => $data['plan'] ?? 'standard',
                'timezone' => $data['timezone'] ?? 'UTC',
                'default_currency' => strtoupper($data['default_currency'] ?? 'TZS'),
                'enabled_modules' => array_values(array_unique($data['enabled_modules'])),
            ]);

            $this->provisioning->provisionRoles($tenant->id);

            setPermissionsTeamId($tenant->id);

            $admin = User::query()->create([
                'tenant_id' => $tenant->id,
                'name' => $data['admin_name'],
                'email' => $data['admin_email'],
                'password' => Hash::make($data['admin_password']),
                'role' => UserRole::Admin,
                'status' => 'active',
                'is_platform_admin' => false,
            ]);
            $admin->syncPrimaryRole(UserRole::Admin);

            setPermissionsTeamId(null);

            AuditService::log('platform.tenant.created', $tenant, [
                'enabled_modules' => $tenant->enabled_modules,
                'admin_email' => $admin->email,
            ]);
        });

        return $this->saved('Tenant created.');
    }

    public function updateModules(Request $request, Tenant $tenant): RedirectResponse
    {
        $data = $request->validate([
            'enabled_modules' => ['required', 'array'],
            'enabled_modules.*' => ['string', Rule::enum(PlatformModule::class)],
        ]);

        $before = $tenant->enabled_modules ?? [];
        $after = array_values(array_unique($data['enabled_modules']));

        $tenant->update(['enabled_modules' => $after]);

        AuditService::log('platform.modules.updated', $tenant, [
            'before' => $before,
            'after' => $after,
        ]);

        return $this->saved('Tenant modules updated.');
    }
}

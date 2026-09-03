<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PlatformModule;
use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ModuleController extends Controller
{
    public function index(): JsonResponse
    {
        $tenant = TenantContext::get();

        return response()->json([
            'enabled_modules' => $tenant?->enabled_modules ?? [],
            'available_modules' => array_column(PlatformModule::cases(), 'value'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled_modules' => ['required', 'array'],
            'enabled_modules.*' => ['string', Rule::enum(PlatformModule::class)],
        ]);

        $tenant = TenantContext::get();

        if (! $tenant) {
            return response()->json([
                'error' => ['code' => 'TENANT_NOT_FOUND', 'message' => 'Tenant context not available.'],
            ], 422);
        }

        $before = $tenant->enabled_modules;
        $tenant->update(['enabled_modules' => $data['enabled_modules']]);
        AuditService::log('modules.updated', $tenant, ['before' => $before, 'after' => $data['enabled_modules']]);

        return response()->json([
            'enabled_modules' => $tenant->fresh()->enabled_modules,
            'available_modules' => array_column(PlatformModule::cases(), 'value'),
        ]);
    }
}

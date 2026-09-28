<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PlatformModule;
use App\Http\Controllers\Controller;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        return response()->json([
            'error' => [
                'code' => 'PLATFORM_ONLY',
                'message' => 'Modules can only be changed by a platform admin.',
            ],
        ], 403);
    }
}

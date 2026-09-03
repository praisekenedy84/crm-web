<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\BillingCycle;
use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->latest();

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'billing_cycle' => ['required', Rule::enum(BillingCycle::class)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['is_active'] ??= true;
        $data['currency'] ??= 'TZS';

        $service = Service::create($data);
        AuditService::log('created', $service);

        return response()->json($service, 201);
    }

    public function show(Service $service): JsonResponse
    {
        return response()->json($service);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'billing_cycle' => ['sometimes', Rule::enum(BillingCycle::class)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $before = $service->only(array_keys($data));
        $service->update($data);
        AuditService::log('updated', $service, ['before' => $before, 'after' => $data]);

        return response()->json($service);
    }

    public function destroy(Service $service): JsonResponse
    {
        AuditService::log('deleted', $service);
        $service->delete();

        return response()->json(['message' => 'Service deleted.']);
    }
}

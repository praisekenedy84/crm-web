<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\AuditService;
use App\Services\AutomationEngine;
use App\Services\LeadConversionService;
use App\Services\LeadScoringService;
use App\Services\WebhookDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeadController extends Controller
{
    public function __construct(
        private LeadConversionService $conversionService,
        private LeadScoringService $scoringService,
        private AutomationEngine $automation,
        private WebhookDispatcher $webhooks,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Lead::with('owner')->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:255'],
            'campaign' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(LeadStatus::class)],
            'owner_id' => ['nullable', 'exists:users,id'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        $lead = Lead::create($data);
        $this->scoringService->scoreLead($lead);
        AuditService::log('created', $lead);
        $this->automation->dispatch('record.created', $lead);
        $this->webhooks->emit('lead.created', $lead);

        return response()->json($lead->fresh()->load('owner'), 201);
    }

    public function show(Lead $lead): JsonResponse
    {
        return response()->json($lead->load(['owner', 'convertedContact', 'convertedAccount', 'convertedDeal']));
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:255'],
            'campaign' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::enum(LeadStatus::class)],
            'owner_id' => ['nullable', 'exists:users,id'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        $lead->update($data);
        AuditService::log('updated', $lead, $data);

        return response()->json($lead->load('owner'));
    }

    public function destroy(Lead $lead): JsonResponse
    {
        AuditService::log('deleted', $lead);
        $lead->delete();

        return response()->json(['message' => 'Lead deleted.']);
    }

    public function convert(Request $request, Lead $lead): JsonResponse
    {
        $options = $request->validate([
            'create_account' => ['boolean'],
            'create_deal' => ['boolean'],
            'account_name' => ['nullable', 'string', 'max:255'],
            'deal_name' => ['nullable', 'string', 'max:255'],
            'deal_value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $result = $this->conversionService->convert($lead, $options);

        return response()->json([
            'lead' => $lead->fresh()->load(['convertedContact', 'convertedAccount', 'convertedDeal']),
            ...$result,
        ]);
    }
}

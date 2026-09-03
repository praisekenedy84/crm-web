<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Lead;
use App\Services\LeadCrmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeadController extends Controller
{
    public function __construct(private readonly LeadCrmService $leads) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lead::class);

        return response()->json($this->leads->paginate(
            $request->query('search'),
            $request->query('status'),
        ));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Lead::class);

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
            'source_contact_id' => ['nullable', 'exists:contacts,id'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        return response()->json($this->leads->store($data), 201);
    }

    public function storeFromContact(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);
        $this->authorize('create', Lead::class);

        $overrides = $request->validate([
            'source' => ['nullable', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'campaign' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(LeadStatus::class)],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        return response()->json($this->leads->storeFromContact($contact, $overrides), 201);
    }

    public function show(Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        return response()->json($lead->load(['owner', 'sourceContact', 'convertedContact', 'convertedAccount', 'convertedDeal']));
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('update', $lead);

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

        return response()->json($this->leads->update($lead, $data));
    }

    public function destroy(Lead $lead): JsonResponse
    {
        $this->authorize('delete', $lead);

        $this->leads->destroy($lead);

        return response()->json(['message' => 'Lead deleted.']);
    }

    public function convert(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('convert', $lead);

        $options = $request->validate([
            'create_account' => ['boolean'],
            'create_deal' => ['boolean'],
            'account_name' => ['nullable', 'string', 'max:255'],
            'deal_name' => ['nullable', 'string', 'max:255'],
            'deal_value' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $result = $this->leads->convert($lead, $options);

        return response()->json([
            'lead' => $lead->fresh()->load(['convertedContact', 'convertedAccount', 'convertedDeal']),
            ...$result,
        ]);
    }
}

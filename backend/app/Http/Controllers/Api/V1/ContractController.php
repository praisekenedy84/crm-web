<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ContractStatus;
use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Services\AuditService;
use App\Services\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContractController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contract::with(['party', 'service', 'contact', 'creator'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($partyId = $request->query('customer_party_id')) {
            $query->where('customer_party_id', $partyId);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request, ContractService $contractService): JsonResponse
    {
        $data = $request->validate([
            'customer_party_id' => ['required', 'exists:parties,id'],
            'service_id' => ['required', 'exists:services,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'amount_paid' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', Rule::enum(ContractStatus::class)],
            'contract_file_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $data['currency'] ??= 'TZS';

        $contract = $contractService->create($data);

        return response()->json($contract->load(['party', 'service', 'contact', 'creator']), 201);
    }

    public function show(Contract $contract): JsonResponse
    {
        return response()->json($contract->load(['party', 'service', 'contact', 'creator']));
    }

    public function update(Request $request, Contract $contract): JsonResponse
    {
        $data = $request->validate([
            'customer_party_id' => ['sometimes', 'exists:parties,id'],
            'service_id' => ['sometimes', 'exists:services,id'],
            'contact_id' => ['nullable', 'exists:contacts,id'],
            'amount_paid' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date'],
            'status' => ['sometimes', Rule::enum(ContractStatus::class)],
            'contract_file_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $before = $contract->only(array_keys($data));
        $contract->update($data);
        AuditService::log('updated', $contract, ['before' => $before, 'after' => $data]);

        return response()->json($contract->load(['party', 'service', 'contact', 'creator']));
    }

    public function destroy(Contract $contract): JsonResponse
    {
        AuditService::log('deleted', $contract);
        $contract->delete();

        return response()->json(['message' => 'Contract deleted.']);
    }
}

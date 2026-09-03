<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Contract;
use App\Models\Service;
use App\Services\AuditService;
use App\Services\ContractService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContractPageController extends Controller
{
    use Flashes;

    public function index(): Response
    {
        return Inertia::render('ContractsPage', [
            'contracts' => Contract::with(['party', 'service', 'contact', 'creator'])->latest()->paginate(20)->withQueryString(),
            'services' => Service::query()->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request, ContractService $contractService): RedirectResponse
    {
        $data = $request->validate([
            'customer_party_id' => ['required', 'exists:parties,id'],
            'service_id' => ['required', 'exists:services,id'],
            'amount_paid' => ['required', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $data['currency'] = 'TZS';
        $contractService->create($data);

        return $this->saved('Contract created.');
    }

    public function update(Request $request, Contract $contract): RedirectResponse
    {
        $data = $request->validate([
            'customer_party_id' => ['sometimes', 'exists:parties,id'],
            'service_id' => ['sometimes', 'exists:services,id'],
            'amount_paid' => ['sometimes', 'numeric', 'min:0'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date'],
        ]);

        $before = $contract->only(array_keys($data));
        $contract->update($data);
        AuditService::log('updated', $contract, ['before' => $before, 'after' => $data]);

        return $this->saved('Contract updated.');
    }

    public function destroy(Contract $contract): RedirectResponse
    {
        AuditService::log('deleted', $contract);
        $contract->delete();

        return $this->saved('Contract deleted.');
    }
}

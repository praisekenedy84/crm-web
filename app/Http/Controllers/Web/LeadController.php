<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Lead;
use App\Services\ContactService;
use App\Services\LeadCrmService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    use Flashes;

    public function __construct(
        private readonly LeadCrmService $leads,
        private readonly ContactService $contacts,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', \App\Models\Lead::class);
        return Inertia::render('LeadsPage', [
            'leads' => $this->leads->paginate(
                $request->query('search'),
                $request->query('status'),
            ),
            'contacts' => $this->contacts->lookup(),
            'filters' => [
                'search' => $request->query('search', ''),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', \App\Models\Lead::class);
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:255'],
            'source_contact_id' => ['nullable', 'exists:contacts,id'],
        ]);

        $this->leads->store($data);

        return $this->saved('Lead created.');
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        $this->authorize('update', $lead);
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'company' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:255'],
        ]);

        $this->leads->update($lead, $data);

        return $this->saved('Lead updated.');
    }

    public function destroy(Lead $lead): RedirectResponse
    {
        $this->authorize('delete', $lead);
        $this->leads->destroy($lead);

        return $this->saved('Lead deleted.');
    }

    public function convert(Lead $lead): RedirectResponse
    {
        $this->authorize('convert', $lead);
        $this->leads->convert($lead, [
            'create_account' => true,
            'create_deal' => true,
        ]);

        return $this->saved('Lead converted to a contact and deal.');
    }
}

<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Contact;
use App\Services\AccountService;
use App\Services\ContactService;
use App\Services\LeadCrmService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    use Flashes;

    public function __construct(
        private readonly ContactService $contacts,
        private readonly AccountService $accounts,
        private readonly LeadCrmService $leads,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', \App\Models\Contact::class);
        return Inertia::render('ContactsPage', [
            'contacts' => $this->contacts->paginate($request->query('search')),
            'accounts' => $this->accounts->lookup(),
            'filters' => [
                'search' => $request->query('search', ''),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', \App\Models\Contact::class);
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'area_id' => ['nullable', 'exists:areas,id'],
        ]);

        $this->contacts->store($data);

        return $this->saved('Contact created.');
    }

    public function update(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize('update', $contact);
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'area_id' => ['nullable', 'exists:areas,id'],
        ]);

        $this->contacts->update($contact, $data);

        return $this->saved('Contact updated.');
    }

    public function destroy(Contact $contact): RedirectResponse
    {
        $this->authorize('delete', $contact);
        $this->contacts->destroy($contact);

        return $this->saved('Contact deleted.');
    }

    public function createLead(Request $request, Contact $contact): RedirectResponse
    {
        $this->authorize('view', $contact);
        $this->authorize('create', \App\Models\Lead::class);

        $overrides = $request->validate([
            'source' => ['nullable', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'campaign' => ['nullable', 'string', 'max:255'],
        ]);

        $this->leads->storeFromContact($contact, $overrides);

        return redirect()->route('leads.index')->with('success', 'Lead created from contact.');
    }
}

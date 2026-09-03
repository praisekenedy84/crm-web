<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ContactStatus;
use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Services\ContactService;
use App\Services\CrossModuleAutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ContactController extends Controller
{
    public function __construct(private readonly ContactService $contacts) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Contact::class);

        return response()->json($this->contacts->paginate($request->query('search')));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Contact::class);

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'status' => ['nullable', Rule::enum(ContactStatus::class)],
            'area_id' => ['nullable', 'exists:areas,id'],
            'tags' => ['nullable', 'array'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        $duplicates = $this->contacts->findDuplicates($data);
        $contact = $this->contacts->store($data);

        return response()->json([
            'contact' => $contact,
            'duplicates' => $duplicates,
        ], 201);
    }

    public function show(Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);

        return response()->json([
            'contact' => $contact->load(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent', 'deals.stage']),
            'timeline' => $this->contacts->timeline($contact),
        ]);
    }

    public function update(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('update', $contact);

        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'title' => ['nullable', 'string', 'max:255'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'status' => ['nullable', Rule::enum(ContactStatus::class)],
            'area_id' => ['nullable', 'exists:areas,id'],
            'tags' => ['nullable', 'array'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        return response()->json($this->contacts->update($contact, $data));
    }

    public function updateStatus(Request $request, Contact $contact, CrossModuleAutomationService $automation): JsonResponse
    {
        $this->authorize('update', $contact);

        $data = $request->validate([
            'status' => ['required', Rule::enum(ContactStatus::class)],
            'notes' => ['required', 'string', 'max:1000'],
        ]);

        $status = $data['status'] instanceof ContactStatus
            ? $data['status']
            : ContactStatus::from($data['status']);

        if ($contact->status === $status) {
            throw ValidationException::withMessages([
                'status' => ['Contact is already in the requested status.'],
            ]);
        }

        return response()->json($this->contacts->updateStatus(
            $contact,
            $status,
            $data['notes'],
            $automation,
        ));
    }

    public function destroy(Contact $contact): JsonResponse
    {
        $this->authorize('delete', $contact);

        $this->contacts->destroy($contact);

        return response()->json(['message' => 'Contact deleted.']);
    }
}

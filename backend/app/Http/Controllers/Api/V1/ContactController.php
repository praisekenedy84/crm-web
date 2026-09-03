<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ContactStatus;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactStatusHistory;
use App\Services\AuditService;
use App\Services\CrossModuleAutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ContactController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contact::with(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent'])->latest();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
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
            'title' => ['nullable', 'string', 'max:255'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'status' => ['nullable', Rule::enum(ContactStatus::class)],
            'area_id' => ['nullable', 'exists:areas,id'],
            'tags' => ['nullable', 'array'],
            'custom_fields' => ['nullable', 'array'],
        ]);

        $duplicates = $this->findDuplicates($data);
        $data = $this->resolveAreaFromAccount($data);
        $contact = Contact::create($data);
        AuditService::log('created', $contact);

        return response()->json([
            'contact' => $contact->load(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent']),
            'duplicates' => $duplicates,
        ], 201);
    }

    public function show(Contact $contact): JsonResponse
    {
        $activities = \App\Models\Activity::where('related_type', Contact::class)
            ->where('related_id', $contact->id)
            ->with('owner')
            ->latest('occurred_at')
            ->limit(50)
            ->get();

        return response()->json([
            'contact' => $contact->load(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent', 'deals.stage']),
            'timeline' => $activities,
        ]);
    }

    public function update(Request $request, Contact $contact): JsonResponse
    {
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

        $before = $contact->only(array_keys($data));
        $data = $this->resolveAreaFromAccount($data);
        $contact->update($data);
        AuditService::log('updated', $contact, ['before' => $before, 'after' => $data]);

        return response()->json($contact->load(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent']));
    }

    public function updateStatus(Request $request, Contact $contact, CrossModuleAutomationService $automation): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(ContactStatus::class)],
            'notes' => ['required', 'string', 'max:1000'],
        ]);

        if ($contact->status === $data['status']) {
            return response()->json([
                'error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Contact is already in the requested status.'],
            ], 422);
        }

        DB::transaction(function () use ($contact, $data, $automation) {
            $fromStatus = $contact->status;

            $contact->update(['status' => $data['status']]);

            ContactStatusHistory::create([
                'contact_id' => $contact->id,
                'from_status' => $fromStatus,
                'to_status' => $data['status'],
                'notes' => $data['notes'],
                'changed_by' => Auth::id(),
                'changed_at' => now(),
            ]);

            AuditService::log('status_changed', $contact, [
                'from_status' => $fromStatus->value,
                'to_status' => $data['status'],
                'notes' => $data['notes'],
            ]);

            if ($data['status'] === ContactStatus::Customer) {
                $automation->onContactStatusCustomer($contact);
            }
        });

        return response()->json($contact->fresh()->load(['owner', 'account', 'area', 'statusHistory.changedBy']));
    }

    public function destroy(Contact $contact): JsonResponse
    {
        AuditService::log('deleted', $contact);
        $contact->delete();

        return response()->json(['message' => 'Contact deleted.']);
    }

    private function findDuplicates(array $data): array
    {
        $query = Contact::query();

        if (! empty($data['email'])) {
            $query->orWhere('email', $data['email']);
        }

        if (! empty($data['phone'])) {
            $query->orWhere('phone', $data['phone']);
        }

        return $query->limit(5)->get(['id', 'first_name', 'last_name', 'email', 'phone'])->toArray();
    }

    private function resolveAreaFromAccount(array $data): array
    {
        if (empty($data['account_id']) || ! empty($data['area_id'])) {
            return $data;
        }

        $account = Account::find($data['account_id']);

        if ($account?->area_id) {
            $data['area_id'] = $account->area_id;
        }

        return $data;
    }
}

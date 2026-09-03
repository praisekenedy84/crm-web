<?php

namespace App\Services;

use App\Enums\ContactStatus;
use App\Models\Account;
use App\Models\Activity;
use App\Models\Contact;
use App\Models\ContactStatusHistory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ContactService
{
    public function __construct(private readonly PermissionService $permissions) {}

    public function paginate(?string $search = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = Contact::with(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent'])->latest();

        if ($user = Auth::user()) {
            $this->permissions->applyOwnerScope($query, $user, 'contacts');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage)->withQueryString();
    }

    public function store(array $data): Contact
    {
        $data = $this->resolveAreaFromAccount($data);
        $data['owner_id'] ??= Auth::id();
        $contact = Contact::create($data);
        AuditService::log('created', $contact);

        return $contact->load(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent']);
    }

    public function update(Contact $contact, array $data): Contact
    {
        $before = $contact->only(array_keys($data));
        $data = $this->resolveAreaFromAccount($data);
        $contact->update($data);
        AuditService::log('updated', $contact, ['before' => $before, 'after' => $data]);

        return $contact->load(['owner', 'account.area.parent.parent.parent', 'area.parent.parent.parent']);
    }

    public function updateStatus(Contact $contact, ContactStatus $status, string $notes, CrossModuleAutomationService $automation): Contact
    {
        DB::transaction(function () use ($contact, $status, $notes, $automation) {
            $fromStatus = $contact->status;

            $contact->update(['status' => $status]);

            ContactStatusHistory::create([
                'contact_id' => $contact->id,
                'from_status' => $fromStatus,
                'to_status' => $status,
                'notes' => $notes,
                'changed_by' => Auth::id(),
                'changed_at' => now(),
            ]);

            AuditService::log('status_changed', $contact, [
                'from_status' => $fromStatus->value,
                'to_status' => $status->value,
                'notes' => $notes,
            ]);

            if ($status === ContactStatus::Customer) {
                $automation->onContactStatusCustomer($contact);
            }
        });

        return $contact->fresh()->load(['owner', 'account', 'area', 'statusHistory.changedBy']);
    }

    public function destroy(Contact $contact): void
    {
        AuditService::log('deleted', $contact);
        $contact->delete();
    }

    public function lookup()
    {
        $query = Contact::with('account')->orderBy('first_name')->orderBy('last_name');

        if ($user = Auth::user()) {
            $this->permissions->applyOwnerScope($query, $user, 'contacts');
        }

        return $query->get(['id', 'first_name', 'last_name', 'email', 'phone', 'account_id', 'owner_id']);
    }

    public function findDuplicates(array $data): array
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

    public function timeline(Contact $contact)
    {
        return Activity::where('related_type', Contact::class)
            ->where('related_id', $contact->id)
            ->with('owner')
            ->latest('occurred_at')
            ->limit(50)
            ->get();
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

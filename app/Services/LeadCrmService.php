<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\Lead;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class LeadCrmService
{
    public function __construct(
        private LeadConversionService $conversionService,
        private LeadScoringService $scoringService,
        private AutomationEngine $automation,
        private WebhookDispatcher $webhooks,
        private PermissionService $permissions,
    ) {}

    public function paginate(?string $search = null, ?string $status = null, int $perPage = 20): LengthAwarePaginator
    {
        $query = Lead::with(['owner', 'sourceContact'])->latest();

        if ($user = Auth::user()) {
            $this->permissions->applyOwnerScope($query, $user, 'leads');
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage)->withQueryString();
    }

    public function store(array $data): Lead
    {
        $data['owner_id'] ??= Auth::id();
        $lead = Lead::create($data);
        $this->scoringService->scoreLead($lead);
        AuditService::log('created', $lead);
        $this->automation->dispatch('record.created', $lead);
        $this->webhooks->emit('lead.created', $lead);

        return $lead->fresh()->load(['owner', 'sourceContact']);
    }

    public function storeFromContact(Contact $contact, array $overrides = []): Lead
    {
        $contact->loadMissing('account');

        return $this->store(array_merge([
            'first_name' => $contact->first_name,
            'last_name' => $contact->last_name,
            'email' => $contact->email,
            'phone' => $contact->phone,
            'company' => $contact->account?->name,
            'source' => 'Contact',
            'source_contact_id' => $contact->id,
            'owner_id' => $contact->owner_id ?? Auth::id(),
            'custom_fields' => $contact->custom_fields,
        ], array_filter($overrides, fn ($value) => $value !== null && $value !== '')));
    }

    public function update(Lead $lead, array $data): Lead
    {
        $lead->update($data);
        AuditService::log('updated', $lead, $data);

        return $lead->load(['owner', 'sourceContact']);
    }

    public function destroy(Lead $lead): void
    {
        AuditService::log('deleted', $lead);
        $lead->delete();
    }

    public function convert(Lead $lead, array $options): array
    {
        return $this->conversionService->convert($lead, $options);
    }
}

<?php

namespace App\Services;

use App\Enums\LeadStatus;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Pipeline;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LeadConversionService
{
    public function convert(Lead $lead, array $options = []): array
    {
        if ($lead->isConverted()) {
            throw new InvalidArgumentException('Lead is already converted.');
        }

        return DB::transaction(function () use ($lead, $options) {
            $account = null;
            if ($options['create_account'] ?? true) {
                $account = Account::create([
                    'name' => $options['account_name'] ?? $lead->company ?? "{$lead->full_name} Account",
                    'owner_id' => $lead->owner_id ?? Auth::id(),
                ]);
            }

            $contact = Contact::create([
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'account_id' => $account?->id,
                'owner_id' => $lead->owner_id ?? Auth::id(),
                'custom_fields' => $lead->custom_fields,
            ]);

            $deal = null;
            if ($options['create_deal'] ?? false) {
                $pipeline = Pipeline::where('is_default', true)->first()
                    ?? Pipeline::first();

                if ($pipeline) {
                    $stage = $pipeline->stages()->where('is_closed', false)->orderBy('sort_order')->first();

                    if ($stage) {
                        $deal = Deal::create([
                            'pipeline_id' => $pipeline->id,
                            'stage_id' => $stage->id,
                            'name' => $options['deal_name'] ?? "{$lead->full_name} Deal",
                            'account_id' => $account?->id,
                            'contact_id' => $contact->id,
                            'value' => $options['deal_value'] ?? 0,
                            'currency' => $options['currency'] ?? 'TZS',
                            'owner_id' => $lead->owner_id ?? Auth::id(),
                            'probability' => $stage->probability,
                        ]);
                    }
                }
            }

            $lead->update([
                'status' => LeadStatus::Converted,
                'converted_at' => now(),
                'converted_contact_id' => $contact->id,
                'converted_account_id' => $account?->id,
                'converted_deal_id' => $deal?->id,
            ]);

            AuditService::log('lead.converted', $lead, [
                'contact_id' => $contact->id,
                'account_id' => $account?->id,
                'deal_id' => $deal?->id,
            ]);

            return compact('contact', 'account', 'deal');
        });
    }
}

<?php

namespace App\Jobs;

use App\Models\Contact;
use App\Models\EmailAccount;
use App\Models\EmailMessage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncEmailAccount implements ShouldQueue
{
    use Queueable;

    public function __construct(public EmailAccount $account) {}

    public function handle(): void
    {
        // Provider sync stub — in production, call Gmail API / Microsoft Graph
        $contacts = Contact::whereNotNull('email')->limit(5)->get();

        foreach ($contacts as $contact) {
            EmailMessage::firstOrCreate(
                [
                    'tenant_id' => $this->account->tenant_id,
                    'external_id' => 'sync-'.$this->account->id.'-'.$contact->id,
                ],
                [
                    'contact_id' => $contact->id,
                    'email_account_id' => $this->account->id,
                    'direction' => 'inbound',
                    'subject' => 'Synced message for '.$contact->full_name,
                    'body' => 'Auto-synced from '.$this->account->provider,
                    'sent_at' => now(),
                ]
            );
        }

        $this->account->update(['last_synced_at' => now()]);
    }
}

<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\SmsLog;
use Illuminate\Support\Facades\Auth;

class StubMessagingProvider implements MessagingProvider
{
    public function send(string $phone, string $message): bool
    {
        $contact = Contact::query()
            ->where('phone', $phone)
            ->first();

        if (! $contact) {
            return false;
        }

        $loggedBy = Auth::id();

        if (! $loggedBy) {
            return false;
        }

        SmsLog::create([
            'contact_id' => $contact->id,
            'logged_by' => $loggedBy,
            'channel' => 'sms',
            'direction' => 'outbound',
            'body' => $message,
            'sent_at' => now(),
        ]);

        return true;
    }
}

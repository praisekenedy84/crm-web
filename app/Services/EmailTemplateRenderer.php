<?php

namespace App\Services;

use App\Models\Contact;

class EmailTemplateRenderer
{
    public function render(string $template, Contact $contact): string
    {
        $replacements = [
            '{{contact.first_name}}' => $contact->first_name,
            '{{contact.last_name}}' => $contact->last_name,
            '{{contact.email}}' => $contact->email ?? '',
            '{{contact.phone}}' => $contact->phone ?? '',
            '{{contact.full_name}}' => $contact->full_name,
            '{{account.name}}' => $contact->account?->name ?? '',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }
}

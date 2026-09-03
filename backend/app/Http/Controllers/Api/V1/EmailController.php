<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SyncEmailAccount;
use App\Models\Contact;
use App\Models\EmailAccount;
use App\Models\EmailMessage;
use App\Models\EmailTemplate;
use App\Services\EmailTemplateRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailController extends Controller
{
    public function accounts(): JsonResponse
    {
        return response()->json(EmailAccount::with('user')->get());
    }

    public function connectAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => ['required', 'in:gmail,outlook'],
            'email' => ['required', 'email'],
            'access_token' => ['nullable', 'string'],
        ]);

        $account = EmailAccount::updateOrCreate(
            ['user_id' => $request->user()->id, 'email' => $data['email']],
            [
                'provider' => $data['provider'],
                'access_token' => $data['access_token'] ?? 'oauth-placeholder',
                'sync_enabled' => true,
            ]
        );

        SyncEmailAccount::dispatch($account);

        return response()->json($account, 201);
    }

    public function syncAccount(EmailAccount $emailAccount): JsonResponse
    {
        SyncEmailAccount::dispatch($emailAccount);

        return response()->json(['message' => 'Sync queued.']);
    }

    public function messages(Request $request): JsonResponse
    {
        $query = EmailMessage::with('contact')->latest('sent_at');

        if ($contactId = $request->query('contact_id')) {
            $query->where('contact_id', $contactId);
        }

        return response()->json($query->paginate(20));
    }

    public function templates(): JsonResponse
    {
        return response()->json(EmailTemplate::latest()->get());
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ]);

        return response()->json(EmailTemplate::create($data), 201);
    }

    public function updateTemplate(Request $request, EmailTemplate $emailTemplate): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'subject' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
        ]);

        $emailTemplate->update($data);

        return response()->json($emailTemplate);
    }

    public function destroyTemplate(EmailTemplate $emailTemplate): JsonResponse
    {
        $emailTemplate->delete();

        return response()->json(['message' => 'Template deleted.']);
    }

    public function previewTemplate(Request $request, EmailTemplate $emailTemplate): JsonResponse
    {
        $request->validate(['contact_id' => ['required', 'exists:contacts,id']]);
        $contact = Contact::with('account')->findOrFail($request->contact_id);
        $renderer = new EmailTemplateRenderer;

        return response()->json([
            'subject' => $renderer->render($emailTemplate->subject, $contact),
            'body' => $renderer->render($emailTemplate->body, $contact),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SmsLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SmsLog::with(['contact', 'loggedBy'])->latest('sent_at');

        if ($contactId = $request->query('contact_id')) {
            $query->where('contact_id', $contactId);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'contact_id' => ['required', 'exists:contacts,id'],
            'channel' => ['required', 'in:sms,whatsapp'],
            'direction' => ['nullable', 'in:inbound,outbound'],
            'body' => ['required', 'string'],
            'sent_at' => ['nullable', 'date'],
        ]);

        $log = SmsLog::create([
            ...$data,
            'logged_by' => $request->user()->id,
            'direction' => $data['direction'] ?? 'outbound',
            'sent_at' => $data['sent_at'] ?? now(),
        ]);

        return response()->json($log->load(['contact', 'loggedBy']), 201);
    }
}

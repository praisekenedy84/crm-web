<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Webhook;
use App\Services\WebhookDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Webhook::latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
            'events' => ['required', 'array'],
            'is_active' => ['boolean'],
        ]);

        $webhook = Webhook::create([
            ...$data,
            'secret' => WebhookDispatcher::generateSecret(),
        ]);

        return response()->json($webhook, 201);
    }

    public function update(Request $request, Webhook $webhook): JsonResponse
    {
        $data = $request->validate([
            'url' => ['sometimes', 'url'],
            'events' => ['sometimes', 'array'],
            'is_active' => ['boolean'],
        ]);

        $webhook->update($data);

        return response()->json($webhook);
    }

    public function destroy(Webhook $webhook): JsonResponse
    {
        $webhook->delete();

        return response()->json(['message' => 'Webhook deleted.']);
    }

    public function deliveries(Webhook $webhook): JsonResponse
    {
        return response()->json($webhook->deliveries()->latest()->paginate(50));
    }
}

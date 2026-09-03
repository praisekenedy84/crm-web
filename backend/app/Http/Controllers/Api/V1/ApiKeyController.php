<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApiKeyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            ApiKey::select('id', 'name', 'key_prefix', 'last_used_at', 'created_at')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255']]);

        $prefix = Str::random(8);
        $secret = Str::random(32);

        $apiKey = ApiKey::create([
            'name' => $data['name'],
            'key_prefix' => $prefix,
            'key_hash' => hash('sha256', $secret),
        ]);

        return response()->json([
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'key' => "{$prefix}.{$secret}",
            'message' => 'Store this key securely — it will not be shown again.',
        ], 201);
    }

    public function destroy(ApiKey $apiKey): JsonResponse
    {
        $apiKey->delete();

        return response()->json(['message' => 'API key revoked.']);
    }
}

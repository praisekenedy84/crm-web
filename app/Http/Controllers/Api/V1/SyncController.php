<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    private array $models = [
        'contacts' => Contact::class,
        'accounts' => Account::class,
        'leads' => Lead::class,
        'deals' => Deal::class,
        'tasks' => Task::class,
    ];

    public function delta(Request $request): JsonResponse
    {
        $request->validate([
            'since' => ['required', 'date'],
            'objects' => ['nullable', 'array'],
        ]);

        $since = $request->since;
        $objects = $request->objects ?? array_keys($this->models);
        $changes = [];

        foreach ($objects as $key) {
            if (! isset($this->models[$key])) continue;

            $model = $this->models[$key];
            $changes[$key] = $model::where('updated_at', '>=', $since)
                ->orWhere('created_at', '>=', $since)
                ->limit(500)
                ->get();
        }

        return response()->json([
            'since' => $since,
            'synced_at' => now()->toIso8601String(),
            'changes' => $changes,
        ]);
    }
}

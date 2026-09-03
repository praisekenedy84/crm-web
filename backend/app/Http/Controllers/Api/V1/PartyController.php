<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PartyType;
use App\Http\Controllers\Controller;
use App\Models\Party;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PartyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Party::query()->latest();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(PartyType::class)],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'metadata' => ['nullable', 'array'],
        ]);

        $party = Party::create($data);
        AuditService::log('created', $party);

        return response()->json($party, 201);
    }

    public function show(Party $party): JsonResponse
    {
        return response()->json($party);
    }
}

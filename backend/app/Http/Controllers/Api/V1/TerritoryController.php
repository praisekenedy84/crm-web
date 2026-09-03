<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Territory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TerritoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Territory::with('users')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rules' => ['nullable', 'array'],
            'user_ids' => ['nullable', 'array'],
        ]);

        $territory = Territory::create($data);

        if (! empty($data['user_ids'])) {
            $territory->users()->sync($data['user_ids']);
        }

        return response()->json($territory->load('users'), 201);
    }

    public function update(Request $request, Territory $territory): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'rules' => ['nullable', 'array'],
            'user_ids' => ['nullable', 'array'],
        ]);

        $territory->update($data);

        if (isset($data['user_ids'])) {
            $territory->users()->sync($data['user_ids']);
        }

        return response()->json($territory->load('users'));
    }

    public function destroy(Territory $territory): JsonResponse
    {
        $territory->delete();

        return response()->json(['message' => 'Territory deleted.']);
    }
}

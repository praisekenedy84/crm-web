<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LeadScoreRule;
use App\Services\LeadScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadScoreController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(LeadScoreRule::latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'field' => ['required', 'string'],
            'operator' => ['required', 'string'],
            'value' => ['nullable', 'string'],
            'points' => ['required', 'integer'],
            'is_active' => ['boolean'],
        ]);

        return response()->json(LeadScoreRule::create($data), 201);
    }

    public function update(Request $request, LeadScoreRule $leadScoreRule): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string'],
            'field' => ['sometimes', 'string'],
            'operator' => ['sometimes', 'string'],
            'value' => ['nullable', 'string'],
            'points' => ['sometimes', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $leadScoreRule->update($data);

        return response()->json($leadScoreRule);
    }

    public function destroy(LeadScoreRule $leadScoreRule): JsonResponse
    {
        $leadScoreRule->delete();

        return response()->json(['message' => 'Rule deleted.']);
    }

    public function recalculate(LeadScoringService $scoring): JsonResponse
    {
        return response()->json(['scored' => $scoring->scoreAll()]);
    }
}

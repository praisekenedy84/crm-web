<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AreaLevel;
use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function pipelineSummary(): JsonResponse
    {
        return response()->json($this->reports->pipelineSummary());
    }

    public function conversionRate(): JsonResponse
    {
        return response()->json($this->reports->conversionRate());
    }

    public function leaderboard(): JsonResponse
    {
        return response()->json($this->reports->leaderboard());
    }

    public function visitsByArea(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'level' => ['nullable', Rule::enum(AreaLevel::class)],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        $level = isset($data['level'])
            ? ($data['level'] instanceof AreaLevel ? $data['level'] : AreaLevel::from($data['level']))
            : null;

        return response()->json($this->reports->visitsByArea(
            $data['from'],
            $data['to'],
            $level,
            isset($data['owner_id']) ? (int) $data['owner_id'] : null,
        ));
    }

    public function leadsPerRepPerDay(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        return response()->json($this->reports->leadsPerRepPerDay(
            $data['from'],
            $data['to'],
            isset($data['owner_id']) ? (int) $data['owner_id'] : null,
        ));
    }

    public function salesDone(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'owner_id' => ['nullable', 'exists:users,id'],
        ]);

        return response()->json($this->reports->salesDone(
            $data['from'],
            $data['to'],
            isset($data['owner_id']) ? (int) $data['owner_id'] : null,
        ));
    }
}

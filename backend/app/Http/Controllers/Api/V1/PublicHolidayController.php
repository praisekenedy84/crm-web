<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PublicHoliday;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicHolidayController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PublicHoliday::includingPlatformDefaults()->orderBy('date');

        if ($year = $request->query('year')) {
            $query->whereYear('date', $year);
        }

        if ($region = $request->query('region')) {
            $query->where('region', $region);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'region' => ['nullable', 'string', 'max:255'],
            'is_recurring_annually' => ['nullable', 'boolean'],
        ]);

        $data['is_recurring_annually'] ??= false;
        $data['region'] ??= 'Tanzania';

        $holiday = PublicHoliday::create($data);
        AuditService::log('created', $holiday);

        return response()->json($holiday, 201);
    }

    public function show(PublicHoliday $publicHoliday): JsonResponse
    {
        return response()->json($publicHoliday);
    }

    public function update(Request $request, PublicHoliday $publicHoliday): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'date' => ['sometimes', 'date'],
            'region' => ['nullable', 'string', 'max:255'],
            'is_recurring_annually' => ['nullable', 'boolean'],
        ]);

        $before = $publicHoliday->only(array_keys($data));
        $publicHoliday->update($data);
        AuditService::log('updated', $publicHoliday, ['before' => $before, 'after' => $data]);

        return response()->json($publicHoliday);
    }

    public function destroy(PublicHoliday $publicHoliday): JsonResponse
    {
        AuditService::log('deleted', $publicHoliday);
        $publicHoliday->delete();

        return response()->json(['message' => 'Public holiday deleted.']);
    }
}

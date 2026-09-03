<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ActivityType;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Activity::with('owner')->latest('occurred_at');

        if ($type = $request->query('related_type')) {
            $query->where('related_type', $type);
        }

        if ($id = $request->query('related_id')) {
            $query->where('related_id', $id);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(ActivityType::class)],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'related_type' => ['required', 'string'],
            'related_id' => ['required', 'integer'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'area_id' => ['nullable', 'exists:areas,id'],
            'visit_outcome' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        if ($data['type'] === ActivityType::FieldVisit) {
            $request->validate([
                'area_id' => ['required', 'exists:areas,id'],
            ]);
            $data['area_id'] = $request->input('area_id');
        }

        $data['occurred_at'] ??= now();
        $data['owner_id'] ??= $request->user()->id;

        $activity = Activity::create($data);
        AuditService::log('created', $activity);

        return response()->json($activity->load(['owner', 'area']), 201);
    }

    public function destroy(Activity $activity): JsonResponse
    {
        AuditService::log('deleted', $activity);
        $activity->delete();

        return response()->json(['message' => 'Activity deleted.']);
    }
}

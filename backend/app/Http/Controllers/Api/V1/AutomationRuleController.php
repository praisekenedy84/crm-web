<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AutomationLog;
use App\Models\AutomationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationRuleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(AutomationRule::latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'trigger_event' => ['required', 'string'],
            'object_type' => ['nullable', 'string'],
            'conditions' => ['nullable', 'array'],
            'actions' => ['required', 'array'],
            'is_active' => ['boolean'],
        ]);

        $rule = AutomationRule::create($data);

        return response()->json($rule, 201);
    }

    public function update(Request $request, AutomationRule $automationRule): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'trigger_event' => ['sometimes', 'string'],
            'object_type' => ['nullable', 'string'],
            'conditions' => ['nullable', 'array'],
            'actions' => ['sometimes', 'array'],
            'is_active' => ['boolean'],
        ]);

        $automationRule->update($data);

        return response()->json($automationRule);
    }

    public function destroy(AutomationRule $automationRule): JsonResponse
    {
        $automationRule->delete();

        return response()->json(['message' => 'Rule deleted.']);
    }

    public function logs(): JsonResponse
    {
        return response()->json(
            AutomationLog::with('rule')->latest('executed_at')->paginate(50)
        );
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Contact;
use App\Models\CustomReport;
use App\Models\Deal;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomReportController extends Controller
{
    private array $models = [
        'contacts' => Contact::class,
        'accounts' => Account::class,
        'leads' => Lead::class,
        'deals' => Deal::class,
    ];

    public function index(): JsonResponse
    {
        return response()->json(CustomReport::with('creator')->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'object_type' => ['required', 'in:contacts,accounts,leads,deals'],
            'filters' => ['nullable', 'array'],
            'group_by' => ['nullable', 'array'],
            'chart_type' => ['nullable', 'in:table,bar,pie,line'],
        ]);

        $report = CustomReport::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($report, 201);
    }

    public function run(CustomReport $customReport): JsonResponse
    {
        $model = $this->models[$customReport->object_type];
        $query = $model::query();

        foreach ($customReport->filters ?? [] as $filter) {
            $field = $filter['field'] ?? null;
            $op = $filter['operator'] ?? 'equals';
            $value = $filter['value'] ?? null;

            if (! $field) continue;

            match ($op) {
                'equals' => $query->where($field, $value),
                'contains' => $query->where($field, 'like', "%{$value}%"),
                'gt' => $query->where($field, '>', $value),
                'lt' => $query->where($field, '<', $value),
                default => null,
            };
        }

        if ($groupBy = $customReport->group_by[0] ?? null) {
            $results = $query->select($groupBy, DB::raw('count(*) as count'))
                ->groupBy($groupBy)
                ->get();
        } else {
            $results = $query->limit(100)->get();
        }

        return response()->json([
            'report' => $customReport,
            'results' => $results,
            'total' => $query->count(),
        ]);
    }

    public function destroy(CustomReport $customReport): JsonResponse
    {
        $customReport->delete();

        return response()->json(['message' => 'Report deleted.']);
    }
}

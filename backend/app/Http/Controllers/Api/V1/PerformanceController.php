<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Party;
use App\Models\PerformanceSnapshot;
use App\Services\AuditService;
use App\Services\PerformanceSnapshotService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerformanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PerformanceSnapshot::with('employeeParty')->orderByDesc('generated_at');

        if ($employeePartyId = $request->query('employee_party_id')) {
            $query->where('employee_party_id', $employeePartyId);
        }

        if ($from = $request->query('from')) {
            $query->where('period_start', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('period_end', '<=', $to);
        }

        return response()->json($query->paginate(20));
    }

    public function generate(Request $request, PerformanceSnapshotService $snapshotService): JsonResponse
    {
        $data = $request->validate([
            'employee_party_id' => ['required', 'exists:parties,id'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
        ]);

        $employee = Party::findOrFail($data['employee_party_id']);

        $snapshot = $snapshotService->generateForEmployee(
            $employee,
            Carbon::parse($data['period_start']),
            Carbon::parse($data['period_end']),
        );

        AuditService::log('generated', $snapshot);

        return response()->json($snapshot->load('employeeParty'), 201);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LeaveRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\AuditService;
use App\Services\LeaveDayCalculator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LeaveController extends Controller
{
    public function indexLeaveTypes(): JsonResponse
    {
        return response()->json(LeaveType::query()->orderBy('name')->paginate(20));
    }

    public function storeLeaveType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'default_days_per_year' => ['required', 'integer', 'min:0'],
            'is_paid' => ['nullable', 'boolean'],
        ]);

        $data['is_paid'] ??= true;

        $leaveType = LeaveType::create($data);
        AuditService::log('created', $leaveType);

        return response()->json($leaveType, 201);
    }

    public function showLeaveType(LeaveType $leaveType): JsonResponse
    {
        return response()->json($leaveType);
    }

    public function updateLeaveType(Request $request, LeaveType $leaveType): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'default_days_per_year' => ['sometimes', 'integer', 'min:0'],
            'is_paid' => ['nullable', 'boolean'],
        ]);

        $before = $leaveType->only(array_keys($data));
        $leaveType->update($data);
        AuditService::log('updated', $leaveType, ['before' => $before, 'after' => $data]);

        return response()->json($leaveType);
    }

    public function destroyLeaveType(LeaveType $leaveType): JsonResponse
    {
        AuditService::log('deleted', $leaveType);
        $leaveType->delete();

        return response()->json(['message' => 'Leave type deleted.']);
    }

    public function indexLeaveRequests(Request $request): JsonResponse
    {
        $query = LeaveRequest::with(['employeeParty', 'leaveType', 'approvedBy'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($employeePartyId = $request->query('employee_party_id')) {
            $query->where('employee_party_id', $employeePartyId);
        }

        return response()->json($query->paginate(20));
    }

    public function storeLeaveRequest(Request $request, LeaveDayCalculator $calculator): JsonResponse
    {
        $data = $request->validate([
            'employee_party_id' => ['required', 'exists:parties,id'],
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $start = Carbon::parse($data['start_date']);
        $end = Carbon::parse($data['end_date']);
        $data['days_requested'] = $calculator->calculateBusinessDays($start, $end);
        $data['status'] = LeaveRequestStatus::Pending;

        $leaveRequest = LeaveRequest::create($data);
        AuditService::log('created', $leaveRequest);

        return response()->json($leaveRequest->load(['employeeParty', 'leaveType']), 201);
    }

    public function showLeaveRequest(LeaveRequest $leaveRequest): JsonResponse
    {
        return response()->json($leaveRequest->load(['employeeParty', 'leaveType', 'approvedBy']));
    }

    public function updateLeaveRequest(Request $request, LeaveRequest $leaveRequest, LeaveDayCalculator $calculator): JsonResponse
    {
        if ($leaveRequest->status !== LeaveRequestStatus::Pending) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only pending leave requests can be updated.'],
            ], 422);
        }

        $data = $request->validate([
            'leave_type_id' => ['sometimes', 'exists:leave_types,id'],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        if (isset($data['start_date']) || isset($data['end_date'])) {
            $start = Carbon::parse($data['start_date'] ?? $leaveRequest->start_date);
            $end = Carbon::parse($data['end_date'] ?? $leaveRequest->end_date);
            $data['days_requested'] = $calculator->calculateBusinessDays($start, $end);
        }

        $before = $leaveRequest->only(array_keys($data));
        $leaveRequest->update($data);
        AuditService::log('updated', $leaveRequest, ['before' => $before, 'after' => $data]);

        return response()->json($leaveRequest->load(['employeeParty', 'leaveType']));
    }

    public function destroyLeaveRequest(LeaveRequest $leaveRequest): JsonResponse
    {
        if ($leaveRequest->status === LeaveRequestStatus::Approved) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Approved leave requests cannot be deleted.'],
            ], 422);
        }

        AuditService::log('deleted', $leaveRequest);
        $leaveRequest->delete();

        return response()->json(['message' => 'Leave request deleted.']);
    }

    public function approveLeaveRequest(LeaveRequest $leaveRequest): JsonResponse
    {
        if ($leaveRequest->status !== LeaveRequestStatus::Pending) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only pending leave requests can be approved.'],
            ], 422);
        }

        DB::transaction(function () use ($leaveRequest) {
            $leaveRequest->update([
                'status' => LeaveRequestStatus::Approved,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);

            $year = Carbon::parse($leaveRequest->start_date)->year;

            $balance = LeaveBalance::query()
                ->where('employee_party_id', $leaveRequest->employee_party_id)
                ->where('leave_type_id', $leaveRequest->leave_type_id)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if ($balance) {
                $usedDays = (float) $balance->used_days + (float) $leaveRequest->days_requested;
                $balance->update([
                    'used_days' => $usedDays,
                    'remaining_days' => max(0, (float) $balance->allocated_days - $usedDays),
                ]);
            }

            AuditService::log('approved', $leaveRequest);
        });

        return response()->json($leaveRequest->fresh()->load(['employeeParty', 'leaveType', 'approvedBy']));
    }

    public function rejectLeaveRequest(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        if ($leaveRequest->status !== LeaveRequestStatus::Pending) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only pending leave requests can be rejected.'],
            ], 422);
        }

        $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $leaveRequest->update([
            'status' => LeaveRequestStatus::Rejected,
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        AuditService::log('rejected', $leaveRequest, ['reason' => $request->input('reason')]);

        return response()->json($leaveRequest->load(['employeeParty', 'leaveType', 'approvedBy']));
    }

    public function indexLeaveBalances(Request $request): JsonResponse
    {
        $query = LeaveBalance::with(['employeeParty', 'leaveType'])->orderByDesc('year');

        if ($year = $request->query('year')) {
            $query->where('year', $year);
        }

        if ($employeePartyId = $request->query('employee_party_id')) {
            $query->where('employee_party_id', $employeePartyId);
        }

        return response()->json($query->paginate(20));
    }

    public function calculateDays(Request $request, LeaveDayCalculator $calculator): JsonResponse
    {
        $data = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $days = $calculator->calculateBusinessDays(
            Carbon::parse($data['start_date']),
            Carbon::parse($data['end_date']),
        );

        return response()->json(['days' => $days]);
    }
}

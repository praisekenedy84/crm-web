<?php

namespace App\Http\Controllers\Web;

use App\Enums\LeaveRequestStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class HrPageController extends Controller
{
    use Flashes;

    public function index(Request $request): Response
    {
        return Inertia::render('HrPage', [
            'tab' => $request->query('tab', 'leave'),
            'leaveRequests' => LeaveRequest::with(['employeeParty', 'leaveType', 'approvedBy'])->latest()->paginate(20)->withQueryString(),
            'employees' => Employee::with(['party', 'user', 'manager'])->latest()->paginate(20)->withQueryString(),
        ]);
    }

    public function approveLeave(LeaveRequest $leaveRequest): RedirectResponse
    {
        if ($leaveRequest->status !== LeaveRequestStatus::Pending) {
            return $this->failed('Only pending leave requests can be approved.');
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

        return $this->saved('Leave request approved.');
    }

    public function destroyLeave(LeaveRequest $leaveRequest): RedirectResponse
    {
        AuditService::log('deleted', $leaveRequest);
        $leaveRequest->delete();

        return $this->saved('Leave request deleted.');
    }

    public function storeEmployee(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'party_id' => ['required', 'exists:parties,id'],
            'department' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
        ]);

        $data['employment_status'] = 'active';
        $data['currency'] = 'TZS';

        $employee = Employee::create($data);
        AuditService::log('created', $employee);

        return $this->saved('Employee created.');
    }

    public function updateEmployee(Request $request, Employee $employee): RedirectResponse
    {
        $data = $request->validate([
            'party_id' => ['sometimes', 'exists:parties,id'],
            'department' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
        ]);

        $before = $employee->only(array_keys($data));
        $employee->update($data);
        AuditService::log('updated', $employee, ['before' => $before, 'after' => $data]);

        return $this->saved('Employee updated.');
    }

    public function destroyEmployee(Employee $employee): RedirectResponse
    {
        AuditService::log('deleted', $employee);
        $employee->delete();

        return $this->saved('Employee deleted.');
    }
}

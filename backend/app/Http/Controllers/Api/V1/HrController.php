<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\AuditService;
use App\Services\LedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class HrController extends Controller
{
    public function indexEmployees(Request $request): JsonResponse
    {
        $query = Employee::with(['party', 'user', 'manager'])->latest();

        if ($status = $request->query('employment_status')) {
            $query->where('employment_status', $status);
        }

        if ($department = $request->query('department')) {
            $query->where('department', $department);
        }

        return response()->json($query->paginate(20));
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $data = $request->validate([
            'party_id' => ['required', 'exists:parties,id'],
            'user_id' => ['nullable', 'exists:users,id'],
            'department' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'employment_status' => ['nullable', 'string', 'in:active,inactive,terminated'],
            'hire_date' => ['nullable', 'date'],
            'salary' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'manager_id' => ['nullable', 'exists:users,id'],
        ]);

        $data['employment_status'] ??= 'active';
        $data['currency'] ??= 'TZS';

        $employee = Employee::create($data);
        AuditService::log('created', $employee);

        return response()->json($employee->load(['party', 'user', 'manager']), 201);
    }

    public function showEmployee(Employee $employee): JsonResponse
    {
        return response()->json($employee->load(['party', 'user', 'manager']));
    }

    public function updateEmployee(Request $request, Employee $employee): JsonResponse
    {
        $data = $request->validate([
            'party_id' => ['sometimes', 'exists:parties,id'],
            'user_id' => ['nullable', 'exists:users,id'],
            'department' => ['nullable', 'string', 'max:255'],
            'job_title' => ['nullable', 'string', 'max:255'],
            'employment_status' => ['nullable', 'string', 'in:active,inactive,terminated'],
            'hire_date' => ['nullable', 'date'],
            'salary' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'manager_id' => ['nullable', 'exists:users,id'],
        ]);

        $before = $employee->only(array_keys($data));
        $employee->update($data);
        AuditService::log('updated', $employee, ['before' => $before, 'after' => $data]);

        return response()->json($employee->load(['party', 'user', 'manager']));
    }

    public function destroyEmployee(Employee $employee): JsonResponse
    {
        AuditService::log('deleted', $employee);
        $employee->delete();

        return response()->json(['message' => 'Employee deleted.']);
    }

    public function indexAttendance(Request $request): JsonResponse
    {
        $query = AttendanceRecord::with('employee.party')->orderByDesc('date');

        if ($employeeId = $request->query('employee_id')) {
            $query->where('employee_id', $employeeId);
        }

        if ($from = $request->query('from')) {
            $query->where('date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('date', '<=', $to);
        }

        return response()->json($query->paginate(20));
    }

    public function storeAttendance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'date' => ['required', 'date'],
            'check_in' => ['nullable', 'string', 'max:10'],
            'check_out' => ['nullable', 'string', 'max:10'],
            'status' => ['nullable', 'string', 'in:present,absent,late,half_day,leave'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $data['status'] ??= 'present';

        $record = AttendanceRecord::create($data);
        AuditService::log('created', $record);

        return response()->json($record->load('employee.party'), 201);
    }

    public function showAttendance(AttendanceRecord $attendanceRecord): JsonResponse
    {
        return response()->json($attendanceRecord->load('employee.party'));
    }

    public function updateAttendance(Request $request, AttendanceRecord $attendanceRecord): JsonResponse
    {
        $data = $request->validate([
            'check_in' => ['nullable', 'string', 'max:10'],
            'check_out' => ['nullable', 'string', 'max:10'],
            'status' => ['nullable', 'string', 'in:present,absent,late,half_day,leave'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $before = $attendanceRecord->only(array_keys($data));
        $attendanceRecord->update($data);
        AuditService::log('updated', $attendanceRecord, ['before' => $before, 'after' => $data]);

        return response()->json($attendanceRecord->load('employee.party'));
    }

    public function destroyAttendance(AttendanceRecord $attendanceRecord): JsonResponse
    {
        AuditService::log('deleted', $attendanceRecord);
        $attendanceRecord->delete();

        return response()->json(['message' => 'Attendance record deleted.']);
    }

    public function indexPayrollRuns(): JsonResponse
    {
        return response()->json(
            PayrollRun::with(['processedBy', 'payslips.employee.party'])->latest()->paginate(20)
        );
    }

    public function storePayrollRun(Request $request): JsonResponse
    {
        $data = $request->validate([
            'period' => ['required', 'string', 'max:50'],
        ]);

        $data['status'] = 'draft';
        $data['total_gross'] = 0;
        $data['total_net'] = 0;

        $run = PayrollRun::create($data);
        AuditService::log('created', $run);

        return response()->json($run, 201);
    }

    public function processPayrollRun(PayrollRun $payrollRun, LedgerService $ledgerService): JsonResponse
    {
        if ($payrollRun->status !== 'draft') {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only draft payroll runs can be processed.'],
            ], 422);
        }

        DB::transaction(function () use ($payrollRun, $ledgerService) {
            $employees = Employee::query()
                ->where('employment_status', 'active')
                ->whereNotNull('salary')
                ->get();

            $totalGross = 0;
            $totalNet = 0;

            foreach ($employees as $employee) {
                $gross = (float) $employee->salary;
                $deductions = round($gross * 0.1, 2);
                $net = round($gross - $deductions, 2);

                Payslip::create([
                    'payroll_run_id' => $payrollRun->id,
                    'employee_id' => $employee->id,
                    'gross_pay' => $gross,
                    'deductions' => $deductions,
                    'net_pay' => $net,
                    'breakdown' => ['tax' => $deductions],
                ]);

                $totalGross += $gross;
                $totalNet += $net;
            }

            $payrollRun->update([
                'status' => 'processed',
                'total_gross' => $totalGross,
                'total_net' => $totalNet,
                'processed_by' => Auth::id(),
                'processed_at' => now(),
            ]);

            $ledgerService->postPayroll($payrollRun);
            AuditService::log('processed', $payrollRun);
        });

        return response()->json($payrollRun->fresh()->load(['processedBy', 'payslips.employee.party']));
    }
}

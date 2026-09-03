<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ExpenseStatus;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Services\AuditService;
use App\Services\LedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    public function indexCategories(): JsonResponse
    {
        return response()->json(ExpenseCategory::query()->orderBy('name')->paginate(20));
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $category = ExpenseCategory::create($data);
        AuditService::log('created', $category);

        return response()->json($category, 201);
    }

    public function showCategory(ExpenseCategory $expenseCategory): JsonResponse
    {
        return response()->json($expenseCategory);
    }

    public function updateCategory(Request $request, ExpenseCategory $expenseCategory): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
        ]);

        $before = $expenseCategory->only(array_keys($data));
        $expenseCategory->update($data);
        AuditService::log('updated', $expenseCategory, ['before' => $before, 'after' => $data]);

        return response()->json($expenseCategory);
    }

    public function destroyCategory(ExpenseCategory $expenseCategory): JsonResponse
    {
        AuditService::log('deleted', $expenseCategory);
        $expenseCategory->delete();

        return response()->json(['message' => 'Expense category deleted.']);
    }

    public function indexExpenses(Request $request): JsonResponse
    {
        $query = Expense::with(['submitter', 'category', 'approvedBy'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($submittedBy = $request->query('submitted_by')) {
            $query->where('submitted_by', $submittedBy);
        }

        return response()->json($query->paginate(20));
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $data = $request->validate([
            'expense_category_id' => ['required', 'exists:expense_categories,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'expensed_at' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
            'receipt_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $data['submitted_by'] = Auth::id();
        $data['status'] = ExpenseStatus::Pending;
        $data['currency'] ??= 'TZS';

        $expense = Expense::create($data);
        AuditService::log('created', $expense);

        return response()->json($expense->load(['submitter', 'category']), 201);
    }

    public function showExpense(Expense $expense): JsonResponse
    {
        return response()->json($expense->load(['submitter', 'category', 'approvedBy', 'ledgerEntry']));
    }

    public function updateExpense(Request $request, Expense $expense): JsonResponse
    {
        if ($expense->status !== ExpenseStatus::Pending) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only pending expenses can be updated.'],
            ], 422);
        }

        $data = $request->validate([
            'expense_category_id' => ['sometimes', 'exists:expense_categories,id'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'expensed_at' => ['sometimes', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
            'receipt_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $before = $expense->only(array_keys($data));
        $expense->update($data);
        AuditService::log('updated', $expense, ['before' => $before, 'after' => $data]);

        return response()->json($expense->load(['submitter', 'category']));
    }

    public function destroyExpense(Expense $expense): JsonResponse
    {
        if ($expense->status === ExpenseStatus::Approved) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Approved expenses cannot be deleted.'],
            ], 422);
        }

        AuditService::log('deleted', $expense);
        $expense->delete();

        return response()->json(['message' => 'Expense deleted.']);
    }

    public function approveExpense(Expense $expense, LedgerService $ledgerService): JsonResponse
    {
        if ($expense->status !== ExpenseStatus::Pending) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only pending expenses can be approved.'],
            ], 422);
        }

        DB::transaction(function () use ($expense, $ledgerService) {
            $expense->update([
                'status' => ExpenseStatus::Approved,
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);

            $ledgerService->postExpense($expense);
            AuditService::log('approved', $expense);
        });

        return response()->json($expense->fresh()->load(['submitter', 'category', 'approvedBy', 'ledgerEntry']));
    }

    public function rejectExpense(Request $request, Expense $expense): JsonResponse
    {
        if ($expense->status !== ExpenseStatus::Pending) {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only pending expenses can be rejected.'],
            ], 422);
        }

        $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $expense->update([
            'status' => ExpenseStatus::Rejected,
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        AuditService::log('rejected', $expense, ['reason' => $request->input('reason')]);

        return response()->json($expense->load(['submitter', 'category', 'approvedBy']));
    }
}

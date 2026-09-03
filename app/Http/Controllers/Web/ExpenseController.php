<?php

namespace App\Http\Controllers\Web;

use App\Enums\ExpenseStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    use Flashes;

    public function index(): Response
    {
        return Inertia::render('ExpensesPage', [
            'expenses' => Expense::with(['submitter', 'category', 'approvedBy'])->latest()->paginate(20)->withQueryString(),
            'categories' => ExpenseCategory::query()->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'expense_category_id' => ['required', 'exists:expense_categories,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'expensed_at' => ['required', 'date'],
        ]);

        $data['submitted_by'] = Auth::id();
        $data['status'] = ExpenseStatus::Pending;
        $data['currency'] = 'TZS';

        $expense = Expense::create($data);
        AuditService::log('created', $expense);

        return $this->saved('Expense created.');
    }

    public function update(Request $request, Expense $expense): RedirectResponse
    {
        $data = $request->validate([
            'expense_category_id' => ['sometimes', 'exists:expense_categories,id'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:1000'],
            'expensed_at' => ['sometimes', 'date'],
        ]);

        $before = $expense->only(array_keys($data));
        $expense->update($data);
        AuditService::log('updated', $expense, ['before' => $before, 'after' => $data]);

        return $this->saved('Expense updated.');
    }

    public function destroy(Expense $expense): RedirectResponse
    {
        AuditService::log('deleted', $expense);
        $expense->delete();

        return $this->saved('Expense deleted.');
    }
}

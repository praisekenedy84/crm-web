<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\Expense;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\PayrollRun;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LedgerService
{
    public function postEntry(
        array $lines,
        string $description,
        ?string $reference = null,
        ?Carbon $date = null,
    ): LedgerEntry {
        if ($lines === []) {
            throw new InvalidArgumentException('Ledger entry requires at least one line.');
        }

        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($lines as $line) {
            $debit = (float) ($line['debit'] ?? 0);
            $credit = (float) ($line['credit'] ?? 0);

            if ($debit < 0 || $credit < 0) {
                throw new InvalidArgumentException('Debit and credit amounts must be non-negative.');
            }

            if ($debit > 0 && $credit > 0) {
                throw new InvalidArgumentException('A ledger line cannot have both debit and credit amounts.');
            }

            if ($debit === 0.0 && $credit === 0.0) {
                throw new InvalidArgumentException('A ledger line must have a debit or credit amount.');
            }

            if (empty($line['account_id'])) {
                throw new InvalidArgumentException('Each ledger line requires an account_id.');
            }

            $totalDebit += $debit;
            $totalCredit += $credit;
        }

        if (round($totalDebit, 2) !== round($totalCredit, 2)) {
            throw new InvalidArgumentException('Total debits must equal total credits.');
        }

        return DB::transaction(function () use ($lines, $description, $reference, $date) {
            $entry = LedgerEntry::create([
                'reference' => $reference,
                'description' => $description,
                'entry_date' => ($date ?? now())->toDateString(),
                'status' => 'posted',
                'created_by' => Auth::id(),
            ]);

            foreach ($lines as $line) {
                LedgerLine::create([
                    'ledger_entry_id' => $entry->id,
                    'account_id' => $line['account_id'],
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                ]);
            }

            AuditService::log('ledger.posted', $entry, [
                'reference' => $reference,
                'line_count' => count($lines),
            ]);

            return $entry->load('lines');
        });
    }

    public function postExpense(Expense $expense): LedgerEntry
    {
        $expense->loadMissing('category');

        $expenseAccount = $this->findAccount('expense', $expense->category?->name ?? 'General Expenses');
        $creditAccount = $this->findAccount('asset', 'Cash') ?? $this->findAccount('liability', 'Accounts Payable');

        if (! $creditAccount) {
            throw new InvalidArgumentException('No cash or accounts payable account configured for expense posting.');
        }

        $entry = $this->postEntry(
            [
                ['account_id' => $expenseAccount->id, 'debit' => $expense->amount, 'credit' => 0],
                ['account_id' => $creditAccount->id, 'debit' => 0, 'credit' => $expense->amount],
            ],
            $expense->description ?? "Expense claim #{$expense->id}",
            "expense:{$expense->id}",
            Carbon::parse($expense->expensed_at),
        );

        $expense->update(['ledger_entry_id' => $entry->id]);

        return $entry;
    }

    public function postPayroll(PayrollRun $run): LedgerEntry
    {
        $payrollExpense = $this->findAccount('expense', 'Payroll Expense');
        $payableAccount = $this->findAccount('liability', 'Salaries Payable');

        $lines = [
            ['account_id' => $payrollExpense->id, 'debit' => $run->total_gross, 'credit' => 0],
            ['account_id' => $payableAccount->id, 'debit' => 0, 'credit' => $run->total_net],
        ];

        $deductions = round((float) $run->total_gross - (float) $run->total_net, 2);

        if ($deductions > 0) {
            $deductionsAccount = $this->findAccount('liability', 'Payroll Deductions Payable');
            $lines[] = ['account_id' => $deductionsAccount->id, 'debit' => 0, 'credit' => $deductions];
        }

        $entry = $this->postEntry(
            $lines,
            "Payroll run {$run->period}",
            "payroll:{$run->id}",
            $run->processed_at ? Carbon::parse($run->processed_at) : now(),
        );

        $run->update(['ledger_entry_id' => $entry->id]);

        return $entry;
    }

    private function findAccount(string $type, string $name): ChartOfAccount
    {
        $account = ChartOfAccount::query()
            ->where('type', $type)
            ->where('is_active', true)
            ->where(function ($query) use ($name): void {
                $query->where('name', $name)
                    ->orWhere('code', $name);
            })
            ->first();

        if (! $account) {
            throw new InvalidArgumentException("Chart of account not found: {$type}/{$name}");
        }

        return $account;
    }
}

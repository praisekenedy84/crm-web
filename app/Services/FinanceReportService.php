<?php

namespace App\Services;

use App\Models\LedgerLine;
use Illuminate\Support\Facades\DB;

/**
 * Ledger aggregates shared by the token API (Api\V1\FinanceController) and the
 * Inertia pages that surface financial headline figures.
 */
class FinanceReportService
{
    public function summary(?string $from = null, ?string $to = null): array
    {
        $query = LedgerLine::query()
            ->join('ledger_entries', 'ledger_entries.id', '=', 'ledger_lines.ledger_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'ledger_lines.account_id')
            ->where('ledger_entries.status', 'posted');

        if (! empty($from)) {
            $query->where('ledger_entries.entry_date', '>=', $from);
        }

        if (! empty($to)) {
            $query->where('ledger_entries.entry_date', '<=', $to);
        }

        $byType = $query
            ->select(
                'chart_of_accounts.type',
                DB::raw('SUM(ledger_lines.debit) as total_debit'),
                DB::raw('SUM(ledger_lines.credit) as total_credit'),
            )
            ->groupBy('chart_of_accounts.type')
            ->get()
            ->keyBy('type');

        $revenue = (float) ($byType->get('revenue')?->total_credit ?? 0) - (float) ($byType->get('revenue')?->total_debit ?? 0);
        $expenses = (float) ($byType->get('expense')?->total_debit ?? 0) - (float) ($byType->get('expense')?->total_credit ?? 0);

        return [
            'period' => ['from' => $from, 'to' => $to],
            'revenue' => round($revenue, 2),
            'expenses' => round($expenses, 2),
            'net_income' => round($revenue - $expenses, 2),
            'by_account_type' => $byType->map(fn ($row) => [
                'total_debit' => round((float) $row->total_debit, 2),
                'total_credit' => round((float) $row->total_credit, 2),
            ]),
        ];
    }
}

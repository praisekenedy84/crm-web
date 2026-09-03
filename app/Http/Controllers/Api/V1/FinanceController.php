<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\LedgerEntry;
use App\Models\LedgerLine;
use App\Models\Payment;
use App\Services\AuditService;
use App\Services\AutomationEngine;
use App\Services\FinanceReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    public function indexAccounts(Request $request): JsonResponse
    {
        $query = ChartOfAccount::query()->orderBy('code');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->paginate(20));
    }

    public function storeAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:asset,liability,equity,revenue,expense'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['is_active'] ??= true;

        $account = ChartOfAccount::create($data);
        AuditService::log('created', $account);

        return response()->json($account, 201);
    }

    public function indexInvoices(Request $request): JsonResponse
    {
        $query = Invoice::with(['party', 'lines', 'creator'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($partyId = $request->query('customer_party_id')) {
            $query->where('customer_party_id', $partyId);
        }

        return response()->json($query->paginate(20));
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_party_id' => ['required', 'exists:parties,id'],
            'invoice_number' => ['required', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:draft,sent,paid,partial,overdue,cancelled'],
            'currency' => ['nullable', 'string', 'size:3'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $data['currency'] ??= 'TZS';
        $data['status'] ??= 'draft';
        $data['amount_paid'] = 0;
        $data['created_by'] = Auth::id();

        $invoice = DB::transaction(function () use ($data) {
            $lines = $data['lines'];
            unset($data['lines']);

            $totalAmount = collect($lines)->sum(fn (array $line) => $line['quantity'] * $line['unit_price']);
            $data['total_amount'] = $totalAmount;

            $invoice = Invoice::create($data);

            foreach ($lines as $line) {
                InvoiceLine::create([
                    'invoice_id' => $invoice->id,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'total' => $line['quantity'] * $line['unit_price'],
                ]);
            }

            AuditService::log('created', $invoice);

            return $invoice;
        });

        return response()->json($invoice->load(['party', 'lines', 'creator']), 201);
    }

    public function showInvoice(Invoice $invoice): JsonResponse
    {
        return response()->json($invoice->load(['party', 'lines', 'payments', 'creator']));
    }

    public function recordPayment(Request $request, Invoice $invoice, AutomationEngine $automationEngine): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['nullable', 'string', 'size:3'],
            'method' => ['nullable', 'string', 'max:50'],
            'reference' => ['nullable', 'string', 'max:255'],
            'paid_at' => ['nullable', 'date'],
        ]);

        $data['invoice_id'] = $invoice->id;
        $data['currency'] ??= $invoice->currency;
        $data['paid_at'] ??= now()->toDateString();
        $data['recorded_by'] = Auth::id();

        $payment = DB::transaction(function () use ($invoice, $data, $automationEngine) {
            $payment = Payment::create($data);

            $newAmountPaid = (float) $invoice->amount_paid + (float) $data['amount'];
            $status = $newAmountPaid >= (float) $invoice->total_amount ? 'paid' : 'partial';

            $invoice->update([
                'amount_paid' => $newAmountPaid,
                'status' => $status,
            ]);

            AuditService::log('payment.recorded', $payment, ['invoice_id' => $invoice->id]);

            if ($status === 'paid') {
                $automationEngine->dispatch('payment.confirmed', $payment);
            }

            return $payment;
        });

        return response()->json([
            'payment' => $payment->load('recordedBy'),
            'invoice' => $invoice->fresh()->load(['party', 'lines']),
        ], 201);
    }

    public function indexLedgerEntries(Request $request): JsonResponse
    {
        $query = LedgerEntry::with(['lines.account', 'creator'])->latest('entry_date');

        if ($from = $request->query('from')) {
            $query->where('entry_date', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('entry_date', '<=', $to);
        }

        return response()->json($query->paginate(20));
    }

    public function financialSummary(Request $request, FinanceReportService $financeReports): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        return response()->json($financeReports->summary($data['from'] ?? null, $data['to'] ?? null));
    }
}

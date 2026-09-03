<?php

namespace App\Services;

use App\Enums\ActivityType;
use App\Enums\PlatformModule;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\SalesOrder;
use App\Models\SalesOrderLine;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Task;
use App\Models\Warehouse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CrossModuleAutomationService
{
    public function __construct(
        private readonly ModuleService $moduleService,
    ) {}

    public function onDealWon(Deal $deal): array
    {
        return DB::transaction(function () use ($deal) {
            $deal->loadMissing(['account.party', 'contact.party', 'lineItems']);

            $partyId = $deal->account?->party_id ?? $deal->contact?->party_id;

            $orderNumber = sprintf('SO-%s-%06d', now()->format('Ymd'), $deal->id);
            $invoiceNumber = sprintf('INV-%s-%06d', now()->format('Ymd'), $deal->id);

            $lines = $deal->lineItems;
            $totalAmount = $lines->isNotEmpty()
                ? (float) $lines->sum('total')
                : (float) $deal->value;

            $salesOrder = SalesOrder::create([
                'deal_id' => $deal->id,
                'customer_party_id' => $partyId,
                'order_number' => $orderNumber,
                'status' => 'draft',
                'total_amount' => $totalAmount,
                'currency' => $deal->currency,
                'created_by' => Auth::id(),
            ]);

            $invoice = Invoice::create([
                'sales_order_id' => $salesOrder->id,
                'deal_id' => $deal->id,
                'customer_party_id' => $partyId,
                'invoice_number' => $invoiceNumber,
                'status' => 'draft',
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'currency' => $deal->currency,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(30)->toDateString(),
                'created_by' => Auth::id(),
            ]);

            if ($lines->isNotEmpty()) {
                foreach ($lines as $line) {
                    SalesOrderLine::create([
                        'sales_order_id' => $salesOrder->id,
                        'description' => $line->description,
                        'quantity' => $line->quantity,
                        'unit_price' => $line->unit_price,
                        'total' => $line->total,
                        'product_id' => $line->product_id,
                    ]);

                    InvoiceLine::create([
                        'invoice_id' => $invoice->id,
                        'description' => $line->description,
                        'quantity' => $line->quantity,
                        'unit_price' => $line->unit_price,
                        'total' => $line->total,
                    ]);
                }
            } else {
                SalesOrderLine::create([
                    'sales_order_id' => $salesOrder->id,
                    'description' => $deal->name,
                    'quantity' => 1,
                    'unit_price' => $deal->value,
                    'total' => $deal->value,
                ]);

                InvoiceLine::create([
                    'invoice_id' => $invoice->id,
                    'description' => $deal->name,
                    'quantity' => 1,
                    'unit_price' => $deal->value,
                    'total' => $deal->value,
                ]);
            }

            AuditService::log('deal.won.automation', $deal, [
                'sales_order_id' => $salesOrder->id,
                'invoice_id' => $invoice->id,
            ]);

            return compact('salesOrder', 'invoice');
        });
    }

    public function onSalesOrderConfirmed(SalesOrder $order): void
    {
        if (! $this->moduleService->isEnabled(PlatformModule::Inventory->value)) {
            return;
        }

        $order->loadMissing('lines');

        DB::transaction(function () use ($order): void {
            $warehouse = Warehouse::query()
                ->where('is_active', true)
                ->orderBy('id')
                ->first();

            if (! $warehouse) {
                return;
            }

            foreach ($order->lines as $line) {
                if (! $line->product_id) {
                    continue;
                }

                $stockLevel = StockLevel::query()
                    ->where('product_id', $line->product_id)
                    ->where('warehouse_id', $warehouse->id)
                    ->lockForUpdate()
                    ->first();

                if (! $stockLevel) {
                    continue;
                }

                $quantity = (float) $line->quantity;
                $stockLevel->decrement('quantity', $quantity);

                StockMovement::create([
                    'product_id' => $line->product_id,
                    'warehouse_id' => $warehouse->id,
                    'type' => 'out',
                    'quantity' => $quantity,
                    'reference_type' => $order->getMorphClass(),
                    'reference_id' => $order->id,
                    'notes' => "Sales order {$order->order_number} confirmed",
                    'created_by' => Auth::id(),
                ]);
            }

            AuditService::log('sales_order.stock_deducted', $order);
        });
    }

    public function onContactStatusCustomer(Contact $contact): Task
    {
        return Task::create([
            'title' => 'Create contract for customer',
            'description' => "Contact {$contact->full_name} became a customer. Create a service contract.",
            'due_date' => now()->addDays(3)->toDateString(),
            'priority' => 'high',
            'assignee_id' => $contact->owner_id ?? Auth::id(),
            'related_type' => $contact->getMorphClass(),
            'related_id' => $contact->id,
        ]);
    }
}

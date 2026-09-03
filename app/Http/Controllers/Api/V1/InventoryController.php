<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function indexProducts(Request $request): JsonResponse
    {
        $query = Product::query()->latest();

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
            'reorder_point' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['is_active'] ??= true;
        $data['currency'] ??= 'TZS';

        $product = Product::create($data);
        AuditService::log('created', $product);

        return response()->json($product, 201);
    }

    public function showProduct(Product $product): JsonResponse
    {
        return response()->json($product->load('stockLevels.warehouse'));
    }

    public function updateProduct(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'sku' => ['sometimes', 'string', 'max:100'],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'unit_price' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'is_active' => ['nullable', 'boolean'],
            'reorder_point' => ['nullable', 'integer', 'min:0'],
        ]);

        $before = $product->only(array_keys($data));
        $product->update($data);
        AuditService::log('updated', $product, ['before' => $before, 'after' => $data]);

        return response()->json($product);
    }

    public function destroyProduct(Product $product): JsonResponse
    {
        AuditService::log('deleted', $product);
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    public function indexWarehouses(): JsonResponse
    {
        return response()->json(Warehouse::query()->orderBy('name')->paginate(20));
    }

    public function storeWarehouse(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['is_active'] ??= true;

        $warehouse = Warehouse::create($data);
        AuditService::log('created', $warehouse);

        return response()->json($warehouse, 201);
    }

    public function showWarehouse(Warehouse $warehouse): JsonResponse
    {
        return response()->json($warehouse->load('stockLevels.product'));
    }

    public function updateWarehouse(Request $request, Warehouse $warehouse): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $before = $warehouse->only(array_keys($data));
        $warehouse->update($data);
        AuditService::log('updated', $warehouse, ['before' => $before, 'after' => $data]);

        return response()->json($warehouse);
    }

    public function destroyWarehouse(Warehouse $warehouse): JsonResponse
    {
        AuditService::log('deleted', $warehouse);
        $warehouse->delete();

        return response()->json(['message' => 'Warehouse deleted.']);
    }

    public function indexStockLevels(Request $request): JsonResponse
    {
        $query = StockLevel::with(['product', 'warehouse']);

        if ($productId = $request->query('product_id')) {
            $query->where('product_id', $productId);
        }

        if ($warehouseId = $request->query('warehouse_id')) {
            $query->where('warehouse_id', $warehouseId);
        }

        return response()->json($query->paginate(20));
    }

    public function indexPurchaseOrders(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with(['vendorParty', 'lines.product', 'creator'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(20));
    }

    public function storePurchaseOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vendor_party_id' => ['required', 'exists:parties,id'],
            'po_number' => ['required', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'size:3'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.product_id' => ['nullable', 'exists:products,id'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $data['currency'] ??= 'TZS';
        $data['status'] = 'draft';
        $data['created_by'] = Auth::id();

        $order = DB::transaction(function () use ($data) {
            $lines = $data['lines'];
            unset($data['lines']);

            $totalAmount = collect($lines)->sum(fn (array $line) => $line['quantity'] * $line['unit_price']);
            $data['total_amount'] = $totalAmount;

            $order = PurchaseOrder::create($data);

            foreach ($lines as $line) {
                PurchaseOrderLine::create([
                    'purchase_order_id' => $order->id,
                    'product_id' => $line['product_id'] ?? null,
                    'description' => $line['description'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'total' => $line['quantity'] * $line['unit_price'],
                ]);
            }

            AuditService::log('created', $order);

            return $order;
        });

        return response()->json($order->load(['vendorParty', 'lines.product', 'creator']), 201);
    }

    public function showPurchaseOrder(PurchaseOrder $purchaseOrder): JsonResponse
    {
        return response()->json($purchaseOrder->load(['vendorParty', 'lines.product', 'creator', 'approvedBy']));
    }

    public function updatePurchaseOrder(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only draft purchase orders can be updated.'],
            ], 422);
        }

        $data = $request->validate([
            'vendor_party_id' => ['sometimes', 'exists:parties,id'],
            'po_number' => ['sometimes', 'string', 'max:100'],
            'currency' => ['nullable', 'string', 'size:3'],
            'lines' => ['sometimes', 'array', 'min:1'],
            'lines.*.product_id' => ['nullable', 'exists:products,id'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($purchaseOrder, $data) {
            if (isset($data['lines'])) {
                $purchaseOrder->lines()->delete();
                $totalAmount = 0;

                foreach ($data['lines'] as $line) {
                    PurchaseOrderLine::create([
                        'purchase_order_id' => $purchaseOrder->id,
                        'product_id' => $line['product_id'] ?? null,
                        'description' => $line['description'],
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unit_price'],
                        'total' => $line['quantity'] * $line['unit_price'],
                    ]);
                    $totalAmount += $line['quantity'] * $line['unit_price'];
                }

                $data['total_amount'] = $totalAmount;
                unset($data['lines']);
            }

            $before = $purchaseOrder->only(array_keys($data));
            $purchaseOrder->update($data);
            AuditService::log('updated', $purchaseOrder, ['before' => $before, 'after' => $data]);
        });

        return response()->json($purchaseOrder->fresh()->load(['vendorParty', 'lines.product', 'creator']));
    }

    public function destroyPurchaseOrder(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only draft purchase orders can be deleted.'],
            ], 422);
        }

        AuditService::log('deleted', $purchaseOrder);
        $purchaseOrder->delete();

        return response()->json(['message' => 'Purchase order deleted.']);
    }

    public function approvePurchaseOrder(PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Only draft purchase orders can be approved.'],
            ], 422);
        }

        $purchaseOrder->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        AuditService::log('approved', $purchaseOrder);

        return response()->json($purchaseOrder->load(['vendorParty', 'lines.product', 'approvedBy']));
    }

    public function goodsReceipt(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        if ($purchaseOrder->status !== 'approved') {
            return response()->json([
                'error' => ['code' => 'INVALID_STATE', 'message' => 'Goods can only be received for approved purchase orders.'],
            ], 422);
        }

        $data = $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.purchase_order_line_id' => ['required', 'exists:purchase_order_lines,id'],
            'lines.*.quantity_received' => ['required', 'numeric', 'min:0.01'],
        ]);

        DB::transaction(function () use ($purchaseOrder, $data) {
            foreach ($data['lines'] as $line) {
                $poLine = PurchaseOrderLine::findOrFail($line['purchase_order_line_id']);

                if (! $poLine->product_id) {
                    continue;
                }

                $stockLevel = StockLevel::query()
                    ->where('product_id', $poLine->product_id)
                    ->where('warehouse_id', $data['warehouse_id'])
                    ->lockForUpdate()
                    ->first();

                if ($stockLevel) {
                    $stockLevel->increment('quantity', $line['quantity_received']);
                } else {
                    StockLevel::create([
                        'product_id' => $poLine->product_id,
                        'warehouse_id' => $data['warehouse_id'],
                        'quantity' => $line['quantity_received'],
                    ]);
                }

                StockMovement::create([
                    'product_id' => $poLine->product_id,
                    'warehouse_id' => $data['warehouse_id'],
                    'type' => 'in',
                    'quantity' => $line['quantity_received'],
                    'reference_type' => $purchaseOrder->getMorphClass(),
                    'reference_id' => $purchaseOrder->id,
                    'notes' => "Goods receipt for PO {$purchaseOrder->po_number}",
                    'created_by' => Auth::id(),
                ]);
            }

            $purchaseOrder->update(['status' => 'received']);
            AuditService::log('goods_received', $purchaseOrder, $data);
        });

        return response()->json($purchaseOrder->fresh()->load(['vendorParty', 'lines.product']));
    }
}

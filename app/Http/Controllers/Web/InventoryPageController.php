<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockLevel;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryPageController extends Controller
{
    use Flashes;

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'products');

        return Inertia::render('InventoryPage', [
            'tab' => $tab,
            'products' => Product::query()->latest()->paginate(20)->withQueryString(),
            'stock' => StockLevel::with(['product', 'warehouse'])->paginate(20)->withQueryString(),
            'orders' => PurchaseOrder::with(['vendorParty', 'lines.product', 'creator'])->latest()->paginate(20)->withQueryString(),
        ]);
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:100'],
            'name' => ['required', 'string', 'max:255'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $data['is_active'] ??= true;
        $data['currency'] = 'TZS';

        $product = Product::create($data);
        AuditService::log('created', $product);

        return $this->saved('Product created.');
    }

    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate([
            'sku' => ['sometimes', 'string', 'max:100'],
            'name' => ['sometimes', 'string', 'max:255'],
            'unit_price' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $before = $product->only(array_keys($data));
        $product->update($data);
        AuditService::log('updated', $product, ['before' => $before, 'after' => $data]);

        return $this->saved('Product updated.');
    }

    public function destroyProduct(Product $product): RedirectResponse
    {
        AuditService::log('deleted', $product);
        $product->delete();

        return $this->saved('Product deleted.');
    }

    public function destroyPurchaseOrder(PurchaseOrder $purchaseOrder): RedirectResponse
    {
        if ($purchaseOrder->status !== 'draft') {
            return $this->failed('Only draft purchase orders can be deleted.');
        }

        AuditService::log('deleted', $purchaseOrder);
        $purchaseOrder->delete();

        return $this->saved('Purchase order deleted.');
    }
}

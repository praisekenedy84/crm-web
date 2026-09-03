import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSubmit, visitFilters } from '@/lib/submit';
import type { Paginated, Product, PurchaseOrder, StockLevel } from '@/types';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { cn } from '@/lib/utils';

const emptyProductForm = {
  sku: '',
  name: '',
  unit_price: '',
  is_active: true,
};

interface InventoryPageProps {
  tab: string;
  products: Paginated<Product>;
  stock: Paginated<StockLevel>;
  orders: Paginated<PurchaseOrder>;
}

export default function InventoryPage({ tab, products, stock, orders }: InventoryPageProps) {
  const { processing, submit } = useSubmit();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState(emptyProductForm);

  const resetForm = () => setForm(emptyProductForm);

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    resetForm();
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setShowForm(false);
    setEditing(product);
    setForm({
      sku: product.sku,
      name: product.name,
      unit_price: String(product.unit_price),
      is_active: product.is_active,
    });
  };

  const handleSaveProduct = () => {
    const payload = {
      sku: form.sku,
      name: form.name,
      unit_price: Number(form.unit_price),
      is_active: form.is_active,
    };
    if (editing) {
      submit('put', `/inventory/products/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/inventory/products', payload, { onSuccess: closeForm });
    }
  };

  const handleDeleteProduct = () => {
    if (!deleteProduct) return;
    submit('delete', `/inventory/products/${deleteProduct.id}`, {}, {
      onSuccess: () => setDeleteProduct(null),
    });
  };

  const handleDeleteOrder = () => {
    if (!deleteOrder) return;
    submit('delete', `/inventory/purchase-orders/${deleteOrder.id}`, {}, {
      onSuccess: () => setDeleteOrder(null),
    });
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Inventory</h1>
          <p className="mt-1 text-muted-foreground">Products, stock levels, and purchase orders</p>
        </div>
        {tab === 'products' && (
          <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            <Plus size={16} />
            New Product
          </Button>
        )}
      </div>

      {tab === 'products' && isFormOpen && (
        <FormCard
          title={editing ? 'Edit Product' : 'Add Product'}
          description={editing ? 'Update product details.' : 'Add a new inventory product.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveProduct();
          }}
          submitLabel={editing ? 'Update Product' : 'Save Product'}
          isSubmitting={processing}
        >
          <FormSection title="Product Details">
            <FormGrid cols={2}>
              <FormField label="SKU" htmlFor="product_sku" required>
                <Input
                  id="product_sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Name" htmlFor="product_name" required>
                <Input
                  id="product_name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Unit price (TZS)" htmlFor="product_price" required>
                <Input
                  id="product_price"
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  required
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <div className="flex gap-2">
        {(['products', 'stock', 'orders'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'secondary' : 'outline'}
            size="sm"
            className="capitalize"
            onClick={() => visitFilters('/inventory', { tab: t })}
          >
            {t === 'orders' ? 'Purchase Orders' : t === 'stock' ? 'Stock Levels' : 'Products'}
          </Button>
        ))}
      </div>

      <Card className={cn('border-0 shadow-sm ring-1 ring-border/60')}>
        <CardHeader>
          <CardTitle className="capitalize">
            {tab === 'orders' ? 'Purchase Orders' : tab === 'stock' ? 'Stock Levels' : 'Products'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tab === 'products' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active</TableHead>
                  <ActionsTableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.sku}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{fmt(p.unit_price)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => openEdit(p)}
                        onDelete={() => setDeleteProduct(p)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {tab === 'stock' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.product?.name ?? `#${s.product_id}`}</TableCell>
                    <TableCell className="text-muted-foreground">{s.warehouse?.name ?? `#${s.warehouse_id}`}</TableCell>
                    <TableCell>{s.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {tab === 'orders' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <ActionsTableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.po_number}</TableCell>
                    <TableCell className="text-muted-foreground">{o.order_date}</TableCell>
                    <TableCell>{fmt(o.total_amount)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{o.status}</TableCell>
                    <TableCell>
                      <RowActions
                        onDelete={() => setDeleteOrder(o)}
                        disableDelete={o.status !== 'draft'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteProduct !== null}
        title={`Delete ${deleteProduct?.name}?`}
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeleteProduct(null)}
        isDeleting={processing}
      />

      <DeleteConfirmDialog
        open={deleteOrder !== null}
        title={`Delete PO ${deleteOrder?.po_number}?`}
        onConfirm={handleDeleteOrder}
        onCancel={() => setDeleteOrder(null)}
        isDeleting={processing}
      />
    </div>
  );
}

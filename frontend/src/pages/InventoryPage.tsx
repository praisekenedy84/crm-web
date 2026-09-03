import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, type Product, type PurchaseOrder } from '../lib/api';
import { FormCard, FormField, FormGrid, FormSection } from '@/components/forms';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Tab = 'products' | 'stock' | 'orders';

const emptyProductForm = {
  sku: '',
  name: '',
  unit_price: '',
  is_active: true,
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('products');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState(emptyProductForm);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
    enabled: tab === 'products',
  });

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-levels'],
    queryFn: () => api.getStockLevels(),
    enabled: tab === 'stock',
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.getPurchaseOrders(),
    enabled: tab === 'orders',
  });

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

  const saveProductMutation = useMutation({
    mutationFn: () => {
      const payload = {
        sku: form.sku,
        name: form.name,
        unit_price: Number(form.unit_price),
        is_active: form.is_active,
      };
      return editing
        ? api.updateProduct(editing.id, payload)
        : api.createProduct(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeForm();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteProduct(null);
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: number) => api.deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setDeleteOrder(null);
    },
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  const isLoading = tab === 'products' ? productsLoading : tab === 'stock' ? stockLoading : ordersLoading;
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
            saveProductMutation.mutate();
          }}
          submitLabel={editing ? 'Update Product' : 'Save Product'}
          isSubmitting={saveProductMutation.isPending}
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
            onClick={() => setTab(t)}
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Skeleton className="mx-auto h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ) : products?.data.map((p) => (
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <Skeleton className="mx-auto h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ) : stock?.data.map((s) => (
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Skeleton className="mx-auto h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ) : orders?.data.map((o) => (
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
        onConfirm={() => deleteProduct && deleteProductMutation.mutate(deleteProduct.id)}
        onCancel={() => setDeleteProduct(null)}
        isDeleting={deleteProductMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteOrder !== null}
        title={`Delete PO ${deleteOrder?.po_number}?`}
        onConfirm={() => deleteOrder && deleteOrderMutation.mutate(deleteOrder.id)}
        onCancel={() => setDeleteOrder(null)}
        isDeleting={deleteOrderMutation.isPending}
      />
    </div>
  );
}

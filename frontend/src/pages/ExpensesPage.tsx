import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api, type Expense } from '../lib/api';
import { PageHeader } from '@/components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/components/forms';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

function expenseDate(e: Expense) {
  return e.expensed_at ?? e.expense_date ?? '';
}

const emptyForm = {
  expense_category_id: '',
  amount: '',
  description: '',
  expense_date: new Date().toISOString().slice(0, 10),
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.getExpenses(),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.getExpenseCategories(),
  });

  const resetForm = () =>
    setForm({
      expense_category_id: '',
      amount: '',
      description: '',
      expense_date: new Date().toISOString().slice(0, 10),
    });

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

  const openEdit = (expense: Expense) => {
    setShowForm(false);
    setEditing(expense);
    setForm({
      expense_category_id: String(expense.expense_category_id),
      amount: String(expense.amount),
      description: expense.description ?? '',
      expense_date: expenseDate(expense).slice(0, 10),
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        expense_category_id: Number(form.expense_category_id),
        amount: Number(form.amount),
        description: form.description || undefined,
        expensed_at: form.expense_date,
      };
      return editing
        ? api.updateExpense(editing.id, payload)
        : api.createExpense(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setDeleteTarget(null);
    },
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  const isFormOpen = showForm || editing !== null;
  const isPending = (e: Expense) => e.status === 'pending';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Expense claims and reimbursements"
        action={
          <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            <Plus size={16} />
            New Expense
          </Button>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Expense' : 'Submit Expense'}
          description={editing ? 'Update expense details.' : 'Log an expense for approval and reimbursement.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update Expense' : 'Submit Expense'}
          isSubmitting={saveMutation.isPending}
        >
          <FormSection title="Expense Details">
            <FormGrid cols={2}>
              <FormField label="Category" htmlFor="expense_category" required>
                <Select
                  value={form.expense_category_id}
                  onValueChange={(value) => value && setForm({ ...form, expense_category_id: value })}
                >
                  <SelectTrigger id="expense_category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.data.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Amount (TZS)" htmlFor="expense_amount" required>
                <Input
                  id="expense_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Expense date" htmlFor="expense_date" required>
                <Input
                  id="expense_date"
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Description" htmlFor="expense_description" hint="Optional notes about this expense">
                <Input
                  id="expense_description"
                  placeholder="Business lunch, travel, supplies..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <ActionsTableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ) : data?.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{expenseDate(e)}</TableCell>
                  <TableCell>{e.category?.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{e.description || '—'}</TableCell>
                  <TableCell className="font-medium">{fmt(e.amount)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{e.status}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => openEdit(e)}
                      onDelete={() => setDeleteTarget(e)}
                      disableEdit={!isPending(e)}
                      disableDelete={!isPending(e)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title="Delete expense?"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

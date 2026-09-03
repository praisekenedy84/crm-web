import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import type { Expense, ExpenseCategory, Paginated } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

function expenseDate(e: Expense) {
  return e.expensed_at ?? e.expense_date ?? '';
}

const emptyForm = {
  expense_category_id: '',
  amount: '',
  description: '',
  expense_date: new Date().toISOString().slice(0, 10),
};

interface ExpensesPageProps {
  expenses: Paginated<Expense>;
  categories: ExpenseCategory[];
}

export default function ExpensesPage({ expenses, categories }: ExpensesPageProps) {
  const { processing, submit } = useSubmit();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const handleSave = () => {
    const payload = {
      expense_category_id: Number(form.expense_category_id),
      amount: Number(form.amount),
      description: form.description || undefined,
      expensed_at: form.expense_date,
    };
    if (editing) {
      submit('put', `/expenses/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/expenses', payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    submit('delete', `/expenses/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

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
            handleSave();
          }}
          submitLabel={editing ? 'Update Expense' : 'Submit Expense'}
          isSubmitting={processing}
        >
          <FormSection title="Expense Details">
            <FormGrid cols={2}>
              <FormField label="Category" htmlFor="expense_category" required>
                <Select
                  value={form.expense_category_id}
                  onValueChange={(value) => value && setForm({ ...form, expense_category_id: value })}
                  items={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                >
                  <SelectTrigger id="expense_category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
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
              {expenses.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{expenseDate(e)}</TableCell>
                  <TableCell>{e.category?.name ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{e.description || '-'}</TableCell>
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
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={processing}
      />
    </div>
  );
}

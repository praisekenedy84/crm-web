import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api, type Contract } from '../lib/api';
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

const emptyForm = {
  customer_party_id: '',
  service_id: '',
  start_date: '',
  end_date: '',
  amount_paid: '',
};

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.getContracts(),
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.getServices(),
  });

  const resetForm = () => setForm(emptyForm);

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

  const openEdit = (contract: Contract) => {
    setShowForm(false);
    setEditing(contract);
    setForm({
      customer_party_id: String(contract.customer_party_id),
      service_id: String(contract.service_id),
      start_date: contract.start_date,
      end_date: contract.end_date,
      amount_paid: String(contract.amount_paid),
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        customer_party_id: Number(form.customer_party_id),
        service_id: Number(form.service_id),
        start_date: form.start_date,
        end_date: form.end_date,
        amount_paid: Number(form.amount_paid),
      };
      return editing
        ? api.updateContract(editing.id, payload)
        : api.createContract(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setDeleteTarget(null);
    },
  });

  const fmt = (n: number, currency = 'TZS') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Service agreements and subscriptions"
        action={
          <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            <Plus size={16} />
            New Contract
          </Button>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Contract' : 'Add Contract'}
          description={editing ? 'Update contract details.' : 'Create a new service agreement for a customer.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update Contract' : 'Save Contract'}
          isSubmitting={saveMutation.isPending}
        >
          <FormSection title="Customer & Service">
            <FormGrid cols={2}>
              <FormField label="Customer party ID" htmlFor="customer_party_id" required>
                <Input
                  id="customer_party_id"
                  type="number"
                  placeholder="Customer ID"
                  value={form.customer_party_id}
                  onChange={(e) => setForm({ ...form, customer_party_id: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Service" htmlFor="service_id" required>
                <Select
                  value={form.service_id}
                  onValueChange={(value) => value && setForm({ ...form, service_id: value })}
                >
                  <SelectTrigger id="service_id" className="w-full">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.data.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Contract Terms">
            <FormGrid cols={3}>
              <FormField label="Start date" htmlFor="start_date" required>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="End date" htmlFor="end_date" required>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Amount paid" htmlFor="amount_paid" required>
                <Input
                  id="amount_paid"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount_paid}
                  onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                  required
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
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Period</TableHead>
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
              ) : data?.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.party?.name ?? `#${c.customer_party_id}`}</TableCell>
                  <TableCell className="text-muted-foreground">{c.service?.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.start_date} → {c.end_date}
                  </TableCell>
                  <TableCell>{fmt(c.amount_paid, c.currency)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{c.status}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => openEdit(c)}
                      onDelete={() => setDeleteTarget(c)}
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
        title="Delete contract?"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

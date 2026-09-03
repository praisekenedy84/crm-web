import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import { useCan } from '@/hooks/useCan';
import type { Account, Paginated } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { AreaPicker, formatAreaLocation } from '@/Components/AreaPicker';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

const emptyForm = {
  name: '',
  industry: '',
  website: '',
  phone: '',
  area_id: null as number | null,
};

interface AccountsPageProps {
  accounts: Paginated<Account>;
  filters: { search: string };
}

export default function AccountsPage({ accounts }: AccountsPageProps) {
  const { processing, submit } = useSubmit();
  const { can } = useCan();
  const canCreate = can('accounts.create');
  const canUpdate = can('accounts.update');
  const canDelete = can('accounts.delete');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const openEdit = (account: Account) => {
    setShowForm(false);
    setEditing(account);
    setForm({
      name: account.name,
      industry: account.industry ?? '',
      website: account.website ?? '',
      phone: account.phone ?? '',
      area_id: account.area_id ?? null,
    });
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      industry: form.industry || undefined,
      website: form.website || undefined,
      phone: form.phone || undefined,
      area_id: form.area_id ?? undefined,
    };
    if (editing) {
      submit('put', `/accounts/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/accounts', payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    submit('delete', `/accounts/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Shops, companies, and workplaces"
        action={
          (canCreate || isFormOpen) && (
            <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
              <Plus size={16} />
              {isFormOpen ? 'Close' : 'New Account'}
            </Button>
          )
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Account' : 'Add Account'}
          description={editing ? 'Update workplace details.' : 'Register a shop, company, or workplace with its location.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          submitLabel={editing ? 'Update Account' : 'Save Account'}
          isSubmitting={processing}
        >
          <FormSection title="Workplace Information">
            <FormGrid cols={3}>
              <FormField label="Name" htmlFor="name" required className="sm:col-span-3 lg:col-span-1">
                <Input
                  id="name"
                  placeholder="Acme Shop"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Industry" htmlFor="industry">
                <Input
                  id="industry"
                  placeholder="Retail"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input
                  id="phone"
                  placeholder="+255 700 000 000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Website" htmlFor="website" hint="e.g. https://acme.com" className="sm:col-span-3 lg:col-span-1">
                <Input
                  id="website"
                  placeholder="https://"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Location">
            <FormField label="Area" hint="Select region, district, ward, and street">
              <AreaPicker
                value={form.area_id}
                onChange={(areaId) => setForm({ ...form, area_id: areaId })}
                idPrefix="account-area"
              />
            </FormField>
          </FormSection>
        </FormCard>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Phone</TableHead>
                <ActionsTableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.industry || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatAreaLocation(a.area)}</TableCell>
                  <TableCell className="text-muted-foreground">{a.phone || '-'}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={canUpdate ? () => openEdit(a) : undefined}
                      onDelete={canDelete ? () => setDeleteTarget(a) : undefined}
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
        title={`Delete ${deleteTarget?.name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={processing}
      />
    </div>
  );
}

import { useState } from 'react';
import { Plus, UserPlus, X } from 'lucide-react';
import { useSubmit, visitFilters } from '@/lib/submit';
import { useCan } from '@/hooks/useCan';
import type { Contact, Account, Paginated } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { AreaPicker, formatAreaLocation } from '@/Components/AreaPicker';
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
import { ListToolbar } from '@/Components/ListToolbar';
import { DataPagination } from '@/Components/DataPagination';
import { DataState } from '@/Components/DataState';

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  account_id: '',
  area_id: null as number | null,
};

interface ContactsPageProps {
  contacts: Paginated<Contact>;
  accounts: Account[];
  filters: { search: string };
}

export default function ContactsPage({ contacts, accounts, filters }: ContactsPageProps) {
  const { processing, submit } = useSubmit();
  const { can } = useCan();
  const canCreate = can('contacts.create');
  const canUpdate = can('contacts.update');
  const canDelete = can('contacts.delete');
  const canCreateLead = can('leads.create');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [creatingLeadId, setCreatingLeadId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchInput, setSearchInput] = useState(filters.search);

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

  const openEdit = (contact: Contact) => {
    setShowForm(false);
    setEditing(contact);
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      account_id: contact.account_id ? String(contact.account_id) : '',
      area_id: contact.area_id ?? contact.account?.area_id ?? null,
    });
  };

  const handleSave = () => {
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      account_id: form.account_id ? Number(form.account_id) : undefined,
      area_id: form.area_id ?? undefined,
    };
    if (editing) {
      submit('put', `/contacts/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/contacts', payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    submit('delete', `/contacts/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleCreateLead = (contact: Contact) => {
    setCreatingLeadId(contact.id);
    submit('post', `/contacts/${contact.id}/create-lead`, {}, {
      onSuccess: () => setCreatingLeadId(null),
      onError: () => setCreatingLeadId(null),
    });
  };

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find((a) => String(a.id) === accountId);
    setForm({
      ...form,
      account_id: accountId,
      area_id: account?.area_id ?? null,
    });
  };

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relationships"
        title="Contacts"
        description="Keep customer details, workplaces, and locations ready for every conversation."
        action={
          (canCreate || isFormOpen) ? (
            <Button variant={isFormOpen ? 'outline' : 'default'} onClick={() => (isFormOpen ? closeForm() : openCreate())}>
              {isFormOpen ? <X size={16} /> : <Plus size={16} />}
              {isFormOpen ? 'Close form' : 'New contact'}
            </Button>
          ) : undefined
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Contact' : 'Add Contact'}
          description={editing ? 'Update contact details.' : 'Enter contact details and link them to their shop or company.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          submitLabel={editing ? 'Update Contact' : 'Save Contact'}
          isSubmitting={processing}
        >
          <FormSection title="Personal Information">
            <FormGrid cols={2}>
              <FormField label="First name" htmlFor="first_name" required>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Last name" htmlFor="last_name" required>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Contact Details">
            <FormGrid cols={2}>
              <FormField label="Email" htmlFor="email" hint="Work or personal email address">
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </FormField>
              <FormField label="Phone" htmlFor="phone" hint="Include country code if applicable">
                <Input
                  id="phone"
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Workplace">
            <FormGrid cols={1}>
              <FormField label="Shop / Company" htmlFor="account_id" hint="The workplace this contact belongs to">
                <Select
                  value={form.account_id}
                  onValueChange={(value) => value && handleAccountChange(value)}
                  items={accounts.map((a) => ({
                    value: String(a.id),
                    label: `${a.name}${a.area ? ` - ${formatAreaLocation(a.area)}` : ''}`,
                  }))}
                >
                  <SelectTrigger id="account_id" className="w-full">
                    <SelectValue placeholder="Select shop or company" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                        {a.area ? ` - ${formatAreaLocation(a.area)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Location"
                hint="Inherited from the selected workplace, or pick a different location"
              >
                <AreaPicker
                  key={form.area_id ?? 'none'}
                  value={form.area_id}
                  onChange={(areaId) => setForm({ ...form, area_id: areaId })}
                  idPrefix="contact-area"
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <Card className="gap-0 border-0 py-0 shadow-sm ring-1 ring-border/70">
        <ListToolbar
          value={searchInput}
          onChange={setSearchInput}
          onSearch={(value = searchInput) => {
            visitFilters('/contacts', { search: value.trim(), page: 1 });
          }}
          placeholder="Search by name or email"
          resultLabel={`${contacts.total} contact${contacts.total === 1 ? '' : 's'}`}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shop / Company</TableHead>
                <TableHead>Location</TableHead>
                <ActionsTableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <DataState
                      compact
                      title={filters.search ? 'No contacts match this search' : 'No contacts yet'}
                      description={filters.search ? 'Try a different name or email.' : 'Create your first contact to start building customer context.'}
                      actionLabel={filters.search ? 'Clear search' : 'Create contact'}
                      onAction={() => filters.search
                        ? (setSearchInput(''), visitFilters('/contacts', { search: '', page: 1 }))
                        : openCreate()}
                    />
                  </TableCell>
                </TableRow>
              ) : contacts.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.account?.name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatAreaLocation(c.area ?? c.account?.area)}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={canUpdate ? () => openEdit(c) : undefined}
                      onDelete={canDelete ? () => setDeleteTarget(c) : undefined}
                      extra={
                        canCreateLead ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateLead(c)}
                            disabled={creatingLeadId !== null}
                            aria-busy={creatingLeadId === c.id}
                            aria-label={`Create lead from ${c.first_name} ${c.last_name}`}
                          >
                            <UserPlus size={16} />
                            {creatingLeadId === c.id ? 'Creating...' : 'Lead'}
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <DataPagination
          page={contacts.current_page}
          lastPage={contacts.last_page}
          total={contacts.total}
          onPageChange={(page) => visitFilters('/contacts', { search: filters.search, page })}
        />
      </Card>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={processing}
      />
    </div>
  );
}

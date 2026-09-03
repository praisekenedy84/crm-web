import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api, getApiErrorMessage, type Contact } from '../lib/api';
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
import { Skeleton } from '@/Components/ui/skeleton';
import { ListToolbar } from '@/Components/ListToolbar';
import { DataPagination } from '@/Components/DataPagination';
import { DataState } from '@/Components/DataState';
import { useFeedback } from '@/Components/Feedback';

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  account_id: '',
  area_id: null as number | null,
};

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () => api.getContacts({ page: String(page), ...(search ? { search } : {}) }),
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts(),
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

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        account_id: form.account_id ? Number(form.account_id) : undefined,
        area_id: form.area_id ?? undefined,
      };
      return editing
        ? api.updateContact(editing.id, payload)
        : api.createContact(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      notify(editing ? 'Contact updated.' : 'Contact created.');
      closeForm();
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Contact could not be saved.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      notify('Contact deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Contact could not be deleted.'), 'error'),
  });

  const handleAccountChange = (accountId: string) => {
    const account = accounts?.data.find((a) => String(a.id) === accountId);
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
          <Button variant={isFormOpen ? 'outline' : 'default'} onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            {isFormOpen ? <X size={16} /> : <Plus size={16} />}
            {isFormOpen ? 'Close form' : 'New contact'}
          </Button>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Contact' : 'Add Contact'}
          description={editing ? 'Update contact details.' : 'Enter contact details and link them to their shop or company.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update Contact' : 'Save Contact'}
          isSubmitting={saveMutation.isPending}
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
                >
                  <SelectTrigger id="account_id" className="w-full">
                    <SelectValue placeholder="Select shop or company" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.data.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                        {a.area ? ` â€” ${formatAreaLocation(a.area)}` : ''}
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
            setSearch(value.trim());
            setPage(1);
          }}
          placeholder="Search by name or email"
          resultLabel={data ? `${data.total} contact${data.total === 1 ? '' : 's'}` : undefined}
        />
        <CardContent className="p-0">
          {isError ? (
            <DataState
              tone="error"
              title="Contacts could not be loaded"
              description="Check your connection and try loading the contact list again."
              actionLabel="Try again"
              onAction={() => refetch()}
            />
          ) : (
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shop / Company</TableHead>
                <TableHead>Location</TableHead>
                <ActionsTableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <DataState
                      compact
                      title={search ? 'No contacts match this search' : 'No contacts yet'}
                      description={search ? 'Try a different name or email.' : 'Create your first contact to start building customer context.'}
                      actionLabel={search ? 'Clear search' : 'Create contact'}
                      onAction={() => search ? (setSearch(''), setSearchInput(''), setPage(1)) : openCreate()}
                    />
                  </TableCell>
                </TableRow>
              ) : data?.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || 'â€”'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || 'â€”'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.account?.name || 'â€”'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatAreaLocation(c.area ?? c.account?.area)}
                  </TableCell>
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
          )}
        </CardContent>
        {data && <DataPagination page={data.current_page} lastPage={data.last_page} total={data.total} onPageChange={setPage} />}
      </Card>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

import { useState } from 'react';
import { Plus, ArrowRightCircle, X } from 'lucide-react';
import { useSubmit, visitFilters } from '@/lib/submit';
import { useCan } from '@/hooks/useCan';
import type { Contact, Lead, Paginated } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
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

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  new: 'default',
  contacted: 'secondary',
  qualified: 'outline',
  converted: 'default',
  disqualified: 'destructive',
};

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company: '',
  source: '',
  source_contact_id: '' as string,
};

interface LeadsPageProps {
  leads: Paginated<Lead>;
  contacts: Contact[];
  filters: { search: string };
}

export default function LeadsPage({ leads, contacts = [], filters }: LeadsPageProps) {
  const { processing, submit } = useSubmit();
  const { can } = useCan();
  const canCreate = can('leads.create');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [convertingId, setConvertingId] = useState<number | null>(null);

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

  const openEdit = (lead: Lead) => {
    setShowForm(false);
    setEditing(lead);
    setForm({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      company: lead.company ?? '',
      source: lead.source ?? '',
      source_contact_id: lead.source_contact_id ? String(lead.source_contact_id) : '',
    });
  };

  const applyContact = (contactId: string) => {
    if (!contactId) {
      setForm({ ...form, source_contact_id: '' });
      return;
    }

    const contact = contacts.find((c) => String(c.id) === contactId);
    if (!contact) return;

    setForm({
      ...form,
      source_contact_id: contactId,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      company: contact.account?.name ?? form.company,
      source: form.source || 'Contact',
    });
  };

  const handleSave = () => {
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      company: form.company || undefined,
      source: form.source || undefined,
      ...(editing ? {} : {
        source_contact_id: form.source_contact_id ? Number(form.source_contact_id) : undefined,
      }),
    };

    if (editing) {
      submit('put', `/leads/${editing.id}`, payload, { onSuccess: closeForm });
    } else {
      submit('post', '/leads', payload, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    submit('delete', `/leads/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleConvert = (id: number) => {
    setConvertingId(id);
    submit('post', `/leads/${id}/convert`, {}, {
      onSuccess: () => setConvertingId(null),
      onError: () => setConvertingId(null),
    });
  };

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acquisition"
        title="Leads"
        description="Qualify new interest, understand its source, and move the right prospects forward."
        action={
          (canCreate || isFormOpen) && (
            <Button variant={isFormOpen ? 'outline' : 'default'} onClick={() => (isFormOpen ? closeForm() : openCreate())}>
              {isFormOpen ? <X size={16} /> : <Plus size={16} />}
              {isFormOpen ? 'Close form' : 'New lead'}
            </Button>
          )
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Lead' : 'Add Lead'}
          description={editing ? 'Update prospect details.' : 'Capture a new prospect, or pull details from an existing contact.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          submitLabel={editing ? 'Update Lead' : 'Save Lead'}
          isSubmitting={processing}
        >
          {!editing && contacts.length > 0 && (
            <FormSection title="From Contact">
              <FormGrid cols={1}>
                <FormField
                  label="Existing contact"
                  htmlFor="lead_source_contact"
                  hint="Select a contact to fill name, email, phone, and company"
                >
                  <Select
                    value={form.source_contact_id}
                    onValueChange={(value) => applyContact(value ?? '')}
                    items={contacts.map((c) => ({
                      value: String(c.id),
                      label: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ''}${c.account?.name ? ` - ${c.account.name}` : ''}`,
                    }))}
                  >
                    <SelectTrigger id="lead_source_contact" className="w-full">
                      <SelectValue placeholder="Optional - pick a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.first_name} {c.last_name}
                          {c.email ? ` (${c.email})` : ''}
                          {c.account?.name ? ` - ${c.account.name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          <FormSection title="Prospect Details">
            <FormGrid cols={2}>
              <FormField label="First name" htmlFor="lead_first_name" required>
                <Input
                  id="lead_first_name"
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Last name" htmlFor="lead_last_name" required>
                <Input
                  id="lead_last_name"
                  placeholder="Smith"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Email" htmlFor="lead_email">
                <Input
                  id="lead_email"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </FormField>
              <FormField label="Phone" htmlFor="lead_phone">
                <Input
                  id="lead_phone"
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </FormField>
              <FormField label="Company" htmlFor="lead_company">
                <Input
                  id="lead_company"
                  placeholder="Company name"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Attribution">
            <FormGrid cols={1}>
              <FormField label="Lead source" htmlFor="lead_source" hint="Where did this lead come from?">
                <Input
                  id="lead_source"
                  placeholder="Website, Referral, Event..."
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
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
            visitFilters('/leads', { search: value.trim(), page: 1 });
          }}
          placeholder="Search by name or company"
          resultLabel={`${leads.total} lead${leads.total === 1 ? '' : 's'}`}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <ActionsTableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <DataState
                      compact
                      title={filters.search ? 'No leads match this search' : 'No leads yet'}
                      description={filters.search ? 'Try another name or company.' : 'Capture your first prospect to begin qualification.'}
                      actionLabel={filters.search ? 'Clear search' : 'Create lead'}
                      onAction={() => filters.search
                        ? (setSearchInput(''), visitFilters('/leads', { search: '', page: 1 }))
                        : openCreate()}
                    />
                  </TableCell>
                </TableRow>
              ) : leads.data.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                  <TableCell>{lead.company || '-'}</TableCell>
                  <TableCell>{lead.source || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lead.score ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[lead.status] ?? 'outline'} className="capitalize">
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => openEdit(lead)}
                      onDelete={() => setDeleteTarget(lead)}
                      disableEdit={lead.status === 'converted'}
                      disableDelete={lead.status === 'converted'}
                      extra={
                        lead.status !== 'converted' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConvert(lead.id)}
                            disabled={convertingId !== null}
                            aria-busy={convertingId === lead.id}
                          >
                            <ArrowRightCircle size={16} />
                            {convertingId === lead.id ? 'Converting...' : 'Convert'}
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
          page={leads.current_page}
          lastPage={leads.last_page}
          total={leads.total}
          onPageChange={(page) => visitFilters('/leads', { search: filters.search, page })}
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

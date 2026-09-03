import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, ArrowRightCircle, X } from 'lucide-react';
import { api, getApiErrorMessage, type Lead } from '../lib/api';
import { PageHeader } from '@/components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/components/forms';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ListToolbar } from '@/components/ListToolbar';
import { DataPagination } from '@/components/DataPagination';
import { DataState } from '@/components/DataState';
import { useFeedback } from '@/components/Feedback';

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
  company: '',
  source: '',
};

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leads', page, search],
    queryFn: () => api.getLeads({ page: String(page), ...(search ? { search } : {}) }),
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

  const openEdit = (lead: Lead) => {
    setShowForm(false);
    setEditing(lead);
    setForm({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email ?? '',
      company: lead.company ?? '',
      source: lead.source ?? '',
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? api.updateLead(editing.id, form)
        : api.createLead(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      notify(editing ? 'Lead updated.' : 'Lead created.');
      closeForm();
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Lead could not be saved.'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      notify('Lead deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Lead could not be deleted.'), 'error'),
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => api.convertLead(id, { create_account: true, create_deal: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['deals-kanban'] });
      notify('Lead converted to a contact and deal.');
    },
    onError: (error) => notify(getApiErrorMessage(error, 'Lead could not be converted.'), 'error'),
  });

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Acquisition"
        title="Leads"
        description="Qualify new interest, understand its source, and move the right prospects forward."
        action={
          <Button variant={isFormOpen ? 'outline' : 'default'} onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            {isFormOpen ? <X size={16} /> : <Plus size={16} />}
            {isFormOpen ? 'Close form' : 'New lead'}
          </Button>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit Lead' : 'Add Lead'}
          description={editing ? 'Update prospect details.' : 'Capture a new prospect before qualification.'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update Lead' : 'Save Lead'}
          isSubmitting={saveMutation.isPending}
        >
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
            setSearch(value.trim());
            setPage(1);
          }}
          placeholder="Search by name or company"
          resultLabel={data ? `${data.total} lead${data.total === 1 ? '' : 's'}` : undefined}
        />
        <CardContent className="p-0">
          {isError ? (
            <DataState
              tone="error"
              title="Leads could not be loaded"
              description="Check your connection and try loading the lead list again."
              actionLabel="Try again"
              onAction={() => refetch()}
            />
          ) : (
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <DataState
                      compact
                      title={search ? 'No leads match this search' : 'No leads yet'}
                      description={search ? 'Try another name or company.' : 'Capture your first prospect to begin qualification.'}
                      actionLabel={search ? 'Clear search' : 'Create lead'}
                      onAction={() => search ? (setSearch(''), setSearchInput(''), setPage(1)) : openCreate()}
                    />
                  </TableCell>
                </TableRow>
              ) : data?.data.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                  <TableCell>{lead.company || '—'}</TableCell>
                  <TableCell>{lead.source || '—'}</TableCell>
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
                            onClick={() => convertMutation.mutate(lead.id)}
                            disabled={convertMutation.isPending}
                            aria-busy={convertMutation.isPending && convertMutation.variables === lead.id}
                          >
                            <ArrowRightCircle size={16} />
                            {convertMutation.isPending && convertMutation.variables === lead.id ? 'Converting...' : 'Convert'}
                          </Button>
                        ) : undefined
                      }
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

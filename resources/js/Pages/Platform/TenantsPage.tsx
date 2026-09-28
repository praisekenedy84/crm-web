import { useEffect, useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { Button, buttonVariants } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

interface TenantRow {
  id: number;
  name: string;
  slug: string;
  plan: string;
  timezone: string;
  default_currency: string;
  enabled_modules: string[];
  users_count: number;
  created_at: string | null;
}

interface PlatformTenantsPageProps {
  tenants: TenantRow[];
  availableModules: string[];
}

const emptyCreate = {
  name: '',
  slug: '',
  plan: 'standard',
  timezone: 'Africa/Nairobi',
  default_currency: 'TZS',
  enabled_modules: ['crm'] as string[],
  admin_name: '',
  admin_email: '',
  admin_password: '',
};

const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM',
  finance: 'Finance',
  inventory: 'Inventory',
  hr: 'HR / People',
  projects: 'Projects',
};

export default function TenantsPage({ tenants, availableModules }: PlatformTenantsPageProps) {
  const { processing, submit } = useSubmit();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [draftModules, setDraftModules] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(tenants.map((t) => [t.id, [...t.enabled_modules]])),
  );

  useEffect(() => {
    setDraftModules(Object.fromEntries(tenants.map((t) => [t.id, [...t.enabled_modules]])));
  }, [tenants]);

  const moduleOptions = useMemo(
    () => availableModules.map((m) => ({ value: m, label: MODULE_LABELS[m] ?? m })),
    [availableModules],
  );

  const toggleCreateModule = (module: string) => {
    setForm((prev) => {
      const set = new Set(prev.enabled_modules);
      if (set.has(module)) set.delete(module);
      else set.add(module);
      return { ...prev, enabled_modules: [...set] };
    });
  };

  const toggleTenantModule = (tenantId: number, module: string) => {
    setDraftModules((prev) => {
      const set = new Set(prev[tenantId] ?? []);
      if (set.has(module)) set.delete(module);
      else set.add(module);
      return { ...prev, [tenantId]: [...set] };
    });
  };

  const isDirty = (tenant: TenantRow) => {
    const a = new Set(tenant.enabled_modules);
    const b = new Set(draftModules[tenant.id] ?? []);
    if (a.size !== b.size) return true;
    for (const m of a) {
      if (!b.has(m)) return true;
    }
    return false;
  };

  const saveModules = (tenant: TenantRow) => {
    submit('put', `/platform/tenants/${tenant.id}/modules`, {
      enabled_modules: draftModules[tenant.id] ?? [],
    });
  };

  const enterTenant = (tenantId: number) => {
    submit('post', `/platform/tenants/${tenantId}/enter`);
  };

  const createTenant = () => {
    submit('post', '/platform/tenants', form, {
      onSuccess: () => {
        setShowCreate(false);
        setForm(emptyCreate);
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants & modules"
        description="Enable product modules per tenant. Tenant admins manage users and roles inside those modules."
        action={(
          <Button onClick={() => setShowCreate((v) => !v)}>
            <Plus className="size-4" />
            New tenant
          </Button>
        )}
      />

      {showCreate && (
        <FormCard
          title="Create tenant"
          description="Provision a workspace with an initial admin user."
          onClose={() => { setShowCreate(false); setForm(emptyCreate); }}
          onSubmit={(e) => { e.preventDefault(); createTenant(); }}
          isSubmitting={processing}
          submitLabel="Create tenant"
        >
          <FormSection title="Workspace">
            <FormGrid>
              <FormField label="Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Slug" hint="Leave blank to auto-generate">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </FormField>
              <FormField label="Plan">
                <Input
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                />
              </FormField>
              <FormField label="Currency">
                <Input
                  value={form.default_currency}
                  onChange={(e) => setForm({ ...form, default_currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </FormField>
            </FormGrid>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Enabled modules</p>
              <div className="flex flex-wrap gap-3">
                {moduleOptions.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.enabled_modules.includes(m.value)}
                      onCheckedChange={() => toggleCreateModule(m.value)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection title="Initial admin">
            <FormGrid>
              <FormField label="Name" required>
                <Input
                  value={form.admin_name}
                  onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Email" required>
                <Input
                  type="email"
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Password" required>
                <Input
                  type="password"
                  value={form.admin_password}
                  onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                  required
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            Tenants
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/platform/tenants/${tenant.id}`}
                        className="font-medium hover:underline"
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {tenant.slug} · {tenant.plan} · {tenant.default_currency}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.users_count}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-3">
                      {moduleOptions.map((m) => (
                        <label key={m.value} className="flex items-center gap-1.5 text-xs">
                          <Checkbox
                            checked={(draftModules[tenant.id] ?? []).includes(m.value)}
                            onCheckedChange={() => toggleTenantModule(tenant.id, m.value)}
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/platform/tenants/${tenant.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                      >
                        Inspect
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={processing || tenant.users_count === 0}
                        onClick={() => enterTenant(tenant.id)}
                      >
                        Enter
                      </Button>
                      <Button
                        size="sm"
                        disabled={processing || !isDirty(tenant)}
                        onClick={() => saveModules(tenant)}
                      >
                        Save
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No tenants yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

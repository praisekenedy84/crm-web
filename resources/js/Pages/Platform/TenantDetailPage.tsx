import { Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, UserRound } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import { PageHeader } from '@/Components/PageHeader';
import { Button, buttonVariants } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

interface TenantDetailPageProps {
  tenant: {
    id: number;
    name: string;
    slug: string;
    plan: string;
    timezone: string;
    default_currency: string;
    enabled_modules: string[];
    created_at: string | null;
  };
  stats: {
    users: number;
    contacts: number;
    accounts: number;
    leads: number;
    deals: number;
    tasks: number;
  };
  users: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    last_login_at: string | null;
  }>;
  audits: Array<{
    id: number;
    user_id: number | null;
    action: string;
    object_type: string;
    object_id: number | null;
    created_at: string | null;
  }>;
  availableModules: string[];
}

const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM',
  finance: 'Finance',
  inventory: 'Inventory',
  hr: 'HR / People',
  projects: 'Projects',
};

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function TenantDetailPage({
  tenant,
  stats,
  users,
  audits,
  availableModules,
}: TenantDetailPageProps) {
  const { processing, submit } = useSubmit();
  const [draftModules, setDraftModules] = useState<string[]>([...tenant.enabled_modules]);

  useEffect(() => {
    setDraftModules([...tenant.enabled_modules]);
  }, [tenant.enabled_modules]);

  const moduleOptions = useMemo(
    () => availableModules.map((m) => ({ value: m, label: MODULE_LABELS[m] ?? m })),
    [availableModules],
  );

  const modulesDirty = useMemo(() => {
    const a = new Set(tenant.enabled_modules);
    const b = new Set(draftModules);
    if (a.size !== b.size) return true;
    for (const m of a) {
      if (!b.has(m)) return true;
    }
    return false;
  }, [tenant.enabled_modules, draftModules]);

  const toggleModule = (module: string) => {
    setDraftModules((prev) => {
      const set = new Set(prev);
      if (set.has(module)) set.delete(module);
      else set.add(module);
      return [...set];
    });
  };

  const saveModules = () => {
    submit('put', `/platform/tenants/${tenant.id}/modules`, {
      enabled_modules: draftModules,
    });
  };

  const enter = () => submit('post', `/platform/tenants/${tenant.id}/enter`);
  const impersonate = (userId: number) =>
    submit('post', `/platform/tenants/${tenant.id}/impersonate/${userId}`);

  const statItems = [
    { label: 'Users', value: stats.users },
    { label: 'Contacts', value: stats.contacts },
    { label: 'Accounts', value: stats.accounts },
    { label: 'Leads', value: stats.leads },
    { label: 'Deals', value: stats.deals },
    { label: 'Tasks', value: stats.tasks },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={tenant.name}
        description={`${tenant.slug} · ${tenant.plan} · ${tenant.default_currency} · ${tenant.timezone}`}
        eyebrow="God Eye"
        action={(
          <div className="flex flex-wrap gap-2">
            <Link
              href="/platform/god-eye"
              className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex items-center gap-2')}
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <Button disabled={processing || users.length === 0} onClick={enter}>
              <Eye className="size-4" />
              Enter workspace
            </Button>
          </div>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statItems.map((item) => (
          <Card key={item.label} className="border-0 shadow-sm ring-1 ring-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-heading text-xl font-semibold tabular-nums">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Modules</CardTitle>
          <Button size="sm" disabled={processing || !modulesDirty} onClick={saveModules}>
            Save modules
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {moduleOptions.map((m) => (
              <label key={m.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draftModules.includes(m.value)}
                  onCheckedChange={() => toggleModule(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4" />
            Users — impersonate
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell className="capitalize">{user.status}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatWhen(user.last_login_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={processing || user.status !== 'active'}
                      onClick={() => impersonate(user.id)}
                    >
                      Impersonate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No users in this tenant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">Recent audit events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {audits.map((row) => (
            <div
              key={row.id}
              className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-medium">{row.action}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.object_type}
                  {row.object_id ? ` #${row.object_id}` : ''}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">{formatWhen(row.created_at)}</p>
            </div>
          ))}
          {audits.length === 0 && (
            <p className="text-sm text-muted-foreground">No audit events for this tenant.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

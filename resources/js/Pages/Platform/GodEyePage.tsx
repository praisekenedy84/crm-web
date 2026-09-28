import { Link } from '@inertiajs/react';
import { Eye, Building2, Users, Contact, Kanban } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import { PageHeader } from '@/Components/PageHeader';
import { Button, buttonVariants } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

interface TenantRow {
  id: number;
  name: string;
  slug: string;
  plan: string;
  enabled_modules: string[];
  users_count: number;
  contacts_count: number;
  leads_count: number;
  deals_count: number;
  tasks_count: number;
}

interface GodEyePageProps {
  summary: {
    tenants: number;
    users: number;
    contacts: number;
    deals: number;
  };
  tenants: TenantRow[];
  recentLogins: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_id: number;
    tenant_name?: string;
    last_login_at: string | null;
  }>;
  recentAudits: Array<{
    id: number;
    tenant_id: number;
    tenant_name?: string;
    user_id: number | null;
    action: string;
    object_type: string;
    object_id: number | null;
    created_at: string | null;
  }>;
  availableModules: string[];
}

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function GodEyePage({ summary, tenants, recentLogins, recentAudits }: GodEyePageProps) {
  const { processing, submit } = useSubmit();

  const enterTenant = (tenantId: number) => {
    submit('post', `/platform/tenants/${tenantId}/enter`);
  };

  const cards = [
    { label: 'Tenants', value: summary.tenants, icon: Building2 },
    { label: 'Users', value: summary.users, icon: Users },
    { label: 'Contacts', value: summary.contacts, icon: Contact },
    { label: 'Deals', value: summary.deals, icon: Kanban },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="God Eye"
        description="Cross-tenant oversight. Open a workspace or impersonate any user."
        eyebrow="Platform"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-0 shadow-sm ring-1 ring-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-heading text-xl font-semibold tabular-nums">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4" />
            Tenant pulse
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>CRM volume</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead className="text-right">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {tenant.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{tenant.slug} · {tenant.plan}</p>
                  </TableCell>
                  <TableCell>{tenant.users_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {tenant.contacts_count} contacts · {tenant.leads_count} leads · {tenant.deals_count} deals
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tenant.enabled_modules.map((m) => (
                        <span
                          key={m}
                          className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/platform/tenants/${tenant.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                      >
                        Inspect
                      </Link>
                      <Button
                        size="sm"
                        disabled={processing || tenant.users_count === 0}
                        onClick={() => enterTenant(tenant.id)}
                      >
                        Enter
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No tenants yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader>
            <CardTitle className="text-base">Recent logins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLogins.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.tenant_name} · {row.role} · {row.email}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatWhen(row.last_login_at)}</p>
              </div>
            ))}
            {recentLogins.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent logins.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader>
            <CardTitle className="text-base">Recent audit trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAudits.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-medium">{row.action}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.tenant_name} · {row.object_type}
                    {row.object_id ? ` #${row.object_id}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">{formatWhen(row.created_at)}</p>
              </div>
            ))}
            {recentAudits.length === 0 && (
              <p className="text-sm text-muted-foreground">No audit events yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

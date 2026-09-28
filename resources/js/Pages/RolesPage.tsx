import { Fragment, useMemo, useState } from 'react';
import { useSubmit } from '@/lib/submit';
import { PageHeader } from '@/Components/PageHeader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

interface RoleRow {
  id: number;
  name: string;
  permissions: string[];
}

interface RolesPageProps {
  roles: RoleRow[];
  permissionGroups: Record<string, string[]>;
}

export default function RolesPage({ roles, permissionGroups }: RolesPageProps) {
  const { processing, submit } = useSubmit();
  const [draft, setDraft] = useState<Record<number, string[]>>(() =>
    Object.fromEntries(roles.map((r) => [r.id, [...r.permissions]])),
  );
  // The matrix needs one column per role, which cannot fit on a phone, so small
  // screens edit a single role at a time instead.
  const [activeRoleId, setActiveRoleId] = useState<number | null>(roles[0]?.id ?? null);

  const flatPermissions = useMemo(
    () => Object.values(permissionGroups).flat(),
    [permissionGroups],
  );

  const toggle = (roleId: number, permission: string) => {
    setDraft((prev) => {
      const current = new Set(prev[roleId] ?? []);
      if (current.has(permission)) {
        current.delete(permission);
      } else {
        current.add(permission);
      }
      return { ...prev, [roleId]: [...current] };
    });
  };

  const saveRole = (role: RoleRow) => {
    submit('put', `/admin/roles/${role.id}`, {
      permissions: draft[role.id] ?? [],
    });
  };

  const isDirty = (role: RoleRow) => {
    const a = new Set(role.permissions);
    const b = new Set(draft[role.id] ?? []);
    if (a.size !== b.size) return true;
    for (const p of a) {
      if (!b.has(p)) return true;
    }
    return false;
  };

  const activeRole = roles.find((r) => r.id === activeRoleId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="Default abilities for each role. Per-user overrides live on the Users page."
      />

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle className="text-base">Permission matrix</CardTitle>
        </CardHeader>
        <CardContent className="md:overflow-x-auto">
          <div className="md:hidden">
            <p className="text-xs font-medium text-muted-foreground">Editing role</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {roles.map((role) => (
                <Button
                  key={role.id}
                  size="sm"
                  variant={role.id === activeRoleId ? 'default' : 'outline'}
                  onClick={() => setActiveRoleId(role.id)}
                  aria-pressed={role.id === activeRoleId}
                  className="capitalize"
                >
                  {role.name}
                  {isDirty(role) && (
                    <span className="ml-1 size-1.5 rounded-full bg-current" aria-label="unsaved changes" />
                  )}
                </Button>
              ))}
            </div>

            {activeRole && (
              <div className="mt-5 space-y-5">
                {Object.entries(permissionGroups).map(([group, perms]) => (
                  <div key={group}>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {group}
                    </p>
                    <div className="mt-2 divide-y divide-border/70 overflow-hidden rounded-xl ring-1 ring-border/70">
                      {perms.map((permission) => (
                        <label
                          key={permission}
                          className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
                        >
                          <span className="min-w-0 font-mono text-xs break-all">{permission}</span>
                          <input
                            type="checkbox"
                            className="size-5 shrink-0 accent-primary"
                            checked={(draft[activeRole.id] ?? []).includes(permission)}
                            onChange={() => toggle(activeRole.id, permission)}
                            aria-label={`${activeRole.name} ${permission}`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <Button
                  size="lg"
                  disabled={processing || !isDirty(activeRole)}
                  onClick={() => saveRole(activeRole)}
                  className="w-full capitalize"
                >
                  Save {activeRole.name}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {flatPermissions.length} permissions across {roles.length} roles
                </p>
              </div>
            )}
          </div>

          <Table className="max-md:hidden">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[220px] bg-card">Permission</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="min-w-[110px] text-center capitalize">
                    {role.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(permissionGroups).map(([group, perms]) => (
                <Fragment key={group}>
                  <TableRow>
                    <TableCell
                      colSpan={roles.length + 1}
                      className="bg-muted/40 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {group}
                    </TableCell>
                  </TableRow>
                  {perms.map((permission) => (
                    <TableRow key={permission}>
                      <TableCell className="sticky left-0 z-10 bg-card font-mono text-xs">
                        {permission}
                      </TableCell>
                      {roles.map((role) => (
                        <TableCell key={`${role.id}-${permission}`} className="text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={(draft[role.id] ?? []).includes(permission)}
                            onChange={() => toggle(role.id, permission)}
                            aria-label={`${role.name} ${permission}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex flex-wrap gap-2 max-md:hidden">
            {roles.map((role) => (
              <Button
                key={role.id}
                size="sm"
                disabled={processing || !isDirty(role)}
                onClick={() => saveRole(role)}
                className="capitalize"
              >
                Save {role.name}
              </Button>
            ))}
            <p className="w-full text-xs text-muted-foreground">
              {flatPermissions.length} permissions across {roles.length} roles
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

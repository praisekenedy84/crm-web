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
        <CardContent className="overflow-x-auto">
          <Table>
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

          <div className="mt-6 flex flex-wrap gap-2">
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

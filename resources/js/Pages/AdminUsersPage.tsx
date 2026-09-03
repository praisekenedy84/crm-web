import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useSubmit } from '@/lib/submit';
import { useCan } from '@/hooks/useCan';
import type { SharedPageProps, User } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
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

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'rep',
  status: 'active',
  direct_permissions: [] as string[],
};

interface AdminUser extends User {
  direct_permissions?: string[];
}

interface AdminUsersPageProps {
  users: AdminUser[];
  permissionGroups: Record<string, string[]>;
}

export default function AdminUsersPage({ users, permissionGroups }: AdminUsersPageProps) {
  const authUser = usePage<SharedPageProps>().props.auth.user;
  const { can } = useCan();
  const canManage = can('users.manage');
  const { processing, submit } = useSubmit();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showOverrides, setShowOverrides] = useState(false);

  useEffect(() => {
    if (!can('users.view')) {
      router.visit('/');
    }
  }, [can]);

  if (!can('users.view')) return null;

  const resetForm = () => setForm(emptyForm);

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setShowOverrides(false);
    resetForm();
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowOverrides(false);
    setShowForm(true);
  };

  const openEdit = (u: AdminUser) => {
    setShowForm(false);
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status ?? 'active',
      direct_permissions: [...(u.direct_permissions ?? [])],
    });
    setShowOverrides((u.direct_permissions?.length ?? 0) > 0);
  };

  const toggleDirect = (permission: string) => {
    setForm((prev) => {
      const set = new Set(prev.direct_permissions);
      if (set.has(permission)) set.delete(permission);
      else set.add(permission);
      return { ...prev, direct_permissions: [...set] };
    });
  };

  const handleSave = () => {
    if (!canManage) return;

    if (editing) {
      submit('put', `/admin/users/${editing.id}`, {
        name: form.name,
        email: form.email,
        role: form.role,
        status: form.status,
        direct_permissions: form.direct_permissions,
        ...(form.password ? { password: form.password } : {}),
      }, { onSuccess: closeForm });
    } else {
      submit('post', '/admin/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        direct_permissions: form.direct_permissions,
      }, { onSuccess: closeForm });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget || !canManage) return;
    submit('delete', `/admin/users/${deleteTarget.id}`, {}, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const isFormOpen = showForm || editing !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Assign roles and optional permission overrides"
        action={
          canManage ? (
            <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
              <Plus size={16} />
              {isFormOpen ? 'Close' : 'New User'}
            </Button>
          ) : undefined
        }
      />

      {isFormOpen && canManage && (
        <FormCard
          title={editing ? 'Edit User' : 'Add User'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          submitLabel={editing ? 'Update User' : 'Save User'}
          isSubmitting={processing}
        >
          <FormSection title="User Details">
            <FormGrid cols={2}>
              <FormField label="Name" htmlFor="user_name" required>
                <Input
                  id="user_name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </FormField>
              <FormField label="Email" htmlFor="user_email" required>
                <Input
                  id="user_email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </FormField>
              <FormField
                label={editing ? 'New password' : 'Password'}
                htmlFor="user_password"
                hint={editing ? 'Leave blank to keep current password' : 'Min 8 chars, mixed case and numbers'}
                required={!editing}
              >
                <Input
                  id="user_password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                />
              </FormField>
              <FormField label="Role" htmlFor="user_role" required>
                <Select
                  value={form.role}
                  onValueChange={(value) => value && setForm({ ...form, role: value })}
                >
                  <SelectTrigger id="user_role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="rep">Rep</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="readonly">Readonly</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {editing && (
                <FormField label="Status" htmlFor="user_status">
                  <Select
                    value={form.status}
                    onValueChange={(value) => value && setForm({ ...form, status: value })}
                  >
                    <SelectTrigger id="user_status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </FormGrid>
          </FormSection>

          <FormSection title="Permission overrides">
            <p className="mb-3 text-sm text-muted-foreground">
              Direct permissions on top of the role defaults. Leave empty to use the role matrix only.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowOverrides((v) => !v)}
            >
              {showOverrides ? 'Hide overrides' : 'Show override checklist'}
            </Button>
            {showOverrides && (
              <div className="mt-4 max-h-72 space-y-4 overflow-y-auto rounded-lg border border-border/70 p-4">
                {Object.entries(permissionGroups).map(([group, perms]) => (
                  <div key={group}>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {group}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perms.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center gap-2 text-xs font-mono"
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={form.direct_permissions.includes(permission)}
                            onChange={() => toggleDirect(permission)}
                          />
                          {permission}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        </FormCard>
      )}

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Overrides</TableHead>
                <TableHead>Last Login</TableHead>
                {canManage && <ActionsTableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">{u.role}</TableCell>
                  <TableCell className="capitalize">{u.status ?? 'active'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.direct_permissions?.length ? u.direct_permissions.length : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '-'}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <RowActions
                        onEdit={() => openEdit(u)}
                        onDelete={() => setDeleteTarget(u)}
                        disableDelete={u.id === authUser?.id}
                      />
                    </TableCell>
                  )}
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, type User } from '../lib/api';
import { PageHeader } from '@/components/PageHeader';
import { FormCard, FormField, FormGrid, FormSection } from '@/components/forms';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  status: 'active',
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: api.getUsers,
    enabled: user?.role === 'admin',
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

  const openEdit = (u: User) => {
    setShowForm(false);
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      status: u.status ?? 'active',
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) {
        const payload: Record<string, string> = {
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
        };
        if (form.password) payload.password = form.password;
        return api.updateUser(editing.id, payload);
      }
      return api.createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
  });

  const isFormOpen = showForm || editing !== null;

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Admin-only user administration"
        action={
          <Button onClick={() => (isFormOpen ? closeForm() : openCreate())}>
            <Plus size={16} />
            New User
          </Button>
        }
      />

      {isFormOpen && (
        <FormCard
          title={editing ? 'Edit User' : 'Add User'}
          onClose={closeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          submitLabel={editing ? 'Update User' : 'Save User'}
          isSubmitting={saveMutation.isPending}
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
                    <SelectItem value="user">User</SelectItem>
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
                <TableHead>Last Login</TableHead>
                <ActionsTableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Skeleton className="mx-auto h-4 w-24" />
                  </TableCell>
                </TableRow>
              ) : users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">{u.role}</TableCell>
                  <TableCell className="capitalize">{u.status ?? 'active'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => openEdit(u)}
                      onDelete={() => setDeleteTarget(u)}
                      disableDelete={u.id === user?.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.name}?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}

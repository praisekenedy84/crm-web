import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Employee, type LeaveRequest } from '../lib/api';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import { FormCard, FormField, FormGrid, FormSection } from '@/components/forms';
import { Input } from '@/components/ui/input';

type Tab = 'leave' | 'employees';

const emptyEmployeeForm = {
  party_id: '',
  department: '',
  job_title: '',
};

export default function HrPage() {
  const [tab, setTab] = useState<Tab>('leave');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canApprove = user?.role === 'admin' || user?.role === 'manager';

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [deleteLeave, setDeleteLeave] = useState<LeaveRequest | null>(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);

  const { data: leaveRequests, isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => api.getLeaveRequests(),
    enabled: tab === 'leave',
  });

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees(),
    enabled: tab === 'employees',
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.approveLeaveRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (id: number) => api.deleteLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setDeleteLeave(null);
    },
  });

  const resetEmployeeForm = () => setEmployeeForm(emptyEmployeeForm);

  const closeEmployeeForm = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    resetEmployeeForm();
  };

  const saveEmployeeMutation = useMutation({
    mutationFn: () => {
      const payload = {
        party_id: Number(employeeForm.party_id),
        department: employeeForm.department || undefined,
        job_title: employeeForm.job_title || undefined,
      };
      return editingEmployee
        ? api.updateEmployee(editingEmployee.id, payload)
        : api.createEmployee(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeEmployeeForm();
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: number) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteEmployee(null);
    },
  });

  const isLoading = tab === 'leave' ? leaveLoading : employeesLoading;
  const isEmployeeFormOpen = showEmployeeForm || editingEmployee !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Human Resources</h1>
          <p className="mt-1 text-muted-foreground">Leave requests and employee directory</p>
        </div>
        {tab === 'employees' && (
          <Button onClick={() => (isEmployeeFormOpen ? closeEmployeeForm() : (setShowEmployeeForm(true)))}>
            New Employee
          </Button>
        )}
      </div>

      {tab === 'employees' && isEmployeeFormOpen && (
        <FormCard
          title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
          onClose={closeEmployeeForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveEmployeeMutation.mutate();
          }}
          submitLabel={editingEmployee ? 'Update Employee' : 'Save Employee'}
          isSubmitting={saveEmployeeMutation.isPending}
        >
          <FormSection title="Employee Details">
            <FormGrid cols={2}>
              <FormField label="Party ID" htmlFor="party_id" required>
                <Input
                  id="party_id"
                  type="number"
                  value={employeeForm.party_id}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, party_id: e.target.value })}
                  required
                  disabled={editingEmployee !== null}
                />
              </FormField>
              <FormField label="Department" htmlFor="department">
                <Input
                  id="department"
                  value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                />
              </FormField>
              <FormField label="Job title" htmlFor="job_title">
                <Input
                  id="job_title"
                  value={employeeForm.job_title}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, job_title: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </FormSection>
        </FormCard>
      )}

      <div className="flex gap-2">
        <Button
          variant={tab === 'leave' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setTab('leave')}
        >
          Leave Requests
        </Button>
        <Button
          variant={tab === 'employees' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setTab('employees')}
        >
          Employees
        </Button>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border/60">
        <CardHeader>
          <CardTitle>{tab === 'leave' ? 'Leave Requests' : 'Employees'}</CardTitle>
        </CardHeader>
        <CardContent>
          {tab === 'leave' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days</TableHead>
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
                ) : leaveRequests?.data.map((lr) => (
                  <TableRow key={lr.id}>
                    <TableCell className="font-medium">
                      {lr.employee_party?.name ?? `#${lr.employee_party_id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lr.leave_type?.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lr.start_date} → {lr.end_date}
                    </TableCell>
                    <TableCell>{lr.days_requested}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{lr.status}</TableCell>
                    <TableCell>
                      <RowActions
                        onDelete={() => setDeleteLeave(lr)}
                        disableDelete={lr.status !== 'pending'}
                        extra={
                          canApprove && lr.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate(lr.id)}
                            >
                              Approve
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

          {tab === 'employees' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <ActionsTableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Skeleton className="mx-auto h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ) : employees?.data.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.party?.name ?? `#${e.party_id}`}</TableCell>
                    <TableCell className="text-muted-foreground">{e.department || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{e.job_title || '—'}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{e.employment_status}</TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => {
                          setShowEmployeeForm(false);
                          setEditingEmployee(e);
                          setEmployeeForm({
                            party_id: String(e.party_id),
                            department: e.department ?? '',
                            job_title: e.job_title ?? '',
                          });
                        }}
                        onDelete={() => setDeleteEmployee(e)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteEmployee !== null}
        title="Delete employee?"
        onConfirm={() => deleteEmployee && deleteEmployeeMutation.mutate(deleteEmployee.id)}
        onCancel={() => setDeleteEmployee(null)}
        isDeleting={deleteEmployeeMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteLeave !== null}
        title="Delete leave request?"
        onConfirm={() => deleteLeave && deleteLeaveMutation.mutate(deleteLeave.id)}
        onCancel={() => setDeleteLeave(null)}
        isDeleting={deleteLeaveMutation.isPending}
      />
    </div>
  );
}

import { useState } from 'react';
import { useSubmit, visitFilters } from '@/lib/submit';
import { useCan } from '@/hooks/useCan';
import type { Employee, LeaveRequest, Paginated } from '@/types';
import { DeleteConfirmDialog } from '@/Components/DeleteConfirmDialog';
import { ActionsTableHead, RowActions } from '@/Components/RowActions';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { FormCard, FormField, FormGrid, FormSection } from '@/Components/forms';
import { Input } from '@/Components/ui/input';

const emptyEmployeeForm = {
  party_id: '',
  department: '',
  job_title: '',
};

interface HrPageProps {
  tab: string;
  leaveRequests: Paginated<LeaveRequest>;
  employees: Paginated<Employee>;
}

export default function HrPage({ tab, leaveRequests, employees }: HrPageProps) {
  const { processing, submit } = useSubmit();
  const { can } = useCan();
  const canApprove = can('hr.leave.approve');
  const canCreateEmployee = can('hr.create');
  const canUpdateEmployee = can('hr.update');
  const canDeleteEmployee = can('hr.delete');

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [deleteLeave, setDeleteLeave] = useState<LeaveRequest | null>(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);

  const resetEmployeeForm = () => setEmployeeForm(emptyEmployeeForm);

  const closeEmployeeForm = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
    resetEmployeeForm();
  };

  const handleApprove = (id: number) => {
    submit('post', `/hr/leave/${id}/approve`);
  };

  const handleSaveEmployee = () => {
    const payload = {
      party_id: Number(employeeForm.party_id),
      department: employeeForm.department || undefined,
      job_title: employeeForm.job_title || undefined,
    };
    if (editingEmployee) {
      submit('put', `/hr/employees/${editingEmployee.id}`, payload, {
        onSuccess: closeEmployeeForm,
      });
    } else {
      submit('post', '/hr/employees', payload, {
        onSuccess: closeEmployeeForm,
      });
    }
  };

  const handleDeleteEmployee = () => {
    if (!deleteEmployee) return;
    submit('delete', `/hr/employees/${deleteEmployee.id}`, {}, {
      onSuccess: () => setDeleteEmployee(null),
    });
  };

  const handleDeleteLeave = () => {
    if (!deleteLeave) return;
    submit('delete', `/hr/leave/${deleteLeave.id}`, {}, {
      onSuccess: () => setDeleteLeave(null),
    });
  };

  const isEmployeeFormOpen = showEmployeeForm || editingEmployee !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Human Resources</h1>
          <p className="mt-1 text-muted-foreground">Leave requests and employee directory</p>
        </div>
        {tab === 'employees' && (canCreateEmployee || isEmployeeFormOpen) && (
          <Button onClick={() => (isEmployeeFormOpen ? closeEmployeeForm() : (setShowEmployeeForm(true)))}>
            {isEmployeeFormOpen ? 'Close' : 'New Employee'}
          </Button>
        )}
      </div>

      {tab === 'employees' && isEmployeeFormOpen && (
        <FormCard
          title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
          onClose={closeEmployeeForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEmployee();
          }}
          submitLabel={editingEmployee ? 'Update Employee' : 'Save Employee'}
          isSubmitting={processing}
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
          onClick={() => visitFilters('/hr', { tab: 'leave' })}
        >
          Leave Requests
        </Button>
        <Button
          variant={tab === 'employees' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => visitFilters('/hr', { tab: 'employees' })}
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
                {leaveRequests.data.map((lr) => (
                  <TableRow key={lr.id}>
                    <TableCell className="font-medium">
                      {lr.employee_party?.name ?? `#${lr.employee_party_id}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lr.leave_type?.name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lr.start_date} → {lr.end_date}
                    </TableCell>
                    <TableCell>{lr.days_requested}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{lr.status}</TableCell>
                    <TableCell>
                      <RowActions
                        onDelete={can('hr.delete') ? () => setDeleteLeave(lr) : undefined}
                        disableDelete={lr.status !== 'pending'}
                        extra={
                          canApprove && lr.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(lr.id)}
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
                {employees.data.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.party?.name ?? `#${e.party_id}`}</TableCell>
                    <TableCell className="text-muted-foreground">{e.department || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{e.job_title || '-'}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{e.employment_status}</TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={canUpdateEmployee ? () => {
                          setShowEmployeeForm(false);
                          setEditingEmployee(e);
                          setEmployeeForm({
                            party_id: String(e.party_id),
                            department: e.department ?? '',
                            job_title: e.job_title ?? '',
                          });
                        } : undefined}
                        onDelete={canDeleteEmployee ? () => setDeleteEmployee(e) : undefined}
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
        onConfirm={handleDeleteEmployee}
        onCancel={() => setDeleteEmployee(null)}
        isDeleting={processing}
      />

      <DeleteConfirmDialog
        open={deleteLeave !== null}
        title="Delete leave request?"
        onConfirm={handleDeleteLeave}
        onCancel={() => setDeleteLeave(null)}
        isDeleting={processing}
      />
    </div>
  );
}

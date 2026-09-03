import type { AuditLog, Paginated } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { DataPagination } from '@/Components/DataPagination';
import { DataState } from '@/Components/DataState';
import { visitFilters } from '@/lib/submit';

interface AuditLogsPageProps {
  auditLogs: Paginated<AuditLog>;
}

function objectLabel(type: string): string {
  const parts = type.split('\\');
  return parts[parts.length - 1] ?? type;
}

export default function AuditLogsPage({ auditLogs }: AuditLogsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Audit Logs"
        description="Track who changed what across the workspace - separate from sales analytics."
      />

      <Card className="gap-0 border-0 py-0 shadow-sm ring-1 ring-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Object</TableHead>
                <TableHead>User</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-0">
                    <DataState
                      compact
                      title="No audit events yet"
                      description="Creates, updates, and deletes will appear here as your team works."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium capitalize">{log.action.replace(/[._]/g, ' ')}</TableCell>
                    <TableCell>
                      {objectLabel(log.object_type)} #{log.object_id}
                    </TableCell>
                    <TableCell>{log.user?.name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <DataPagination
          page={auditLogs.current_page}
          lastPage={auditLogs.last_page}
          total={auditLogs.total}
          onPageChange={(page) => visitFilters('/audit-logs', { page })}
        />
      </Card>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function AnalyticsPage() {
  const { data: analytics } = useQuery({ queryKey: ['analytics'], queryFn: api.getAnalytics });
  const { data: auditLogs } = useQuery({ queryKey: ['audit-logs'], queryFn: api.getAuditLogs });

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Analytics</h1>
      <p className="mt-1 text-muted-foreground">Advanced insights and audit trail</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analytics && Object.entries(analytics.counts).map(([key, val]) => (
          <Card key={key}>
            <CardHeader>
              <CardDescription className="uppercase">{key.replace(/_/g, ' ')}</CardDescription>
              <CardTitle className="text-2xl">{val}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Won Total</span>
              <span className="font-semibold">{fmt(analytics?.revenue.won_total ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pipeline Total</span>
              <span className="font-semibold">{fmt(analytics?.revenue.pipeline_total ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Days to Close</span>
              <span className="font-semibold">{analytics?.deal_velocity ? Math.round(analytics.deal_velocity) : '—'} days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Lead Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics?.top_lead_sources.map((s) => (
              <div key={s.source} className="flex justify-between text-sm">
                <span>{s.source ?? 'Unknown'}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(analytics?.finance || analytics?.inventory || analytics?.hr || analytics?.projects) && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Cross-Module Overview</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analytics.finance && (
              <>
                <Card>
                  <CardHeader>
                    <CardDescription>Outstanding AR</CardDescription>
                    <CardTitle className="text-xl">{fmt(analytics.finance.outstanding_receivables)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Paid This Month</CardDescription>
                    <CardTitle className="text-xl">{fmt(analytics.finance.paid_this_month)}</CardTitle>
                  </CardHeader>
                </Card>
              </>
            )}
            {analytics.inventory && (
              <Card>
                <CardHeader>
                  <CardDescription>Stock Value</CardDescription>
                  <CardTitle className="text-xl">{fmt(analytics.inventory.stock_value)}</CardTitle>
                </CardHeader>
              </Card>
            )}
            {analytics.hr && (
              <Card>
                <CardHeader>
                  <CardDescription>Headcount Cost / Month</CardDescription>
                  <CardTitle className="text-xl">{fmt(analytics.hr.payroll_cost_this_month)}</CardTitle>
                </CardHeader>
              </Card>
            )}
            {analytics.projects && (
              <Card>
                <CardHeader>
                  <CardDescription>Active Project Budget</CardDescription>
                  <CardTitle className="text-xl">{fmt(analytics.projects.total_budget)}</CardTitle>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
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
              {auditLogs?.data.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.object_type} #{log.object_id}</TableCell>
                  <TableCell>{log.user?.name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

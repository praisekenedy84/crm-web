import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function ReportsPage() {
  const range = defaultDateRange();

  const { data: forecast } = useQuery({ queryKey: ['forecast'], queryFn: api.getForecast });
  const { data: reports } = useQuery({ queryKey: ['custom-reports'], queryFn: api.getCustomReports });
  const { data: visits } = useQuery({
    queryKey: ['visits-by-area', range.from, range.to],
    queryFn: () => api.getVisitsByArea(range),
  });
  const { data: leadsPerRep } = useQuery({
    queryKey: ['leads-per-rep', range.from, range.to],
    queryFn: () => api.getLeadsPerRepPerDay(range),
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Reports & Forecasting</h1>
      <p className="mt-1 text-muted-foreground">Custom reports and weighted sales forecast</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Pipeline</CardDescription>
            <CardTitle className="text-2xl">{fmt(forecast?.totals.pipeline ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Weighted Forecast</CardDescription>
            <CardTitle className="text-2xl">{fmt(forecast?.totals.weighted ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Open Deals</CardDescription>
            <CardTitle className="text-2xl">{forecast?.totals.deal_count ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {forecast?.monthly.map((m) => (
              <div key={m.month} className="flex justify-between text-sm">
                <span>{m.month}</span>
                <span className="font-medium">{fmt(m.weighted_value)} ({m.deal_count} deals)</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports?.length === 0 && <p className="text-sm text-muted-foreground">No custom reports yet</p>}
            {reports?.map((r) => (
              <div key={r.id} className="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>{r.name}</span>
                <span className="text-muted-foreground">{r.object_type} Â· {r.chart_type}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visits by Area</CardTitle>
            <CardDescription>
              Last 30 days Â· {visits?.level ?? 'street'} level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits?.visits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No visits recorded
                    </TableCell>
                  </TableRow>
                )}
                {visits?.visits.map((v, i) => (
                  <TableRow key={`${v.area_id}-${v.owner_id}-${i}`}>
                    <TableCell className="font-medium">{v.area_name}</TableCell>
                    <TableCell className="text-muted-foreground">{v.owner_name}</TableCell>
                    <TableCell>{v.visit_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads per Rep per Day</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsPerRep?.leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No leads recorded
                    </TableCell>
                  </TableRow>
                )}
                {leadsPerRep?.leads.map((l, i) => (
                  <TableRow key={`${l.owner_id}-${l.date}-${i}`}>
                    <TableCell className="font-medium">{l.owner_name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.date}</TableCell>
                    <TableCell>{l.lead_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

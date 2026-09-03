import { useEffect, useState } from 'react';
import type {
  CustomReport,
  ForecastData,
  LeadsPerRepReport,
  SalesDoneReport,
  VisitsByAreaReport,
} from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { visitFilters } from '@/lib/submit';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

interface ReportsPageProps {
  forecast: ForecastData;
  customReports: CustomReport[];
  salesDone: SalesDoneReport;
  visits: VisitsByAreaReport;
  leadsPerRep: LeadsPerRepReport;
  range: { from: string; to: string };
}

export default function ReportsPage({
  forecast,
  customReports,
  salesDone,
  visits,
  leadsPerRep,
  range,
}: ReportsPageProps) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  useEffect(() => {
    setFrom(range.from);
    setTo(range.to);
  }, [range.from, range.to]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  const applyRange = () => {
    visitFilters('/reports', { from, to });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Reports & Forecasting"
        description="Sales closed in range, field activity, and weighted forecast."
      />

      <Card className="border-0 shadow-sm ring-1 ring-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Date range</CardTitle>
          <CardDescription>Filters sales done, visits, and leads for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">From</span>
                <Input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">To</span>
                <Input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
            <Button type="button" onClick={applyRange} disabled={!from || !to || from > to}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Sales Done</CardDescription>
            <CardTitle className="text-2xl">{salesDone.totals.deal_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Revenue Closed</CardDescription>
            <CardTitle className="text-2xl">{fmt(salesDone.totals.revenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pipeline</CardDescription>
            <CardTitle className="text-2xl">{fmt(forecast.totals.pipeline)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Weighted Forecast</CardDescription>
            <CardTitle className="text-2xl">{fmt(forecast.totals.weighted)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Done</CardTitle>
          <CardDescription>
            Won deals closed {range.from} → {range.to}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Account / Contact</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Closed</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesDone.sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No sales closed in this period
                  </TableCell>
                </TableRow>
              ) : (
                salesDone.sales.flatMap((sale) => [
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sale.account_name || sale.contact_name || '-'}
                    </TableCell>
                    <TableCell>{sale.owner_name}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.closed_at || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(sale.value)}</TableCell>
                  </TableRow>,
                  ...(sale.lines?.length
                    ? [
                        <TableRow key={`${sale.id}-lines`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5} className="py-2">
                            <ul className="space-y-1 text-xs text-muted-foreground">
                              {sale.lines.map((line) => (
                                <li key={line.id} className="flex flex-wrap items-center justify-between gap-2">
                                  <span>
                                    {line.quantity} × {line.description}
                                    {line.product_name ? ' · Product' : line.service_name ? ' · Service' : ''}
                                  </span>
                                  <span className="font-medium text-foreground">{fmt(line.total)}</span>
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>,
                      ]
                    : []),
                ])
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {forecast.monthly.length === 0 && (
              <p className="text-sm text-muted-foreground">No open deals with expected close dates</p>
            )}
            {forecast.monthly.map((m) => (
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
            {customReports.length === 0 && <p className="text-sm text-muted-foreground">No custom reports yet</p>}
            {customReports.map((r) => (
              <div key={r.id} className="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>{r.name}</span>
                <span className="text-muted-foreground">{r.object_type} · {r.chart_type}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visits by Area</CardTitle>
            <CardDescription>
              {range.from} → {range.to} · {visits.level} level
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
                {visits.visits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No visits recorded
                    </TableCell>
                  </TableRow>
                )}
                {visits.visits.map((v, i) => (
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
            <CardDescription>
              {range.from} → {range.to}
            </CardDescription>
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
                {leadsPerRep.leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No leads recorded
                    </TableCell>
                  </TableRow>
                )}
                {leadsPerRep.leads.map((l, i) => (
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

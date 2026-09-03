import type { AnalyticsOverview } from '@/types';
import { PageHeader } from '@/Components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';

interface AnalyticsPageProps {
  analytics: AnalyticsOverview;
}

export default function AnalyticsPage({ analytics }: AnalyticsPageProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Sales performance, pipeline health, and cross-module totals."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(analytics.counts).map(([key, val]) => (
          <Card key={key}>
            <CardHeader>
              <CardDescription className="uppercase">{key.replace(/_/g, ' ')}</CardDescription>
              <CardTitle className="text-2xl">{val}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Won Total</span>
              <span className="font-semibold">{fmt(analytics.revenue.won_total ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pipeline Total</span>
              <span className="font-semibold">{fmt(analytics.revenue.pipeline_total ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Days to Close</span>
              <span className="font-semibold">{analytics.deal_velocity ? Math.round(analytics.deal_velocity) : '-'} days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Lead Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.top_lead_sources.length === 0 && (
              <p className="text-sm text-muted-foreground">No lead sources yet</p>
            )}
            {analytics.top_lead_sources.map((s) => (
              <div key={s.source} className="flex justify-between text-sm">
                <span>{s.source ?? 'Unknown'}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(analytics.finance || analytics.inventory || analytics.hr || analytics.projects) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Cross-Module Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}

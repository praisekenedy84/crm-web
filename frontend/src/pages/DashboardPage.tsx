import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleDollarSign, Radio, Scale, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/DataState';
import { PageHeader } from '@/components/PageHeader';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const financeEnabled = user?.tenant?.enabled_modules?.includes('finance') ?? false;

  const { data: pipeline, isLoading: pipelineLoading, isError: pipelineError, refetch: refetchPipeline } = useQuery({
    queryKey: ['pipeline-summary'],
    queryFn: api.getPipelineSummary,
  });

  const { data: conversion, isLoading: conversionLoading, isError: conversionError, refetch: refetchConversion } = useQuery({
    queryKey: ['conversion-rate'],
    queryFn: api.getConversionRate,
  });

  const { data: leaderboard, isLoading: leaderboardLoading, isError: leaderboardError, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: api.getLeaderboard,
  });

  const { data: financialSummary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => api.getFinancialSummary(),
    enabled: financeEnabled,
  });

  const formatCurrency = (n: number, currency = 'TZS') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  const formatNumber = (n: number) =>
    new Intl.NumberFormat('en-US').format(n);

  const maxStageValue = Math.max(...(pipeline?.stages.map((s) => s.total_value) ?? [1]), 1);

  if (pipelineLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (pipelineError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revenue overview" description="Pipeline health, conversion signals, and team momentum." eyebrow="Workspace" />
        <Card className="border-0 ring-1 ring-border/70">
          <DataState
            tone="error"
            title="Dashboard data is unavailable"
            description="We could not load your pipeline summary. Check your connection and try again."
            actionLabel="Try again"
            onAction={() => refetchPipeline()}
          />
        </Card>
      </div>
    );
  }

  const pipelineStages = pipeline?.stages ?? [];
  const sources = conversion?.sources ?? [];
  const reps = leaderboard?.leaderboard ?? [];
  const currency = user?.tenant?.default_currency ?? 'TZS';

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace"
        title="Revenue overview"
        description="Pipeline health, conversion signals, and team momentum."
        action={
          <Button variant="outline" onClick={() => navigate('/deals')}>
            Open pipeline
            <ArrowRight className="size-4" />
          </Button>
        }
      />

      <WelcomeBanner
        name={user?.name ?? 'there'}
        signals={[
          { label: 'Open deals', value: formatNumber(pipeline?.totals.deal_count ?? 0) },
          { label: 'Lead sources', value: formatNumber(sources.length) },
          { label: 'Active reps', value: formatNumber(reps.filter((rep) => rep.deals_won > 0).length) },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open Deals"
          value={formatNumber(pipeline?.totals.deal_count ?? 0)}
          sub="Currently moving through the pipeline"
          icon={Radio}
          tone="primary"
        />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(pipeline?.totals.total_value ?? 0, currency)}
          sub="Total value before probability weighting"
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="Weighted Forecast"
          value={formatCurrency(pipeline?.totals.weighted_value ?? 0, currency)}
          sub="Probability-adjusted pipeline value"
          icon={Scale}
          tone="warning"
        />
        <StatCard
          label="Lead Sources"
          value={String(sources.length)}
          sub="Acquisition channels currently tracked"
          icon={Target}
        />
      </div>

      {financeEnabled && financialSummary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Revenue"
            value={formatCurrency(financialSummary.revenue, currency)}
            sub="Recognized revenue in the current summary"
            tone="success"
          />
          <StatCard
            label="Expenses"
            value={formatCurrency(financialSummary.expenses, currency)}
            sub="Recorded operating expenses"
            tone="warning"
          />
          <StatCard
            label="Net Income"
            value={formatCurrency(financialSummary.net_income, currency)}
            sub="Revenue after recorded expenses"
            tone="primary"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader>
            <div>
              <CardTitle>Pipeline shape</CardTitle>
              <CardDescription>Deal value by stage across the current pipeline</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipelineStages.length === 0 ? (
              <DataState compact title="No pipeline activity yet" description="Create a deal to start seeing stage distribution." actionLabel="Create a deal" onAction={() => navigate('/deals')} />
            ) : pipelineStages.map((stage) => (
              <div key={stage.stage_name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.stage_name}</span>
                  <span className="text-muted-foreground tabular-nums">{formatCurrency(stage.total_value, currency)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(stage.total_value / maxStageValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader>
            <div>
              <CardTitle>Conversion signals</CardTitle>
              <CardDescription>Performance by acquisition source</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {conversionLoading ? (
              <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : conversionError ? (
              <DataState compact tone="error" title="Conversion data unavailable" description="The source report could not be loaded." actionLabel="Try again" onAction={() => refetchConversion()} />
            ) : sources.length === 0 ? (
              <DataState compact title="No conversion data yet" description="Lead source performance will appear after leads begin converting." />
            ) : sources.map((src) => (
              <div key={src.source}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{src.source}</span>
                  <span className="font-semibold text-primary">{src.conversion_rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${src.conversion_rate}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-0 shadow-sm ring-1 ring-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Lead Sources</CardTitle>
            <CardDescription>
              {sources.length} sources tracked
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversionError ? (
              <DataState compact tone="error" title="Sources unavailable" description="Lead-source totals could not be loaded." actionLabel="Try again" onAction={() => refetchConversion()} />
            ) : sources.length === 0 ? (
              <DataState compact title="No sources yet" description="Add lead sources to compare acquisition performance." />
            ) : sources.slice(0, 4).map((src) => (
              <div
                key={src.source}
                className="flex items-center justify-between rounded-xl bg-muted/65 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{src.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {src.converted} converted of {src.total}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{src.conversion_rate}%</p>
                  <p className="text-xs font-medium text-success-foreground">{src.converted} won</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm ring-1 ring-border/60 lg:col-span-3">
          <CardHeader>
            <CardTitle>Rep Leaderboard</CardTitle>
            <CardDescription>Top performers this period</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : leaderboardError ? (
              <DataState compact tone="error" title="Leaderboard unavailable" description="Team performance could not be loaded." actionLabel="Try again" onAction={() => refetchLeaderboard()} />
            ) : reps.length === 0 ? (
              <DataState compact title="No team results yet" description="Won deals will populate the team leaderboard." />
            ) : (
              <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold tracking-wider uppercase">Rep</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase">Deals Won</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase">Revenue</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wider uppercase">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold tracking-wider uppercase">Pipeline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.map((rep) => (
                  <TableRow key={rep.user_id}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell>{rep.deals_won}</TableCell>
                    <TableCell>{formatCurrency(rep.revenue, currency)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          rep.deals_won > 0
                            ? 'bg-success/10 text-success-foreground hover:bg-success/10'
                            : 'bg-warning/15 text-warning-foreground hover:bg-warning/15'
                        }
                      >
                        {rep.deals_won > 0 ? 'Active' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate('/deals')}>View deals</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

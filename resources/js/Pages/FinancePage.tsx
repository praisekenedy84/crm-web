import type { FinancialSummary, Invoice, Paginated } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';

interface FinancePageProps {
  summary: FinancialSummary;
  invoices: Paginated<Invoice>;
}

export default function FinancePage({ summary, invoices }: FinancePageProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Finance</h1>
        <p className="mt-1 text-muted-foreground">Financial summary and invoices</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-2xl">{fmt(summary.revenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Expenses</CardDescription>
            <CardTitle className="text-2xl">{fmt(summary.expenses)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Net Income</CardDescription>
            <CardTitle className="text-2xl">{fmt(summary.net_income)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.data.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.party?.name ?? `#${inv.customer_party_id}`}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.issue_date}</TableCell>
                  <TableCell>{fmt(inv.total_amount)}</TableCell>
                  <TableCell>{fmt(inv.amount_paid)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{inv.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

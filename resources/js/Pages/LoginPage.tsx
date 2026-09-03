import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { FormField } from '@/Components/forms';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Skeleton } from '@/Components/ui/skeleton';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-0 shadow-lg ring-1 ring-border/60">
          <CardHeader className="space-y-2">
            <Skeleton className="mx-auto h-8 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex xl:p-16">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-[22rem] rounded-full border border-white/10" />
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-lg font-bold text-sidebar-primary-foreground">
            N
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-300" />
          </div>
          <div>
            <span className="font-heading text-lg font-semibold text-white">Northstar</span>
            <p className="text-[10px] tracking-[0.16em] text-sidebar-foreground/45 uppercase">Revenue desk</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-sidebar-foreground/70">
            <Sparkles className="size-3.5 text-sidebar-primary" />
            Your workday, in focus
          </div>
          <h1 className="text-balance font-heading text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white xl:text-5xl">
            Turn customer signals into your next best move.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-sidebar-foreground/65">
            Keep relationships, pipeline momentum, and team priorities in one operational view built for action.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
            {['Pipeline clarity', 'Customer context', 'Team focus'].map((label, index) => (
              <div key={label} className="bg-sidebar/85 px-4 py-4">
                <p className="font-heading text-lg font-semibold text-white">0{index + 1}</p>
                <p className="mt-1 text-xs text-sidebar-foreground/55">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/45">
          <ShieldCheck className="size-4" />
          Secure tenant workspace
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <Card className="w-full max-w-md border-0 bg-card shadow-2xl shadow-foreground/10 ring-1 ring-border/70">
          <CardHeader className="px-6 pt-7 text-left sm:px-8 sm:pt-8">
            <div className="mb-5 flex items-center gap-2.5 lg:hidden">
              <div className="relative flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                N
                <span className="absolute right-1 top-1 size-1 rounded-full bg-emerald-300" />
              </div>
              <span className="font-heading text-base font-semibold">Northstar</span>
            </div>
            <CardTitle className="font-heading text-2xl font-semibold tracking-[-0.035em]">Welcome back</CardTitle>
            <CardDescription className="mt-1">Sign in to continue to your workspace.</CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-7 pt-4 sm:px-8 sm:pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                />
              </FormField>

              <FormField label="Password" htmlFor="password" required>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </FormField>

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting} aria-busy={submitting}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardContent } from '@/components/ui/card';

interface WelcomeBannerProps {
  name: string;
  message?: string;
  signals?: { label: string; value: string }[];
}

export function WelcomeBanner({
  name,
  message = 'Here is the current shape of your revenue operation.',
  signals = [],
}: WelcomeBannerProps) {
  const firstName = name.split(' ')[0];

  return (
    <Card className="relative overflow-hidden border-0 bg-sidebar text-sidebar-foreground shadow-xl shadow-foreground/5">
      <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full border border-white/10" />
      <CardContent className="relative py-5 sm:py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-sidebar-primary uppercase">Daily brief</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Good to see you, {firstName}.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-sidebar-foreground/60">{message}</p>
          </div>
          {signals.length > 0 && (
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:min-w-[420px]">
              {signals.map((signal, index) => (
                <div key={signal.label} className="relative bg-sidebar/90 px-4 py-3">
                  <span className="absolute left-0 top-0 h-full w-0.5 bg-sidebar-primary" style={{ opacity: 1 - index * 0.2 }} />
                  <p className="text-[10px] tracking-wide text-sidebar-foreground/45 uppercase">{signal.label}</p>
                  <p className="mt-1 font-heading text-base font-semibold text-white tabular-nums">{signal.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

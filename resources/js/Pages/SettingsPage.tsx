import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';

export default function SettingsPage() {
  const { data: webhooks } = useQuery({ queryKey: ['webhooks'], queryFn: api.getWebhooks });
  const { data: rules } = useQuery({ queryKey: ['automation'], queryFn: api.getAutomationRules });
  const { data: templates } = useQuery({ queryKey: ['email-templates'], queryFn: api.getEmailTemplates });
  const { data: territories } = useQuery({ queryKey: ['territories'], queryFn: api.getTerritories });
  const { data: scoreRules } = useQuery({ queryKey: ['lead-scores'], queryFn: api.getLeadScoreRules });
  const { data: apiKeys } = useQuery({ queryKey: ['api-keys'], queryFn: api.getApiKeys });

  const sections = [
    { title: 'Automation Rules', items: rules?.map((r) => r.name) ?? [] },
    { title: 'Webhooks', items: webhooks?.map((w) => w.url) ?? [] },
    { title: 'Email Templates', items: templates?.map((t) => t.name) ?? [] },
    { title: 'Territories', items: territories?.map((t) => t.name) ?? [] },
    { title: 'Lead Scoring Rules', items: scoreRules?.map((r) => `${r.name} (+${r.points})`) ?? [] },
    { title: 'API Keys', items: apiKeys?.map((k) => `${k.name} (${k.key_prefix}â€¦`) ?? [] },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Settings</h1>
      <p className="mt-1 text-muted-foreground">Automation, integrations, and configuration</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {sections.map(({ title, items }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items configured</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="rounded-lg bg-muted px-3 py-2 text-sm">{item}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import type {
  ApiKeyRecord,
  AutomationRule,
  EmailTemplate,
  LeadScoreRule,
  Territory,
  Webhook,
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';

interface SettingsPageProps {
  automationRules: Pick<AutomationRule, 'id' | 'name'>[];
  webhooks: Pick<Webhook, 'id' | 'url'>[];
  emailTemplates: Pick<EmailTemplate, 'id' | 'name'>[];
  territories: Pick<Territory, 'id' | 'name'>[];
  leadScoreRules: Pick<LeadScoreRule, 'id' | 'name' | 'points'>[];
  apiKeys: Pick<ApiKeyRecord, 'id' | 'name' | 'key_prefix'>[];
}

export default function SettingsPage({
  automationRules,
  webhooks,
  emailTemplates,
  territories,
  leadScoreRules,
  apiKeys,
}: SettingsPageProps) {
  const sections = [
    { title: 'Automation Rules', items: automationRules.map((r) => r.name) },
    { title: 'Webhooks', items: webhooks.map((w) => w.url) },
    { title: 'Email Templates', items: emailTemplates.map((t) => t.name) },
    { title: 'Territories', items: territories.map((t) => t.name) },
    { title: 'Lead Scoring Rules', items: leadScoreRules.map((r) => `${r.name} (+${r.points})`) },
    { title: 'API Keys', items: apiKeys.map((k) => `${k.name} (${k.key_prefix}...)`) },
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

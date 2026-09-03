<?php

namespace Database\Seeders;

use App\Enums\ContactStatus;
use App\Enums\LeadStatus;
use App\Enums\UserRole;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CrmSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::query()->firstOrCreate(
            ['slug' => 'demo'],
            [
                'name' => 'Demo Company',
                'plan' => 'standard',
                'timezone' => 'Africa/Nairobi',
                'default_currency' => 'TZS',
            ],
        );

        TenantContext::set($tenant);

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@demo.com'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Admin User',
                'password' => Hash::make('Password1'),
                'role' => UserRole::Admin,
                'status' => 'active',
            ],
        );
        $admin->syncPrimaryRole(UserRole::Admin);

        $rep = User::query()->firstOrCreate(
            ['email' => 'rep@demo.com'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Sales Rep',
                'password' => Hash::make('Password1'),
                'role' => UserRole::Rep,
                'status' => 'active',
            ],
        );
        $rep->syncPrimaryRole(UserRole::Rep);

        $pipeline = Pipeline::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Default Sales Pipeline',
            ],
            ['is_default' => true],
        );

        $stageDefs = [
            ['name' => 'Prospecting', 'sort_order' => 1, 'probability' => 10],
            ['name' => 'Qualified', 'sort_order' => 2, 'probability' => 30],
            ['name' => 'Proposal', 'sort_order' => 3, 'probability' => 50],
            ['name' => 'Negotiation', 'sort_order' => 4, 'probability' => 70],
            ['name' => 'Won', 'sort_order' => 5, 'probability' => 100, 'is_closed' => true, 'is_won' => true],
            ['name' => 'Lost', 'sort_order' => 6, 'probability' => 0, 'is_closed' => true, 'is_won' => false],
        ];

        $createdStages = [];
        foreach ($stageDefs as $stage) {
            $createdStages[] = PipelineStage::query()->firstOrCreate(
                [
                    'pipeline_id' => $pipeline->id,
                    'name' => $stage['name'],
                ],
                $stage,
            );
        }

        $account = Account::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Acme Corporation',
            ],
            [
                'industry' => 'Technology',
                'website' => 'https://acme.example.com',
                'owner_id' => $rep->id,
            ],
        );

        $contact = Contact::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'email' => 'jane.doe@acme.example.com',
            ],
            [
                'account_id' => $account->id,
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'phone' => '+254712345678',
                'title' => 'VP Sales',
                'status' => ContactStatus::Inquiry,
                'owner_id' => $rep->id,
            ],
        );

        Lead::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'email' => 'john@startup.io',
            ],
            [
                'first_name' => 'John',
                'last_name' => 'Smith',
                'company' => 'Startup IO',
                'source' => 'Website',
                'campaign' => 'Q3 Launch',
                'status' => LeadStatus::New,
                'owner_id' => $rep->id,
            ],
        );

        Lead::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'email' => 'mary@referral.com',
            ],
            [
                'first_name' => 'Mary',
                'last_name' => 'Johnson',
                'company' => 'Referral Co',
                'source' => 'Referral',
                'status' => LeadStatus::Contacted,
                'owner_id' => $rep->id,
            ],
        );

        Deal::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Acme Enterprise License',
            ],
            [
                'pipeline_id' => $pipeline->id,
                'stage_id' => $createdStages[2]->id,
                'account_id' => $account->id,
                'contact_id' => $contact->id,
                'value' => 25000,
                'currency' => 'TZS',
                'owner_id' => $rep->id,
                'expected_close_date' => now()->addDays(30),
                'probability' => 50,
                'status' => 'open',
            ],
        );

        Deal::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Startup IO Pilot',
            ],
            [
                'pipeline_id' => $pipeline->id,
                'stage_id' => $createdStages[1]->id,
                'value' => 5000,
                'currency' => 'TZS',
                'owner_id' => $rep->id,
                'expected_close_date' => now()->addDays(14),
                'probability' => 30,
                'status' => 'open',
            ],
        );

        \App\Models\EmailTemplate::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Welcome Email',
            ],
            [
                'subject' => 'Hello {{contact.first_name}}!',
                'body' => "Hi {{contact.full_name}},\n\nThank you for your interest in {{account.name}}.",
            ],
        );

        \App\Models\AutomationRule::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'New Lead Follow-up',
            ],
            [
                'trigger_event' => 'record.created',
                'object_type' => \App\Models\Lead::class,
                'conditions' => [],
                'actions' => [
                    ['type' => 'create_task', 'title' => 'Follow up with new lead', 'due_days' => 1, 'priority' => 'high'],
                ],
                'is_active' => true,
            ],
        );

        \App\Models\LeadScoreRule::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Website source bonus',
            ],
            [
                'field' => 'source',
                'operator' => 'equals',
                'value' => 'Website',
                'points' => 20,
                'is_active' => true,
            ],
        );

        \App\Models\LeadScoreRule::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'Has email',
            ],
            [
                'field' => 'email',
                'operator' => 'not_empty',
                'value' => null,
                'points' => 10,
                'is_active' => true,
            ],
        );

        $territory = \App\Models\Territory::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name' => 'East Africa',
            ],
            [
                'rules' => ['regions' => ['KE', 'TZ', 'UG']],
            ],
        );
        $territory->users()->syncWithoutDetaching([$admin->id, $rep->id]);

        Lead::query()
            ->where('tenant_id', $tenant->id)
            ->get()
            ->each(fn ($lead) => app(\App\Services\LeadScoringService::class)->scoreLead($lead));

        TenantContext::clear();

        $this->command?->info('Demo tenant seeded.');
        $this->command?->info('Login: admin@demo.com / Password1');
    }
}

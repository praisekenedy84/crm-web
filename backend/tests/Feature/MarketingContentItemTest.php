<?php

namespace Tests\Feature;

use App\Models\MarketingContentItem;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketingContentItemTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $manager;

    private User $rep;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Northstar',
            'slug' => 'northstar',
        ]);

        $this->manager = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => 'manager',
            'status' => 'active',
        ]);

        $this->rep = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => 'rep',
            'status' => 'active',
        ]);
    }

    public function test_every_authenticated_role_can_submit_an_idea(): void
    {
        foreach (['rep', 'support', 'readonly'] as $role) {
            $user = User::factory()->create([
                'tenant_id' => $this->tenant->id,
                'role' => $role,
                'status' => 'active',
            ]);
            Sanctum::actingAs($user);

            $this->postJson('/api/v1/marketing/content-items', [
                'title' => "An idea from {$role}",
                'brief' => 'Show customers how the team works.',
                'content_type' => 'carousel',
                'platforms' => ['linkedin', 'instagram'],
                'proposed_date' => '2026-09-18',
                'status' => 'published',
                'scheduled_at' => '2026-09-18T09:00:00Z',
            ])
                ->assertCreated()
                ->assertJsonPath('status', 'idea')
                ->assertJsonPath('scheduled_at', null)
                ->assertJsonPath('submitter.id', $user->id);
        }

        $this->assertSame(3, MarketingContentItem::withoutGlobalScopes()->count());
    }

    public function test_only_managers_and_admins_can_manage_content_items(): void
    {
        Sanctum::actingAs($this->rep);
        $item = $this->createIdea($this->rep);

        $this->putJson("/api/v1/marketing/content-items/{$item->id}", [
            'status' => 'planned',
            'scheduled_at' => '2026-09-16T10:00:00Z',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/marketing/content-items/{$item->id}")
            ->assertForbidden();

        Sanctum::actingAs($this->manager);
        $this->putJson("/api/v1/marketing/content-items/{$item->id}", [
            'status' => 'planned',
            'scheduled_at' => '2026-09-16T10:00:00Z',
            'assigned_to' => $this->rep->id,
        ])
            ->assertOk()
            ->assertJsonPath('status', 'planned')
            ->assertJsonPath('assignee.id', $this->rep->id);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'updated',
            'object_type' => MarketingContentItem::class,
            'object_id' => $item->id,
            'user_id' => $this->manager->id,
        ]);
    }

    public function test_management_requires_a_schedule_after_the_idea_stage(): void
    {
        Sanctum::actingAs($this->rep);
        $item = $this->createIdea($this->rep);

        Sanctum::actingAs($this->manager);
        $this->putJson("/api/v1/marketing/content-items/{$item->id}", [
            'status' => 'ready',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('scheduled_at');
    }

    public function test_content_is_tenant_isolated(): void
    {
        Sanctum::actingAs($this->rep);
        $item = $this->createIdea($this->rep);

        $otherTenant = Tenant::create([
            'name' => 'Other workspace',
            'slug' => 'other-workspace',
        ]);
        $otherManager = User::factory()->create([
            'tenant_id' => $otherTenant->id,
            'role' => 'manager',
            'status' => 'active',
        ]);

        Sanctum::actingAs($otherManager);
        $this->getJson('/api/v1/marketing/content-items')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->putJson("/api/v1/marketing/content-items/{$item->id}", [
            'title' => 'Cross-tenant edit',
        ])->assertNotFound();
    }

    public function test_calendar_can_include_month_items_and_unscheduled_ideas(): void
    {
        Sanctum::actingAs($this->rep);
        $unscheduled = $this->createIdea($this->rep, 'Backlog idea');
        $scheduled = $this->createIdea($this->rep, 'September post');
        $outside = $this->createIdea($this->rep, 'October post');

        $scheduled->update([
            'status' => 'planned',
            'scheduled_at' => '2026-09-15 09:00:00',
            'platforms' => ['linkedin'],
        ]);
        $outside->update([
            'status' => 'planned',
            'scheduled_at' => '2026-10-03 09:00:00',
            'platforms' => ['linkedin'],
        ]);

        $this->getJson('/api/v1/marketing/content-items?from=2026-09-01&to=2026-09-30&include_unscheduled=1&platform=linkedin')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $unscheduled->id])
            ->assertJsonFragment(['id' => $scheduled->id])
            ->assertJsonMissing(['id' => $outside->id]);
    }

    private function createIdea(User $submitter, string $title = 'Customer launch story'): MarketingContentItem
    {
        return MarketingContentItem::create([
            'tenant_id' => $submitter->tenant_id,
            'title' => $title,
            'brief' => 'A useful social post.',
            'content_type' => 'post',
            'platforms' => ['linkedin'],
            'status' => 'idea',
            'submitted_by' => $submitter->id,
        ]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Tenant;
use App\Models\Territory;
use App\Models\User;
use App\Services\PermissionService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PermissionTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->tenant = Tenant::create([
            'name' => 'Northstar',
            'slug' => 'northstar',
            'enabled_modules' => ['crm', 'hr', 'finance', 'inventory', 'projects'],
        ]);
    }

    private function makeUser(string $role): User
    {
        $user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => $role,
            'status' => 'active',
        ]);

        return $user->syncPrimaryRole($role);
    }

    public function test_role_defaults_grant_expected_abilities(): void
    {
        $admin = $this->makeUser('admin');
        $rep = $this->makeUser('rep');
        $readonly = $this->makeUser('readonly');

        $this->assertTrue($admin->can('users.manage'));
        $this->assertTrue($admin->can('roles.manage'));
        $this->assertTrue($admin->can('contacts.view.all'));

        $this->assertTrue($rep->can('contacts.view.own'));
        $this->assertTrue($rep->can('contacts.create'));
        $this->assertFalse($rep->can('contacts.view.all'));
        $this->assertFalse($rep->can('users.manage'));

        $this->assertTrue($readonly->can('contacts.view.own'));
        $this->assertFalse($readonly->can('contacts.create'));
        $this->assertFalse($readonly->can('marketing.create'));
    }

    public function test_user_override_adds_and_removes_ability(): void
    {
        $rep = $this->makeUser('rep');
        $this->assertFalse($rep->can('users.view'));

        $rep->givePermissionTo('users.view');
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->assertTrue($rep->fresh()->can('users.view'));

        $rep->revokePermissionTo('users.view');
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->assertFalse($rep->fresh()->can('users.view'));
    }

    public function test_contact_list_respects_own_team_and_all_scopes(): void
    {
        $owner = $this->makeUser('rep');
        $teammate = $this->makeUser('rep');
        $outsider = $this->makeUser('rep');
        $manager = $this->makeUser('manager');

        $territory = Territory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'East',
        ]);
        $territory->users()->attach([$owner->id, $teammate->id]);

        $own = Contact::create([
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Own',
            'last_name' => 'Contact',
            'owner_id' => $owner->id,
        ]);
        $team = Contact::create([
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Team',
            'last_name' => 'Contact',
            'owner_id' => $teammate->id,
        ]);
        $other = Contact::create([
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Other',
            'last_name' => 'Contact',
            'owner_id' => $outsider->id,
        ]);

        $service = app(PermissionService::class);

        $ownIds = $service->applyOwnerScope(Contact::query(), $owner, 'contacts')->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$own->id], $ownIds);

        $owner->givePermissionTo('contacts.view.team');
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $owner = $owner->fresh();

        $teamIds = $service->applyOwnerScope(Contact::query(), $owner, 'contacts')->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$own->id, $team->id], $teamIds);

        $allIds = $service->applyOwnerScope(Contact::query(), $manager, 'contacts')->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$own->id, $team->id, $other->id], $allIds);
    }

    public function test_unauthorized_web_routes_return_403(): void
    {
        $rep = $this->makeUser('rep');

        $this->actingAs($rep)
            ->get('/admin/roles')
            ->assertForbidden();

        $this->actingAs($rep)
            ->get('/admin/users')
            ->assertForbidden();
    }

    public function test_admin_can_open_and_update_roles_page(): void
    {
        $admin = $this->makeUser('admin');
        $role = Role::findByName('rep', 'web');

        $this->actingAs($admin)
            ->get('/admin/roles')
            ->assertOk();

        $this->actingAs($admin)
            ->put("/admin/roles/{$role->id}", [
                'permissions' => ['contacts.view.own', 'contacts.create'],
            ])
            ->assertRedirect();

        $this->assertTrue($role->fresh()->hasPermissionTo('contacts.create'));
        $this->assertFalse($role->fresh()->hasPermissionTo('contacts.delete'));
    }

    public function test_non_admin_cannot_update_roles(): void
    {
        $manager = $this->makeUser('manager');
        $role = Role::findByName('rep', 'web');

        $this->actingAs($manager)
            ->put("/admin/roles/{$role->id}", [
                'permissions' => ['contacts.view.all'],
            ])
            ->assertForbidden();
    }
}

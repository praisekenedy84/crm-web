<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AreaImportTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $tenant = Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'enabled_modules' => ['crm'],
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'admin',
        ])->syncPrimaryRole('admin');

        Sanctum::actingAs($this->user);
    }

    public function test_it_imports_a_territory_hierarchy_without_duplicating_existing_areas(): void
    {
        $payload = [
            'records' => [
                [
                    'region' => 'Dar es Salaam',
                    'district' => 'Kinondoni',
                    'ward' => 'Mikocheni',
                    'street' => 'Mwai Kibaki Road',
                ],
                [
                    'region' => 'Dar es Salaam',
                    'district' => 'Kinondoni',
                    'ward' => 'Mikocheni',
                    'street' => 'Old Bagamoyo Road',
                ],
            ],
        ];

        $this->postJson('/api/v1/import-export/areas', $payload)
            ->assertOk()
            ->assertJson([
                'created' => 5,
                'rows_processed' => 2,
            ]);

        $this->postJson('/api/v1/import-export/areas', $payload)
            ->assertOk()
            ->assertJson([
                'created' => 0,
                'rows_processed' => 2,
            ]);

        $this->assertSame(5, Area::count());
        $street = Area::where('name', 'Mwai Kibaki Road')->firstOrFail();
        $this->assertSame('Mikocheni', $street->parent->name);
        $this->assertSame('Kinondoni', $street->parent->parent->name);
        $this->assertSame('Dar es Salaam', $street->parent->parent->parent->name);
    }

    public function test_it_rejects_a_hierarchy_with_a_missing_parent_level(): void
    {
        $this->postJson('/api/v1/import-export/areas', [
            'records' => [[
                'region' => 'Dar es Salaam',
                'district' => '',
                'ward' => 'Mikocheni',
                'street' => '',
            ]],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('records.0.ward');

        $this->assertSame(0, Area::count());
    }

    public function test_it_downloads_the_csv_template(): void
    {
        $this->get('/api/v1/import-export/areas/template/csv')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8')
            ->assertHeader('content-disposition', 'attachment; filename="territories-import-template.csv"')
            ->assertSee('"Region","District","Ward","Street"', false);
    }
}

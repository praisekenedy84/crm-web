<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Covers the Inertia session login that replaced the SPA's bearer-token flow.
 */
class SessionAuthTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $tenant = Tenant::create([
            'name' => 'Northstar',
            'slug' => 'northstar',
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@demo.com',
            'password' => Hash::make('Password1'),
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_valid_credentials_start_a_session_and_land_on_the_dashboard(): void
    {
        $response = $this->post('/login', [
            'email' => 'admin@demo.com',
            'password' => 'Password1',
        ]);

        $response->assertRedirect('/');
        $this->assertAuthenticatedAs($this->user);
    }

    public function test_invalid_credentials_are_rejected_with_a_field_error(): void
    {
        $response = $this->from('/login')->post('/login', [
            'email' => 'admin@demo.com',
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_repeated_failures_lock_the_account(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->from('/login')->post('/login', [
                'email' => 'admin@demo.com',
                'password' => 'wrong-password',
            ]);
        }

        $this->assertNotNull($this->user->fresh()->locked_until);

        // Even the correct password is refused while the lockout is active.
        $this->from('/login')->post('/login', [
            'email' => 'admin@demo.com',
            'password' => 'Password1',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_authenticated_user_can_reach_the_dashboard(): void
    {
        $this->actingAs($this->user)->get('/')->assertStatus(200);
    }

    public function test_logout_clears_the_session(): void
    {
        $this->actingAs($this->user)->post('/logout')->assertRedirect('/login');

        $this->assertGuest();
    }
}

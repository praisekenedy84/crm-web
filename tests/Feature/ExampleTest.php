<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_guests_are_redirected_from_the_dashboard_to_login(): void
    {
        $this->get('/')->assertRedirect('/login');
    }

    public function test_the_login_page_renders(): void
    {
        $this->get('/login')->assertStatus(200);
    }
}

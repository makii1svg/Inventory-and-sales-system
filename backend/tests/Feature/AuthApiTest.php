<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in(): void
    {
        $user = User::factory()->create([
            'name' => 'Ariana Cruz',
            'email' => 'admin@sunrise.local',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $user->assignRole('admin');

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@sunrise.local',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'admin@sunrise.local')
            ->assertJsonStructure(['user', 'token', 'message']);
    }

    public function test_current_user_route_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_fetch_dashboard(): void
    {
        $user = User::factory()->create([
            'email' => 'staff@sunrise.local',
            'password' => bcrypt('password'),
            'role' => 'Staff',
        ]);

        $user->assignRole('staff');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure(['metrics', 'salesByDay', 'topProducts'])
            ->assertJsonMissingPath('metrics.0.total_amount');

        $this->assertSame([], $response->json('salesByDay'));
        $this->assertNotContains('Gross sales', array_column($response->json('metrics'), 'label'));
        $this->assertNotContains('Daily sales', array_column($response->json('metrics'), 'label'));
    }
}

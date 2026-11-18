<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_api_returns_json_values_as_native_values(): void
    {
        Setting::query()->create(['key' => 'store_name', 'value' => 'Sunrise Market']);
        Setting::query()->create(['key' => 'monthly_target', 'value' => 180000]);

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('store_name', 'Sunrise Market')
            ->assertJsonPath('monthly_target', 180000);
    }

    public function test_admin_can_update_settings_and_staff_cannot(): void
    {
        $admin = User::factory()->create(['role' => 'Admin']);
        $admin->assignRole('admin');
        $staff = User::factory()->create(['role' => 'Staff']);
        $staff->assignRole('staff');
        $payload = [
            'store_name' => 'Sunrise North',
            'store_address' => '45 Market Road',
            'contact_number' => '555-0101',
            'receipt_footer' => 'Thank you.',
            'monthly_target' => 210000,
            'tax_rate' => 10,
            'expiry_warning_days' => 14,
        ];

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/settings', $payload)
            ->assertOk()
            ->assertJsonPath('store_name', 'Sunrise North')
            ->assertJsonPath('monthly_target', 210000)
            ->assertJsonPath('expiry_warning_days', 14);

        $this->assertSame('45 Market Road', Setting::query()->where('key', 'store_address')->firstOrFail()->value);

        $this->actingAs($staff, 'sanctum')
            ->patchJson('/api/settings', $payload)
            ->assertForbidden();
    }
}

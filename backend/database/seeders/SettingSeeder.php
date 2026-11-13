<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['key' => 'store_name', 'value' => 'Sunrise Market'],
            ['key' => 'app_name', 'value' => 'Inventory and Sales System'],
            ['key' => 'receipt_footer', 'value' => 'Thank you for shopping with us.'],
            ['key' => 'currency', 'value' => 'PHP'],
            ['key' => 'monthly_target', 'value' => 180000],
            ['key' => 'tax_rate', 'value' => 12],
        ];

        foreach ($defaults as $setting) {
            Setting::query()->updateOrCreate(['key' => $setting['key']], ['value' => $setting['value']]);
        }
    }
}

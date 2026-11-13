<?php

namespace App\Http\Controllers\Api;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController
{
    public function index(Request $request)
    {
        $settings = Setting::query()->pluck('value', 'key')->toArray();

        return response()->json([
            'store_name' => $settings['store_name'] ?? 'Sunrise Market',
            'app_name' => $settings['app_name'] ?? 'Inventory and Sales System',
            'receipt_footer' => $settings['receipt_footer'] ?? 'Thank you for shopping with us.',
            'currency' => $settings['currency'] ?? 'PHP',
            'monthly_target' => (float) ($settings['monthly_target'] ?? 180000),
            'tax_rate' => (float) ($settings['tax_rate'] ?? 12),
        ]);
    }
}

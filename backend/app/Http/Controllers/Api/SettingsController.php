<?php

namespace App\Http\Controllers\Api;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController
{
    public function index(Request $request)
    {
        $settings = Setting::query()
            ->get()
            ->mapWithKeys(fn (Setting $setting) => [$setting->key => $setting->value])
            ->all();

        return response()->json([
            'store_name' => $settings['store_name'] ?? 'Sunrise Market',
            'app_name' => $settings['app_name'] ?? 'Inventory and Sales System',
            'store_address' => $settings['store_address'] ?? '',
            'contact_number' => $settings['contact_number'] ?? '',
            'receipt_footer' => $settings['receipt_footer'] ?? 'Thank you for shopping with us.',
            'currency' => $settings['currency'] ?? 'PHP',
            'monthly_target' => (float) ($settings['monthly_target'] ?? 180000),
            'tax_rate' => (float) ($settings['tax_rate'] ?? 12),
            'expiry_warning_days' => (int) ($settings['expiry_warning_days'] ?? 7),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'store_name' => ['required', 'string', 'max:255'],
            'store_address' => ['nullable', 'string', 'max:1000'],
            'contact_number' => ['nullable', 'string', 'max:100'],
            'receipt_footer' => ['nullable', 'string', 'max:1000'],
            'monthly_target' => ['required', 'numeric', 'min:0'],
            'tax_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'expiry_warning_days' => ['required', 'integer', 'min:0', 'max:365'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated as $key => $value) {
                Setting::query()->updateOrCreate(
                    ['key' => $key],
                    ['value' => $value],
                );
            }
        });

        return $this->index($request);
    }
}

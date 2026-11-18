<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('sales:backfill-costs', function () {
    $updated = 0;

    DB::table('sale_items')
        ->join('products', 'products.id', '=', 'sale_items.product_id')
        ->where(function ($query) {
            $query->whereNull('sale_items.unit_cost')
                ->orWhere('sale_items.unit_cost', 0);
        })
        ->where('sale_items.cost_source', '!=', 'estimated')
        ->select('sale_items.id as id', 'products.cost_price as cost_price')
        ->orderBy('sale_items.id')
        ->chunkById(500, function ($items) use (&$updated) {
            foreach ($items as $item) {
                $updated += DB::table('sale_items')
                    ->where('id', $item->id)
                    ->update([
                        'unit_cost' => $item->cost_price,
                        'cost_source' => 'estimated',
                        'updated_at' => now(),
                    ]);
            }
        }, 'sale_items.id', 'id');

    $this->info("Updated {$updated} sale item cost rows.");
})->purpose('Estimate missing sale item costs from current product costs');

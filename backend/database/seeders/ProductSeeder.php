<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Services\InventoryService;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = Supplier::all();
        $categories = Category::all()->keyBy('slug');

        $items = [
            ['sku' => 'FRT-001', 'name' => 'Banana Cavendish', 'category' => 'fresh-produce', 'supplier' => 'Green Valley Farms', 'unit_price' => 42.50, 'cost_price' => 28.00, 'stock_quantity' => 120, 'reorder_level' => 20],
            ['sku' => 'FRT-002', 'name' => 'Rice 5kg', 'category' => 'dry-goods', 'supplier' => 'Prime Distributors', 'unit_price' => 185.00, 'cost_price' => 140.00, 'stock_quantity' => 80, 'reorder_level' => 25],
            ['sku' => 'BVG-001', 'name' => 'Mineral Water 1L', 'category' => 'beverages', 'supplier' => 'Metro Grocery Supply', 'unit_price' => 42.00, 'cost_price' => 28.00, 'stock_quantity' => 180, 'reorder_level' => 30],
            ['sku' => 'HSE-001', 'name' => 'Dishwashing Liquid', 'category' => 'household', 'supplier' => 'Metro Grocery Supply', 'unit_price' => 88.00, 'cost_price' => 58.00, 'stock_quantity' => 60, 'reorder_level' => 15],
            ['sku' => 'BKG-001', 'name' => 'Pan de Sal', 'category' => 'bakery', 'supplier' => 'Prime Distributors', 'unit_price' => 32.00, 'cost_price' => 18.00, 'stock_quantity' => 50, 'reorder_level' => 10],
        ];

        foreach ($items as $item) {
            $product = Product::firstOrCreate(['sku' => $item['sku']], [
                'category_id' => $categories[$item['category']]->id ?? null,
                'supplier_id' => $suppliers->firstWhere('name', $item['supplier'])?->id,
                'name' => $item['name'],
                'barcode' => $item['sku'],
                'description' => $item['name'],
                'unit_price' => $item['unit_price'],
                'cost_price' => $item['cost_price'],
                'stock_quantity' => 0,
                'reorder_level' => $item['reorder_level'],
                'is_active' => true,
            ]);

            if ($product->wasRecentlyCreated && $item['stock_quantity'] > 0) {
                app(InventoryService::class)->stockIn(
                    $product->id,
                    $item['stock_quantity'],
                    $item['cost_price'],
                    null,
                    'OPENING-'.$item['sku'],
                    null,
                    $product->supplier_id,
                    'Demo opening stock',
                    'initial_stock'
                );
            }
        }
    }
}

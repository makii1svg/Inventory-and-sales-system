<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = Supplier::all();
        $categories = Category::all()->keyBy('slug');

        $items = [
            ['sku' => 'FRT-001', 'name' => 'Banana Cavendish', 'category' => 'fresh-produce', 'supplier' => 'Green Valley Farms', 'unit_price' => 42.50, 'cost_price' => 28.00, 'stock_quantity' => 120, 'reorder_level' => 20, 'barcode' => 'FRT-001'],
            ['sku' => 'FRT-002', 'name' => 'Rice 5kg', 'category' => 'dry-goods', 'supplier' => 'Prime Distributors', 'unit_price' => 185.00, 'cost_price' => 140.00, 'stock_quantity' => 80, 'reorder_level' => 25, 'barcode' => 'FRT-002'],
            ['sku' => 'BVG-001', 'name' => 'Mineral Water 1L', 'category' => 'beverages', 'supplier' => 'Metro Grocery Supply', 'unit_price' => 42.00, 'cost_price' => 28.00, 'stock_quantity' => 180, 'reorder_level' => 30, 'barcode' => 'BVG-001'],
            ['sku' => 'HSE-001', 'name' => 'Dishwashing Liquid', 'category' => 'household', 'supplier' => 'Metro Grocery Supply', 'unit_price' => 88.00, 'cost_price' => 58.00, 'stock_quantity' => 60, 'reorder_level' => 15, 'barcode' => 'HSE-001'],
            ['sku' => 'BKG-001', 'name' => 'Pan de Sal', 'category' => 'bakery', 'supplier' => 'Prime Distributors', 'unit_price' => 32.00, 'cost_price' => 18.00, 'stock_quantity' => 50, 'reorder_level' => 10, 'barcode' => 'BKG-001'],
        ];

        $catalogRows = [
            ['RG-001', 'Well-milled rice 25kg sack', 'Rice and grains', 'Davao Grain Traders', 'sack', 1180.00, 1300.00, 5],
            ['RG-002', 'Premium rice 5kg', 'Rice and grains', 'Davao Grain Traders', 'pack', 285.00, 320.00, 10],
            ['RG-003', 'Brown rice 1kg', 'Rice and grains', 'Davao Grain Traders', 'pack', 62.00, 75.00, 8],
            ['RG-004', 'Quaker oats 400g', 'Rice and grains', 'Davao Grain Traders', 'pack', 110.00, 128.00, 6],
            ['RG-005', 'Glutinous rice 1kg', 'Rice and grains', 'Davao Grain Traders', 'pack', 70.00, 82.00, 6],
            ['RG-006', 'Mung beans 500g', 'Rice and grains', 'Davao Grain Traders', 'pack', 55.00, 68.00, 6],
            ['CG-001', 'Ligo sardines in tomato sauce 155g', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 20.50, 24.00, 30],
            ['CG-002', '555 sardines in tomato sauce 155g', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 20.00, 24.00, 30],
            ['CG-003', 'Century tuna flakes in oil 155g', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 37.00, 44.00, 20],
            ['CG-004', 'Argentina corned beef 150g', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 42.00, 50.00, 20],
            ['CG-005', 'Purefoods corned beef 150g', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 52.00, 62.00, 12],
            ['CG-006', 'Luncheon meat 165g', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 52.00, 64.00, 12],
            ['CG-007', 'Alaska evaporated milk 370ml', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 40.00, 48.00, 15],
            ['CG-008', 'Reno liver spread 85g', 'Canned goods', 'Mindanao Canned Goods Supply', 'can', 14.00, 18.00, 20],
            ['NP-001', 'Lucky Me Pancit Canton 60g', 'Noodles and pasta', 'Mindanao Canned Goods Supply', 'pc', 13.50, 17.00, 60],
            ['NP-002', 'Lucky Me instant noodles beef 55g', 'Noodles and pasta', 'Mindanao Canned Goods Supply', 'pc', 10.50, 13.00, 60],
            ['NP-003', 'Nissin cup noodles 60g', 'Noodles and pasta', 'Mindanao Canned Goods Supply', 'pc', 18.00, 23.00, 24],
            ['NP-004', 'Spaghetti pasta 500g', 'Noodles and pasta', 'Mindanao Canned Goods Supply', 'pack', 36.00, 45.00, 10],
            ['NP-005', 'Del Monte spaghetti sauce 250g', 'Noodles and pasta', 'Mindanao Canned Goods Supply', 'pack', 24.00, 29.00, 12],
            ['NP-006', 'Elbow macaroni 400g', 'Noodles and pasta', 'Mindanao Canned Goods Supply', 'pack', 32.00, 40.00, 8],
            ['NP-007', 'Bihon rice noodles 227g', 'Noodles and pasta', 'Mindanao Canned Goods Supply', 'pack', 24.00, 30.00, 8],
            ['BV-001', 'Bottled water 500ml', 'Beverages', 'Southern Beverage Distributors', 'bottle', 10.50, 15.00, 48],
            ['BV-002', 'Bottled water 1L', 'Beverages', 'Southern Beverage Distributors', 'bottle', 15.00, 20.00, 24],
            ['BV-003', 'Coca-Cola 1.5L', 'Beverages', 'Southern Beverage Distributors', 'bottle', 66.00, 78.00, 12],
            ['BV-004', 'Sprite 1.5L', 'Beverages', 'Southern Beverage Distributors', 'bottle', 66.00, 78.00, 12],
            ['BV-005', 'Nescafe 3-in-1 original sachet', 'Beverages', 'Southern Beverage Distributors', 'pc', 7.00, 9.00, 100],
            ['BV-006', 'Great Taste white coffee 3-in-1 sachet', 'Beverages', 'Southern Beverage Distributors', 'pc', 6.50, 8.50, 100],
            ['BV-007', 'Milo chocolate malt sachet 22g', 'Beverages', 'Southern Beverage Distributors', 'pc', 8.00, 10.00, 60],
            ['BV-008', 'Tang orange powdered juice sachet', 'Beverages', 'Southern Beverage Distributors', 'pc', 8.50, 11.00, 50],
            ['BV-009', 'Sting energy drink 330ml', 'Beverages', 'Southern Beverage Distributors', 'bottle', 16.00, 20.00, 24],
            ['DE-001', 'Chicken eggs medium tray of 30', 'Dairy and eggs', 'Fresh Dairy Hub', 'tray', 235.00, 265.00, 6],
            ['DE-002', 'Bear Brand powdered milk 320g', 'Dairy and eggs', 'Fresh Dairy Hub', 'pack', 150.00, 172.00, 8],
            ['DE-003', 'Eden cheese 165g', 'Dairy and eggs', 'Fresh Dairy Hub', 'pack', 52.00, 62.00, 8],
            ['DE-004', 'Fresh milk 1L', 'Dairy and eggs', 'Fresh Dairy Hub', 'box', 90.00, 108.00, 10],
            ['DE-005', 'Butter 200g', 'Dairy and eggs', 'Fresh Dairy Hub', 'pack', 88.00, 105.00, 6],
            ['DE-006', 'Alaska condensada 300ml', 'Dairy and eggs', 'Fresh Dairy Hub', 'can', 42.00, 50.00, 12],
            ['DE-007', 'Margarine 100g', 'Dairy and eggs', 'Fresh Dairy Hub', 'pack', 28.00, 35.00, 10],
            ['CC-001', 'Datu Puti soy sauce 1L', 'Condiments and cooking', 'Mindanao Canned Goods Supply', 'bottle', 40.00, 48.00, 12],
            ['CC-002', 'Datu Puti vinegar 1L', 'Condiments and cooking', 'Mindanao Canned Goods Supply', 'bottle', 34.00, 42.00, 12],
            ['CC-003', 'Cooking oil 1L', 'Condiments and cooking', 'Mindanao Canned Goods Supply', 'bottle', 95.00, 108.00, 12],
            ['CC-004', 'Iodized salt 500g', 'Condiments and cooking', 'Mindanao Canned Goods Supply', 'pack', 11.00, 15.00, 20],
            ['CC-005', 'Refined sugar 1kg', 'Condiments and cooking', 'Davao Grain Traders', 'pack', 78.00, 90.00, 20],
            ['CC-006', 'Brown sugar 1kg', 'Condiments and cooking', 'Davao Grain Traders', 'pack', 70.00, 82.00, 15],
            ['CC-007', 'Magic Sarap seasoning 8g', 'Condiments and cooking', 'Mindanao Canned Goods Supply', 'pc', 4.50, 6.00, 100],
            ['CC-008', 'UFC banana ketchup 320g', 'Condiments and cooking', 'Mindanao Canned Goods Supply', 'bottle', 24.00, 30.00, 12],
            ['CC-009', 'Mayonnaise 220ml', 'Condiments and cooking', 'Mindanao Canned Goods Supply', 'bottle', 50.00, 60.00, 8],
            ['CC-010', 'Garlic 250g', 'Condiments and cooking', 'Davao Grain Traders', 'pack', 38.00, 48.00, 8],
            ['SN-001', 'Skyflakes crackers pack of 10', 'Snacks and sweets', 'Metro Snacks Wholesale', 'pack', 44.00, 55.00, 20],
            ['SN-002', 'Piattos potato crisps 40g', 'Snacks and sweets', 'Metro Snacks Wholesale', 'pack', 16.00, 20.00, 24],
            ['SN-003', 'Chippy corn chips 27g', 'Snacks and sweets', 'Metro Snacks Wholesale', 'pack', 8.00, 10.00, 36],
            ['SN-004', 'Oishi prawn crackers 60g', 'Snacks and sweets', 'Metro Snacks Wholesale', 'pack', 14.00, 18.00, 24],
            ['SN-005', 'Cloud 9 chocolate bar 34g', 'Snacks and sweets', 'Metro Snacks Wholesale', 'pc', 8.00, 10.00, 36],
            ['SN-006', 'Assorted candy bag of 100', 'Snacks and sweets', 'Metro Snacks Wholesale', 'bag', 45.00, 58.00, 10],
            ['HP-001', 'Powder laundry detergent 1kg', 'Household and personal care', 'Kalinaw Household Supply', 'pack', 78.00, 95.00, 10],
            ['HP-002', 'Joy dishwashing liquid 475ml', 'Household and personal care', 'Kalinaw Household Supply', 'bottle', 50.00, 62.00, 8],
            ['HP-003', 'Safeguard bath soap 85g', 'Household and personal care', 'Kalinaw Household Supply', 'pc', 28.00, 35.00, 24],
            ['HP-004', 'Shampoo sachet 12ml', 'Household and personal care', 'Kalinaw Household Supply', 'pc', 5.50, 7.00, 100],
            ['HP-005', 'Colgate toothpaste 75ml', 'Household and personal care', 'Kalinaw Household Supply', 'tube', 44.00, 55.00, 10],
            ['HP-006', 'Tissue roll 2-ply', 'Household and personal care', 'Kalinaw Household Supply', 'roll', 17.00, 22.00, 24],
            ['HP-007', 'Zonrox bleach 1L', 'Household and personal care', 'Kalinaw Household Supply', 'bottle', 36.00, 45.00, 8],
            ['HP-008', 'Fabric conditioner sachet 25ml', 'Household and personal care', 'Kalinaw Household Supply', 'pc', 6.00, 8.00, 60],
            ['HP-009', 'Alcohol 70 percent 500ml', 'Household and personal care', 'Kalinaw Household Supply', 'bottle', 50.00, 62.00, 8],
        ];

        $lowStockQuantities = [
            'RG-002' => 4,
            'RG-006' => 2,
            'CG-004' => 8,
            'CG-008' => 6,
            'NP-002' => 24,
            'BV-003' => 4,
            'BV-009' => 8,
            'DE-004' => 3,
            'CC-005' => 6,
            'SN-002' => 7,
            'HP-003' => 8,
            'HP-007' => 2,
        ];

        foreach ($catalogRows as [$sku, $name, $category, $supplier, $unit, $costPrice, $price, $reorderLevel]) {
            $items[] = [
                'sku' => $sku,
                'name' => $name,
                'category' => str($category)->slug()->toString(),
                'supplier' => $supplier,
                'unit' => $unit,
                'unit_price' => $price,
                'cost_price' => $costPrice,
                'stock_quantity' => $lowStockQuantities[$sku] ?? $reorderLevel * 4,
                'reorder_level' => $reorderLevel,
            ];
        }

        foreach ($items as $item) {
            $product = Product::firstOrCreate(['sku' => $item['sku']], [
                'category_id' => $categories[$item['category']]->id ?? null,
                'supplier_id' => $suppliers->firstWhere('name', $item['supplier'])?->id,
                'name' => $item['name'],
                'barcode' => $item['barcode'] ?? null,
                'unit' => $item['unit'] ?? 'unit',
                'description' => $item['name'],
                'unit_price' => $item['unit_price'],
                'cost_price' => $item['cost_price'],
                'stock_quantity' => 0,
                'reorder_level' => $item['reorder_level'],
                'is_active' => true,
            ]);

            $openingStockReference = 'OPENING-'.$item['sku'];

            if ($item['stock_quantity'] > 0 && ! StockMovement::query()->where('reference', $openingStockReference)->exists()) {
                app(InventoryService::class)->stockIn(
                    $product->id,
                    $item['stock_quantity'],
                    $item['cost_price'],
                    null,
                    $openingStockReference,
                    null,
                    $product->supplier_id,
                    'Demo opening stock',
                    'initial_stock'
                );
            }
        }
    }
}

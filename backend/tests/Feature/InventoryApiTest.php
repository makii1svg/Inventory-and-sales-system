<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Category;
use App\Models\Supplier;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\SupplierSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_create_product(): void
    {
        $user = User::factory()->create([
            'email' => 'staff@sunrise.local',
            'password' => bcrypt('password'),
            'role' => 'Staff',
        ]);
        $user->assignRole('staff');

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/products', [
            'name' => 'Coconut Water',
            'sku' => 'BVG-010',
            'barcode' => '1234567890123',
            'unit' => 'bottle',
            'unit_price' => 55,
            'cost_price' => 32,
            'stock_quantity' => 25,
            'reorder_level' => 8,
            'description' => 'Fresh coconut water',
        ]);

        $response->assertCreated()
            ->assertJsonPath('sku', 'BVG-010')
            ->assertJsonPath('barcode', '1234567890123')
            ->assertJsonPath('unit', 'bottle')
            ->assertJsonPath('stock_quantity', 25);
    }

    public function test_cashier_can_create_sale_and_reduce_stock(): void
    {
        $user = User::factory()->create([
            'email' => 'cashier@sunrise.local',
            'password' => bcrypt('password'),
            'role' => 'Cashier',
        ]);
        $user->assignRole('cashier');

        $product = Product::query()->create([
            'sku' => 'FRT-200',
            'name' => 'Mango',
            'unit_price' => 80,
            'cost_price' => 45,
            'stock_quantity' => 10,
            'reorder_level' => 3,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/sales', [
            'payment_method' => 'cash',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 80],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonFragment(['payment_method' => 'cash'])
            ->assertJsonPath('status', 'completed');

        $product->refresh();
        $this->assertSame(7, $product->stock_quantity);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'movement_type' => 'sale',
            'quantity' => -3,
        ]);
    }

    public function test_admin_cannot_create_sales_or_use_pos_products(): void
    {
        $admin = User::factory()->create(['role' => 'Admin']);
        $admin->assignRole('admin');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/sales', [
                'payment_method' => 'cash',
                'items' => [['product_id' => 1, 'quantity' => 1, 'unit_price' => 100]],
            ])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/pos/products')
            ->assertForbidden();
    }

    public function test_product_catalog_seed_contains_the_requested_catalog_fields(): void
    {
        $this->seed([
            CategorySeeder::class,
            SupplierSeeder::class,
            ProductSeeder::class,
        ]);

        $this->assertDatabaseHas('products', [
            'sku' => 'RG-001',
            'barcode' => null,
            'name' => 'Well-milled rice 25kg sack',
            'unit' => 'sack',
            'cost_price' => 1180,
            'unit_price' => 1300,
            'reorder_level' => 5,
            'stock_quantity' => 20,
        ]);

        $product = Product::query()->with(['category', 'supplier'])->where('sku', 'RG-001')->firstOrFail();
        $this->assertSame('Rice and grains', $product->category->name);
        $this->assertSame('Davao Grain Traders', $product->supplier->name);
        $lowStockProduct = Product::query()->where('sku', 'RG-002')->firstOrFail();
        $this->assertGreaterThan(0, $lowStockProduct->stock_quantity);
        $this->assertLessThan($lowStockProduct->reorder_level, $lowStockProduct->stock_quantity);
        $this->seed(ProductSeeder::class);
        $this->assertSame(20, $product->fresh()->stock_quantity);
        $this->assertSame(1, StockMovement::query()->where('reference', 'OPENING-RG-001')->count());
        $this->assertSame(62, Product::query()->where('sku', 'like', 'RG-%')
            ->orWhere('sku', 'like', 'CG-%')
            ->orWhere('sku', 'like', 'NP-%')
            ->orWhere('sku', 'like', 'BV-%')
            ->orWhere('sku', 'like', 'DE-%')
            ->orWhere('sku', 'like', 'CC-%')
            ->orWhere('sku', 'like', 'SN-%')
            ->orWhere('sku', 'like', 'HP-%')
            ->count());
    }

    public function test_supplier_seeder_updates_supplier_details_and_notes(): void
    {
        Supplier::query()->create(['name' => 'Davao Grain Traders']);
        $this->seed(SupplierSeeder::class);

        $this->assertDatabaseHas('suppliers', [
            'name' => 'Davao Grain Traders',
            'contact_person' => 'Juan Dela Cruz',
            'phone' => '09171234567',
            'email' => 'grain@example.com',
            'address' => 'Davao City',
            'notes' => 'Rice and grains',
        ]);
    }

    public function test_staff_can_create_categories_and_suppliers_from_their_management_pages(): void
    {
        $staff = User::factory()->create(['role' => 'Staff']);
        $staff->assignRole('staff');

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/categories', ['name' => 'Fresh Herbs', 'description' => 'Leafy herbs'])
            ->assertCreated()
            ->assertJsonPath('slug', 'fresh-herbs');

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/suppliers', [
                'name' => 'Market Supply',
                'email' => 'orders@example.test',
                'phone' => '555-0199',
                'notes' => 'Local produce supplier',
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Market Supply')
            ->assertJsonPath('notes', 'Local produce supplier');

        $this->assertDatabaseHas('categories', ['name' => 'Fresh Herbs']);
        $this->assertDatabaseHas('suppliers', ['name' => 'Market Supply', 'notes' => 'Local produce supplier']);
        $this->assertSame(1, Category::query()->count());
        $this->assertSame(1, Supplier::query()->count());
    }
}

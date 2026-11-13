<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
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
            'unit_price' => 55,
            'cost_price' => 32,
            'stock_quantity' => 25,
            'reorder_level' => 8,
            'description' => 'Fresh coconut water',
        ]);

        $response->assertCreated()
            ->assertJsonPath('sku', 'BVG-010')
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
}

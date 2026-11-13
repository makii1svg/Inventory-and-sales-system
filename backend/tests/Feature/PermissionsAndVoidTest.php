<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionsAndVoidTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_cannot_create_product(): void
    {
        $user = User::factory()->create([
            'email' => 'cashier@sunrise.local',
            'password' => bcrypt('password'),
            'role' => 'Cashier',
        ]);
        $user->assignRole('cashier');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/products', [
                'name' => 'Forbidden Item',
                'sku' => 'FORB-001',
                'unit_price' => 10,
                'cost_price' => 5,
                'stock_quantity' => 1,
            ])
            ->assertForbidden();
    }

    public function test_sale_can_be_voided_and_stock_recovered(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@sunrise.local',
            'password' => bcrypt('password'),
            'role' => 'Admin',
        ]);
        $user->assignRole('admin');

        $product = Product::query()->create([
            'sku' => 'RTN-001',
            'name' => 'Rice',
            'unit_price' => 75,
            'cost_price' => 50,
            'stock_quantity' => 5,
            'reorder_level' => 2,
            'is_active' => true,
        ]);

        $sale = Sale::query()->create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-VOID-1',
            'status' => 'completed',
            'subtotal' => 150,
            'tax_amount' => 18,
            'total_amount' => 168,
            'payment_method' => 'cash',
        ]);

        SaleItem::query()->create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 75,
            'line_total' => 150,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/sales/' . $sale->id . '/void', ['reason' => 'Customer cancellation'])
            ->assertOk();

        $product->refresh();
        $this->assertSame(7, $product->stock_quantity);
        $this->assertDatabaseHas('sales', ['id' => $sale->id, 'status' => 'voided']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesProfitTest extends TestCase
{
    use RefreshDatabase;

    public function test_profit_uses_sale_time_costs_excludes_voided_sales_and_subtracts_expenses(): void
    {
        $admin = $this->userWithRole('admin');
        $product = $this->product('PROFIT-001', 99);
        $date = today()->toDateString();

        $saleOne = $this->sale($admin, 'completed', 40, $date);
        SaleItem::query()->create([
            'sale_id' => $saleOne->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 20,
            'unit_cost' => 7,
            'cost_source' => 'recorded',
            'line_total' => 40,
        ]);

        $saleTwo = $this->sale($admin, 'completed', 30, $date);
        SaleItem::query()->create([
            'sale_id' => $saleTwo->id,
            'product_id' => $product->id,
            'quantity' => 3,
            'unit_price' => 10,
            'unit_cost' => 4,
            'cost_source' => 'recorded',
            'line_total' => 30,
        ]);

        $voidedSale = $this->sale($admin, 'voided', 100, $date);
        SaleItem::query()->create([
            'sale_id' => $voidedSale->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 100,
            'unit_cost' => 90,
            'cost_source' => 'recorded',
            'line_total' => 100,
        ]);

        Expense::query()->create([
            'user_id' => $admin->id,
            'title' => 'Rent',
            'category' => 'Operations',
            'amount' => 9,
            'status' => 'approved',
            'incurred_on' => $date,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/analytics?date_from='.$date.'&date_to='.$date)
            ->assertOk();

        $this->assertEquals(70, $response->json('summary.revenue'));
        $this->assertEquals(26, $response->json('summary.cost_of_goods_sold'));
        $this->assertEquals(44, $response->json('summary.gross_profit'));
        $this->assertEquals(9, $response->json('summary.expenses'));
        $this->assertEquals(35, $response->json('summary.net_profit'));
        $this->assertEquals(62.86, $response->json('summary.gross_margin'));
        $this->assertEquals(50, $response->json('summary.net_margin'));
        $this->assertSame(2, $response->json('summary.completed_sales_count'));

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/dashboard?date_from='.$date.'&date_to='.$date.'&previous_date_from='.$date.'&previous_date_to='.$date)
            ->assertOk()
            ->assertJsonPath('profit.gross_profit', 44)
            ->assertJsonPath('profit.net_profit', 35)
            ->assertJsonPath('profit_comparison.gross_profit', 44);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/reports?date_from='.$date.'&date_to='.$date)
            ->assertOk()
            ->assertJsonPath('reports.4.metrics.net_profit', 35)
            ->assertJsonPath('reports.4.metrics.cost_of_goods_sold', 26);

        $product->update(['cost_price' => 500]);
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/analytics?date_from='.$date.'&date_to='.$date)
            ->assertOk()
            ->assertJsonPath('summary.cost_of_goods_sold', 26)
            ->assertJsonPath('summary.gross_profit', 44);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/sales/'.$saleOne->id)
            ->assertOk()
            ->assertJsonPath('items.0.unit_cost', 7)
            ->assertJsonPath('items.0.cost_source', 'recorded');
    }

    public function test_checkout_records_weighted_batch_cost_and_rejects_client_costs(): void
    {
        $cashier = $this->userWithRole('cashier');
        $product = $this->product('BATCH-001', 25);
        $inventory = app(InventoryService::class);
        $inventory->stockIn($product->id, 3, 10, $cashier->id);
        $inventory->stockIn($product->id, 4, 20, $cashier->id);

        $this->actingAs($cashier, 'sanctum')
            ->postJson('/api/sales', [
                'payment_method' => 'cash',
                'items' => [[
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'unit_price' => 30,
                ]],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('sale_items', [
            'product_id' => $product->id,
            'quantity' => 5,
            'unit_cost' => 14,
            'cost_source' => 'recorded',
        ]);
        $this->assertSame(2, $product->fresh()->stock_quantity);

        $this->actingAs($cashier, 'sanctum')
            ->postJson('/api/sales', [
                'payment_method' => 'cash',
                'items' => [[
                    'product_id' => $product->id,
                    'quantity' => 1,
                    'unit_price' => 30,
                    'unit_cost' => 0.01,
                ]],
            ])
            ->assertUnprocessable();

        $this->assertSame(2, $product->fresh()->stock_quantity);
        $this->assertSame(1, Sale::query()->count());
    }

    public function test_checkout_falls_back_to_current_product_cost_when_stock_has_no_batches(): void
    {
        $cashier = $this->userWithRole('cashier');
        $product = $this->product('FALLBACK-001', 45, 5);

        $this->actingAs($cashier, 'sanctum')
            ->postJson('/api/sales', [
                'payment_method' => 'cash',
                'items' => [[
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => 80,
                ]],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('sale_items', [
            'product_id' => $product->id,
            'unit_cost' => 45,
            'cost_source' => 'recorded',
        ]);
        $this->assertSame(3, $product->fresh()->stock_quantity);
    }

    public function test_cost_backfill_marks_rows_estimated_and_is_repeatable(): void
    {
        $user = $this->userWithRole('admin');
        $product = $this->product('BACKFILL-001', 27);
        $sale = $this->sale($user, 'completed', 50, today()->toDateString());
        $item = SaleItem::query()->create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 25,
            'line_total' => 50,
        ]);

        $this->artisan('sales:backfill-costs')
            ->expectsOutput('Updated 1 sale item cost rows.')
            ->assertExitCode(0);
        $this->assertSame('27.00', $item->fresh()->unit_cost);
        $this->assertSame('estimated', $item->fresh()->cost_source);

        $this->artisan('sales:backfill-costs')
            ->expectsOutput('Updated 0 sale item cost rows.')
            ->assertExitCode(0);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create(['role' => ucfirst($role)]);
        $user->assignRole($role);

        return $user;
    }

    private function product(string $sku, float $costPrice, int $stock = 0): Product
    {
        return Product::query()->create([
            'sku' => $sku,
            'name' => $sku,
            'unit_price' => 80,
            'cost_price' => $costPrice,
            'stock_quantity' => $stock,
            'reorder_level' => 1,
            'is_active' => true,
        ]);
    }

    private function sale(User $user, string $status, float $subtotal, string $date): Sale
    {
        return Sale::query()->create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-'.str_replace('.', '', uniqid('', true)),
            'status' => $status,
            'subtotal' => $subtotal,
            'tax_amount' => 0,
            'total_amount' => $subtotal,
            'payment_method' => 'cash',
            'created_at' => $date.' 12:00:00',
        ]);
    }
}

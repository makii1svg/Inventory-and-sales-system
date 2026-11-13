<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Notifications\LowStockNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockOperationsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_in_creates_batch_updates_on_hand_cost_and_resolves_low_stock_notification(): void
    {
        $staff = $this->userWithRole('staff');
        $product = $this->productWithBatch(2, 3);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/stock/adjustments', [
                'product_id' => $product->id,
                'quantity' => 1,
                'reason_code' => 'damaged',
                'note' => 'Discard one damaged package',
            ])
            ->assertOk();

        $openNotification = $staff->notifications()
            ->where('type', LowStockNotification::class)
            ->whereNull('read_at')
            ->firstOrFail();

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/stock/in', [
                'product_id' => $product->id,
                'quantity' => 4,
                'unit_cost' => 32.75,
                'batch_no' => 'BATCH-APR-01',
                'expiry_date' => today()->addDays(30)->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('quantity_on_hand', 5)
            ->assertJsonPath('cost_price', 32.75);

        $product->refresh();
        $this->assertSame(5, $product->quantity_on_hand);
        $this->assertSame(
            $product->quantity_on_hand,
            (int) StockBatch::query()->where('product_id', $product->id)->sum('quantity_on_hand')
        );
        $this->assertDatabaseHas('stock_batches', [
            'product_id' => $product->id,
            'batch_no' => 'BATCH-APR-01',
            'unit_cost' => 32.75,
            'quantity_received' => 4,
            'quantity_on_hand' => 4,
        ]);
        $this->assertNotNull($openNotification->fresh()->read_at);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'movement_type' => 'stock_in',
            'quantity' => 4,
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $staff->id,
            'action' => 'stock_in',
            'module' => 'stock',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/stock/movements?movement_type=stock_in&direction=in')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.direction', 'in');

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/stock/movements?movement_type=stock_out&direction=out')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.direction', 'out')
            ->assertJsonPath('0.reason_code', 'damaged');
    }

    public function test_stock_out_requires_a_valid_reason_and_cannot_make_stock_negative(): void
    {
        $staff = $this->userWithRole('staff');
        $product = $this->productWithBatch(3, 5);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/stock/adjustments', [
                'product_id' => $product->id,
                'quantity' => 4,
                'reason_code' => 'other',
                'note' => 'Attempt to remove more than on hand',
            ])
            ->assertUnprocessable();

        $this->assertSame(3, $product->fresh()->quantity_on_hand);
        $this->assertSame(3, (int) $product->stockBatches()->sum('quantity_on_hand'));
        $this->assertSame(0, StockMovement::query()->count());

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/stock/adjustments', [
                'product_id' => $product->id,
                'quantity' => -1,
                'reason_code' => 'other',
                'note' => 'A negative request must not act as stock-in',
            ])
            ->assertUnprocessable();

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/stock/adjustments', [
                'product_id' => $product->id,
                'quantity' => 1,
                'note' => 'Missing reason code',
            ])
            ->assertUnprocessable();
    }

    public function test_cashier_cannot_use_stock_in_or_stock_out_endpoints(): void
    {
        $cashier = $this->userWithRole('cashier');
        $product = $this->productWithBatch(4, 5);

        $this->actingAs($cashier, 'sanctum')
            ->postJson('/api/stock/in', [
                'product_id' => $product->id,
                'quantity' => 1,
                'unit_cost' => 10,
            ])
            ->assertForbidden();

        $this->actingAs($cashier, 'sanctum')
            ->postJson('/api/stock/adjustments', [
                'product_id' => $product->id,
                'quantity' => 1,
                'reason_code' => 'lost',
                'note' => 'Unauthorized adjustment',
            ])
            ->assertForbidden();
    }

    public function test_stock_in_rejects_expiry_dates_in_the_past(): void
    {
        $staff = $this->userWithRole('staff');
        $product = $this->productWithBatch(4, 5);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/stock/in', [
                'product_id' => $product->id,
                'quantity' => 1,
                'unit_cost' => 10,
                'expiry_date' => today()->subDay()->toDateString(),
            ])
            ->assertUnprocessable();

        $this->assertSame(4, $product->fresh()->quantity_on_hand);
        $this->assertSame(1, $product->stockBatches()->count());
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create(['role' => ucfirst($roleName)]);
        $user->assignRole($roleName);

        return $user;
    }

    private function productWithBatch(int $quantity, int $reorderLevel): Product
    {
        $product = Product::query()->create([
            'sku' => 'STK-'.uniqid(),
            'name' => 'Stock Test Product',
            'unit_price' => 60,
            'cost_price' => 25,
            'stock_quantity' => $quantity,
            'reorder_level' => $reorderLevel,
            'is_active' => true,
        ]);

        StockBatch::query()->create([
            'product_id' => $product->id,
            'batch_no' => 'TEST-OPENING-'.$product->id,
            'unit_cost' => 25,
            'quantity_received' => $quantity,
            'quantity_on_hand' => $quantity,
        ]);

        return $product;
    }
}

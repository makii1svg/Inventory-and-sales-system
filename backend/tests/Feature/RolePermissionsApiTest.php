<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_cannot_access_analytics_reports_or_sales_by_default(): void
    {
        $staff = $this->userWithRole('staff');
        $sale = $this->createSale($staff, 'INV-STAFF-001');

        foreach (['/api/analytics', '/api/reports', '/api/activity-log', '/api/expenses'] as $path) {
            $this->actingAs($staff, 'sanctum')->getJson($path)->assertForbidden();
        }

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/sales')
            ->assertForbidden();

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/transactions')
            ->assertForbidden();

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/sales/'.$sale->id)
            ->assertForbidden();

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/sales', ['payment_method' => 'cash', 'items' => []])
            ->assertForbidden();
    }

    public function test_admin_can_enable_staff_optional_permissions_and_limited_sales_have_no_money_fields(): void
    {
        $admin = $this->userWithRole('admin');
        $staff = $this->userWithRole('staff');
        $role = Role::query()->where('name', 'staff')->firstOrFail();
        $sale = $this->createSale($staff, 'INV-LIMITED-001');

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/roles/'.$role->id.'/permissions', [
                'optional_permissions' => ['pos.use', 'sales.view_limited'],
            ])
            ->assertOk()
            ->assertJsonPath('optional_permissions.0', 'pos.use')
            ->assertJsonPath('optional_permissions.1', 'sales.view_limited');

        $response = $this->actingAs($staff, 'sanctum')
            ->getJson('/api/sales')
            ->assertOk()
            ->assertJsonCount(1);

        $this->assertSame(
            ['receipt_number', 'date', 'time', 'cashier', 'status', 'items'],
            array_keys($response->json('0'))
        );
        $this->assertSame(
            ['product', 'quantity'],
            array_keys($response->json('0.items.0'))
        );
        $this->assertSame('INV-LIMITED-001', $response->json('0.receipt_number'));
        $this->assertSame('Rice', $response->json('0.items.0.product'));
        $this->assertSame(1, $response->json('0.items.0.quantity'));

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/sales/'.$sale->id)
            ->assertOk()
            ->assertJsonMissingPath('total_amount')
            ->assertJsonMissingPath('payment_method')
            ->assertJsonMissingPath('items.0.unit_price')
            ->assertJsonMissingPath('items.0.line_total');

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/analytics')
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/roles/'.$role->id.'/permissions', [
                'optional_permissions' => [],
            ])
            ->assertOk()
            ->assertJsonPath('optional_permissions', []);
    }

    public function test_staff_pos_permission_enables_checkout_but_not_sales_history(): void
    {
        $admin = $this->userWithRole('admin');
        $staff = $this->userWithRole('staff');
        $role = Role::query()->where('name', 'staff')->firstOrFail();
        $product = Product::query()->create([
            'sku' => 'STAFF-POS-001',
            'name' => 'Rice',
            'unit_price' => 80,
            'cost_price' => 45,
            'stock_quantity' => 5,
            'reorder_level' => 1,
            'is_active' => true,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/roles/'.$role->id.'/permissions', [
                'optional_permissions' => ['pos.use'],
            ])
            ->assertOk();

        $saleResponse = $this->actingAs($staff, 'sanctum')
            ->postJson('/api/sales', [
                'payment_method' => 'cash',
                'items' => [
                    ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 80],
                ],
            ])
            ->assertCreated();
        $this->assertSame(
            ['receipt_number', 'date', 'time', 'cashier', 'status', 'items'],
            array_keys($saleResponse->json())
        );
        $saleId = Sale::query()->where('user_id', $staff->id)->firstOrFail()->id;

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/sales')
            ->assertForbidden();

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/sales/'.$saleId.'/receipt')
            ->assertOk()
            ->assertJsonMissingPath('total_amount')
            ->assertJsonMissingPath('payment_method');
    }

    public function test_cashier_can_only_view_own_sales_and_print_own_receipt(): void
    {
        $cashier = $this->userWithRole('cashier');
        $otherCashier = $this->userWithRole('cashier');
        $ownSale = $this->createSale($cashier, 'INV-CASHIER-OWN');
        $otherSale = $this->createSale($otherCashier, 'INV-CASHIER-OTHER');

        $this->actingAs($cashier, 'sanctum')
            ->getJson('/api/sales')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.invoice_number', 'INV-CASHIER-OWN');

        $this->actingAs($cashier, 'sanctum')
            ->getJson('/api/sales/'.$otherSale->id)
            ->assertNotFound();

        $this->actingAs($cashier, 'sanctum')
            ->getJson('/api/sales/'.$ownSale->id.'/receipt')
            ->assertOk()
            ->assertJsonPath('invoice_number', 'INV-CASHIER-OWN');

        $this->actingAs($cashier, 'sanctum')
            ->getJson('/api/sales/'.$otherSale->id.'/receipt')
            ->assertForbidden();
    }

    public function test_permission_matrix_keeps_admin_read_only_and_lists_staff_optional_group(): void
    {
        $admin = $this->userWithRole('admin');
        $this->userWithRole('staff');
        $adminRole = Role::query()->where('name', 'admin')->firstOrFail();
        $staffRole = Role::query()->where('name', 'staff')->firstOrFail();

        $matrix = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/permission-matrix')
            ->assertOk()
            ->assertJsonPath('roles.0.name', 'admin')
            ->assertJsonPath('roles.0.editable', false);

        $groups = collect($matrix->json('groups'))->keyBy('name');
        $this->assertSame(['pos.use', 'sales.view_limited'], $groups['Optional for staff']['permissions']);
        $this->assertSame(['*'], $matrix->json('roles.0.permissions'));

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/roles/'.$adminRole->id.'/permissions', [
                'optional_permissions' => ['pos.use'],
            ])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/roles/'.$staffRole->id.'/permissions', [
                'optional_permissions' => ['analytics.view'],
            ])
            ->assertUnprocessable();
    }

    public function test_role_seeder_migrates_legacy_roles_and_preserves_staff_optional_toggles(): void
    {
        $staffRole = Role::query()->create([
            'name' => 'staff',
            'display_name' => 'Staff',
            'permissions' => [...Role::defaultPermissions('staff'), 'pos.use'],
        ]);
        $legacyAdmin = Role::query()->create([
            'name' => 'administrator',
            'display_name' => 'Administrator',
            'permissions' => ['*'],
        ]);
        $legacyManager = Role::query()->create([
            'name' => 'manager',
            'display_name' => 'Manager',
            'permissions' => ['dashboard.view'],
        ]);
        $adminUser = User::factory()->create(['role' => 'Administrator']);
        $managerUser = User::factory()->create(['role' => 'Manager']);
        $adminUser->roles()->attach($legacyAdmin);
        $managerUser->roles()->attach($legacyManager);

        (new RoleSeeder)->run();

        $this->assertSame(
            [...Role::defaultPermissions('staff'), 'pos.use'],
            Role::query()->where('name', 'staff')->firstOrFail()->permissions
        );
        $this->assertSame('admin', $adminUser->fresh()->roles()->firstOrFail()->name);
        $this->assertSame('staff', $managerUser->fresh()->roles()->firstOrFail()->name);
        $this->assertDatabaseMissing('roles', ['name' => 'administrator']);
        $this->assertDatabaseMissing('roles', ['name' => 'manager']);
        $this->assertNotNull($staffRole->fresh());
    }

    private function userWithRole(string $roleName): User
    {
        $user = User::factory()->create([
            'role' => ucfirst($roleName),
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function createSale(User $cashier, string $invoiceNumber): Sale
    {
        $product = Product::query()->create([
            'sku' => 'SKU-'.str_replace('-', '', $invoiceNumber),
            'name' => 'Rice',
            'unit_price' => 80,
            'cost_price' => 45,
            'stock_quantity' => 5,
            'reorder_level' => 1,
            'is_active' => true,
        ]);

        $sale = Sale::query()->create([
            'user_id' => $cashier->id,
            'invoice_number' => $invoiceNumber,
            'status' => 'completed',
            'subtotal' => 80,
            'tax_amount' => 9.6,
            'total_amount' => 89.6,
            'payment_method' => 'cash',
        ]);

        SaleItem::query()->create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 80,
            'line_total' => 80,
        ]);

        return $sale;
    }
}

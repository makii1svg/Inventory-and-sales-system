<?php

namespace App\Http\Controllers\Api;

use App\Models\Sale;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleVoidController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function void(Request $request, Sale $sale)
    {
        $user = $request->user();

        if (! $user || ! $user->hasPermission('sales.void')) {
            abort(403, 'You are not allowed to void sales.');
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($sale, $user, $validated) {
            $sale->loadMissing('items');

            if ($sale->status === 'voided') {
                throw new \RuntimeException('This sale has already been voided.');
            }

            foreach ($sale->items as $item) {
                $this->inventoryService->adjustStock(
                    (int) $item->product_id,
                    (int) $item->quantity,
                    'sale_void',
                    $user->id,
                    $sale->invoice_number,
                    $validated['reason'] ?? 'Sale voided'
                );
            }

            $sale->status = 'voided';
            $sale->save();
        });

        return response()->json([
            'message' => 'Sale voided successfully.',
            'sale_id' => $sale->id,
            'status' => 'voided',
        ]);
    }
}

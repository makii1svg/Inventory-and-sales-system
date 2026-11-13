<?php

namespace App\Http\Controllers\Api;

use App\Services\InventoryService;
use Illuminate\Http\Request;

class StockAdjustmentController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function adjust(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason_code' => ['required', 'string', 'in:damaged,expired,lost,internal_use,count_correction,other'],
            'note' => ['required', 'string', 'max:2000'],
        ]);

        $product = $this->inventoryService->adjustStock(
            (int) $validated['product_id'],
            -(int) $validated['quantity'],
            'stock_out',
            $user->id,
            null,
            $validated['note'],
            $validated['reason_code']
        );

        return response()->json([
            'product_id' => $product->id,
            'stock_quantity' => (int) $product->stock_quantity,
            'quantity_on_hand' => $product->quantity_on_hand,
            'movement_type' => 'stock_out',
            'reason_code' => $validated['reason_code'],
        ]);
    }
}

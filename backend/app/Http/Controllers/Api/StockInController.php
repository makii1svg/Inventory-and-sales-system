<?php

namespace App\Http\Controllers\Api;

use App\Services\InventoryService;
use Illuminate\Http\Request;

class StockInController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'batch_no' => ['nullable', 'string', 'max:255'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:today'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $product = $this->inventoryService->stockIn(
            (int) $validated['product_id'],
            (int) $validated['quantity'],
            (float) $validated['unit_cost'],
            $request->user()->id,
            $validated['batch_no'] ?? null,
            $validated['expiry_date'] ?? null,
            isset($validated['supplier_id']) ? (int) $validated['supplier_id'] : null,
            $validated['note'] ?? null
        );

        return response()->json([
            'product_id' => $product->id,
            'stock_quantity' => (int) $product->stock_quantity,
            'quantity_on_hand' => $product->quantity_on_hand,
            'cost_price' => (float) $product->cost_price,
            'movement_type' => 'stock_in',
        ], 201);
    }
}

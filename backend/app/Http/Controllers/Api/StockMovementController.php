<?php

namespace App\Http\Controllers\Api;

use App\Models\StockMovement;
use Illuminate\Http\Request;

class StockMovementController
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'movement_type' => ['nullable', 'string', 'in:'.implode(',', StockMovement::TYPES)],
            'direction' => ['nullable', 'string', 'in:in,out'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $query = StockMovement::query()
            ->with(['product:id,name,sku', 'user:id,name', 'batch:id,batch_no,expiry_date']);

        if (isset($validated['product_id'])) {
            $query->where('product_id', $validated['product_id']);
        }

        if (isset($validated['movement_type'])) {
            $query->where('movement_type', $validated['movement_type']);
        }

        if (isset($validated['direction'])) {
            $operator = $validated['direction'] === 'in' ? '>' : '<';
            $query->where('quantity', $operator, 0);
        }

        if (isset($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }

        if (isset($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        return response()->json(
            $query->latest()->limit(200)->get()->map(fn (StockMovement $movement) => [
                'id' => $movement->id,
                'product_id' => $movement->product_id,
                'product' => $movement->product?->name,
                'sku' => $movement->product?->sku,
                'user' => $movement->user?->name,
                'movement_type' => $movement->movement_type,
                'direction' => $movement->quantity > 0 ? 'in' : 'out',
                'quantity' => (int) $movement->quantity,
                'reason_code' => $movement->reason_code,
                'reference' => $movement->reference,
                'notes' => $movement->notes,
                'batch_no' => $movement->batch?->batch_no,
                'expiry_date' => $movement->batch?->expiry_date?->format('Y-m-d'),
                'created_at' => $movement->created_at?->toISOString(),
            ])->values()
        );
    }
}

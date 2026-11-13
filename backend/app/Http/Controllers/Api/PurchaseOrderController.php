<?php

namespace App\Http\Controllers\Api;

use App\Models\DocumentSequence;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function index(Request $request)
    {
        return response()->json(
            PurchaseOrder::query()->with(['supplier', 'items.product'])->latest()->get()->map(fn ($order) => [
                'id' => $order->id,
                'supplier' => $order->supplier?->name,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'total_amount' => (float) $order->total_amount,
                'items' => $order->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'product' => $item->product?->name,
                    'quantity' => (int) $item->quantity,
                    'unit_cost' => (float) $item->unit_cost,
                    'line_total' => (float) $item->line_total,
                ]),
            ])
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $user->hasPermission('purchases.create') || ! $user->hasPermission('purchases.receive')) {
            abort(403, 'You are not allowed to create and receive purchase orders.');
        }

        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $order = DB::transaction(function () use ($validated, $user) {
            $orderNumber = DocumentSequence::incrementFor('purchase_order', 'PO');

            $order = PurchaseOrder::query()->create([
                'supplier_id' => $validated['supplier_id'],
                'order_number' => $orderNumber,
                'status' => 'received',
                'notes' => $validated['notes'] ?? null,
                'total_amount' => 0,
            ]);

            $total = 0;

            foreach ($validated['items'] as $item) {
                $lineTotal = (float) $item['quantity'] * (float) $item['unit_cost'];
                $total += $lineTotal;

                PurchaseOrderItem::query()->create([
                    'purchase_order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'line_total' => $lineTotal,
                ]);

                $this->inventoryService->stockIn(
                    (int) $item['product_id'],
                    (int) $item['quantity'],
                    (float) $item['unit_cost'],
                    $user->id,
                    $order->order_number.'-'.$item['product_id'],
                    null,
                    $validated['supplier_id'],
                    'Purchase order received',
                    'purchase_order'
                );
            }

            $order->total_amount = $total;
            $order->save();

            return $order->fresh(['supplier', 'items.product']);
        });

        return response()->json($order, 201);
    }
}

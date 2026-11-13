<?php

namespace App\Http\Controllers\Api;

use App\Models\DocumentSequence;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function index(Request $request)
    {
        $query = $this->visibleSales($request);

        if ($request->user()->hasPermission('sales.view_limited') && ! $request->user()->hasPermission('sales.view_all')) {
            return response()->json($query->latest()->get()->map(fn (Sale $sale) => $this->limitedResource($sale)));
        }

        return response()->json($query->latest()->get()->map(fn (Sale $sale) => $this->fullResource($sale)));
    }

    public function show(Request $request, Sale $sale)
    {
        $user = $request->user();
        $this->visibleSales($request)->whereKey($sale->id)->firstOrFail();
        $sale->loadMissing(['user', 'items.product']);

        $resource = ($user->hasPermission('sales.view_limited') || $user->hasRole('staff'))
            && ! $user->hasPermission('sales.view_all')
            ? $this->limitedResource($sale)
            : $this->fullResource($sale);

        return response()->json($resource);
    }

    public function receipt(Request $request, Sale $sale)
    {
        $user = $request->user();
        $canViewAny = $user->hasPermission('sales.view_all');
        $canPrintOwn = $user->hasPermission('pos.use') && (int) $sale->user_id === (int) $user->id;

        if (! $canViewAny && ! $canPrintOwn) {
            abort(403, 'You are not allowed to print this receipt.');
        }

        $sale->loadMissing(['user', 'items.product']);

        $resource = $user->hasRole('staff') && ! $user->hasPermission('sales.view_all')
            ? $this->limitedResource($sale)
            : $this->fullResource($sale);

        return response()->json($resource);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user || (! $user->hasPermission('sales.create') && ! $user->hasPermission('pos.use'))) {
            abort(403, 'You are not allowed to create sales.');
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:cash,card,bank_transfer'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $sale = DB::transaction(function () use ($validated, $user) {
            $invoiceNumber = DocumentSequence::incrementFor('sale', 'INV');

            $sale = Sale::query()->create([
                'invoice_number' => $invoiceNumber,
                'user_id' => $user->id,
                'status' => 'completed',
                'payment_method' => $validated['payment_method'],
                'subtotal' => 0,
                'tax_amount' => 0,
                'total_amount' => 0,
            ]);

            $subtotal = 0;

            foreach ($validated['items'] as $item) {
                $lineTotal = (float) $item['quantity'] * (float) $item['unit_price'];
                $subtotal += $lineTotal;

                SaleItem::query()->create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $lineTotal,
                ]);

                $this->inventoryService->adjustStock(
                    (int) $item['product_id'],
                    -(int) $item['quantity'],
                    'sale',
                    $user->id,
                    $sale->invoice_number,
                    'Point-of-sale sale'
                );
            }

            $taxAmount = $subtotal * 0.12;
            $total = $subtotal + $taxAmount;

            $sale->subtotal = $subtotal;
            $sale->tax_amount = $taxAmount;
            $sale->total_amount = $total;
            $sale->save();

            return $sale->fresh(['user', 'items.product']);
        });

        $resource = $user->hasRole('staff') && ! $user->hasPermission('sales.view_all')
            ? $this->limitedResource($sale)
            : $this->fullResource($sale);

        return response()->json($resource, 201);
    }

    private function visibleSales(Request $request)
    {
        $user = $request->user();

        if ($user->hasPermission('sales.view_all')) {
            return Sale::query()->with(['user', 'items.product']);
        }

        if ($user->hasPermission('sales.view_own')) {
            return Sale::query()->where('user_id', $user->id)->with(['user', 'items.product']);
        }

        if ($user->hasPermission('sales.view_limited')) {
            return Sale::query()->with(['user', 'items.product']);
        }

        abort(403, 'You are not allowed to view sales.');
    }

    private function limitedResource(Sale $sale): array
    {
        $sale->loadMissing(['user', 'items.product']);

        return [
            'receipt_number' => $sale->invoice_number,
            'date' => $sale->created_at?->format('Y-m-d'),
            'time' => $sale->created_at?->format('H:i:s'),
            'cashier' => $sale->user?->name,
            'status' => $sale->status,
            'items' => $sale->items->map(fn ($item) => [
                'product' => $item->product?->name,
                'quantity' => (int) $item->quantity,
            ])->values(),
        ];
    }

    private function fullResource(Sale $sale): array
    {
        $sale->loadMissing(['user', 'items.product']);

        return [
            'id' => $sale->id,
            'invoice_number' => $sale->invoice_number,
            'receipt_number' => $sale->invoice_number,
            'date' => $sale->created_at?->format('Y-m-d'),
            'time' => $sale->created_at?->format('H:i:s'),
            'user' => $sale->user?->name,
            'status' => $sale->status,
            'subtotal' => (float) $sale->subtotal,
            'tax_amount' => (float) $sale->tax_amount,
            'total_amount' => (float) $sale->total_amount,
            'payment_method' => $sale->payment_method,
            'items' => $sale->items->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product' => $item->product?->name,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
            ])->values(),
        ];
    }
}

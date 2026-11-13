<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController
{
    public function __construct(private InventoryService $inventoryService)
    {
    }

    public function index()
    {
        return response()->json(
            Product::query()->with(['category', 'supplier'])->orderBy('name')->get()->map(fn ($product) => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category' => $product->category?->name,
                'supplier' => $product->supplier?->name,
                'unit_price' => (float) $product->unit_price,
                'cost_price' => (float) $product->cost_price,
                'stock_quantity' => (int) $product->stock_quantity,
                'quantity_on_hand' => $product->quantity_on_hand,
                'reorder_level' => (int) $product->reorder_level,
                'is_active' => (bool) $product->is_active,
            ])->values()
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $user->hasPermission('products.create')) {
            abort(403, 'You are not allowed to create products.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'barcode' => ['nullable', 'string', 'max:100', 'unique:products,barcode'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'reorder_level' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        $product = DB::transaction(function () use ($validated, $user) {
            $product = Product::query()->create([
                'name' => $validated['name'],
                'sku' => $validated['sku'],
                'category_id' => $validated['category_id'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'barcode' => $validated['barcode'] ?? null,
                'unit_price' => $validated['unit_price'],
                'cost_price' => $validated['cost_price'],
                'stock_quantity' => 0,
                'reorder_level' => $validated['reorder_level'] ?? 0,
                'description' => $validated['description'] ?? null,
                'is_active' => true,
            ]);

            if ((int) $validated['stock_quantity'] > 0) {
                $this->inventoryService->adjustStock(
                    $product->id,
                    (int) $validated['stock_quantity'],
                    'initial_stock',
                    $user->id,
                    'INITIAL-STOCK',
                    'Initial stock entry'
                );
            }

            return $product->fresh();
        });

        return response()->json($product, 201);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => ['sometimes', 'required', 'string', 'max:100', 'unique:products,sku,'.$product->id],
            'category_id' => ['sometimes', 'nullable', 'exists:categories,id'],
            'supplier_id' => ['sometimes', 'nullable', 'exists:suppliers,id'],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:100', 'unique:products,barcode,'.$product->id],
            'unit_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'cost_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'reorder_level' => ['sometimes', 'required', 'integer', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ]);

        if ($validated === []) {
            abort(422, 'At least one product field must be provided.');
        }

        $product->fill($validated)->save();

        return response()->json($product->fresh(['category', 'supplier']));
    }
}

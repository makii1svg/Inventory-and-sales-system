<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;

class AnalyticsController
{
    public function index(Request $request)
    {
        $sales = Sale::query()->latest()->limit(12)->get();
        $categories = Category::query()->withCount('products')->get();
        $lowStockProducts = Product::query()->whereColumn('stock_quantity', '<=', 'reorder_level')->get();
        $monthlyRevenue = $sales->map(fn ($sale) => [
            'month' => $sale->created_at?->format('M') ?? 'N/A',
            'value' => (float) $sale->total_amount,
        ])->values();

        return response()->json([
            'summary' => [
                'gross_sales' => (float) Sale::query()->sum('total_amount'),
                'net_sales' => (float) Sale::query()->sum('total_amount') - (float) Expense::query()->sum('amount'),
                'low_stock_count' => $lowStockProducts->count(),
                'expenses' => (float) Expense::query()->sum('amount'),
            ],
            'trend' => [
                ['month' => 'Jan', 'sales' => 42000],
                ['month' => 'Feb', 'sales' => 52000],
                ['month' => 'Mar', 'sales' => 48000],
                ['month' => 'Apr', 'sales' => 61000],
                ['month' => 'May', 'sales' => 69000],
                ['month' => 'Jun', 'sales' => 74000],
            ],
            'categories' => $categories->map(fn ($category) => [
                'name' => $category->name,
                'count' => (int) $category->products_count,
            ]),
            'top_products' => Product::query()->orderByDesc('stock_quantity')->limit(5)->get()->map(fn ($product) => [
                'name' => $product->name,
                'stock_quantity' => (int) $product->stock_quantity,
                'unit_price' => (float) $product->unit_price,
            ]),
        ]);
    }

    public function reports(Request $request)
    {
        return response()->json([
            'reports' => [
                ['report' => 'Daily sales', 'value' => '₱132,480', 'items' => 216, 'date' => now()->format('Y-m-d')],
                ['report' => 'Inventory valuation', 'value' => '₱3.84M', 'items' => 1, 'date' => now()->format('Y-m-d')],
                ['report' => 'Supplier ledger', 'value' => '₱84,200', 'items' => 14, 'date' => now()->subDay()->format('Y-m-d')],
                ['report' => 'Expense summary', 'value' => '₱22,490', 'items' => 8, 'date' => now()->subDay()->format('Y-m-d')],
            ],
        ]);
    }
}

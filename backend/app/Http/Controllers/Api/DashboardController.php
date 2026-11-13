<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;

class DashboardController
{
    public function index(Request $request)
    {
        $productCount = Product::count();
        $lowStockCount = Product::whereColumn('stock_quantity', '<=', 'reorder_level')->count();
        $user = $request->user();
        $canViewSales = $user->hasPermission('sales.view_all') || $user->hasPermission('sales.view_own');
        $sales = Sale::query();

        if ($canViewSales && ! $user->hasPermission('sales.view_all')) {
            $sales->where('user_id', $user->id);
        }

        $metrics = [
            ['label' => 'Products', 'value' => (string) $productCount, 'delta' => $lowStockCount > 0 ? $lowStockCount . ' low stock' : 'Healthy'],
            ['label' => 'Alerts', 'value' => (string) $lowStockCount, 'delta' => 'Needs review'],
        ];

        if ($canViewSales) {
            $metrics = [
                ['label' => 'Gross sales', 'value' => '₱' . number_format((float) (clone $sales)->sum('total_amount'), 2), 'delta' => ''],
                ['label' => 'Daily sales', 'value' => '₱' . number_format((float) (clone $sales)->whereDate('created_at', today())->sum('total_amount'), 2), 'delta' => ''],
                ...$metrics,
            ];
        }

        return response()->json([
            'metrics' => $metrics,
            'salesByDay' => $user->hasPermission('sales.view_all') ? [
                ['day' => 'Mon', 'sales' => 12000],
                ['day' => 'Tue', 'sales' => 16000],
                ['day' => 'Wed', 'sales' => 14000],
                ['day' => 'Thu', 'sales' => 18000],
                ['day' => 'Fri', 'sales' => 22000],
                ['day' => 'Sat', 'sales' => 21000],
            ] : [],
            'topProducts' => Product::query()
                ->orderByDesc('stock_quantity')
                ->limit(5)
                ->get(['id', 'name', 'stock_quantity', 'unit_price'])
                ->map(fn ($product) => [
                    'name' => $product->name,
                    'stock' => $product->stock_quantity,
                    'price' => (float) $product->unit_price,
                ])
                ->values(),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\Sale;
use App\Services\ProfitAnalyticsService;
use Illuminate\Http\Request;

class DashboardController
{
    public function index(Request $request, ProfitAnalyticsService $profitAnalytics)
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'previous_date_from' => ['nullable', 'date'],
            'previous_date_to' => ['nullable', 'date', 'after_or_equal:previous_date_from'],
        ]);
        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;
        $productCount = Product::count();
        $lowStockCount = Product::whereColumn('stock_quantity', '<=', 'reorder_level')->count();
        $user = $request->user();
        $canViewSales = $user->hasPermission('sales.view_all') || $user->hasPermission('sales.view_own');
        $sales = Sale::query()->where('status', 'completed');

        if ($canViewSales && ! $user->hasPermission('sales.view_all')) {
            $sales->where('user_id', $user->id);
        }

        if ($dateFrom) {
            $sales->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $sales->whereDate('created_at', '<=', $dateTo);
        }

        $metrics = [
            ['label' => 'Products', 'value' => (string) $productCount, 'delta' => $lowStockCount > 0 ? $lowStockCount . ' low stock' : 'Healthy'],
            ['label' => 'Alerts', 'value' => (string) $lowStockCount, 'delta' => 'Needs review'],
        ];

        if ($canViewSales) {
            $metrics = [
                ['label' => 'Revenue', 'value' => '₱' . number_format((float) (clone $sales)->sum('subtotal'), 2), 'delta' => ''],
                ['label' => 'Daily sales', 'value' => '₱' . number_format((float) (clone $sales)->whereDate('created_at', today())->sum('subtotal'), 2), 'delta' => ''],
                ...$metrics,
            ];
        }

        $response = [
            'metrics' => $metrics,
            'salesByDay' => $user->hasPermission('sales.view_all')
                ? collect($profitAnalytics->trend(
                    $dateFrom ?? now()->subDays(6)->toDateString(),
                    $dateTo ?? today()->toDateString(),
                ))->map(fn ($row) => ['day' => $row['date'], 'sales' => $row['revenue']])->values()
                : [],
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
        ];

        if ($user->hasPermission('analytics.view')) {
            $response['profit'] = $profitAnalytics->summary($dateFrom, $dateTo);
            $response['profit_comparison'] = isset($validated['previous_date_from'], $validated['previous_date_to'])
                ? $profitAnalytics->summary($validated['previous_date_from'], $validated['previous_date_to'])
                : null;
        }

        return response()->json($response);
    }
}

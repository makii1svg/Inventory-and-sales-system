<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use App\Models\Product;
use App\Services\ProfitAnalyticsService;
use Illuminate\Http\Request;

class AnalyticsController
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
        $trendFrom = $dateFrom ?? now()->startOfMonth()->toDateString();
        $trendTo = $dateTo ?? today()->toDateString();
        $summary = $profitAnalytics->summary($dateFrom, $dateTo);
        $summary['low_stock_count'] = Product::query()->whereColumn('stock_quantity', '<=', 'reorder_level')->count();
        $categories = Category::query()->withCount('products')->get();
        $comparison = isset($validated['previous_date_from'], $validated['previous_date_to'])
            ? $profitAnalytics->summary($validated['previous_date_from'], $validated['previous_date_to'])
            : null;

        return response()->json([
            'summary' => $summary,
            'comparison' => $comparison,
            'trend' => $profitAnalytics->trend($trendFrom, $trendTo),
            'categories' => $categories->map(fn ($category) => [
                'name' => $category->name,
                'count' => (int) $category->products_count,
            ]),
            'revenue_by_category' => $profitAnalytics->revenueByCategory($dateFrom, $dateTo),
            'top_products_by_profit' => $profitAnalytics->topProductsByProfit($dateFrom, $dateTo),
            'top_products' => Product::query()->orderByDesc('stock_quantity')->limit(5)->get()->map(fn ($product) => [
                'name' => $product->name,
                'stock_quantity' => (int) $product->stock_quantity,
                'unit_price' => (float) $product->unit_price,
            ]),
        ]);
    }

    public function reports(Request $request, ProfitAnalyticsService $profitAnalytics)
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);
        $profitAndLoss = $profitAnalytics->summary(
            $validated['date_from'] ?? null,
            $validated['date_to'] ?? null,
        );

        return response()->json([
            'reports' => [
                ['report' => 'Daily sales', 'value' => '₱132,480', 'items' => 216, 'date' => now()->format('Y-m-d')],
                ['report' => 'Inventory valuation', 'value' => '₱3.84M', 'items' => 1, 'date' => now()->format('Y-m-d')],
                ['report' => 'Supplier ledger', 'value' => '₱84,200', 'items' => 14, 'date' => now()->subDay()->format('Y-m-d')],
                ['report' => 'Expense summary', 'value' => '₱22,490', 'items' => 8, 'date' => now()->subDay()->format('Y-m-d')],
                [
                    'report' => 'Profit and loss',
                    'value' => $profitAndLoss['net_profit'],
                    'items' => $profitAndLoss['completed_sales_count'],
                    'date' => $validated['date_to'] ?? today()->toDateString(),
                    'metrics' => $profitAndLoss,
                ],
            ],
        ]);
    }
}

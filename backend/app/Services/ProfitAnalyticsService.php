<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Sale;
use App\Models\Setting;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class ProfitAnalyticsService
{
    public function summary(?string $dateFrom = null, ?string $dateTo = null): array
    {
        $sales = Sale::query()->where('status', 'completed');
        $this->constrainDates($sales, $dateFrom, $dateTo);
        $items = $this->saleItemsQuery($dateFrom, $dateTo);
        $revenue = (float) (clone $sales)->sum('subtotal');
        $costOfGoodsSold = (float) (clone $items)
            ->selectRaw('COALESCE(SUM(sale_items.quantity * sale_items.unit_cost), 0) as aggregate')
            ->value('aggregate');
        $estimatedCost = (float) (clone $items)
            ->where('sale_items.cost_source', 'estimated')
            ->selectRaw('COALESCE(SUM(sale_items.quantity * sale_items.unit_cost), 0) as aggregate')
            ->value('aggregate');
        $expenses = $this->expensesQuery($dateFrom, $dateTo)->sum('amount');
        $grossProfit = $revenue - $costOfGoodsSold;
        $netProfit = $grossProfit - (float) $expenses;

        return [
            'revenue' => round($revenue, 2),
            'cost_of_goods_sold' => round($costOfGoodsSold, 2),
            'gross_profit' => round($grossProfit, 2),
            'expenses' => round((float) $expenses, 2),
            'net_profit' => round($netProfit, 2),
            'gross_margin' => $revenue > 0 ? round($grossProfit / $revenue * 100, 2) : 0,
            'net_margin' => $revenue > 0 ? round($netProfit / $revenue * 100, 2) : 0,
            'estimated_cost_amount' => round($estimatedCost, 2),
            'estimated_cost_share' => $costOfGoodsSold > 0 ? round($estimatedCost / $costOfGoodsSold * 100, 2) : 0,
            'estimated_cost_items_count' => (clone $items)->where('sale_items.cost_source', 'estimated')->count(),
            'cost_tracking_started_at' => Setting::query()
                ->where('key', 'sale_cost_tracking_started_at')
                ->first()?->value,
            'completed_sales_count' => (clone $sales)->count(),
        ];
    }

    public function trend(string $dateFrom, string $dateTo): array
    {
        $start = CarbonImmutable::parse($dateFrom)->startOfDay();
        $end = CarbonImmutable::parse($dateTo)->startOfDay();
        $rows = [];

        for ($date = $start; $date <= $end; $date = $date->addDay()) {
            $key = $date->toDateString();
            $rows[$key] = [
                'date' => $key,
                'revenue' => 0.0,
                'cost_of_goods_sold' => 0.0,
                'gross_profit' => 0.0,
                'expenses' => 0.0,
                'net_profit' => 0.0,
                'estimated_cost_amount' => 0.0,
                'estimated_cost_share' => 0.0,
            ];
        }

        $sales = Sale::query()
            ->where('status', 'completed')
            ->whereDate('created_at', '>=', $start->toDateString())
            ->whereDate('created_at', '<=', $end->toDateString())
            ->with('items')
            ->get();

        foreach ($sales as $sale) {
            $key = $sale->created_at->toDateString();
            $rows[$key]['revenue'] += (float) $sale->subtotal;

            foreach ($sale->items as $item) {
                $cost = (int) $item->quantity * (float) $item->unit_cost;
                $rows[$key]['cost_of_goods_sold'] += $cost;
                if ($item->cost_source === 'estimated') {
                    $rows[$key]['estimated_cost_amount'] += $cost;
                }
            }
        }

        foreach ($this->expensesQuery($start->toDateString(), $end->toDateString())->get(['incurred_on', 'amount']) as $expense) {
            $key = CarbonImmutable::parse($expense->incurred_on)->toDateString();
            $rows[$key]['expenses'] += (float) $expense->amount;
        }

        foreach ($rows as &$row) {
            $row['gross_profit'] = round($row['revenue'] - $row['cost_of_goods_sold'], 2);
            $row['net_profit'] = round($row['gross_profit'] - $row['expenses'], 2);
            $row['estimated_cost_share'] = $row['cost_of_goods_sold'] > 0
                ? round($row['estimated_cost_amount'] / $row['cost_of_goods_sold'] * 100, 2)
                : 0;
            foreach (['revenue', 'cost_of_goods_sold', 'expenses', 'estimated_cost_amount'] as $amountField) {
                $row[$amountField] = round($row[$amountField], 2);
            }
        }
        unset($row);

        return array_values($rows);
    }

    public function topProductsByProfit(?string $dateFrom = null, ?string $dateTo = null): array
    {
        return $this->saleItemsQuery($dateFrom, $dateTo)
            ->leftJoin('products', 'products.id', '=', 'sale_items.product_id')
            ->select('sale_items.product_id as id')
            ->selectRaw("COALESCE(products.name, 'Deleted product') as name")
            ->selectRaw('SUM(sale_items.quantity) as units')
            ->selectRaw('SUM(sale_items.line_total) as revenue')
            ->selectRaw('SUM(sale_items.quantity * sale_items.unit_cost) as cost_of_goods_sold')
            ->groupBy('sale_items.product_id', 'products.name')
            ->get()
            ->map(function ($product) {
                $revenue = (float) $product->revenue;
                $cost = (float) $product->cost_of_goods_sold;

                return [
                    'id' => (int) $product->id,
                    'name' => $product->name,
                    'units' => (int) $product->units,
                    'revenue' => round($revenue, 2),
                    'cost_of_goods_sold' => round($cost, 2),
                    'gross_profit' => round($revenue - $cost, 2),
                ];
            })
            ->sortByDesc('gross_profit')
            ->values()
            ->all();
    }

    public function revenueByCategory(?string $dateFrom = null, ?string $dateTo = null): array
    {
        return $this->saleItemsQuery($dateFrom, $dateTo)
            ->leftJoin('products', 'products.id', '=', 'sale_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->selectRaw("COALESCE(categories.name, 'Uncategorized') as category")
            ->selectRaw('SUM(sale_items.line_total) as revenue')
            ->selectRaw('SUM(sale_items.quantity * sale_items.unit_cost) as cost_of_goods_sold')
            ->groupBy('categories.name')
            ->get()
            ->map(function ($category) {
                $revenue = (float) $category->revenue;
                $cost = (float) $category->cost_of_goods_sold;

                return [
                    'category' => $category->category,
                    'revenue' => round($revenue, 2),
                    'cost_of_goods_sold' => round($cost, 2),
                    'gross_profit' => round($revenue - $cost, 2),
                ];
            })
            ->sortByDesc('revenue')
            ->values()
            ->all();
    }

    private function saleItemsQuery(?string $dateFrom, ?string $dateTo): Builder
    {
        $query = DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', 'completed')
            ->whereNull('sales.deleted_at');

        if ($dateFrom) {
            $query->whereDate('sales.created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('sales.created_at', '<=', $dateTo);
        }

        return $query;
    }

    private function expensesQuery(?string $dateFrom, ?string $dateTo)
    {
        $query = Expense::query();

        if ($dateFrom) {
            $query->whereDate('incurred_on', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('incurred_on', '<=', $dateTo);
        }

        return $query;
    }

    private function constrainDates($query, ?string $dateFrom, ?string $dateTo): void
    {
        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }
    }
}

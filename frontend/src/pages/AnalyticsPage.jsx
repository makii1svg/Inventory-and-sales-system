import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  ChartCard,
  DashboardGrid,
  DonutCard,
  GroupedBarChart,
  KpiCard,
  MoneyText,
  PageHeader,
  RankedList,
  SegmentedBar,
  TabsList,
} from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { canAccessTab, hasPermission } from '../lib/permissions'
import { getSaleCost, summarizeProfit } from '../lib/profit'
import ForbiddenPage from './ForbiddenPage'

const RANGE_VALUES = ['1D', '7D', '30D', '90D', 'YTD']
const RANGE_LABELS = {
  '1D': 'Today',
  '7D': 'Last 7 days',
  '30D': 'Last 30 days',
  '90D': 'Last 90 days',
  YTD: 'Year to date',
}
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function filterSalesByCategory(sales, products, category) {
  if (!category) return sales
  const productById = new Map(products.map((product) => [Number(product.id), product]))
  return sales.flatMap((sale) => {
    const items = saleItems(sale).filter((item) => (
      productById.get(Number(item.product_id))?.category === category
    ))
    if (!items.length) return []
    return [{
      ...sale,
      items,
      subtotal: items.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0),
    }]
  })
}

function parseDate(value) {
  if (!value) return null
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day) : null
}

function shiftDate(date, offset) {
  const result = new Date(date)
  result.setDate(result.getDate() + offset)
  return result
}

function getRange(range, now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = range === 'YTD'
    ? new Date(end.getFullYear(), 0, 1)
    : shiftDate(end, -(Number.parseInt(range, 10) - 1))
  const length = Math.round((end - start) / 86400000) + 1
  const previousEnd = shiftDate(start, -1)
  const previousStart = shiftDate(previousEnd, -(length - 1))
  return { start, end, previousStart, previousEnd, length }
}

function inRange(value, start, end) {
  const date = value instanceof Date ? localDate(value) : String(value ?? '').slice(0, 10)
  return date && date >= localDate(start) && date <= localDate(end)
}

function saleDate(sale) {
  return sale.date ?? sale.created_at
}

function saleTime(sale) {
  return String(sale.time ?? sale.created_at?.slice(11, 19) ?? '')
}

function saleItems(sale) {
  return Array.isArray(sale.items) ? sale.items : []
}

function validSales(sales) {
  return sales.filter((sale) => String(sale.status).toLowerCase() === 'completed')
}

function sumSales(sales) {
  return sales.reduce((sum, sale) => sum + Number(sale.subtotal ?? sale.total_amount ?? 0), 0)
}

function sumUnits(sales) {
  return sales.reduce((sum, sale) => (
    sum + saleItems(sale).reduce((itemSum, item) => itemSum + Number(item.quantity ?? 0), 0)
  ), 0)
}

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? '0%' : 'New'
  const percent = ((current - previous) / Math.abs(previous)) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function compactCurrency(value) {
  return `₱${new Intl.NumberFormat('en-PH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0))}`
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-PH')
}

function periodLabel(rangeData, range) {
  const format = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
  if (range === '1D') return `Today · ${format.format(rangeData.end)}`
  if (range === 'YTD') return `${rangeData.start.getFullYear()} to date`
  return `${format.format(rangeData.start)} – ${format.format(rangeData.end)}`
}

function getBuckets(rangeData, granularity = 'day') {
  const buckets = []

  if (granularity === 'month') {
    let cursor = new Date(rangeData.start.getFullYear(), rangeData.start.getMonth(), 1)
    while (cursor <= rangeData.end) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      buckets.push({
        start: cursor < rangeData.start ? rangeData.start : cursor,
        end: monthEnd > rangeData.end ? rangeData.end : monthEnd,
        label: cursor.toLocaleString('en', { month: 'short' }),
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return buckets
  }

  const span = granularity === 'week' ? 7 : 1
  let cursor = new Date(rangeData.start)
  while (cursor <= rangeData.end) {
    const bucketEnd = shiftDate(cursor, span - 1)
    const end = bucketEnd > rangeData.end ? rangeData.end : bucketEnd
    buckets.push({
      start: cursor,
      end,
      label: `${cursor.toLocaleString('en', { month: 'short' })} ${cursor.getDate()}`,
    })
    cursor = shiftDate(end, 1)
  }
  return buckets
}

function bucketIndex(value, buckets) {
  const date = parseDate(value)
  if (!date) return -1
  return buckets.findIndex((bucket) => date >= bucket.start && date <= bucket.end)
}

function buildSalesTrend(sales, rangeData, granularity) {
  const buckets = getBuckets(rangeData, granularity)
  const previousRange = {
    start: rangeData.previousStart,
    end: rangeData.previousEnd,
  }
  const previousBuckets = getBuckets(previousRange, granularity)
  const rows = buckets.map((bucket) => ({
    label: bucket.label,
    current: 0,
    previous: 0,
  }))

  for (const sale of sales) {
    const index = bucketIndex(saleDate(sale), buckets)
    if (index >= 0) rows[index].current += Number(sale.subtotal ?? sale.total_amount ?? 0)
    const previousIndex = bucketIndex(saleDate(sale), previousBuckets)
    if (previousIndex >= 0 && rows[previousIndex]) {
      rows[previousIndex].previous += Number(sale.subtotal ?? sale.total_amount ?? 0)
    }
  }
  return rows
}

function buildExpenseTrend(expenses, rangeData, granularity) {
  const buckets = getBuckets(rangeData, granularity)
  return buckets.map((bucket) => ({
    label: bucket.label,
    value: expenses.reduce((sum, expense) => (
      inRange(expense.date, bucket.start, bucket.end) ? sum + Number(expense.amount ?? 0) : sum
    ), 0),
  }))
}

function buildProfitTrend(sales, expenses, rangeData, granularity) {
  const buckets = getBuckets(rangeData, granularity)
  return buckets.map((bucket) => {
    const bucketSales = sales.filter((sale) => inRange(saleDate(sale), bucket.start, bucket.end))
    const revenue = sumSales(bucketSales)
    const cost = bucketSales.reduce((sum, sale) => sum + getSaleCost(sale), 0)
    const expenseTotal = expenses.reduce((sum, expense) => (
      inRange(expense.date, bucket.start, bucket.end) ? sum + Number(expense.amount ?? 0) : sum
    ), 0)
    const grossProfit = revenue - cost

    return {
      label: bucket.label,
      revenue,
      cost_of_goods_sold: cost,
      expenses: expenseTotal,
      gross_profit: grossProfit,
      net_profit: grossProfit - expenseTotal,
    }
  })
}

function buildProductSales(sales, products) {
  const byId = new Map()
  for (const sale of sales) {
    for (const item of saleItems(sale)) {
      const id = Number(item.product_id)
      const current = byId.get(id) ?? {
        id,
        name: item.product ?? 'Product',
        units: 0,
        revenue: 0,
        cost_of_goods_sold: 0,
        profit: 0,
      }
      current.units += Number(item.quantity ?? 0)
      current.revenue += Number(item.line_total ?? 0)
      const itemCost = Number(item.quantity ?? 0) * Number(item.unit_cost ?? 0)
      current.cost_of_goods_sold += itemCost
      current.profit += Number(item.line_total ?? 0) - itemCost
      byId.set(id, current)
    }
  }

  const productById = new Map(products.map((product) => [Number(product.id), product]))
  return [...byId.values()].map((item) => ({
    ...item,
    name: productById.get(item.id)?.name ?? item.name,
    stock: Number(productById.get(item.id)?.stock_quantity ?? 0),
  }))
}

function buildCategoryRevenue(sales, products) {
  const productById = new Map(products.map((product) => [Number(product.id), product]))
  const categories = new Map()
  for (const sale of sales) {
    for (const item of saleItems(sale)) {
      const category = productById.get(Number(item.product_id))?.category ?? 'Uncategorized'
      categories.set(category, (categories.get(category) ?? 0) + Number(item.line_total ?? 0))
    }
  }
  return [...categories.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function getStockStatus(products) {
  const statuses = { healthy: 0, low: 0, out: 0 }
  for (const product of products) {
    const quantity = Number(product.stock_quantity ?? 0)
    const reorder = Number(product.reorder_level ?? 0)
    if (quantity <= 0) statuses.out += 1
    else if (quantity <= reorder) statuses.low += 1
    else statuses.healthy += 1
  }
  return statuses
}

function getStockValueByCategory(products) {
  const categories = new Map()
  for (const product of products) {
    const category = product.category ?? 'Uncategorized'
    const value = Number(product.stock_quantity ?? 0) * Number(product.cost_price ?? 0)
    categories.set(category, (categories.get(category) ?? 0) + value)
  }
  return [...categories.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function getAverageRevenueByWeekday(sales, rangeData) {
  const values = Array.from({ length: 7 }, (_, index) => ({
    label: new Date(2024, 0, 7 + index).toLocaleString('en', { weekday: 'short' }),
    revenue: 0,
    days: 0,
  }))
  for (const sale of sales) {
    const date = parseDate(saleDate(sale))
    if (!date) continue
    const index = date.getDay()
    values[index].revenue += Number(sale.subtotal ?? sale.total_amount ?? 0)
  }
  for (let date = new Date(rangeData.start); date <= rangeData.end; date = shiftDate(date, 1)) {
    values[date.getDay()].days += 1
  }
  return values.map((value) => ({
    label: value.label,
    average: value.days ? value.revenue / value.days : 0,
  }))
}

function getHourlyRevenue(sales, rangeData) {
  const values = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}:00`,
    total: 0,
  }))
  for (const sale of sales) {
    const hour = Number.parseInt(saleTime(sale).slice(0, 2), 10)
    if (hour >= 0 && hour < 24) values[hour].total += Number(sale.subtotal ?? sale.total_amount ?? 0)
  }
  return values.map(({ label, total }) => ({
    label,
    value: rangeData.length ? total / rangeData.length : 0,
  }))
}

function buildCashierRankings(sales) {
  const cashiers = new Map()
  for (const sale of sales) {
    const name = sale.user ?? sale.cashier ?? 'Unknown cashier'
    const item = cashiers.get(name) ?? { id: name, name, value: 0 }
    item.value += Number(sale.subtotal ?? sale.total_amount ?? 0)
    cashiers.set(name, item)
  }
  return [...cashiers.values()].sort((a, b) => b.value - a.value).slice(0, 8)
}

function toCsv(filename, rows) {
  const contents = rows.map((row) => row.map((value) => (
    `"${String(value ?? '').replace(/"/g, '""')}"`
  )).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function LoadingGrid() {
  return (
    <DashboardGrid>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4">
        <CardSkeleton title="Loading analytics" rows={3} />
        <CardSkeleton title="Loading analytics" rows={3} />
        <CardSkeleton title="Loading analytics" rows={3} />
        <CardSkeleton title="Loading analytics" rows={3} />
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-2">
        <CardSkeleton title="Loading chart" rows={5} />
        <CardSkeleton title="Loading chart" rows={5} />
      </div>
    </DashboardGrid>
  )
}

function ChartEmpty({ children }) {
  return <div className="flex h-full w-full items-center justify-center px-5 text-center text-sm text-slate-500">{children}</div>
}

function InlineBarTable({ rows, metric, metricLabel, onMetricChange }) {
  const values = rows.map((row) => metric === 'units'
    ? Number(row.units)
    : metric === 'revenue'
      ? Number(row.revenue)
      : Number(row.profit ?? 0))
  const maxValue = Math.max(1, ...values)

  return (
    <Card
      title="Best sellers"
      subtitle="Sales line items in the selected date range"
      footer={`${formatNumber(rows.length)} products with sales in the selected range.`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Ranked by {metricLabel.toLowerCase()}</p>
        <div className="flex gap-1 rounded-lg border border-[#E6EAF2] bg-slate-50 p-1">
          {[
            ['units', 'Units'],
            ['revenue', 'Revenue'],
            ['profit', 'Profit'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onMetricChange(value)}
              className={`min-h-8 rounded-md px-2 text-xs font-medium ${
                metric === value ? 'bg-primary text-white' : 'text-slate-600 hover:bg-white'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#EEF1F6] text-slate-500">
              <th className="py-2 pr-3 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Performance</th>
              <th className="py-2 pl-3 text-right font-medium">{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.slice(0, 8).map((row, index) => {
              const value = values[index]
              return (
                <tr key={row.id ?? row.name} className="border-b border-[#EEF1F6] last:border-0">
                  <td className="max-w-40 truncate py-3 pr-3 font-medium text-slate-700">{row.name}</td>
                  <td className="w-1/2 px-3 py-3">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, value / maxValue * 100))}%` }} />
                    </div>
                  </td>
                  <td className="py-3 pl-3 text-right font-medium text-slate-800 tabular-nums">
                    {metric === 'units' ? formatNumber(value) : formatCurrency(value)}
                  </td>
                </tr>
              )
            }) : (
              <tr><td colSpan={3} className="py-8 text-center text-slate-500">No product sales in the selected range.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function SimpleDataTable({ columns, rows, emptyMessage }) {
  return (
    <div className="h-full overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#EEF1F6] text-slate-500">
            {columns.map((column) => <th key={column.key} className="px-2 py-2 font-medium">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id ?? row.name ?? index} className="border-b border-[#EEF1F6] last:border-0">
              {columns.map((column) => (
                <td key={column.key} className="px-2 py-3 text-slate-700">
                  {column.render ? column.render(row[column.key], row) : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={columns.length} className="py-8 text-center text-slate-500">{emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReportWorkspace({ reports, selectedReport, rangeData, selectedRange }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const reportRows = reports?.reports ?? []
  const selected = reportRows.find((report) => report.report === selectedReport)
  const profitMetrics = selected?.report === 'Profit and loss' ? selected.metrics : null
  const filteredRows = reportRows.filter((report) => (
    (!selectedReport || report.report === selectedReport)
    && inRange(report.date, rangeData.start, rangeData.end)
  ))

  function openReport(name) {
    const params = new URLSearchParams(searchParams)
    params.set('tab', 'reports')
    params.set('report', name)
    setSearchParams(params)
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.delete('report')
                setSearchParams(params)
              }}
              className="mb-2 text-xs font-medium text-primary hover:underline"
            >
              All reports
            </button>
            <h2 className="text-lg font-semibold text-slate-900">{selected.report}</h2>
            <p className="text-sm text-slate-500">Report catalog result for {RANGE_LABELS[selectedRange].toLowerCase()}.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => window.print()}>Print</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => toCsv(`${selected.report.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, [
                ['Metric', 'Value'],
                ...(profitMetrics ? [
                  ['Revenue', profitMetrics.revenue],
                  ['Cost of goods sold', profitMetrics.cost_of_goods_sold],
                  ['Gross profit', profitMetrics.gross_profit],
                  ['Expenses', profitMetrics.expenses],
                  ['Net profit', profitMetrics.net_profit],
                  ['Gross margin (%)', profitMetrics.gross_margin],
                  ['Net margin (%)', profitMetrics.net_margin],
                  ['Estimated cost share (%)', profitMetrics.estimated_cost_share],
                ] : filteredRows.map((row) => [row.report, row.value])),
              ])}
            >
              CSV
            </Button>
          </div>
        </div>
        <Card
          title={profitMetrics ? 'Profit and loss statement' : 'Report results'}
          subtitle={profitMetrics ? 'Completed sales and expenses for the selected date range.' : 'The endpoint returns report data for the selected period.'}
          footer={profitMetrics ? 'Revenue − cost of goods sold = gross profit; gross profit − expenses = net profit.' : 'Date filtering applies to report entries returned by GET /api/reports.'}
        >
          {profitMetrics ? (
            <SimpleDataTable
              columns={[
                { key: 'metric', label: 'Metric' },
                { key: 'value', label: 'Value', render: (value, row) => row.percent ? `${Number(value ?? 0).toFixed(2)}%` : formatCurrency(value) },
              ]}
              rows={[
                { metric: 'Revenue', value: profitMetrics.revenue },
                { metric: 'Cost of goods sold', value: profitMetrics.cost_of_goods_sold },
                { metric: 'Gross profit', value: profitMetrics.gross_profit },
                { metric: 'Expenses', value: profitMetrics.expenses },
                { metric: 'Net profit', value: profitMetrics.net_profit },
                { metric: 'Gross margin', value: profitMetrics.gross_margin, percent: true },
                { metric: 'Net margin', value: profitMetrics.net_margin, percent: true },
                { metric: 'Estimated cost share', value: profitMetrics.estimated_cost_share, percent: true },
              ]}
              emptyMessage="No profit and loss data is available for this period."
            />
          ) : (
            <>
              <div className="mb-4 max-w-xs">
                <label className="block text-xs font-medium text-slate-600" htmlFor="report-range">Date range</label>
                <select
                  id="report-range"
                  value={selectedRange}
                  onChange={(event) => {
                    const params = new URLSearchParams(searchParams)
                    params.set('range', event.target.value)
                    setSearchParams(params)
                  }}
                  className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
                >
                  {RANGE_VALUES.map((range) => <option key={range} value={range}>{RANGE_LABELS[range]}</option>)}
                </select>
              </div>
              <SimpleDataTable
                columns={[
                  { key: 'report', label: 'Report' },
                  { key: 'value', label: 'Value' },
                  { key: 'items', label: 'Items' },
                  { key: 'date', label: 'Date' },
                ]}
                rows={filteredRows}
                emptyMessage="No catalog entries match this report and date range."
              />
            </>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Available reports</h2>
        <p className="mt-1 text-sm text-slate-500">Open a catalog report preview. Detailed report datasets are not exposed by the documented API.</p>
      </div>
      <DashboardGrid>
        {reportRows.map((report) => (
          <Card
            key={report.report}
            className="col-span-12 min-[768px]:col-span-3"
            title={report.report}
            subtitle={`Updated ${report.date ?? 'date unavailable'}`}
            footer={<Button type="button" variant="secondary" onClick={() => openReport(report.report)}>Open</Button>}
          >
            <p className="text-sm text-slate-600">
              {formatNumber(report.items ?? 0)} catalog {Number(report.items) === 1 ? 'entry' : 'entries'} with a returned summary value.
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900 tabular-nums">{report.value ?? 'No summary value'}</p>
          </Card>
        ))}
        {!reportRows.length ? (
          <Card className="col-span-12" title="No reports returned">
            <p className="text-sm text-slate-500">The reports catalog is empty.</p>
          </Card>
        ) : null}
      </DashboardGrid>
    </div>
  )
}

function OverviewTab({ data, sales, rangeData, range, categoryFilter }) {
  const currentSales = validSales(sales).filter((sale) => inRange(saleDate(sale), rangeData.start, rangeData.end))
  const previousSales = validSales(sales).filter((sale) => inRange(saleDate(sale), rangeData.previousStart, rangeData.previousEnd))
  const selectedSales = categoryFilter
    ? currentSales.filter((sale) => saleItems(sale).some((item) => (
      data.products.find((product) => Number(product.id) === Number(item.product_id))?.category === categoryFilter
    )))
    : currentSales
  const selectedPreviousSales = categoryFilter
    ? previousSales.filter((sale) => saleItems(sale).some((item) => (
      data.products.find((product) => Number(product.id) === Number(item.product_id))?.category === categoryFilter
    )))
    : previousSales
  const salesTrend = buildSalesTrend(
    categoryFilter
      ? validSales(sales).filter((sale) => saleItems(sale).some((item) => (
        data.products.find((product) => Number(product.id) === Number(item.product_id))?.category === categoryFilter
      )))
      : validSales(sales),
    rangeData,
    range === 'YTD' ? 'month' : 'week',
  )
  const trendBuckets = getBuckets(rangeData, range === 'YTD' ? 'month' : 'week')
  salesTrend.forEach((row, index) => {
    row.target = Number(data.monthlyTarget ?? 0)
      * (Math.round((trendBuckets[index].end - trendBuckets[index].start) / 86400000) + 1)
      / 30
  })
  const productsSold = buildProductSales(selectedSales, data.products)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
  const categoryRevenue = buildCategoryRevenue(selectedSales, data.products)
  const stockCount = getStockStatus(data.products)
  const expensesTotal = data.expenses
    .filter((expense) => inRange(expense.date, rangeData.start, rangeData.end))
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const currentExpenses = data.expenses.filter((expense) => inRange(expense.date, rangeData.start, rangeData.end))
  const previousExpenses = data.expenses.filter((expense) => inRange(expense.date, rangeData.previousStart, rangeData.previousEnd))
  const currentProfit = summarizeProfit(selectedSales, currentExpenses)
  const previousProfit = summarizeProfit(selectedPreviousSales, previousExpenses)
  const profitTrend = buildProfitTrend(
    categoryFilter
      ? validSales(sales).filter((sale) => saleItems(sale).some((item) => (
        data.products.find((product) => Number(product.id) === Number(item.product_id))?.category === categoryFilter
      )))
      : validSales(sales),
    data.expenses,
    rangeData,
    range === 'YTD' ? 'month' : 'week',
  )
  const costTrackingDate = data.analytics?.summary?.cost_tracking_started_at
  const estimatedBeforeDate = costTrackingDate
    ? new Date(`${costTrackingDate}T00:00:00`).toLocaleDateString('en-PH')
    : 'cost tracking began'

  return (
    <>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        <KpiCard
          label="Revenue"
          value={<MoneyText amount={sumSales(selectedSales)} />}
          change={percentChange(sumSales(selectedSales), sumSales(selectedPreviousSales))}
          icon={CircleDollarSign}
          sparkline={salesTrend.map((row) => ({ value: row.current }))}
          footer={RANGE_LABELS[range]}
        />
        <KpiCard
          label="Transactions"
          value={formatNumber(selectedSales.length)}
          change={percentChange(selectedSales.length, selectedPreviousSales.length)}
          icon={Receipt}
          sparkline={salesTrend.map((row) => ({ value: row.current ? 1 : 0 }))}
          footer={RANGE_LABELS[range]}
        />
        <KpiCard
          label="Average sale"
          value={<MoneyText amount={selectedSales.length ? sumSales(selectedSales) / selectedSales.length : 0} />}
          change={percentChange(
            selectedSales.length ? sumSales(selectedSales) / selectedSales.length : 0,
            selectedPreviousSales.length ? sumSales(selectedPreviousSales) / selectedPreviousSales.length : 0,
          )}
          icon={ShoppingCart}
          sparkline={salesTrend.map((row) => ({ value: row.current }))}
          footer="Average transaction amount"
        />
        <KpiCard
          label="Gross profit"
          value={<MoneyText amount={currentProfit.gross_profit} />}
          change={percentChange(currentProfit.gross_profit, previousProfit.gross_profit)}
          sparkline={profitTrend.map((row) => ({ value: row.gross_profit }))}
          icon={TrendingUp}
          footer={selectedSales.length ? RANGE_LABELS[range] : 'No completed sales in this period'}
        />
        <KpiCard
          label="Net profit"
          value={<MoneyText amount={currentProfit.net_profit} />}
          change={percentChange(currentProfit.net_profit, previousProfit.net_profit)}
          sparkline={profitTrend.map((row) => ({ value: row.net_profit }))}
          icon={TrendingDown}
          footer={selectedSales.length ? RANGE_LABELS[range] : 'No completed sales in this period'}
        />
        <KpiCard
          label="Low-stock items"
          value={formatNumber(stockCount.low)}
          trendUnavailable
          icon={AlertTriangle}
          footer="Current inventory snapshot"
        />
        <KpiCard
          label="Expenses"
          value={<MoneyText amount={expensesTotal} />}
          trendUnavailable
          icon={TrendingDown}
          footer="Filtered by expense date"
        />
      </div>
      {currentProfit.estimated_cost_items_count > 0 ? (
        <p className="col-span-12 -mt-2 text-xs text-slate-500">
          Includes estimated costs for sales before {estimatedBeforeDate}.
        </p>
      ) : null}
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-12 min-[1280px]:gap-5">
        <ChartCard
          className="min-[1280px]:col-span-8"
          title="Revenue vs previous period"
          subtitle={RANGE_LABELS[range]}
          legend={[
            { label: 'Current period', color: '#2457D6' },
            { label: 'Previous period', color: '#9DB6EE' },
            { label: 'Target', color: '#0E1A33' },
          ]}
          footnote={categoryFilter ? `Filtered to ${categoryFilter}. Target is not category-adjusted.` : 'Previous period uses the same-length period immediately before the selected range.'}
          tableData={salesTrend.map((row) => ({ label: row.label, value: formatCurrency(row.current) }))}
        >
          <GroupedBarChart
            data={salesTrend}
            xKey="label"
            series={[
              { key: 'current', label: 'Current period', color: '#2457D6' },
              { key: 'previous', label: 'Previous period', color: '#9DB6EE' },
            ]}
            targetKey={data.monthlyTarget ? 'target' : undefined}
            targetLabel="Configured monthly target"
            calloutKey="current"
            calloutLabel={`Latest ${compactCurrency(salesTrend[salesTrend.length - 1]?.current ?? 0)}`}
            formatValue={compactCurrency}
          />
        </ChartCard>
        <ChartCard
          className="min-[1280px]:col-span-4"
          title="Forecast preview"
          subtitle="7 or 30 day estimate"
          legend={[{ label: 'Forecast', color: '#9DB6EE' }]}
          footnote="Forecast data and uncertainty bounds are not available."
          tableData={[]}
        >
          <ChartEmpty>The API has no forecast series, uncertainty bounds, or backtest error.</ChartEmpty>
        </ChartCard>
      </div>
      <div className="col-span-12">
        <ChartCard
          title="Profit trend"
          subtitle={RANGE_LABELS[range]}
          legend={[
            { label: 'Gross profit', color: '#2457D6' },
            { label: 'Net profit', color: '#0E1A33' },
          ]}
          footnote="Gross profit is revenue less sale-time cost; net profit also subtracts expenses incurred in each period."
          tableData={profitTrend.map((row) => ({
            label: row.label,
            value: `Gross ${formatCurrency(row.gross_profit)} · Net ${formatCurrency(row.net_profit)}`,
          }))}
        >
          <GroupedBarChart
            data={profitTrend}
            xKey="label"
            series={[
              { key: 'gross_profit', label: 'Gross profit', color: '#2457D6' },
              { key: 'net_profit', label: 'Net profit', color: '#0E1A33' },
            ]}
            formatValue={compactCurrency}
          />
        </ChartCard>
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-2 min-[1280px]:gap-5">
        <RankedList
          title="Top products"
          subtitle="Units sold in selected date range"
          items={productsSold}
          formatValue={(value) => `${formatNumber(value)} units`}
          footer="Ranked from returned sale line items."
        />
        <DonutCard
          title="Revenue by category"
          subtitle="Selected date range"
          data={categoryRevenue}
          total={categoryRevenue.reduce((sum, row) => sum + row.value, 0)}
          formatValue={formatCurrency}
          footer={categoryFilter ? `Filtered to ${categoryFilter}.` : 'Derived by joining sale item product IDs with product categories.'}
        />
      </div>
    </>
  )
}

function SalesTab({ sales, expenses, rangeData, range, period, setParameter }) {
  const liveSales = validSales(sales)
  const currentSales = liveSales.filter((sale) => inRange(saleDate(sale), rangeData.start, rangeData.end))
  const previousSales = liveSales.filter((sale) => inRange(saleDate(sale), rangeData.previousStart, rangeData.previousEnd))
  const trend = buildSalesTrend(liveSales, rangeData, period)
  const profitTrend = buildProfitTrend(liveSales, expenses, rangeData, period)
  const weekdays = getAverageRevenueByWeekday(currentSales, rangeData)
  const hourly = getHourlyRevenue(currentSales, rangeData)
  const cashierRankings = buildCashierRankings(currentSales).map((row) => ({
    ...row,
    value: row.value,
  }))
  const today = new Date()
  const weekday = today.getDay()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const lastWeekSameDay = shiftDate(todayStart, -7)
  const weekStart = shiftDate(todayStart, -weekday)
  const previousWeekStart = shiftDate(weekStart, -7)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const previousMonthEnd = shiftDate(monthStart, -1)
  const comparisons = [
    {
      label: 'Today vs same weekday last week',
      current: sumSales(liveSales.filter((sale) => inRange(saleDate(sale), todayStart, todayStart))),
      previous: sumSales(liveSales.filter((sale) => inRange(saleDate(sale), lastWeekSameDay, lastWeekSameDay))),
    },
    {
      label: 'This week vs last week',
      current: sumSales(liveSales.filter((sale) => inRange(saleDate(sale), weekStart, todayStart))),
      previous: sumSales(liveSales.filter((sale) => inRange(saleDate(sale), previousWeekStart, shiftDate(weekStart, -1)))),
    },
    {
      label: 'This month vs last month',
      current: sumSales(liveSales.filter((sale) => inRange(saleDate(sale), monthStart, todayStart))),
      previous: sumSales(liveSales.filter((sale) => inRange(saleDate(sale), previousMonthStart, previousMonthEnd))),
    },
  ]

  return (
    <>
      <div className="col-span-12 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Sales trend</h2>
          <p className="mt-1 text-xs text-slate-500">Switch the grouping while retaining the page date range.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[#E6EAF2] bg-white p-1">
          {['day', 'week', 'month'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setParameter('period', value)}
              className={`min-h-9 rounded-md px-3 text-xs font-medium capitalize ${
                period === value ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="col-span-12">
        <ChartCard
          title="Sales trend"
          subtitle={`${period[0].toUpperCase()}${period.slice(1)} totals · ${RANGE_LABELS[range]}`}
          legend={[{ label: 'Revenue', color: '#2457D6' }, { label: 'Gross profit', color: '#0E1A33' }]}
          footnote="Revenue uses sale subtotals; gross profit subtracts recorded sale-time costs."
          tableData={trend.map((row) => ({ label: row.label, value: formatCurrency(row.current) }))}
        >
          <GroupedBarChart
            data={trend.map((row, index) => ({ ...row, gross_profit: profitTrend[index]?.gross_profit ?? 0 }))}
            xKey="label"
            series={[
              { key: 'current', label: 'Revenue', color: '#2457D6' },
              { key: 'gross_profit', label: 'Gross profit', color: '#0E1A33' },
            ]}
            formatValue={compactCurrency}
          />
        </ChartCard>
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-3 min-[1280px]:gap-5">
        <ChartCard
          title="Average revenue by weekday"
          subtitle="Average daily revenue for each weekday"
          legend={[{ label: 'Average revenue', color: '#2457D6' }]}
          tableData={weekdays.map((row) => ({ label: row.label, value: formatCurrency(row.average) }))}
        >
          <GroupedBarChart data={weekdays} xKey="label" series={[{ key: 'average', label: 'Average revenue', color: '#2457D6' }]} formatValue={compactCurrency} />
        </ChartCard>
        <ChartCard
          title="Average revenue by hour"
          subtitle="Average per day in selected range"
          legend={[{ label: 'Average revenue', color: '#6F91E7' }]}
          tableData={hourly.map((row) => ({ label: row.label, value: formatCurrency(row.value) }))}
        >
          <GroupedBarChart data={hourly} xKey="label" series={[{ key: 'value', label: 'Revenue', color: '#6F91E7' }]} formatValue={compactCurrency} />
        </ChartCard>
        <RankedList
          title="Sales by cashier"
          subtitle="Revenue in selected range"
          items={cashierRankings}
          formatValue={formatCurrency}
          footer={`${formatNumber(cashierRankings.length)} cashiers with returned sales.`}
        />
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[768px]:grid-cols-3 min-[1280px]:gap-5">
        {comparisons.map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={<MoneyText amount={item.current} />}
            change={percentChange(item.current, item.previous)}
            goodDirection="up"
            icon={Activity}
            footer={`Previous: ${formatCurrency(item.previous)}`}
          />
        ))}
      </div>
      {currentSales.length === 0 && previousSales.length === 0 ? (
        <p className="col-span-12 text-xs text-slate-500">No sales were returned for the selected or comparison periods.</p>
      ) : null}
    </>
  )
}

function classifyProducts(products, saleProducts) {
  const salesById = new Map(saleProducts.map((item) => [item.id, item]))
  const ranked = products.map((product) => ({
    ...product,
    units: Number(salesById.get(Number(product.id))?.units ?? 0),
    revenue: Number(salesById.get(Number(product.id))?.revenue ?? 0),
    profit: Number(salesById.get(Number(product.id))?.profit ?? 0),
    stockValue: Number(product.stock_quantity ?? 0) * Number(product.cost_price ?? 0),
  }))
  const sold = ranked.filter((product) => product.units > 0).sort((a, b) => b.units - a.units)
  const fastCutoff = Math.ceil(sold.length * 0.25)
  const slowCutoff = Math.max(fastCutoff, Math.ceil(sold.length * 0.75))

  return ranked.map((product) => {
    if (product.units === 0) return { ...product, className: 'Not moving' }
    const index = sold.findIndex((row) => Number(row.id) === Number(product.id))
    if (index < fastCutoff) return { ...product, className: 'Fast' }
    if (index >= slowCutoff) return { ...product, className: 'Slow' }
    return { ...product, className: 'Normal' }
  })
}

function ProductsTab({ products, sales, rangeData, range, productView, metric, setParameter }) {
  const currentSales = validSales(sales).filter((sale) => inRange(saleDate(sale), rangeData.start, rangeData.end))
  const soldProducts = buildProductSales(currentSales, products)
  const classified = classifyProducts(products, soldProducts)
  const groups = [
    { name: 'Fast', tone: 'positive' },
    { name: 'Normal', tone: 'info' },
    { name: 'Slow', tone: 'warning' },
    { name: 'Not moving', tone: 'negative' },
  ]
  const rows = classified
    .filter((product) => !productView || productView === 'all' || (
      productView === 'best-sellers' ? product.units > 0 : productView === 'slow-movers'
        ? ['Slow', 'Not moving'].includes(product.className)
        : true
    ))
    .sort((a, b) => {
      if (metric === 'revenue') return b.revenue - a.revenue
      if (metric === 'profit') return b.profit - a.profit
      return b.units - a.units
    })
  const restock = products
    .filter((product) => Number(product.stock_quantity ?? 0) <= Number(product.reorder_level ?? 0))
    .sort((a, b) => Number(a.stock_quantity) - Number(b.stock_quantity))
    .slice(0, 6)
  return (
    <>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        {groups.map((group) => {
          const members = classified.filter((product) => product.className === group.name)
          const stockValue = members.reduce((sum, product) => sum + product.stockValue, 0)
          return (
            <Card
              key={group.name}
              title={`${group.name} products`}
              subtitle={group.name === 'Not moving' ? 'No sale line in selected range' : `Relative velocity · ${RANGE_LABELS[range]}`}
              footer="Stock value uses current product cost prices."
            >
              <p className="text-3xl font-semibold text-slate-900 tabular-nums">{formatNumber(members.length)}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">Current stock value</span>
                <Badge tone={group.tone}>{formatCurrency(stockValue)}</Badge>
              </div>
            </Card>
          )
        })}
      </div>
      <div className="col-span-12 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Product movement</h2>
          <p className="mt-1 text-xs text-slate-500">Classes are relative quartiles of returned sales in the selected date range.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[#E6EAF2] bg-white p-1">
          {[
            ['best-sellers', 'Best sellers'],
            ['slow-movers', 'Slow movers'],
            ['performance', 'Performance'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setParameter('productView', value)}
              className={`min-h-9 rounded-md px-3 text-xs font-medium ${
                productView === value ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-2 min-[1280px]:gap-5">
        <InlineBarTable
          rows={rows}
          metric={metric}
          metricLabel={metric === 'units' ? 'Units sold' : metric === 'revenue' ? 'Revenue' : 'Profit'}
          onMetricChange={(value) => setParameter('metric', value)}
        />
        <Card
          title="Product performance"
          subtitle="Sales and current inventory position"
          footer="Current cost and stock fields do not represent historical sale-time values."
        >
          <SimpleDataTable
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'units', label: 'Units' },
              { key: 'revenue', label: 'Revenue', render: (value) => formatCurrency(value) },
              { key: 'profit', label: 'Profit', render: (value) => formatCurrency(value) },
              { key: 'className', label: 'Class', render: (value) => <Badge tone={groups.find((group) => group.name === value)?.tone}>{value}</Badge> },
            ]}
            rows={classified.sort((a, b) => b.units - a.units).slice(0, 8)}
            emptyMessage="No products are available."
          />
        </Card>
      </div>
      <div className="col-span-12">
        <Card
          title="Restock suggestions"
          subtitle="Current stock at or below reorder level"
          footer={(
            <span>
              Create a purchase order from the existing purchase-order page.{' '}
              <Link className="font-medium text-primary" to="/purchasing?tab=purchase-orders">Create purchase order</Link>
            </span>
          )}
        >
          <SimpleDataTable
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'stock_quantity', label: 'On hand' },
              { key: 'reorder_level', label: 'Reorder at' },
              { key: 'supplier', label: 'Supplier' },
              { key: 'stock_value', label: 'Stock value', render: (value) => formatCurrency(value) },
            ]}
            rows={restock.map((product) => ({
              ...product,
              stock_value: Number(product.stock_quantity ?? 0) * Number(product.cost_price ?? 0),
            }))}
            emptyMessage="No products currently meet the restock threshold."
          />
        </Card>
      </div>
    </>
  )
}

function InventoryTab({ data, rangeData, range }) {
  const stock = getStockStatus(data.products)
  const productCount = Math.max(1, data.products.length)
  const valueByCategory = getStockValueByCategory(data.products)
  const liveSales = validSales(data.sales).filter((sale) => inRange(saleDate(sale), rangeData.start, rangeData.end))
  const unitsSold = sumUnits(liveSales)
  const currentQuantity = data.products.reduce((sum, product) => sum + Number(product.stock_quantity ?? 0), 0)
  const averageDailySales = rangeData.length ? unitsSold / rangeData.length : 0
  const daysOfCover = averageDailySales ? currentQuantity / averageDailySales : null
  const expiringMoves = data.movements.filter((movement) => (
    movement.expiry_date && movement.expiry_date >= localDate()
  ))
    .sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)))
    .slice(0, 10)

  return (
    <>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-12 min-[1280px]:gap-5">
        <Card
          className="min-[1280px]:col-span-6"
          title="Inventory status"
          subtitle={`${formatNumber(data.products.length)} active and inactive products`}
          footer="Status is based on current quantity and reorder level."
        >
          <SegmentedBar data={[
            { label: `In stock · ${stock.healthy}`, value: Math.round(stock.healthy / productCount * 100), color: '#2457D6' },
            { label: `Low stock · ${stock.low}`, value: Math.round(stock.low / productCount * 100), color: '#F59E0B' },
            { label: `Out of stock · ${stock.out}`, value: Math.round(stock.out / productCount * 100), color: '#EF4444' },
          ]} />
        </Card>
        <div className="min-[1280px]:col-span-6">
          <DonutCard
            title="Inventory value by category"
            subtitle="On-hand quantity × current cost price"
            data={valueByCategory}
            formatValue={formatCurrency}
            footer="Valuation uses current product cost prices; historical costs are not available."
          />
        </div>
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        <KpiCard
          label="Inventory turnover"
          value="Unavailable"
          trendUnavailable
          unavailableMessage="Historical average inventory is not exposed."
          icon={TrendingUp}
          footer="Needs historical inventory snapshots"
        />
        <KpiCard
          label="Days of cover"
          value={daysOfCover == null ? 'Unavailable' : `${daysOfCover.toFixed(1)} days`}
          trendUnavailable
          unavailableMessage={daysOfCover == null ? 'No returned sales to estimate daily demand.' : `Estimated from ${RANGE_LABELS[range].toLowerCase()} sales.`}
          icon={Activity}
          footer="Current on-hand ÷ average daily units sold"
        />
        <KpiCard label="Low-stock products" value={formatNumber(stock.low)} trendUnavailable icon={AlertTriangle} footer={`${formatNumber(stock.out)} products out of stock`} />
        <KpiCard
          label="Inventory cost value"
          value={<MoneyText amount={valueByCategory.reduce((sum, row) => sum + row.value, 0)} />}
          trendUnavailable
          icon={Boxes}
          footer="Current quantity × current unit cost"
        />
      </div>
      <div className="col-span-12">
        <Card
          title="Expiring stock"
          subtitle="Batch expiry dates found on recent stock movements"
          footer="Movement history is not a current batch balance; no dedicated batch-expiry endpoint is documented."
        >
          <SimpleDataTable
            columns={[
              { key: 'product', label: 'Product' },
              { key: 'batch_no', label: 'Batch' },
              { key: 'expiry_date', label: 'Expiry date' },
              { key: 'quantity', label: 'Movement qty' },
              { key: 'movement_type', label: 'Movement type' },
            ]}
            rows={expiringMoves}
            emptyMessage="No expiry-dated batches were included in the returned movement records."
          />
        </Card>
      </div>
    </>
  )
}

function ProfitTab({ sales, expenses, rangeData, range, costTrackingDate }) {
  const currentSales = validSales(sales).filter((sale) => inRange(saleDate(sale), rangeData.start, rangeData.end))
  const previousSales = validSales(sales).filter((sale) => inRange(saleDate(sale), rangeData.previousStart, rangeData.previousEnd))
  const currentExpenses = expenses.filter((expense) => inRange(expense.date, rangeData.start, rangeData.end))
  const previousExpenses = expenses.filter((expense) => inRange(expense.date, rangeData.previousStart, rangeData.previousEnd))
  const currentProfit = summarizeProfit(currentSales, currentExpenses)
  const previousProfit = summarizeProfit(previousSales, previousExpenses)
  const trend = buildProfitTrend(validSales(sales), expenses, rangeData, range === 'YTD' ? 'month' : 'week')
  const expenseTrend = buildExpenseTrend(expenses, rangeData, range === 'YTD' ? 'month' : 'week')
  const estimatedBeforeDate = costTrackingDate
    ? new Date(`${costTrackingDate}T00:00:00`).toLocaleDateString('en-PH')
    : 'cost tracking began'
  const expenseByCategory = new Map()
  for (const expense of expenses) {
    if (!inRange(expense.date, rangeData.start, rangeData.end)) continue
    expenseByCategory.set(expense.category ?? 'Uncategorized', (expenseByCategory.get(expense.category ?? 'Uncategorized') ?? 0) + Number(expense.amount ?? 0))
  }
  const expenseRankings = [...expenseByCategory.entries()]
    .map(([name, value]) => ({ id: name, name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        <KpiCard
          label="Gross profit"
          value={<MoneyText amount={currentProfit.gross_profit} />}
          change={percentChange(currentProfit.gross_profit, previousProfit.gross_profit)}
          sparkline={trend.map((row) => ({ value: row.gross_profit }))}
          icon={TrendingUp}
          footer={currentSales.length ? RANGE_LABELS[range] : 'No completed sales in this period'}
        />
        <KpiCard
          label="Net profit"
          value={<MoneyText amount={currentProfit.net_profit} />}
          change={percentChange(currentProfit.net_profit, previousProfit.net_profit)}
          sparkline={trend.map((row) => ({ value: row.net_profit }))}
          icon={TrendingDown}
          footer={currentSales.length ? RANGE_LABELS[range] : 'No completed sales in this period'}
        />
        <KpiCard label="Gross margin" value={`${currentProfit.gross_margin.toFixed(1)}%`} change={percentChange(currentProfit.gross_margin, previousProfit.gross_margin)} sparkline={trend.map((row) => ({ value: row.gross_profit }))} icon={TrendingUp} footer="Gross profit ÷ revenue" />
        <KpiCard label="Net margin" value={`${currentProfit.net_margin.toFixed(1)}%`} change={percentChange(currentProfit.net_margin, previousProfit.net_margin)} sparkline={trend.map((row) => ({ value: row.net_profit }))} icon={TrendingDown} footer="Net profit ÷ revenue" />
        <KpiCard label="Revenue" value={<MoneyText amount={currentProfit.revenue} />} trendUnavailable icon={CircleDollarSign} footer={RANGE_LABELS[range]} />
        <KpiCard
          label="Expenses"
          value={<MoneyText amount={currentProfit.expenses} />}
          trendUnavailable
          icon={Receipt}
          footer="Expense records filtered by date"
        />
      </div>
      {currentProfit.estimated_cost_items_count > 0 ? (
        <p className="col-span-12 -mt-2 text-xs text-slate-500">
          Includes estimated costs for sales before {estimatedBeforeDate}.
        </p>
      ) : null}
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-12 min-[1280px]:gap-5">
        <ChartCard
          className="min-[1280px]:col-span-6"
          title="Gross and net profit trend"
          subtitle={RANGE_LABELS[range]}
          legend={[{ label: 'Gross profit', color: '#2457D6' }, { label: 'Net profit', color: '#0E1A33' }]}
          footnote="Gross profit subtracts sale-time costs; net profit also subtracts expenses incurred in the period."
          tableData={trend.map((row) => ({ label: row.label, value: `Gross ${formatCurrency(row.gross_profit)} · Net ${formatCurrency(row.net_profit)}` }))}
        >
          <GroupedBarChart
            data={trend}
            xKey="label"
            series={[
              { key: 'gross_profit', label: 'Gross profit', color: '#2457D6' },
              { key: 'net_profit', label: 'Net profit', color: '#0E1A33' },
            ]}
            formatValue={compactCurrency}
          />
        </ChartCard>
        <ChartCard
          className="min-[1280px]:col-span-6"
          title="Revenue, cost and expenses"
          subtitle={RANGE_LABELS[range]}
          legend={[
            { label: 'Revenue', color: '#2457D6' },
            { label: 'Cost of goods sold', color: '#9DB6EE' },
            { label: 'Expenses', color: '#0E1A33' },
          ]}
          footnote="Sale costs are recorded at checkout; expenses are grouped by incurred date."
          tableData={trend.map((row, index) => ({
            label: row.label,
            value: `Revenue ${formatCurrency(row.revenue)}; cost ${formatCurrency(row.cost_of_goods_sold)}; expenses ${formatCurrency(expenseTrend[index]?.value ?? 0)}`,
          }))}
        >
          {trend.length ? (
            <GroupedBarChart
              data={trend.map((row, index) => ({
                label: row.label,
                revenue: row.revenue,
                cost: row.cost_of_goods_sold,
                expenses: expenseTrend[index]?.value ?? 0,
              }))}
              xKey="label"
              series={[
                { key: 'revenue', label: 'Revenue', color: '#2457D6' },
                { key: 'cost', label: 'Cost of goods sold', color: '#9DB6EE' },
                { key: 'expenses', label: 'Expenses', color: '#0E1A33' },
              ]}
              formatValue={compactCurrency}
            />
          ) : <ChartEmpty>No sales or expense data is available for this range.</ChartEmpty>}
        </ChartCard>
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-2 min-[1280px]:gap-5">
        <RankedList title="Expenses by category" subtitle={RANGE_LABELS[range]} items={expenseRankings} formatValue={formatCurrency} footer="Grouped from expense records returned by GET /api/expenses." />
        <Card title="Profit and loss summary" subtitle={RANGE_LABELS[range]} footer="Net profit = gross profit − expenses.">
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex justify-between gap-3"><span>Revenue</span><strong>{formatCurrency(currentProfit.revenue)}</strong></li>
            <li className="flex justify-between gap-3"><span>Cost of goods sold</span><strong>{formatCurrency(currentProfit.cost_of_goods_sold)}</strong></li>
            <li className="flex justify-between gap-3"><span>Gross profit</span><strong>{formatCurrency(currentProfit.gross_profit)}</strong></li>
            <li className="flex justify-between gap-3"><span>Expenses</span><strong>{formatCurrency(currentProfit.expenses)}</strong></li>
            <li className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-slate-900"><span>Net profit</span><strong>{formatCurrency(currentProfit.net_profit)}</strong></li>
          </ul>
        </Card>
      </div>
    </>
  )
}

function ForecastTab({ sales, products, rangeData, forecastDays, setParameter }) {
  const actualSales = validSales(sales).filter((sale) => inRange(saleDate(sale), rangeData.start, rangeData.end))
  const trend = buildSalesTrend(actualSales, rangeData, 'day')
  const restock = products
    .filter((product) => Number(product.stock_quantity ?? 0) <= Number(product.reorder_level ?? 0))
    .sort((a, b) => Number(a.stock_quantity) - Number(b.stock_quantity))
    .slice(0, 6)

  return (
    <>
      <div className="col-span-12 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Forecast horizon</h2>
          <p className="mt-1 text-xs text-slate-500">Choose a display window. The forecast itself requires API support.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[#E6EAF2] bg-white p-1">
          {[7, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setParameter('forecastDays', String(days))}
              className={`min-h-9 rounded-md px-3 text-xs font-medium ${
                forecastDays === String(days) ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>
      <div className="col-span-12 grid grid-cols-1 gap-4 min-[1280px]:grid-cols-12 min-[1280px]:gap-5">
        <ChartCard
          className="min-[1280px]:col-span-8"
          title={`${forecastDays}-day sales forecast`}
          subtitle="Actual revenue and forecast range"
          legend={[
            { label: 'Actual revenue', color: '#2457D6' },
            { label: 'Forecast', color: '#9DB6EE' },
            { label: 'Uncertainty range', color: '#C2D0F5' },
          ]}
          footnote="Actual daily revenue is shown where returned; no forecast values are invented."
          tableData={trend.map((row) => ({ label: row.label, value: formatCurrency(row.current) }))}
        >
          {trend.length ? (
            <GroupedBarChart
              data={trend.slice(-Number(forecastDays))}
              xKey="label"
              series={[{ key: 'current', label: 'Actual revenue', color: '#2457D6' }]}
              formatValue={compactCurrency}
            />
          ) : <ChartEmpty>No actual sales were returned for this period.</ChartEmpty>}
        </ChartCard>
        <Card
          className="min-[1280px]:col-span-4"
          title="Forecast method"
          subtitle="Forecast quality and assumptions"
          footer="No prediction is displayed until the API returns forecast data."
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              The documented API does not provide a forecast method, estimate, or confidence interval.
            </div>
            <div className="border-t border-[#EEF1F6] pt-3">
              <p className="text-xs font-medium text-slate-600">Backtest error</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Unavailable</p>
            </div>
            <p className="text-xs leading-5 text-slate-500">Current actual data comes from GET /api/sales and does not include an explicit paging or date-filter contract.</p>
          </div>
        </Card>
      </div>
      <div className="col-span-12">
        <Card
          title="Restock suggestions"
          subtitle="Current on-hand at or below reorder level"
          footer={<Link className="font-medium text-primary" to="/purchasing?tab=purchase-orders">Create purchase order</Link>}
        >
          <SimpleDataTable
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'stock_quantity', label: 'On hand' },
              { key: 'reorder_level', label: 'Reorder level' },
              { key: 'supplier', label: 'Supplier' },
            ]}
            rows={restock}
            emptyMessage="No products currently meet the restock threshold."
          />
        </Card>
      </div>
    </>
  )
}

const analyticsTabs = [
  { label: 'Overview', value: 'overview', permission: 'analytics.view' },
  { label: 'Sales', value: 'sales', permission: 'analytics.view' },
  { label: 'Products', value: 'products', permission: 'analytics.view' },
  { label: 'Inventory status', value: 'inventory-status', permission: 'analytics.view' },
  { label: 'Profit and expenses', value: 'profit-expenses', permission: 'analytics.view' },
  { label: 'Forecast', value: 'forecast', permission: 'analytics.view' },
  { label: 'Reports', value: 'reports', permission: 'reports.view' },
]

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const visibleTabs = analyticsTabs.filter((tab) => canAccessTab(user, tab))
  const requestedTab = searchParams.get('tab')
  const tab = visibleTabs.some((item) => item.value === requestedTab)
    ? requestedTab
    : visibleTabs[0]?.value
  const range = RANGE_VALUES.includes(searchParams.get('range')) ? searchParams.get('range') : '30D'
  const dateRange = useMemo(() => getRange(range), [range])
  const categoryFilter = searchParams.get('category') ?? ''
  const productView = searchParams.get('productView') ?? 'best-sellers'
  const period = ['day', 'week', 'month'].includes(searchParams.get('period'))
    ? searchParams.get('period')
    : 'day'
  const metric = ['units', 'revenue', 'profit'].includes(searchParams.get('metric'))
    ? searchParams.get('metric')
    : 'units'
  const forecastDays = ['7', '30'].includes(searchParams.get('forecastDays'))
    ? searchParams.get('forecastDays')
    : '7'
  const reportParam = searchParams.get('report') ?? ''
  const hasAnalytics = hasPermission(user, ['analytics.view'])
  const hasReports = hasPermission(user, ['reports.view'])
  useEffect(() => {
    const requestedRange = searchParams.get('range')
    const requestedTab = searchParams.get('tab')
    if (requestedRange !== range || requestedTab !== tab) {
      const next = new URLSearchParams(searchParams)
      next.set('range', range)
      if (tab) next.set('tab', tab)
      setSearchParams(next, { replace: true })
    }
  }, [range, searchParams, setSearchParams, tab])

  const query = useQuery({
    queryKey: ['analytics-page', user?.id, range, localDate(dateRange.start), localDate(dateRange.end), hasAnalytics, hasReports],
    enabled: Boolean(user && (hasAnalytics || hasReports)),
    queryFn: async () => {
      const get = async (path, config) => (await apiClient.get(path, config)).data
      const results = {}
      const currentDates = {
        date_from: localDate(dateRange.start),
        date_to: localDate(dateRange.end),
        previous_date_from: localDate(dateRange.previousStart),
        previous_date_to: localDate(dateRange.previousEnd),
      }

      if (hasAnalytics) {
        const [sales, products, stock, movements, expenses, settings, analytics] = await Promise.all([
          get('/api/sales'),
          get('/api/products'),
          get('/api/stock'),
          get('/api/stock/movements', { params: { date_from: localDate(dateRange.start), date_to: localDate(dateRange.end) } }),
          get('/api/expenses'),
          get('/api/settings'),
          get('/api/analytics', { params: currentDates }),
        ])
        Object.assign(results, { sales, products, stock, movements, expenses, settings, analytics })
      }

      if (hasReports) {
        results.reports = await get('/api/reports', {
          params: { date_from: currentDates.date_from, date_to: currentDates.date_to },
        })
      }
      return results
    },
  })

  function updateParams(updates) {
    const next = new URLSearchParams(searchParams)
    if (tab) next.set('tab', tab)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value == null) next.delete(key)
      else next.set(key, String(value))
    })
    setSearchParams(next)
  }

  function changeTab(value) {
    const next = new URLSearchParams(searchParams)
    next.set('tab', value)
    if (value !== 'reports') next.delete('report')
    setSearchParams(next)
  }

  function exportTab() {
    const loaded = query.data ?? {}
    if (tab === 'reports') {
      const rows = (loaded.reports?.reports ?? []).filter((row) => (
        (!reportParam || row.report === reportParam)
        && inRange(row.date, dateRange.start, dateRange.end)
      ))
      const profitReport = rows.find((row) => row.report === 'Profit and loss')
      if (profitReport?.metrics) {
        const metrics = profitReport.metrics
        toCsv('profit-and-loss.csv', [
          ['Metric', 'Value'],
          ['Revenue', metrics.revenue],
          ['Cost of goods sold', metrics.cost_of_goods_sold],
          ['Gross profit', metrics.gross_profit],
          ['Expenses', metrics.expenses],
          ['Net profit', metrics.net_profit],
          ['Gross margin (%)', metrics.gross_margin],
          ['Net margin (%)', metrics.net_margin],
          ['Estimated cost share (%)', metrics.estimated_cost_share],
        ])
        return
      }
      toCsv('analytics-reports.csv', [
        ['Report', 'Value', 'Items', 'Date'],
        ...rows.map((row) => [row.report, row.value, row.items, row.date]),
      ])
      return
    }
    const currentSales = validSales(loaded.sales ?? []).filter((sale) => inRange(saleDate(sale), dateRange.start, dateRange.end))
    if (tab === 'products') {
      const productSales = buildProductSales(currentSales, loaded.products ?? [])
      toCsv('product-performance.csv', [
        ['Product', 'Units sold', 'Revenue', 'Cost of goods sold', 'Profit', 'Current stock'],
        ...productSales.map((row) => [row.name, row.units, row.revenue, row.cost_of_goods_sold, row.profit, row.stock]),
      ])
      return
    }
    if (tab === 'inventory-status') {
      toCsv('inventory-status.csv', [
        ['Product', 'Category', 'On hand', 'Reorder level', 'Cost price'],
        ...(loaded.products ?? []).map((product) => [product.name, product.category, product.stock_quantity, product.reorder_level, product.cost_price]),
      ])
      return
    }
    if (tab === 'profit-expenses') {
      const selectedExpenses = (loaded.expenses ?? []).filter((expense) => inRange(expense.date, dateRange.start, dateRange.end))
      const profit = summarizeProfit(currentSales, selectedExpenses)
      toCsv('profit-and-expenses.csv', [
        ['Metric', 'Value'],
        ['Revenue', profit.revenue],
        ['Cost of goods sold', profit.cost_of_goods_sold],
        ['Gross profit', profit.gross_profit],
        ['Expenses', profit.expenses],
        ['Net profit', profit.net_profit],
        ['Gross margin (%)', profit.gross_margin],
        ['Net margin (%)', profit.net_margin],
        ['Estimated cost share (%)', profit.estimated_cost_share],
        ...selectedExpenses.map((expense) => [expense.category, expense.amount]),
      ])
      return
    }
    toCsv(`analytics-${tab ?? 'overview'}.csv`, [
      ['Receipt', 'Date', 'Cashier', 'Total'],
      ...currentSales.map((sale) => [sale.receipt_number ?? sale.invoice_number, saleDate(sale), sale.user, sale.subtotal ?? sale.total_amount]),
    ])
  }

  const header = (
    <PageHeader
      title="Data Analytics"
      subtitle={`${query.data?.settings?.store_name ?? 'Store'} · ${periodLabel(dateRange, range)}`}
      dateRange={periodLabel(dateRange, range)}
      range={range}
      onRangeChange={(value) => updateParams({ range: value })}
      activeFilters={(range !== '30D' ? 1 : 0) + (categoryFilter ? 1 : 0)}
      onFilters={() => setFiltersOpen((open) => !open)}
      onExport={exportTab}
    />
  )

  if (!tab || !visibleTabs.some((item) => item.value === tab)) return <ForbiddenPage />

  if (query.error) {
    return (
      <div className="space-y-5">
        {header}
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {query.error?.response?.data?.message ?? 'Could not load analytics data.'}
        </div>
      </div>
    )
  }

  const loading = query.isLoading
  const data = query.data ?? {
    sales: [],
    products: [],
    stock: [],
    movements: [],
    expenses: [],
    settings: {},
    reports: { reports: [] },
  }
  const categoryOptions = [...new Set((data.products ?? []).map((product) => product.category).filter(Boolean))]
  const filteredSales = filterSalesByCategory(data.sales ?? [], data.products ?? [], categoryFilter)
  const filteredProducts = categoryFilter
    ? (data.products ?? []).filter((product) => product.category === categoryFilter)
    : data.products ?? []
  const filteredMovements = categoryFilter
    ? (data.movements ?? []).filter((movement) => {
      const product = (data.products ?? []).find((item) => Number(item.id) === Number(movement.product_id))
      return product?.category === categoryFilter
    })
    : data.movements ?? []
  const analyticsData = {
    ...data,
    sales: filteredSales,
    products: filteredProducts,
    movements: filteredMovements,
  }
  const content = loading ? <LoadingGrid /> : tab === 'overview' ? (
    <OverviewTab
      data={{ ...analyticsData, monthlyTarget: data.settings?.monthly_target }}
      sales={filteredSales}
      rangeData={dateRange}
      range={range}
      categoryFilter=""
    />
  ) : tab === 'sales' ? (
    <SalesTab
      sales={filteredSales}
      expenses={data.expenses ?? []}
      rangeData={dateRange}
      range={range}
      period={period}
      setParameter={updateParams}
    />
  ) : tab === 'products' ? (
    <ProductsTab
      products={filteredProducts}
      sales={filteredSales}
      rangeData={dateRange}
      range={range}
      productView={productView}
      metric={metric}
      setParameter={updateParams}
    />
  ) : tab === 'inventory-status' ? (
    <InventoryTab data={analyticsData} rangeData={dateRange} range={range} />
  ) : tab === 'profit-expenses' ? (
    <ProfitTab sales={filteredSales} expenses={data.expenses ?? []} rangeData={dateRange} range={range} costTrackingDate={data.analytics?.summary?.cost_tracking_started_at} />
  ) : tab === 'forecast' ? (
    <ForecastTab
      sales={filteredSales}
      products={filteredProducts}
      rangeData={dateRange}
      forecastDays={forecastDays}
      setParameter={updateParams}
    />
  ) : (
    <ReportWorkspace
      reports={data.reports}
      selectedReport={reportParam}
      rangeData={dateRange}
      selectedRange={range}
    />
  )

  return (
    <div className="space-y-5">
      {header}
      <TabsList
        value={tab}
        onValueChange={changeTab}
        items={visibleTabs.map(({ label, value }) => ({ label, value }))}
      />
      {filtersOpen ? (
        <Card title="Analytics filters" subtitle="Filters apply to client-side summaries from documented responses.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              Product category
              <select
                value={categoryFilter}
                onChange={(event) => updateParams({ category: event.target.value })}
                className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                <option value="">All categories</option>
                {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <p className="self-end pb-2 text-xs text-slate-500">
              {categoryFilter ? `Filtering sales to ${categoryFilter}.` : 'No category filter applied.'}
            </p>
          </div>
        </Card>
      ) : null}
      {tab === 'reports' ? (
        content
      ) : (
        <DashboardGrid>
          {content}
        </DashboardGrid>
      )}
    </div>
  )
}

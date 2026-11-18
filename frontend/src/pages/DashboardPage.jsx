import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Package,
  PackageCheck,
  Receipt,
  ShoppingCart,
  Truck,
} from 'lucide-react'

import {
  Badge,
  Card,
  CardSkeleton,
  ChartCard,
  DashboardGrid,
  DonutCard,
  GroupedBarChart,
  KpiCard,
  MetricsTable,
  MoneyText,
  PageHeader,
  RankedList,
  StatusCard,
} from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'
import { getCompletedSales, getSaleCost, summarizeProfit } from '../lib/profit'

const RANGE_OPTIONS = ['1D', '7D', '30D', '90D', 'YTD']
const RANGE_LABELS = {
  '1D': 'Today',
  '7D': 'Last 7 days',
  '30D': 'Last 30 days',
  '90D': 'Last 90 days',
  YTD: 'Year to date',
}

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value) {
  if (!value) return null
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getPeriod(range, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let start

  if (range === 'YTD') {
    start = new Date(end.getFullYear(), 0, 1)
  } else {
    const days = Number.parseInt(range, 10) || 1
    start = addDays(end, -(days - 1))
  }

  const daysInPeriod = Math.round((end - start) / 86400000) + 1
  const previousEnd = range === 'YTD'
    ? new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())
    : addDays(start, -1)
  const previousStart = range === 'YTD'
    ? new Date(previousEnd.getFullYear(), 0, 1)
    : addDays(previousEnd, -(daysInPeriod - 1))

  return { start, end, previousStart, previousEnd }
}

function formatPeriod(period, range) {
  const format = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
  if (range === '1D') return `Today · ${format.format(period.end)}`
  return `${format.format(period.start)} – ${format.format(period.end)}`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatCompactCurrency(value) {
  return `₱${new Intl.NumberFormat('en-PH', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0))}`
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-PH')
}

function getSaleDate(sale) {
  return String(sale.date ?? sale.created_at ?? '').slice(0, 10)
}

function getSaleTime(sale) {
  return String(sale.time ?? sale.created_at?.slice(11, 19) ?? '')
}

function isSaleInPeriod(sale, start, end) {
  const date = getSaleDate(sale)
  return date >= localDateString(start) && date <= localDateString(end)
}

function getLiveSales(sales = []) {
  return getCompletedSales(sales)
}

function getSaleTotal(sales) {
  return sales.reduce((sum, sale) => sum + Number(sale.subtotal ?? sale.total_amount ?? 0), 0)
}

function getItemsSold(sales) {
  return sales.reduce((sum, sale) => (
    sum + (sale.items ?? []).reduce((items, item) => items + Number(item.quantity ?? 0), 0)
  ), 0)
}

function getChange(current, previous) {
  if (previous === 0) return current === 0 ? '0%' : 'New'
  const percent = ((current - previous) / Math.abs(previous)) * 100
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
}

function makeBuckets(period, range) {
  const buckets = []

  if (range === 'YTD' || range === '90D') {
    let cursor = new Date(period.start.getFullYear(), period.start.getMonth(), 1)
    while (cursor <= period.end) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const start = cursor < period.start ? period.start : cursor
      const end = monthEnd > period.end ? period.end : monthEnd
      buckets.push({
        start,
        end,
        label: cursor.toLocaleString('en', { month: 'short' }),
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return buckets
  }

  const daysPerBucket = range === '30D' ? 6 : 1
  let cursor = new Date(period.start)
  while (cursor <= period.end) {
    const bucketEnd = addDays(cursor, daysPerBucket - 1)
    const end = bucketEnd > period.end ? period.end : bucketEnd
    buckets.push({
      start: cursor,
      end,
      label: daysPerBucket === 1
        ? cursor.toLocaleString('en', { weekday: 'short' })
        : `W${buckets.length + 1}`,
    })
    cursor = addDays(end, 1)
  }
  return buckets
}

function getBucketIndex(dateValue, buckets) {
  const date = parseLocalDate(dateValue)
  if (!date) return -1
  return buckets.findIndex((bucket) => date >= bucket.start && date <= bucket.end)
}

function buildSalesSeries(sales, period, range, monthlyTarget) {
  const currentBuckets = makeBuckets(period, range)
  const previousBuckets = makeBuckets({
    start: period.previousStart,
    end: period.previousEnd,
  }, range)
  const values = currentBuckets.map((bucket) => ({
    label: bucket.label,
    current: 0,
    previous: 0,
    currentTransactions: 0,
    previousTransactions: 0,
    target: Number(monthlyTarget ?? 0) * (Math.round((bucket.end - bucket.start) / 86400000) + 1) / 30,
  }))

  for (const sale of sales) {
    const currentIndex = getBucketIndex(getSaleDate(sale), currentBuckets)
    if (currentIndex >= 0) {
      values[currentIndex].current += Number(sale.subtotal ?? sale.total_amount ?? 0)
      values[currentIndex].currentTransactions += 1
    }

    const previousIndex = getBucketIndex(getSaleDate(sale), previousBuckets)
    if (previousIndex >= 0 && values[previousIndex]) {
      values[previousIndex].previous += Number(sale.subtotal ?? sale.total_amount ?? 0)
      values[previousIndex].previousTransactions += 1
    }
  }

  return values
}

function buildProfitSeries(sales, expenses, period, range) {
  const series = buildSalesSeries(sales, period, range, 0)
  const buckets = makeBuckets(period, range)

  series.forEach((row, index) => {
    const bucket = buckets[index]
    const bucketSales = sales.filter((sale) => isSaleInPeriod(sale, bucket.start, bucket.end))
    const cost = bucketSales.reduce((sum, sale) => sum + getSaleCost(sale), 0)
    const revenue = bucketSales.reduce((sum, sale) => sum + Number(sale.subtotal ?? 0), 0)
    const expenseTotal = expenses
      .filter((expense) => isSaleInPeriod({ date: expense.date }, bucket.start, bucket.end))
      .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)

    row.currentGrossProfit = revenue - cost
    row.currentNetProfit = row.currentGrossProfit - expenseTotal
  })

  return series
}

function buildMovementSeries(movements, period, range) {
  const buckets = makeBuckets(period, range)
  const values = buckets.map((bucket) => ({
    label: bucket.label,
    stockIn: 0,
    stockOut: 0,
  }))

  for (const movement of movements) {
    const index = getBucketIndex(movement.created_at, buckets)
    if (index < 0) continue
    const direction = movement.direction
      ?? (Number(movement.quantity) > 0 ? 'in' : 'out')
    if (direction === 'in') values[index].stockIn += Math.abs(Number(movement.quantity ?? 0))
    else values[index].stockOut += Math.abs(Number(movement.quantity ?? 0))
  }

  return values
}

function buildHourlySeries(sales) {
  const values = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    sales: 0,
  }))
  for (const sale of sales) {
    const hour = Number.parseInt(getSaleTime(sale).slice(0, 2), 10)
    if (hour >= 0 && hour < values.length) values[hour].sales += Number(sale.total_amount ?? 0)
  }
  return values
}

function getProductName(value) {
  if (typeof value === 'string') return value
  return value?.name ?? value?.product_name ?? 'Product'
}

function getMovementProductName(movement) {
  return getProductName(movement.product)
}

function getCategoryName(product) {
  if (typeof product.category === 'string') return product.category
  return product.category?.name ?? product.category_name ?? 'Uncategorized'
}

function getStockCounts(stock) {
  const low = stock.filter((product) => {
    const quantity = Number(product.stock_quantity ?? 0)
    const reorder = Number(product.reorder_level ?? 0)
    return quantity > 0 && (product.low_stock || quantity <= reorder)
  })
  const out = stock.filter((product) => Number(product.stock_quantity ?? 0) <= 0)
  const inStock = stock.filter((product) => Number(product.stock_quantity ?? 0) > 0
    && !low.includes(product))
  return { inStock, low, out }
}

function ErrorNotice({ error }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {error?.response?.data?.message ?? 'Could not load dashboard data.'}
    </div>
  )
}

function EmptyChart({ children }) {
  return <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-slate-500">{children}</div>
}

function InlineTable({ columns, rows, emptyMessage }) {
  return (
    <div className="h-full overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#EEF1F6] text-slate-500">
            {columns.map((column) => <th key={column.key} className="px-2 py-2 font-medium">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id} className="border-b border-[#EEF1F6] last:border-0">
              {columns.map((column) => (
                <td key={`${row.id}-${column.key}`} className="px-2 py-3 text-slate-700">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
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

function InventoryHealthCard({ stock, footer }) {
  const counts = getStockCounts(stock)
  const total = stock.length
  const rows = [
    { label: 'In stock', count: counts.inStock.length, tone: 'bg-emerald-500' },
    { label: 'Low stock', count: counts.low.length, tone: 'bg-amber-500' },
    { label: 'Out of stock', count: counts.out.length, tone: 'bg-red-500' },
  ]

  return (
    <Card title="Inventory health" subtitle={`${formatNumber(total)} products tracked`} footer={footer}>
      <div className="flex h-full flex-col justify-between gap-3">
        {rows.map((row) => {
          const percent = total ? Math.round((row.count / total) * 100) : 0
          return (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-700">{row.label}</span>
                <span className="text-slate-500 tabular-nums">{formatNumber(row.count)} · {percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-between border-t border-[#EEF1F6] pt-3 text-xs">
          <span className="font-medium text-slate-700">Expiring soon</span>
          <Badge tone="warning">Unavailable</Badge>
        </div>
      </div>
    </Card>
  )
}

function ReceiptButton({ sale, onError }) {
  const [loading, setLoading] = useState(false)

  async function printReceipt() {
    const popup = window.open('', '_blank')
    if (!popup) {
      onError('Allow pop-ups to open a printable receipt.')
      return
    }

    popup.document.write('<!doctype html><title>Preparing receipt</title><p>Preparing receipt...</p>')
    setLoading(true)
    onError('')

    try {
      const { data: receipt } = await apiClient.get(`/api/sales/${sale.id}/receipt`)
      const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character])
      const itemRows = (receipt.items ?? []).map((item) => `
        <tr>
          <td>${escapeHtml(item.product)}</td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${formatCurrency(item.unit_price)}</td>
          <td>${formatCurrency(item.line_total)}</td>
        </tr>`).join('')

      popup.document.open()
      popup.document.write(`<!doctype html>
        <html><head><meta charset="utf-8"><title>${escapeHtml(receipt.receipt_number ?? 'Receipt')}</title>
        <style>
          body{font:14px Arial,sans-serif;max-width:680px;margin:32px auto;padding:0 20px;color:#172033}
          h1{font-size:20px;margin-bottom:4px}p{margin:6px 0;color:#526078}
          table{width:100%;border-collapse:collapse;margin:24px 0}
          th,td{text-align:left;padding:9px 5px;border-bottom:1px solid #e6eaf2}
          th:nth-child(n+2),td:nth-child(n+2){text-align:right}
          .total{font-size:18px;font-weight:bold;text-align:right}
          @media print{body{margin:0 auto}}
        </style></head><body>
        <h1>Receipt ${escapeHtml(receipt.receipt_number)}</h1>
        <p>${escapeHtml(receipt.date)} ${escapeHtml(receipt.time)} · ${escapeHtml(receipt.user)}</p>
        <p>Status: ${escapeHtml(receipt.status)}</p>
        <table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody></table>
        <p class="total">Total: ${formatCurrency(receipt.total_amount)}</p>
        <p>Payment: ${escapeHtml(receipt.payment_method)}</p>
        </body></html>`)
      popup.document.close()
      popup.focus()
      window.setTimeout(() => popup.print(), 300)
    } catch (error) {
      popup.close()
      onError(error?.response?.data?.message ?? 'Could not open this receipt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={printReceipt}
      disabled={loading}
      className="font-medium text-primary hover:text-primary/80 disabled:opacity-50"
    >
      {loading ? 'Loading…' : 'Receipt'}
    </button>
  )
}

function AdminDashboard({ data, sales, period, range }) {
  const stock = data.stock
  const stockCounts = getStockCounts(stock)
  const allSales = getLiveSales(sales)
  const currentSales = allSales.filter((sale) => isSaleInPeriod(sale, period.start, period.end))
  const previousSales = allSales.filter((sale) => isSaleInPeriod(sale, period.previousStart, period.previousEnd))
  const currentCompletedSales = getCompletedSales(currentSales)
  const previousCompletedSales = getCompletedSales(previousSales)
  const currentRevenue = getSaleTotal(currentSales)
  const previousRevenue = getSaleTotal(previousSales)
  const series = buildSalesSeries(allSales, period, range, data.settings.monthly_target)
  const productById = new Map(data.products.map((product) => [Number(product.id), product]))
  const categoryRevenue = new Map()
  const productUnits = new Map()

  for (const sale of currentSales) {
    for (const item of sale.items ?? []) {
      const product = productById.get(Number(item.product_id))
      const category = product ? getCategoryName(product) : 'Uncategorized'
      categoryRevenue.set(category, (categoryRevenue.get(category) ?? 0) + Number(item.line_total ?? 0))
      const name = product?.name ?? item.product ?? 'Product'
      const existing = productUnits.get(Number(item.product_id)) ?? { id: item.product_id, name, value: 0 }
      existing.value += Number(item.quantity ?? 0)
      productUnits.set(Number(item.product_id), existing)
    }
  }

  const topProducts = [...productUnits.values()].sort((a, b) => b.value - a.value).slice(0, 5)
  const categories = [...categoryRevenue.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const expenses = data.expenses
  const currentExpenses = expenses
    .filter((expense) => isSaleInPeriod({ date: expense.date }, period.start, period.end))
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const previousExpenses = expenses
    .filter((expense) => isSaleInPeriod({ date: expense.date }, period.previousStart, period.previousEnd))
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const profitSeries = buildProfitSeries(
    getCompletedSales(allSales),
    expenses,
    period,
    range,
  )
  const currentProfit = data.dashboard.profit ?? summarizeProfit(currentCompletedSales, expenses.filter((expense) => isSaleInPeriod({ date: expense.date }, period.start, period.end)))
  const previousProfit = data.dashboard.profit_comparison ?? summarizeProfit(previousCompletedSales, expenses.filter((expense) => isSaleInPeriod({ date: expense.date }, period.previousStart, period.previousEnd)))
  const estimatedBeforeDate = currentProfit.cost_tracking_started_at
    ? new Date(`${currentProfit.cost_tracking_started_at}T00:00:00`).toLocaleDateString('en-PH')
    : null
  const pendingOrders = data.purchaseOrders.filter((order) => (
    ['open', 'pending', 'partial'].includes(String(order.status).toLowerCase())
  ))
  const latestSales = [...currentSales].slice(0, 3)
  const alertCount = Number(data.dashboard.metrics?.find((metric) => metric.label === 'Alerts')?.value ?? 0)
  const hasSalesTarget = Number(data.settings.monthly_target) > 0
  const targetLabel = ['90D', 'YTD'].includes(range) ? 'Monthly target' : 'Period target'

  return (
    <>
      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-5 min-[1280px]:gap-5">
        <KpiCard
          label="Total revenue"
          value={<MoneyText amount={currentRevenue} />}
          change={getChange(currentRevenue, previousRevenue)}
          sparkline={series.map((item) => ({ value: item.current }))}
          icon={CircleDollarSign}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View sales</Link>}
        />
        <KpiCard
          label="Transactions"
          value={formatNumber(currentSales.length)}
          change={getChange(currentSales.length, previousSales.length)}
          sparkline={series.map((item) => ({ value: item.currentTransactions }))}
          icon={Receipt}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View transactions</Link>}
        />
        <KpiCard
          label="Gross profit"
          value={<MoneyText amount={currentProfit.gross_profit} />}
          change={getChange(Number(currentProfit.gross_profit ?? 0), Number(previousProfit.gross_profit ?? 0))}
          sparkline={profitSeries.map((item) => ({ value: item.currentGrossProfit }))}
          icon={Activity}
          footer={(
            <span>
              {currentCompletedSales.length ? RANGE_LABELS[range] : 'No completed sales in this period'} ·{' '}
              <Link className="font-medium text-primary" to="/analytics?tab=profit-expenses">View details</Link>
            </span>
          )}
        />
        <KpiCard
          label="Net profit"
          value={<MoneyText amount={currentProfit.net_profit} />}
          change={getChange(Number(currentProfit.net_profit ?? 0), Number(previousProfit.net_profit ?? 0))}
          sparkline={profitSeries.map((item) => ({ value: item.currentNetProfit }))}
          icon={BarChart3}
          footer={(
            <span>
              {currentCompletedSales.length ? RANGE_LABELS[range] : 'No completed sales in this period'} ·{' '}
              <Link className="font-medium text-primary" to="/analytics?tab=profit-expenses">View details</Link>
            </span>
          )}
        />
        <KpiCard
          label="Low-stock items"
          value={formatNumber(stockCounts.low.length)}
          trendUnavailable
          icon={AlertTriangle}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-levels">View stock levels</Link>}
        />
      </div>
      {Number(currentProfit.estimated_cost_items_count ?? 0) > 0 ? (
        <p className="col-span-12 -mt-2 text-xs text-slate-500">
          Includes estimated costs for sales before {estimatedBeforeDate ?? 'cost tracking began'}.
        </p>
      ) : null}

      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[1280px]:grid-cols-12 min-[1280px]:gap-5">
        <ChartCard
          className="min-[1280px]:col-span-8"
          title="Revenue vs previous period"
          subtitle={RANGE_LABELS[range]}
          legend={[
            { label: 'This period', color: '#2457D6' },
            { label: 'Previous period', color: '#9DB6EE' },
            ...(hasSalesTarget ? [{ label: targetLabel, color: '#0E1A33' }] : []),
          ]}
          footnote={hasSalesTarget ? 'Target is prorated from the configured monthly sales target for each period.' : 'Revenue is aggregated from documented sale records.'}
          footerLink="View sales"
          footerHref="/sales/transactions"
        >
          {series.length ? (
            <div className="relative h-full w-full">
              <GroupedBarChart
                data={series}
                xKey="label"
                series={[
                  { key: 'current', label: 'This period', color: '#2457D6' },
                  { key: 'previous', label: 'Previous period', color: '#9DB6EE' },
                ]}
                targetKey={hasSalesTarget ? 'target' : undefined}
                targetLabel={targetLabel}
                calloutKey="current"
                calloutLabel={`Latest ${formatCompactCurrency(series[series.length - 1]?.current ?? 0)}`}
                formatValue={formatCompactCurrency}
              />
              {Number(series[series.length - 1]?.current ?? 0) === 0 ? (
                <span className="pointer-events-none absolute bottom-7 right-[7%] rounded-full bg-[#0E1A33] px-3 py-1 text-[10px] font-semibold text-white">
                  Latest {formatCompactCurrency(0)}
                </span>
              ) : null}
            </div>
          ) : <EmptyChart>No sales were returned for this period.</EmptyChart>}
        </ChartCard>

        <ChartCard
          className="min-[1280px]:col-span-4"
          title="Sales forecast"
          subtitle="Forecast and uncertainty range"
          legend={[{ label: 'Actual', color: '#2457D6' }, { label: 'Forecast', color: '#9DB6EE' }]}
          footnote="Backtest error: unavailable. Forecasts are estimates."
          footerLink="View forecast"
          footerHref="/analytics?tab=forecast"
        >
          <EmptyChart>
            Forecast unavailable: the documented API has no forecast series, uncertainty bounds, backtest error, or insufficient_data status.
          </EmptyChart>
        </ChartCard>
      </div>

      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        <DonutCard
          title="Revenue by category"
          subtitle={RANGE_LABELS[range]}
          data={categories}
          total={currentRevenue}
          formatValue={formatCurrency}
          footer={<Link className="font-medium text-primary" to="/analytics?tab=sales">View category sales</Link>}
        />
        <InventoryHealthCard
          stock={stock}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-levels">View stock levels</Link>}
        />
        <RankedList
          title="Top products"
          subtitle="Units sold in selected period"
          items={topProducts}
          formatValue={(value) => `${formatNumber(value)} units`}
          footer={<Link className="font-medium text-primary" to="/analytics?tab=products">View product performance</Link>}
        />
        <MetricsTable
          title="Profit summary"
          subtitle={RANGE_LABELS[range]}
          rows={[
            { metric: 'Gross profit', current: formatCurrency(currentProfit.gross_profit), previous: formatCurrency(previousProfit.gross_profit), change: getChange(Number(currentProfit.gross_profit ?? 0), Number(previousProfit.gross_profit ?? 0)) },
            { metric: 'Net profit', current: formatCurrency(currentProfit.net_profit), previous: formatCurrency(previousProfit.net_profit), change: getChange(Number(currentProfit.net_profit ?? 0), Number(previousProfit.net_profit ?? 0)) },
            {
              metric: 'Expenses',
              current: formatCurrency(currentExpenses),
              previous: formatCurrency(previousExpenses),
              change: getChange(currentExpenses, previousExpenses),
              goodDirection: 'down',
            },
          ]}
          footer={(
            <span>
              Net profit subtracts expenses incurred during the selected period.{' '}
              <Link className="font-medium text-primary" to="/expenses">View expenses</Link>
            </span>
          )}
        />
      </div>

      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        <StatusCard
          title="Pending purchase orders"
          count={pendingOrders.length}
          items={pendingOrders.slice(0, 2).map((order) => ({
            id: order.id,
            title: order.order_number ?? order.reference ?? `Order #${order.id}`,
            description: String(order.status),
          }))}
          footer={<Link className="font-medium text-primary" to="/purchasing?tab=purchase-orders">View purchase orders</Link>}
          emptyMessage="No pending orders."
        />
        <StatusCard
          title="Active alerts"
          count={alertCount}
          countTone={alertCount > 0 ? 'negative' : 'positive'}
          items={[{
            id: 'alert-list',
            title: alertCount > 0 ? 'Alert details unavailable' : 'No active alerts reported',
            description: 'The documented API returns an alert count but no active-notification list.',
            tone: alertCount > 0 ? 'negative' : 'positive',
          }]}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=expiry-alerts">View alerts</Link>}
        />
        <StatusCard
          title="Latest sales"
          count={currentSales.length}
          countTone="info"
          items={latestSales.map((sale) => ({
            id: sale.id,
            title: sale.receipt_number ?? sale.invoice_number ?? `Sale #${sale.id}`,
            description: `${sale.date ?? ''} ${sale.time ?? ''} · ${String(sale.status)}`,
          }))}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View transactions</Link>}
          emptyMessage="No sales in the selected period."
        />
        <StatusCard
          title="Expiring soon"
          count="Unavailable"
          countTone="warning"
          items={[{
            id: 'expiry-data',
            title: 'Expiry details unavailable',
            description: 'No current batch-expiry listing is documented by the API.',
            tone: 'negative',
          }]}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=expiry-alerts">View expiry alerts</Link>}
        />
      </div>
    </>
  )
}

function StaffDashboard({ data, period, range }) {
  const stock = data.stock
  const stockCounts = getStockCounts(stock)
  const pendingOrders = data.purchaseOrders.filter((order) => (
    ['open', 'pending', 'partial'].includes(String(order.status).toLowerCase())
  ))
  const movements = data.movements
  const movementSeries = buildMovementSeries(movements, period, range)
  const lowStockRows = [...stockCounts.low, ...stockCounts.out]
    .sort((a, b) => Number(a.stock_quantity ?? 0) - Number(b.stock_quantity ?? 0))
    .slice(0, 8)
  const recentReceived = movements
    .filter((movement) => ['stock_in', 'purchase_order'].includes(movement.movement_type))
    .slice(0, 4)
  const latestMovements = movements.slice(0, 4)
  const alertCount = Number(data.dashboard.metrics?.find((metric) => metric.label === 'Alerts')?.value ?? 0)
  const productsByCategory = new Map()
  for (const product of stock) {
    const category = getCategoryName(product)
    productsByCategory.set(category, (productsByCategory.get(category) ?? 0) + Number(product.stock_quantity ?? 0))
  }
  const stockByCategory = [...productsByCategory.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return (
    <>
      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-5 min-[1280px]:gap-5">
        <KpiCard
          label="Inventory value"
          value="Not shown"
          trendUnavailable
          unavailableMessage="Monetary totals are not displayed on staff dashboards."
          icon={CircleDollarSign}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-levels">View stock levels</Link>}
        />
        <KpiCard label="Low stock" value={formatNumber(stockCounts.low.length)} trendUnavailable icon={AlertTriangle} footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-levels">View stock levels</Link>} />
        <KpiCard label="Out of stock" value={formatNumber(stockCounts.out.length)} trendUnavailable icon={Package} footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-levels">View stock levels</Link>} />
        <KpiCard
          label="Expiring soon"
          value="Unavailable"
          trendUnavailable
          unavailableMessage="No current batch-expiry listing is documented."
          icon={AlertTriangle}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=expiry-alerts">View expiry alerts</Link>}
        />
        <KpiCard label="Pending purchase orders" value={formatNumber(pendingOrders.length)} trendUnavailable icon={Truck} footer={<Link className="font-medium text-primary" to="/purchasing?tab=purchase-orders">View purchase orders</Link>} />
      </div>

      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[1280px]:grid-cols-2 min-[1280px]:gap-5">
        <ChartCard
          title="Stock in vs stock out"
          subtitle={RANGE_LABELS[range]}
          legend={[{ label: 'Stock in', color: '#2457D6' }, { label: 'Stock out', color: '#9DB6EE' }]}
          footnote="Up to 200 returned movements are grouped within the selected period."
          footerLink="View stock movements"
          footerHref="/inventory?tab=stock-in-out"
        >
          {movementSeries.length ? (
            <GroupedBarChart
              data={movementSeries}
              xKey="label"
              series={[
                { key: 'stockIn', label: 'Stock in', color: '#2457D6' },
                { key: 'stockOut', label: 'Stock out', color: '#9DB6EE' },
              ]}
              formatValue={formatNumber}
            />
          ) : <EmptyChart>No movements were returned for this period.</EmptyChart>}
        </ChartCard>

        <Card
          title="Restock queue"
          subtitle="Products at or below reorder level"
          footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-levels">View inventory</Link>}
        >
          <InlineTable
            columns={[
              { key: 'name', label: 'Product' },
              { key: 'stock_quantity', label: 'Stock' },
              { key: 'days_left', label: 'Days left' },
              { key: 'supplier', label: 'Supplier' },
            ]}
            rows={lowStockRows.map((product) => ({
              ...product,
              days_left: 'Unavailable',
              supplier: getProductName(product.supplier ?? product.supplier_name) === 'Product'
                ? '—'
                : getProductName(product.supplier ?? product.supplier_name),
            }))}
            emptyMessage="No products need restocking."
          />
        </Card>
      </div>

      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[768px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        <InventoryHealthCard
          stock={stock}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-levels">View stock levels</Link>}
        />
        <DonutCard
          title="Stock by category"
          subtitle="Units currently on hand"
          data={stockByCategory}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=products">View products</Link>}
        />
        <StatusCard
          title="Recently received goods"
          count={recentReceived.length}
          countTone="info"
          items={recentReceived.map((movement) => ({
            id: movement.id,
            title: getMovementProductName(movement),
            description: `+${Math.abs(Number(movement.quantity ?? 0))} units · ${movement.created_at ? new Date(movement.created_at).toLocaleDateString() : 'Date unavailable'}`,
            tone: 'positive',
          }))}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-in-out">View movements</Link>}
          emptyMessage="No stock receipts in the selected period."
        />
        <StatusCard
          title="Latest movements"
          count={movements.length}
          countTone="info"
          items={latestMovements.map((movement) => ({
            id: movement.id,
            title: getMovementProductName(movement),
            description: `${movement.direction === 'in' ? '+' : ''}${Number(movement.quantity ?? 0)} units · ${movement.movement_type}`,
            tone: movement.direction === 'in' ? 'positive' : 'warning',
          }))}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=stock-in-out">View movements</Link>}
          emptyMessage="No stock movements are available."
        />
      </div>

      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[1280px]:grid-cols-2 min-[1280px]:gap-5">
        <StatusCard
          title="Active alerts"
          count={alertCount}
          countTone={alertCount > 0 ? 'negative' : 'positive'}
          items={[{
            id: 'alerts',
            title: alertCount > 0 ? 'Alert details unavailable' : 'No active alerts reported',
            description: 'The API returns only a count, not the alert list.',
            tone: alertCount > 0 ? 'negative' : 'positive',
          }]}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=expiry-alerts">View alerts</Link>}
        />
        <StatusCard
          title="Expiring soon"
          count="Unavailable"
          countTone="warning"
          items={[{
            id: 'expiry',
            title: 'Expiry details unavailable',
            description: 'No current batch-expiry listing or days-left field is documented.',
            tone: 'negative',
          }]}
          footer={<Link className="font-medium text-primary" to="/inventory?tab=expiry-alerts">View expiry alerts</Link>}
        />
      </div>
    </>
  )
}

function CashierDashboard({ sales, period, range, onReceiptError }) {
  const allSales = getLiveSales(sales)
  const currentSales = allSales.filter((sale) => isSaleInPeriod(sale, period.start, period.end))
  const previousSales = allSales.filter((sale) => isSaleInPeriod(sale, period.previousStart, period.previousEnd))
  const todaySales = allSales.filter((sale) => getSaleDate(sale) === localDateString())
  const currentTotal = getSaleTotal(currentSales)
  const previousTotal = getSaleTotal(previousSales)
  const todayTotal = getSaleTotal(todaySales)
  const avgSale = currentSales.length ? currentTotal / currentSales.length : 0
  const previousAvgSale = previousSales.length ? previousTotal / previousSales.length : 0
  const hourlySeries = buildHourlySeries(currentSales)
  const recentSales = [...currentSales].slice(0, 10).map((sale) => ({
    ...sale,
    receipt: sale.receipt_number ?? sale.invoice_number,
    date_time: [sale.date, sale.time].filter(Boolean).join(' '),
  }))
  const useTodayLabels = range === '1D'
  const currentItems = getItemsSold(currentSales)
  const previousItems = getItemsSold(previousSales)

  return (
    <>
      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4 min-[1280px]:gap-5">
        <KpiCard
          label={useTodayLabels ? 'My sales today' : 'My sales in period'}
          value={<MoneyText amount={useTodayLabels ? todayTotal : currentTotal} />}
          change={getChange(currentTotal, previousTotal)}
          sparkline={hourlySeries.map((item) => ({ value: item.sales }))}
          icon={CircleDollarSign}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View transactions</Link>}
        />
        <KpiCard
          label={useTodayLabels ? 'My transactions today' : 'My transactions'}
          value={formatNumber(currentSales.length)}
          change={getChange(currentSales.length, previousSales.length)}
          sparkline={hourlySeries.map((item) => ({ value: item.sales ? 1 : 0 }))}
          icon={Receipt}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View transactions</Link>}
        />
        <KpiCard
          label="Average sale"
          value={<MoneyText amount={avgSale} />}
          change={getChange(avgSale, previousAvgSale)}
          sparkline={hourlySeries.map((item) => ({ value: item.sales }))}
          icon={ShoppingCart}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View transactions</Link>}
        />
        <KpiCard
          label={useTodayLabels ? 'Items sold today' : 'Items sold'}
          value={formatNumber(currentItems)}
          change={getChange(currentItems, previousItems)}
          sparkline={hourlySeries.map((item) => ({ value: item.sales ? 1 : 0 }))}
          icon={PackageCheck}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View transactions</Link>}
        />
      </div>

      <div className="col-span-12 grid grid-cols-1 items-stretch gap-4 min-[1280px]:grid-cols-2 min-[1280px]:gap-5">
        <ChartCard
          title={useTodayLabels ? 'My sales by hour today' : 'My sales by hour'}
          subtitle={RANGE_LABELS[range]}
          legend={[{ label: 'Sales', color: '#2457D6' }]}
          footnote="Hourly totals are derived from your returned sales."
          footerLink="Open POS"
          footerHref="/sales/pos"
        >
          <GroupedBarChart
            data={hourlySeries}
            xKey="hour"
            series={[{ key: 'sales', label: 'Sales', color: '#2457D6' }]}
            formatValue={formatCompactCurrency}
          />
        </ChartCard>

        <Card
          title="My last 10 sales"
          subtitle={RANGE_LABELS[range]}
          footer={<Link className="font-medium text-primary" to="/sales/transactions">View transaction history</Link>}
        >
          {onReceiptError.message ? (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{onReceiptError.message}</p>
          ) : null}
          <InlineTable
            columns={[
              { key: 'receipt', label: 'Receipt', render: (value, row) => <ReceiptButton sale={row} onError={onReceiptError.set} /> },
              { key: 'date_time', label: 'Date and time' },
              { key: 'status', label: 'Status', render: (value) => <Badge tone={value === 'completed' ? 'positive' : 'default'}>{value}</Badge> },
              { key: 'total_amount', label: 'Total', render: (value) => <MoneyText amount={value} /> },
            ]}
            rows={recentSales}
            emptyMessage="No sales in the selected period."
          />
        </Card>
      </div>
    </>
  )
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterInfoOpen, setFilterInfoOpen] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const isAdmin = hasPermission(user, ['analytics.view'])
  const isCashier = String(user?.role ?? '').trim().toLowerCase() === 'cashier'
  const roleKey = isAdmin ? 'admin' : isCashier ? 'cashier' : 'staff'
  const defaultRange = isCashier ? '1D' : '30D'
  const requestedRange = searchParams.get('range')
  const range = RANGE_OPTIONS.includes(requestedRange) ? requestedRange : defaultRange
  const period = useMemo(() => getPeriod(range), [range])
  const periodLabel = formatPeriod(period, range)
  const dateFrom = localDateString(period.start)
  const dateTo = localDateString(period.end)

  useEffect(() => {
    if (!RANGE_OPTIONS.includes(requestedRange)) {
      const params = new URLSearchParams(searchParams)
      params.set('range', defaultRange)
      setSearchParams(params, { replace: true })
    }
  }, [defaultRange, requestedRange, searchParams, setSearchParams])

  const query = useQuery({
    queryKey: ['dashboard', user?.id, roleKey, range, dateFrom, dateTo],
    queryFn: async () => {
      const get = async (path, config) => (await apiClient.get(path, config)).data
      const movementConfig = { params: { date_from: dateFrom, date_to: dateTo } }
      const dashboardConfig = {
        params: {
          date_from: dateFrom,
          date_to: dateTo,
          previous_date_from: localDateString(period.previousStart),
          previous_date_to: localDateString(period.previousEnd),
        },
      }

      if (isAdmin) {
        const [dashboard, sales, products, stock, movements, purchaseOrders, settings, expenses] = await Promise.all([
          get('/api/dashboard', dashboardConfig),
          get('/api/sales'),
          get('/api/products'),
          get('/api/stock'),
          get('/api/stock/movements', movementConfig),
          get('/api/purchase-orders'),
          get('/api/settings'),
          get('/api/expenses'),
        ])
        return { dashboard, sales, products, stock, movements, purchaseOrders, settings, expenses }
      }

      if (isCashier) {
        const [sales, settings] = await Promise.all([
          get('/api/sales'),
          get('/api/settings'),
        ])
        return { sales, settings }
      }

      const [dashboard, products, stock, movements, purchaseOrders, settings] = await Promise.all([
        get('/api/dashboard'),
        get('/api/products'),
        get('/api/stock'),
        get('/api/stock/movements', movementConfig),
        get('/api/purchase-orders'),
        get('/api/settings'),
      ])
      return { dashboard, products, stock, movements, purchaseOrders, settings }
    },
    enabled: Boolean(user),
  })

  const handleRangeChange = (nextRange) => {
    const params = new URLSearchParams(searchParams)
    params.set('range', nextRange)
    setSearchParams(params, { replace: true })
  }

  const titleSubtitle = `${query.data?.settings?.store_name ?? 'Store'} · ${periodLabel}`
  const pageHeader = (
    <PageHeader
      title="Dashboard"
      subtitle={query.isLoading ? 'Loading store dashboard…' : titleSubtitle}
      dateRange={periodLabel}
      range={range}
      onRangeChange={handleRangeChange}
      activeFilters={range === defaultRange ? 0 : 1}
      onFilters={() => setFilterInfoOpen((open) => !open)}
      onExport={() => {
        const data = query.data ?? {}
        const liveSales = getLiveSales(data.sales ?? [])
        const selectedSales = liveSales.filter((sale) => isSaleInPeriod(sale, period.start, period.end))
        const stockCounts = getStockCounts(data.stock ?? [])
        const selectedExpenses = (data.expenses ?? []).filter((expense) => isSaleInPeriod({ date: expense.date }, period.start, period.end))
        const profit = data.dashboard?.profit ?? summarizeProfit(getCompletedSales(selectedSales), selectedExpenses)
        const rows = isCashier
          ? [
            ['Metric', 'Value'],
            ['My sales', formatCurrency(getSaleTotal(selectedSales))],
            ['My transactions', selectedSales.length],
            ['Items sold', getItemsSold(selectedSales)],
          ]
          : isAdmin
            ? [
              ['Metric', 'Value'],
              ['Revenue', formatCurrency(getSaleTotal(selectedSales))],
              ['Transactions', selectedSales.length],
              ['Cost of goods sold', formatCurrency(profit.cost_of_goods_sold)],
              ['Gross profit', formatCurrency(profit.gross_profit)],
              ['Expenses', formatCurrency(profit.expenses)],
              ['Net profit', formatCurrency(profit.net_profit)],
              ['Low-stock items', stockCounts.low.length],
            ]
            : [
              ['Metric', 'Value'],
              ['Inventory value', 'Not shown to staff'],
              ['Low-stock items', stockCounts.low.length],
              ['Out-of-stock items', stockCounts.out.length],
              ['Pending purchase orders', data.purchaseOrders?.filter((order) => ['open', 'pending', 'partial'].includes(String(order.status).toLowerCase())).length ?? 0],
            ]
        downloadCsv(`dashboard-${range.toLowerCase()}.csv`, rows)
      }}
      primaryAction={isCashier ? (
        <Link to="/sales/pos" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90">
          <ShoppingCart aria-hidden="true" className="h-4 w-4" />
          Open POS
        </Link>
      ) : null}
    />
  )

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        {pageHeader}
        <DashboardGrid>
          <div className="col-span-12 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4">
            <CardSkeleton title="Loading dashboard" />
            <CardSkeleton title="Loading dashboard" />
            <CardSkeleton title="Loading dashboard" />
            <CardSkeleton title="Loading dashboard" />
          </div>
        </DashboardGrid>
      </div>
    )
  }

  if (query.error) {
    return <div className="space-y-5">{pageHeader}<ErrorNotice error={query.error} /></div>
  }

  const receiptErrorProps = { message: receiptError, set: setReceiptError }

  return (
    <div className="space-y-5">
      {pageHeader}
      {filterInfoOpen ? (
        <div className="rounded-xl border border-[#E6EAF2] bg-white p-3 text-sm text-slate-600 shadow-soft">
          Date range is the active dashboard filter. {range === defaultRange ? 'No additional filters are active.' : `${RANGE_LABELS[range]} is selected.`}
        </div>
      ) : null}
      <DashboardGrid>
        {isAdmin ? (
          <AdminDashboard
            data={query.data}
            sales={query.data.sales}
            period={period}
            range={range}
          />
        ) : isCashier ? (
          <CashierDashboard
            sales={query.data.sales}
            period={period}
            range={range}
            onReceiptError={receiptErrorProps}
          />
        ) : (
          <StaffDashboard data={query.data} period={period} range={range} />
        )}
      </DashboardGrid>
    </div>
  )
}

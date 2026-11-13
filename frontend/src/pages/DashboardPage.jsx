import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Badge, ChartFrame, DataTable, MoneyText } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'

function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ErrorNotice({ error }) {
  return (
    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {error?.response?.data?.message ?? 'Could not load dashboard data.'}
    </p>
  )
}

function MetricCard({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{children}</div>
    </div>
  )
}

function AdminDashboard({ data }) {
  const summary = data.analytics.summary
  const metrics = [
    { label: 'Gross sales', value: <MoneyText amount={summary.gross_sales} /> },
    { label: 'Net sales', value: <MoneyText amount={summary.net_sales} /> },
    { label: 'Low-stock products', value: summary.low_stock_count },
    { label: 'Expenses', value: <MoneyText amount={summary.expenses} /> },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label}>{metric.value}</MetricCard>
        ))}
      </div>
      <ChartFrame title="Sales trend" subtitle="Recent monthly sales">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.analytics.trend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Sales']} />
            <Bar dataKey="sales" fill="#2457D6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Product categories</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Category' },
            { key: 'count', label: 'Products' },
          ]}
          rows={data.analytics.categories}
          query=""
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Top products by stock</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Product' },
            { key: 'stock_quantity', label: 'On hand' },
          ]}
          rows={data.analytics.top_products}
          query=""
        />
      </section>
    </div>
  )
}

function StaffDashboard({ data }) {
  const stockRows = data.stock
  const outOfStock = stockRows.filter((product) => Number(product.stock_quantity) === 0)
  const lowStock = stockRows.filter((product) => product.low_stock && Number(product.stock_quantity) > 0)
  const pendingOrders = data.purchaseOrders.filter((order) => ['open', 'pending', 'partial'].includes(String(order.status).toLowerCase()))
  const alertCount = Number(data.dashboard.metrics.find((metric) => metric.label === 'Alerts')?.value ?? 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Low stock">{lowStock.length}</MetricCard>
        <MetricCard label="Out of stock">{outOfStock.length}</MetricCard>
        <MetricCard label="Expiring soon">Unavailable</MetricCard>
        <MetricCard label="Pending purchase orders">{pendingOrders.length}</MetricCard>
        <MetricCard label="Active alerts">{alertCount}</MetricCard>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Expiry details and the active alert list are unavailable because the API does not expose a batch-expiry or notifications endpoint.
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Low-stock products</h2>
        <DataTable
          columns={[
            { key: 'name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'stock_quantity', label: 'On hand' },
            { key: 'reorder_level', label: 'Reorder level' },
          ]}
          rows={lowStock}
          query=""
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Latest stock movements</h2>
        <DataTable
          columns={[
            { key: 'created_at', label: 'Date', render: (value) => value ? new Date(value).toLocaleString() : '—' },
            { key: 'product', label: 'Product' },
            { key: 'movement_type', label: 'Movement' },
            { key: 'quantity', label: 'Quantity' },
            { key: 'user', label: 'User' },
          ]}
          rows={data.movements.slice(0, 10)}
          query=""
        />
      </section>
    </div>
  )
}

function CashierDashboard({ sales }) {
  const todaySales = sales.filter((sale) => sale.date === localDateString() && sale.status !== 'voided')
  const total = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0)
  const average = todaySales.length ? total / todaySales.length : 0
  const recentSales = sales.slice(0, 10).map((sale) => ({
    ...sale,
    id: sale.id ?? sale.invoice_number ?? sale.receipt_number,
    receipt: sale.receipt_number ?? sale.invoice_number,
    date_time: [sale.date, sale.time].filter(Boolean).join(' '),
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Sales today"><MoneyText amount={total} /></MetricCard>
        <MetricCard label="Transactions today">{todaySales.length}</MetricCard>
        <MetricCard label="Average sale"><MoneyText amount={average} /></MetricCard>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Last 10 sales</h2>
        <DataTable
          columns={[
            { key: 'receipt', label: 'Receipt' },
            { key: 'date_time', label: 'Date and time' },
            { key: 'status', label: 'Status', render: (value) => <Badge tone={value === 'completed' ? 'positive' : 'default'}>{value}</Badge> },
            { key: 'total_amount', label: 'Total', render: (value) => <MoneyText amount={value} /> },
          ]}
          rows={recentSales}
          query=""
        />
      </section>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = hasPermission(user, ['analytics.view'])
  const isCashier = hasPermission(user, ['sales.view_own']) && !hasPermission(user, ['sales.view_all'])
  const roleKey = isAdmin ? 'admin' : isCashier ? 'cashier' : 'staff'
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', user?.id, roleKey],
    queryFn: async () => {
      if (isAdmin) {
        const analytics = await apiClient.get('/api/analytics')
        return { analytics: analytics.data }
      }

      if (isCashier) {
        const response = await apiClient.get('/api/sales')
        return { sales: response.data }
      }

      const [dashboard, stock, movements, purchaseOrders] = await Promise.all([
        apiClient.get('/api/dashboard'),
        apiClient.get('/api/stock'),
        apiClient.get('/api/stock/movements'),
        apiClient.get('/api/purchase-orders'),
      ])
      return {
        dashboard: dashboard.data,
        stock: stock.data,
        movements: movements.data,
        purchaseOrders: purchaseOrders.data,
      }
    },
    enabled: Boolean(user),
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading dashboard...</p>
  if (error) return <ErrorNotice error={error} />

  if (isAdmin) return <AdminDashboard data={data} />
  if (isCashier) return <CashierDashboard sales={data.sales} />
  return <StaffDashboard data={data} />
}

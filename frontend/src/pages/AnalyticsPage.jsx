import { useSearchParams } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import UrlTabSection from '../components/UrlTabSection'
import { Badge, ChartFrame, DataTable } from '../components/shared/ui'
import ReportsPage from './ReportsPage'

const overviewData = [
  { label: 'Jan', sales: 5400, target: 5000, expenses: 2800 },
  { label: 'Feb', sales: 6100, target: 5200, expenses: 3100 },
  { label: 'Mar', sales: 6400, target: 5600, expenses: 3000 },
  { label: 'Apr', sales: 7200, target: 6100, expenses: 3400 },
  { label: 'May', sales: 8100, target: 6700, expenses: 3800 },
  { label: 'Jun', sales: 9100, target: 7000, expenses: 3900 },
]

const productRows = [
  { id: 1, product: 'Rice 5kg', units: 1284, revenue: 269, profit: 91, stock: 34, status: 'Low stock' },
  { id: 2, product: 'Fresh Tomato', units: 980, revenue: 212, profit: 84, stock: 142, status: 'Healthy' },
  { id: 3, product: 'Chicken Drumsticks', units: 730, revenue: 189, profit: 72, stock: 86, status: 'Healthy' },
  { id: 4, product: 'Milk', units: 601, revenue: 154, profit: 58, stock: 12, status: 'Low stock' },
]

function AnalyticsView({ view }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const period = searchParams.get('period') ?? 'day'
  const productView = searchParams.get('productView') ?? 'best-sellers'
  const productColumns = [
    { key: 'product', label: 'Product' },
    { key: 'units', label: productView === 'performance' ? 'Units sold' : 'Units' },
    { key: 'revenue', label: 'Revenue', render: (value) => `₱${value}k` },
    { key: 'profit', label: 'Profit', render: (value) => `₱${value}k` },
  ]
  const inventoryColumns = [
    { key: 'product', label: 'Product' },
    { key: 'stock', label: 'On hand' },
    { key: 'status', label: 'Status', render: (value) => <Badge tone={value === 'Healthy' ? 'positive' : 'warning'}>{value}</Badge> },
  ]

  function setParameter(key, value) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', view)
    nextParams.set(key, value)
    setSearchParams(nextParams)
  }

  const data = view === 'forecast'
    ? overviewData.map((item) => ({ ...item, sales: Math.round(item.sales * 1.08) }))
    : overviewData

  return (
    <div className="space-y-6">
      {view === 'sales' ? (
        <div className="flex flex-wrap gap-2" aria-label="Sales period">
          {['day', 'week', 'month'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setParameter('period', value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${period === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}

      {view === 'products' ? (
        <div className="flex flex-wrap gap-2" aria-label="Product analytics">
          {[
            ['best-sellers', 'Best sellers'],
            ['slow-movers', 'Slow movers'],
            ['performance', 'Performance'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setParameter('productView', value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${productView === value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {view === 'inventory-status' ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Inventory status</h2>
          <DataTable columns={inventoryColumns} rows={productRows} query="" onSearch={() => {}} />
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartFrame
            title={view === 'forecast' ? 'Sales forecast' : view === 'profit-expenses' ? 'Profit and expenses' : 'Sales trend'}
            subtitle={view === 'sales' ? `${period[0].toUpperCase()}${period.slice(1)} view` : 'Store performance over time'}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                <Bar dataKey={view === 'profit-expenses' ? 'expenses' : 'sales'} fill="#2457D6" radius={[4, 4, 0, 0]} />
                {view !== 'profit-expenses' ? <Line type="monotone" dataKey="target" stroke="#5B6779" strokeDasharray="4 4" dot={false} /> : null}
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame title={view === 'products' ? 'Product performance' : 'Revenue flow'} subtitle="Rolling trend and demand cycle">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`analyticsFlow-${view}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2457D6" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2457D6" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                <Area type="monotone" dataKey="sales" stroke="#2457D6" fill={`url(#analyticsFlow-${view})`} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      )}

      {view === 'products' ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold capitalize text-slate-900">{productView.replace('-', ' ')}</h2>
          <DataTable columns={productColumns} rows={productRows} query="" onSearch={() => {}} />
        </section>
      ) : null}
    </div>
  )
}

const tabs = [
  { label: 'Overview', value: 'overview', permission: 'analytics.view', content: <AnalyticsView view="overview" /> },
  { label: 'Sales', value: 'sales', permission: 'analytics.view', content: <AnalyticsView view="sales" /> },
  { label: 'Products', value: 'products', permission: 'analytics.view', content: <AnalyticsView view="products" /> },
  { label: 'Inventory status', value: 'inventory-status', permission: 'analytics.view', content: <AnalyticsView view="inventory-status" /> },
  { label: 'Profit and expenses', value: 'profit-expenses', permission: 'analytics.view', content: <AnalyticsView view="profit-expenses" /> },
  { label: 'Forecast', value: 'forecast', permission: 'analytics.view', content: <AnalyticsView view="forecast" /> },
  { label: 'Reports', value: 'reports', permission: 'reports.view', content: <ReportsPage /> },
]

export default function AnalyticsPage() {
  return <UrlTabSection tabs={tabs} />
}

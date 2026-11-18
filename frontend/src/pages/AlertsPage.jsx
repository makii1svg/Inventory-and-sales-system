import { AlertTriangle, Bell, PackageSearch } from 'lucide-react'

import { Badge, DataTable, KpiCard } from '../components/shared/ui'
import { alerts, unreadAlertCount } from '../lib/alerts'

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'source', label: 'Source' },
  { key: 'severity', label: 'Severity', render: (value) => <Badge tone={value === 'High' ? 'negative' : value === 'Medium' ? 'warning' : 'default'}>{value}</Badge> },
  { key: 'status', label: 'Status' },
]

const expiryRows = [
  { id: 1, product: 'Yogurt', batch: 'B-0094', expiry: 'Expired', stock: 0, status: 'Expired' },
  { id: 2, product: 'Milk', batch: 'B-0108', expiry: 'In 4 days', stock: 12, status: 'Expiring soon' },
  { id: 3, product: 'Fresh Tomato', batch: 'B-0112', expiry: 'In 21 days', stock: 34, status: 'Healthy' },
]

const expiryColumns = [
  { key: 'product', label: 'Product' },
  { key: 'batch', label: 'Batch' },
  { key: 'expiry', label: 'Expiry' },
  { key: 'stock', label: 'On hand' },
  { key: 'status', label: 'Status', render: (value) => <Badge tone={value === 'Healthy' ? 'positive' : value === 'Expired' ? 'negative' : 'warning'}>{value}</Badge> },
]

export default function AlertsPage() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Unread alerts" value={unreadAlertCount.toLocaleString()} icon={Bell} trendUnavailable footer="Unread store notifications" />
        <KpiCard label="Expiry records" value={expiryRows.length.toLocaleString()} icon={PackageSearch} trendUnavailable footer="Rows in the expiry monitor" />
        <KpiCard label="High severity" value={alerts.filter((alert) => alert.severity === 'High').length.toLocaleString()} icon={AlertTriangle} trendUnavailable footer="High-severity alerts in the list" />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Expiry monitor</h2>
        <DataTable columns={expiryColumns} rows={expiryRows} query="" emptyMessage="No expiring stock is listed." />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">All alerts</h2>
        <DataTable columns={columns} rows={alerts} query="" emptyMessage="No alerts are available." />
      </section>
    </div>
  )
}

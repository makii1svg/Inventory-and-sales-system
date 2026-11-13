import { Bell } from 'lucide-react'

import { Badge, DataTable } from '../components/shared/ui'
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Expiry and alerts</h2>
          <p className="text-sm text-slate-500">Review expiring stock and operational notifications.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          <Bell className="h-4 w-4" />
          {unreadAlertCount} unread
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Expiry monitor</h3>
        <DataTable columns={expiryColumns} rows={expiryRows} query="" onSearch={() => {}} />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">All alerts</h3>
        <DataTable columns={columns} rows={alerts} query="" onSearch={() => {}} />
      </section>
    </div>
  )
}

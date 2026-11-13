import { useQuery } from '@tanstack/react-query'

import { DataTable } from '../components/shared/ui'
import { apiClient } from '../lib/api'

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'user', label: 'User' },
  { key: 'action', label: 'Action' },
  { key: 'detail', label: 'Details' },
]

export default function ActivityLogPage() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['activity-log'],
    queryFn: async () => (await apiClient.get('/api/activity-log')).data,
  })
  const rows = data.map((entry) => ({
    id: entry.id,
    date: entry.created_at ? new Date(entry.created_at).toLocaleString() : '',
    user: entry.user ?? 'System',
    action: `${entry.module}: ${entry.action}`,
    detail: Object.values(entry.meta ?? {}).join(' · '),
  }))

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Activity log</h2>
        <p className="text-sm text-slate-500">Review recent changes and actions across the store.</p>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load the activity log.</p> : null}
      <DataTable columns={columns} rows={rows} loading={isLoading} query="" onSearch={() => {}} />
    </section>
  )
}

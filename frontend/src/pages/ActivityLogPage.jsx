import { useQuery } from '@tanstack/react-query'
import { Activity, CalendarClock, UsersRound } from 'lucide-react'

import { DataTable, KpiCard } from '../components/shared/ui'
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
    created_at: entry.created_at,
    date: entry.created_at ? new Date(entry.created_at).toLocaleString() : '',
    user: entry.user ?? 'System',
    action: `${entry.module}: ${entry.action}`,
    detail: Object.values(entry.meta ?? {}).join(' · '),
  }))

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Logged events" value={rows.length.toLocaleString()} icon={Activity} trendUnavailable loading={isLoading} footer="Events in the returned log" />
        <KpiCard label="Users represented" value={new Set(rows.map((entry) => entry.user)).size.toLocaleString()} icon={UsersRound} trendUnavailable loading={isLoading} footer="Distinct users in this list" />
        <KpiCard label="Events today" value={rows.filter((entry) => entry.created_at && new Date(entry.created_at).toDateString() === new Date().toDateString()).length.toLocaleString()} icon={CalendarClock} trendUnavailable loading={isLoading} footer="Activity recorded today" />
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load the activity log.</p> : null}
      <DataTable columns={columns} rows={rows} loading={isLoading} query="" emptyMessage="No activity has been recorded." />
    </section>
  )
}

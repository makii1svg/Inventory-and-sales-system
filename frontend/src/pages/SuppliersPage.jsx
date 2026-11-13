import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { Button, DataTable } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'

export default function SuppliersPage() {
  const { user } = useAuth()
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await apiClient.get('/api/suppliers')).data,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500">Supplier directory and contact information.</p>
        </div>
        {hasPermission(user, ['suppliers.manage']) ? (
          <Button type="button" className="gap-2">
            <Plus className="h-4 w-4" />
            Add supplier
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Suppliers</p>
        <p className="mt-3 text-2xl font-semibold text-slate-900">{data.length}</p>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error?.response?.data?.message ?? 'Could not load suppliers.'}</p> : null}
      <DataTable
        columns={[
          { key: 'name', label: 'Supplier' },
          { key: 'contact_person', label: 'Contact', render: (value) => value || '—' },
          { key: 'email', label: 'Email', render: (value) => value || '—' },
          { key: 'phone', label: 'Phone', render: (value) => value || '—' },
        ]}
        rows={data}
        loading={isLoading}
        query=""
      />
    </div>
  )
}

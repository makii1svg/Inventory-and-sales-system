import { useQuery } from '@tanstack/react-query'
import { FolderTree, Plus } from 'lucide-react'

import { Button, DataTable } from '../components/shared/ui'
import { apiClient } from '../lib/api'

export default function CategoriesPage() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get('/api/categories')).data,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500">Organize products by category.</p>
        </div>
        <Button type="button" className="gap-2">
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-slate-500">
          <FolderTree className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide">Total categories</span>
        </div>
        <p className="text-2xl font-semibold text-slate-900">{data.length}</p>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error?.response?.data?.message ?? 'Could not load categories.'}</p> : null}
      <DataTable columns={[{ key: 'name', label: 'Category' }, { key: 'description', label: 'Description', render: (value) => value || '—' }]} rows={data} loading={isLoading} query="" />
    </div>
  )
}

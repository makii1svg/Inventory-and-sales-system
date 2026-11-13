import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'

import { Button, DataTable, FormField, SelectInput, StatusDot, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'

export default function ProductsPage() {
  const { user } = useAuth()
  const canViewPrices = String(user?.role).toLowerCase() !== 'staff'
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await apiClient.get('/api/products')).data,
  })

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category', render: (value) => value || '—' },
    { key: 'supplier', label: 'Supplier', render: (value) => value || '—' },
    ...(canViewPrices ? [{ key: 'unit_price', label: 'Price', render: (value) => `₱${Number(value).toLocaleString()}` }] : []),
    { key: 'stock_quantity', label: 'Stock' },
    { key: 'reorder_level', label: 'Reorder' },
    {
      key: 'status',
      label: 'Status',
      render: (_, product) => {
        const stock = Number(product.stock_quantity)
        const reorder = Number(product.reorder_level)
        const label = stock === 0 ? 'Out of stock' : stock <= reorder ? 'Low stock' : 'In stock'
        return (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <StatusDot tone={stock === 0 ? 'negative' : stock <= reorder ? 'warning' : 'positive'} />
            {label}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">Monitor inventory, categories, and suppliers.</p>
        </div>
        <Button type="button" className="gap-2">
          <Plus className="h-4 w-4" />
          Add product
        </Button>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error?.response?.data?.message ?? 'Could not load products.'}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <FormField label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput placeholder="Search SKU or item" className="pl-9" />
            </div>
          </FormField>
          <FormField label="Category">
            <SelectInput>
              <option>All categories</option>
              {[...new Set(data.map((product) => product.category).filter(Boolean))].map((category) => <option key={category}>{category}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Supplier">
            <SelectInput>
              <option>All suppliers</option>
              {[...new Set(data.map((product) => product.supplier).filter(Boolean))].map((supplier) => <option key={supplier}>{supplier}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Status">
            <SelectInput>
              <option>All status</option>
              <option>In stock</option>
              <option>Low stock</option>
              <option>Out of stock</option>
            </SelectInput>
          </FormField>
        </div>
      </section>

      <DataTable columns={columns} rows={data} loading={isLoading} query="" />
    </div>
  )
}

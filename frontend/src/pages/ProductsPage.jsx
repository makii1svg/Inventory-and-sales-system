import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Boxes, CircleDollarSign, Plus } from 'lucide-react'

import { Badge, Button, DataTable, FormField, KpiCard, Modal, SelectInput, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'

export default function ProductsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canViewPrices = String(user?.role).toLowerCase() !== 'staff'
  const canCreate = hasPermission(user, ['products.create'])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const emptyForm = { name: '', sku: '', barcode: '', unit: 'pc', unit_price: '', cost_price: '', stock_quantity: '0', reorder_level: '0' }
  const [form, setForm] = useState(emptyForm)
  const [createError, setCreateError] = useState('')
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await apiClient.get('/api/products')).data,
  })
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get('/api/categories')).data,
    enabled: createOpen,
  })
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await apiClient.get('/api/suppliers')).data,
    enabled: createOpen,
  })
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/products', payload),
    onSuccess: () => {
      setCreateOpen(false)
      setForm(emptyForm)
      setCreateError('')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
    },
    onError: (requestError) => {
      setCreateError(requestError?.response?.data?.message ?? 'Could not create product.')
    },
  })
  const lowStock = data.filter((product) => Number(product.stock_quantity) > 0 && Number(product.stock_quantity) <= Number(product.reorder_level)).length
  const outOfStock = data.filter((product) => Number(product.stock_quantity) === 0).length
  const inventoryValue = data.reduce((total, product) => total + Number(product.stock_quantity ?? 0) * Number(product.cost_price ?? 0), 0)
  const filteredData = data.filter((product) => {
    const stock = Number(product.stock_quantity)
    const reorder = Number(product.reorder_level)
    const status = stock === 0 ? 'Out of stock' : stock <= reorder ? 'Low stock' : 'In stock'
    return (!categoryFilter || product.category === categoryFilter)
      && (!supplierFilter || product.supplier === supplierFilter)
      && (!statusFilter || status === statusFilter)
  })

  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'barcode', label: 'Barcode', render: (value) => value || '—' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category', render: (value) => value || '—' },
    { key: 'supplier', label: 'Supplier', render: (value) => value || '—' },
    { key: 'unit', label: 'Unit', render: (value) => value || 'unit' },
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
        return <Badge tone={stock === 0 ? 'negative' : stock <= reorder ? 'warning' : 'positive'}>{label}</Badge>
      },
    },
  ]

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error?.response?.data?.message ?? 'Could not load products.'}</p> : null}

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${canViewPrices ? 'xl:grid-cols-4' : ''}`}>
        <KpiCard label="Total products" value={data.length.toLocaleString()} icon={Boxes} trendUnavailable loading={isLoading} footer="Products in the catalog" />
        <KpiCard label="Low stock" value={lowStock.toLocaleString()} icon={AlertTriangle} trendUnavailable loading={isLoading} footer="At or below reorder level" />
        <KpiCard label="Out of stock" value={outOfStock.toLocaleString()} icon={AlertTriangle} trendUnavailable loading={isLoading} footer="Zero on-hand quantity" />
        {canViewPrices ? <KpiCard label="Inventory value" value={`₱${inventoryValue.toLocaleString()}`} icon={CircleDollarSign} trendUnavailable loading={isLoading} footer="On hand × current cost price" /> : null}
      </div>

      <DataTable
        columns={columns}
        rows={filteredData}
        loading={isLoading}
        query={query}
        onSearch={setQuery}
        emptyMessage="No products are available."
        toolbarActions={(
          <>
            <SelectInput aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="sm:w-40">
              <option value="">All categories</option>
              {[...new Set(data.map((product) => product.category).filter(Boolean))].map((category) => <option key={category} value={category}>{category}</option>)}
            </SelectInput>
            <SelectInput aria-label="Filter by supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="sm:w-40">
              <option value="">All suppliers</option>
              {[...new Set(data.map((product) => product.supplier).filter(Boolean))].map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
            </SelectInput>
            <SelectInput aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="sm:w-36">
              <option value="">All status</option>
              <option value="In stock">In stock</option>
              <option value="Low stock">Low stock</option>
              <option value="Out of stock">Out of stock</option>
            </SelectInput>
            {canCreate ? <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Add product</Button> : null}
          </>
        )}
      />

      {canCreate ? (
        <Modal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Add product"
          description="Create a product with its initial inventory and pricing."
          footer={(
            <>
              <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-product-form" disabled={createMutation.isPending || categoriesQuery.isLoading || suppliersQuery.isLoading}>
                {createMutation.isPending ? 'Saving...' : 'Create product'}
              </Button>
            </>
          )}
        >
          <form id="create-product-form" className="space-y-4" onSubmit={(event) => {
            event.preventDefault()
            setCreateError('')
            createMutation.mutate({
              ...form,
              stock_quantity: Number(form.stock_quantity),
              reorder_level: Number(form.reorder_level),
            })
          }}>
            {createError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{createError}</p> : null}
            {(categoriesQuery.error || suppliersQuery.error) ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load category or supplier options.</p> : null}
            <FormField label="Product name"><TextInput required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></FormField>
            <FormField label="SKU"><TextInput required value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} /></FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Barcode"><TextInput value={form.barcode} onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))} /></FormField>
              <FormField label="Unit"><TextInput required value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} /></FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Category">
                <SelectInput value={form.category_id ?? ''} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value || null }))}>
                  <option value="">No category</option>
                  {(categoriesQuery.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </SelectInput>
              </FormField>
              <FormField label="Supplier">
                <SelectInput value={form.supplier_id ?? ''} onChange={(event) => setForm((current) => ({ ...current, supplier_id: event.target.value || null }))}>
                  <option value="">No supplier</option>
                  {(suppliersQuery.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </SelectInput>
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Unit price"><TextInput required type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: event.target.value }))} /></FormField>
              <FormField label="Cost price"><TextInput required type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => setForm((current) => ({ ...current, cost_price: event.target.value }))} /></FormField>
              <FormField label="Initial stock"><TextInput required type="number" min="0" step="1" value={form.stock_quantity} onChange={(event) => setForm((current) => ({ ...current, stock_quantity: event.target.value }))} /></FormField>
              <FormField label="Reorder level"><TextInput required type="number" min="0" step="1" value={form.reorder_level} onChange={(event) => setForm((current) => ({ ...current, reorder_level: event.target.value }))} /></FormField>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

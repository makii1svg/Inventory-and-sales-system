import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Badge, Button, DataTable, FormField, SelectInput, TextInput } from '../components/shared/ui'
import { apiClient } from '../lib/api'

const reasons = [
  ['damaged', 'Damaged'],
  ['expired', 'Expired'],
  ['lost', 'Lost'],
  ['internal_use', 'Internal use'],
  ['count_correction', 'Count correction'],
  ['other', 'Other'],
]

function responseErrors(error) {
  return error?.response?.data?.errors ?? {}
}

function RequestError({ error }) {
  return error ? (
    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {error?.response?.data?.message ?? 'The request could not be completed.'}
    </p>
  ) : null
}

function StockLevelsPage() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['stock-levels'],
    queryFn: async () => (await apiClient.get('/api/stock')).data,
  })

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Stock levels</h2>
        <p className="text-sm text-slate-500">Track on-hand inventory and reorder thresholds.</p>
      </div>
      <RequestError error={error} />
      <DataTable
        columns={[
          { key: 'name', label: 'Product' },
          { key: 'sku', label: 'SKU' },
          { key: 'stock_quantity', label: 'On hand' },
          { key: 'reorder_level', label: 'Reorder level' },
          {
            key: 'low_stock',
            label: 'Status',
            render: (value, product) => (
              <Badge tone={Number(product.stock_quantity) === 0 ? 'negative' : value ? 'warning' : 'positive'}>
                {Number(product.stock_quantity) === 0 ? 'Out of stock' : value ? 'Low stock' : 'Healthy'}
              </Badge>
            ),
          },
        ]}
        rows={data}
        loading={isLoading}
        query=""
      />
    </section>
  )
}

function StockMovementsPage() {
  const queryClient = useQueryClient()
  const [direction, setDirection] = useState('')
  const [stockIn, setStockIn] = useState({
    product_id: '',
    quantity: '',
    unit_cost: '',
    batch_no: '',
    expiry_date: '',
    supplier_id: '',
    note: '',
  })
  const [stockOut, setStockOut] = useState({
    product_id: '',
    quantity: '',
    reason_code: '',
    note: '',
  })
  const [success, setSuccess] = useState('')
  const productsQuery = useQuery({
    queryKey: ['stock-form-products'],
    queryFn: async () => (await apiClient.get('/api/products')).data,
  })
  const suppliersQuery = useQuery({
    queryKey: ['stock-form-suppliers'],
    queryFn: async () => (await apiClient.get('/api/suppliers')).data,
  })
  const movementsQuery = useQuery({
    queryKey: ['stock-movements', direction],
    queryFn: async () => (await apiClient.get('/api/stock/movements', {
      params: direction ? { direction } : {},
    })).data,
  })
  const refreshStockData = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const stockInMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/stock/in', payload),
    onSuccess: () => {
      setStockIn({ product_id: '', quantity: '', unit_cost: '', batch_no: '', expiry_date: '', supplier_id: '', note: '' })
      setSuccess('Stock-in was recorded.')
      refreshStockData()
    },
  })
  const stockOutMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/stock/adjustments', payload),
    onSuccess: () => {
      setStockOut({ product_id: '', quantity: '', reason_code: '', note: '' })
      setSuccess('Stock-out was recorded.')
      refreshStockData()
    },
  })
  const productOptions = productsQuery.data ?? []
  const supplierOptions = suppliersQuery.data ?? []
  const stockInErrors = responseErrors(stockInMutation.error)
  const stockOutErrors = responseErrors(stockOutMutation.error)
  const catalogError = productsQuery.error ?? suppliersQuery.error

  function updateStockIn(field, value) {
    setStockIn((current) => ({ ...current, [field]: value }))
    setSuccess('')
  }

  function updateStockOut(field, value) {
    setStockOut((current) => ({ ...current, [field]: value }))
    setSuccess('')
  }

  function submitStockIn(event) {
    event.preventDefault()
    setSuccess('')
    stockInMutation.mutate({
      ...stockIn,
      supplier_id: stockIn.supplier_id || null,
      batch_no: stockIn.batch_no || null,
      expiry_date: stockIn.expiry_date || null,
      note: stockIn.note || null,
    })
  }

  function submitStockOut(event) {
    event.preventDefault()
    setSuccess('')
    stockOutMutation.mutate(stockOut)
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Stock in and out</h2>
        <p className="text-sm text-slate-500">Review movements and record reason-coded adjustments.</p>
      </div>

      <RequestError error={catalogError} />
      {success ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Movement ledger</h3>
            <p className="text-sm text-slate-500">Recent stock changes from the server.</p>
          </div>
          <FormField label="Direction">
            <SelectInput value={direction} onChange={(event) => setDirection(event.target.value)} aria-label="Movement direction">
              <option value="">All movements</option>
              <option value="in">In</option>
              <option value="out">Out</option>
            </SelectInput>
          </FormField>
        </div>
        <RequestError error={movementsQuery.error} />
        <DataTable
          columns={[
            { key: 'created_at', label: 'Date', render: (value) => value ? new Date(value).toLocaleString() : '—' },
            { key: 'product', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'direction', label: 'Direction', render: (value) => value === 'in' ? 'In' : 'Out' },
            { key: 'movement_type', label: 'Type' },
            { key: 'quantity', label: 'Quantity' },
            { key: 'reason_code', label: 'Reason', render: (value) => value?.replaceAll('_', ' ') ?? '—' },
            { key: 'batch_no', label: 'Batch', render: (value) => value || '—' },
            { key: 'user', label: 'User', render: (value) => value || '—' },
          ]}
          rows={movementsQuery.data ?? []}
          loading={movementsQuery.isLoading}
          query=""
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitStockIn} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Stock in</h3>
            <p className="text-sm text-slate-500">Add a new batch and update on-hand stock.</p>
          </div>
          <RequestError error={stockInMutation.error && !Object.keys(stockInErrors).length ? stockInMutation.error : null} />
          <FormField label="Product" error={stockInErrors.product_id?.[0]}>
            <SelectInput required value={stockIn.product_id} onChange={(event) => updateStockIn('product_id', event.target.value)}>
              <option value="">Select product</option>
              {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
            </SelectInput>
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Quantity" error={stockInErrors.quantity?.[0]}>
              <TextInput required type="number" min="1" step="1" value={stockIn.quantity} onChange={(event) => updateStockIn('quantity', event.target.value)} />
            </FormField>
            <FormField label="Unit cost" error={stockInErrors.unit_cost?.[0]}>
              <TextInput required type="number" min="0" step="0.01" value={stockIn.unit_cost} onChange={(event) => updateStockIn('unit_cost', event.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Batch number" error={stockInErrors.batch_no?.[0]}>
              <TextInput value={stockIn.batch_no} onChange={(event) => updateStockIn('batch_no', event.target.value)} />
            </FormField>
            <FormField label="Expiry date" error={stockInErrors.expiry_date?.[0]}>
              <TextInput type="date" value={stockIn.expiry_date} onChange={(event) => updateStockIn('expiry_date', event.target.value)} />
            </FormField>
          </div>
          <FormField label="Supplier" error={stockInErrors.supplier_id?.[0]}>
            <SelectInput value={stockIn.supplier_id} onChange={(event) => updateStockIn('supplier_id', event.target.value)}>
              <option value="">No supplier</option>
              {supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Note" error={stockInErrors.note?.[0]}>
            <TextInput value={stockIn.note} onChange={(event) => updateStockIn('note', event.target.value)} />
          </FormField>
          <Button type="submit" disabled={stockInMutation.isPending || productsQuery.isLoading}>
            {stockInMutation.isPending ? 'Recording...' : 'Record stock in'}
          </Button>
        </form>

        <form onSubmit={submitStockOut} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Stock out</h3>
            <p className="text-sm text-slate-500">Reduce stock for a recorded reason.</p>
          </div>
          <RequestError error={stockOutMutation.error && !Object.keys(stockOutErrors).length ? stockOutMutation.error : null} />
          <FormField label="Product" error={stockOutErrors.product_id?.[0]}>
            <SelectInput required value={stockOut.product_id} onChange={(event) => updateStockOut('product_id', event.target.value)}>
              <option value="">Select product</option>
              {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Quantity" error={stockOutErrors.quantity?.[0]}>
            <TextInput required type="number" min="1" step="1" value={stockOut.quantity} onChange={(event) => updateStockOut('quantity', event.target.value)} />
          </FormField>
          <FormField label="Reason" error={stockOutErrors.reason_code?.[0]}>
            <SelectInput required value={stockOut.reason_code} onChange={(event) => updateStockOut('reason_code', event.target.value)}>
              <option value="">Select reason</option>
              {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Note" error={stockOutErrors.note?.[0]}>
            <TextInput required value={stockOut.note} onChange={(event) => updateStockOut('note', event.target.value)} />
          </FormField>
          <p className="text-xs text-amber-700">Batch-specific stock-out is not supported by the available adjustment endpoint.</p>
          <Button type="submit" variant="secondary" disabled={stockOutMutation.isPending || productsQuery.isLoading}>
            {stockOutMutation.isPending ? 'Recording...' : 'Record stock out'}
          </Button>
        </form>
      </div>
    </section>
  )
}

export default function StockPage({ view = 'levels' }) {
  return view === 'levels' ? <StockLevelsPage /> : <StockMovementsPage />
}

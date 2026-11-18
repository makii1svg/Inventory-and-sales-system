import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, PackageCheck, Plus } from 'lucide-react'

import { Badge, Button, DataTable, FormField, KpiCard, Modal, SelectInput, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'

function requestErrors(error) {
  return error?.response?.data?.errors ?? {}
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [query, setQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ supplier_id: '', product_id: '', quantity: '1', unit_cost: '', notes: '' })
  const isStaff = String(user?.role).toLowerCase() === 'staff'
  const canCreateAndReceive = hasPermission(user, ['purchases.create']) && hasPermission(user, ['purchases.receive'])
  const canCancel = hasPermission(user, ['purchases.cancel'])
  const ordersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await apiClient.get('/api/purchase-orders')).data,
  })
  const suppliersQuery = useQuery({
    queryKey: ['purchase-order-suppliers'],
    queryFn: async () => (await apiClient.get('/api/suppliers')).data,
    enabled: showCreate,
  })
  const productsQuery = useQuery({
    queryKey: ['purchase-order-products'],
    queryFn: async () => (await apiClient.get('/api/products')).data,
    enabled: showCreate,
  })
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/purchase-orders', payload),
    onSuccess: () => {
      setShowCreate(false)
      setForm({ supplier_id: '', product_id: '', quantity: '1', unit_cost: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
  const errors = requestErrors(createMutation.error)
  const rows = (ordersQuery.data ?? []).map((order) => ({
    ...order,
    id: order.id ?? order.order_number,
    po: order.order_number,
    item_summary: (order.items ?? []).map((item) => `${item.product} × ${item.quantity}`).join(', '),
  }))
  const filteredRows = rows.filter((order) => (
    (!supplierFilter || order.supplier === supplierFilter)
    && (!statusFilter || order.status === statusFilter)
  ))
  const columns = [
    { key: 'po', label: 'PO' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'item_summary', label: 'Items' },
    ...(isStaff ? [] : [{ key: 'total_amount', label: 'Total', render: (value) => `₱${Number(value).toLocaleString()}` }]),
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge tone={value === 'received' ? 'positive' : value === 'cancelled' ? 'negative' : 'warning'}>
          {value}
        </Badge>
      ),
    },
  ]

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submitCreate(event) {
    event.preventDefault()
    createMutation.mutate({
      supplier_id: form.supplier_id,
      items: [{
        product_id: form.product_id,
        quantity: form.quantity,
        unit_cost: form.unit_cost,
      }],
      notes: form.notes || null,
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total orders" value={rows.length.toLocaleString()} icon={PackageCheck} trendUnavailable loading={ordersQuery.isLoading} footer="Orders in the returned list" />
        <KpiCard label="Pending orders" value={rows.filter((order) => order.status === 'pending').length.toLocaleString()} icon={Clock3} trendUnavailable loading={ordersQuery.isLoading} footer="Awaiting receipt" />
        <KpiCard label="Received orders" value={rows.filter((order) => order.status === 'received').length.toLocaleString()} icon={CheckCircle2} trendUnavailable loading={ordersQuery.isLoading} footer="Items marked as received" />
      </div>

      {ordersQuery.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{ordersQuery.error?.response?.data?.message ?? 'Could not load purchase orders.'}</p> : null}
      {canCancel ? <p className="text-xs text-amber-700">Cancellation is unavailable because the API does not expose a cancellation endpoint.</p> : null}

      <DataTable
        columns={columns}
        rows={filteredRows}
        loading={ordersQuery.isLoading}
        query={query}
        onSearch={setQuery}
        emptyMessage="No purchase orders are available."
        toolbarActions={(
          <>
            <SelectInput aria-label="Filter by supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="sm:w-44">
              <option value="">All suppliers</option>
              {[...new Set(rows.map((order) => order.supplier).filter(Boolean))].map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
            </SelectInput>
            <SelectInput aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="sm:w-36">
              <option value="">All status</option>
              {[...new Set(rows.map((order) => order.status).filter(Boolean))].map((status) => <option key={status} value={status}>{status}</option>)}
            </SelectInput>
            {canCreateAndReceive ? (
              <Button type="button" className="gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />
                Create and receive PO
              </Button>
            ) : null}
          </>
        )}
      />

      {canCreateAndReceive ? (
        <Modal
          open={showCreate}
          onOpenChange={setShowCreate}
          title="Create and receive purchase order"
          description="The available endpoint creates the order and receives its items in one operation."
          footer={(
            <>
              <Button variant="secondary" onClick={() => setShowCreate(false)} type="button">Cancel</Button>
              <Button type="submit" form="purchase-order-form" disabled={createMutation.isPending || suppliersQuery.isLoading || productsQuery.isLoading}>
                {createMutation.isPending ? 'Saving...' : 'Create and receive'}
              </Button>
            </>
          )}
        >
          <form id="purchase-order-form" onSubmit={submitCreate} className="space-y-4">
          {suppliersQuery.error || productsQuery.error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Could not load supplier and product choices.
            </p>
          ) : null}
            {createMutation.error && !Object.keys(errors).length ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {createMutation.error?.response?.data?.message ?? 'Could not create purchase order.'}
              </p>
            ) : null}
            <FormField label="Supplier" error={errors.supplier_id?.[0]}>
              <SelectInput required value={form.supplier_id} onChange={(event) => updateForm('supplier_id', event.target.value)}>
                <option value="">Select supplier</option>
                {(suppliersQuery.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </SelectInput>
            </FormField>
            <FormField label="Product" error={errors['items.0.product_id']?.[0]}>
              <SelectInput required value={form.product_id} onChange={(event) => updateForm('product_id', event.target.value)}>
                <option value="">Select product</option>
                {(productsQuery.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
              </SelectInput>
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Quantity" error={errors['items.0.quantity']?.[0]}>
                <TextInput required type="number" min="1" step="1" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} />
              </FormField>
              <FormField label="Unit cost" error={errors['items.0.unit_cost']?.[0]}>
                <TextInput required type="number" min="0" step="0.01" value={form.unit_cost} onChange={(event) => updateForm('unit_cost', event.target.value)} />
              </FormField>
            </div>
            <FormField label="Notes" error={errors.notes?.[0]}>
              <TextInput value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} />
            </FormField>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

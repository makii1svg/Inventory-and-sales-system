import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Badge, Button, DataTable, FormField, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'

export default function TransactionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const canViewAll = hasPermission(user, ['sales.view_all'])
  const canViewOwn = hasPermission(user, ['sales.view_own'])
  const isLimitedView = !canViewAll && !canViewOwn && hasPermission(user, ['sales.view_limited'])
  const canVoid = hasPermission(user, ['sales.void'])
  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: async () => (await apiClient.get('/api/sales')).data,
  })
  const voidMutation = useMutation({
    mutationFn: ({ saleId, voidReason }) => apiClient.post(`/api/sales/${saleId}/void`, { reason: voidReason }),
    onSuccess: () => {
      setSelectedSale(null)
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
  const rows = useMemo(() => (salesQuery.data ?? []).map((sale) => ({
    ...sale,
    id: sale.id ?? sale.receipt_number ?? sale.invoice_number,
    receipt: sale.receipt_number ?? sale.invoice_number,
    cashier: sale.cashier ?? sale.user ?? '—',
    date_time: [sale.date, sale.time].filter(Boolean).join(' '),
    item_summary: (sale.items ?? []).map((item) => `${item.product} × ${item.quantity}`).join(', '),
  })), [salesQuery.data])

  const limitedColumns = [
    { key: 'receipt', label: 'Receipt number' },
    { key: 'date_time', label: 'Date and time' },
    { key: 'cashier', label: 'Cashier' },
    { key: 'status', label: 'Status' },
    { key: 'item_summary', label: 'Items and quantities' },
  ]
  const fullColumns = [
    { key: 'receipt', label: 'Receipt' },
    { key: 'date_time', label: 'Date and time' },
    { key: 'cashier', label: 'Cashier' },
    { key: 'total_amount', label: 'Total', render: (value) => `₱${Number(value ?? 0).toLocaleString()}` },
    { key: 'payment_method', label: 'Payment' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <Badge tone={value === 'completed' ? 'positive' : 'default'}>{value}</Badge>,
    },
    ...(canVoid ? [{
      key: 'action',
      label: 'Action',
      render: (_, sale) => sale.status === 'voided'
        ? '—'
        : <Button type="button" variant="danger" onClick={() => setSelectedSale(sale)}>Void</Button>,
    }] : []),
  ]
  const columns = isLimitedView ? limitedColumns : fullColumns

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Transactions</h2>
        <p className="text-sm text-slate-500">
          {isLimitedView ? 'Receipt history with item names and quantities.' : 'Review your permitted transaction history.'}
        </p>
      </div>

      {salesQuery.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{salesQuery.error?.response?.data?.message ?? 'Could not load sales.'}</p> : null}
      {voidMutation.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{voidMutation.error?.response?.data?.message ?? 'Could not void sale.'}</p> : null}

      <DataTable columns={columns} rows={rows} loading={salesQuery.isLoading} query="" />

      {canVoid ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-sale-title"
          className={selectedSale ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4' : 'hidden'}
        >
          <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div>
              <h3 id="void-sale-title" className="text-lg font-semibold text-slate-900">Void transaction</h3>
              <p className="mt-1 text-sm text-slate-500">This action returns the sale items to stock.</p>
            </div>
            <FormField label="Reason for void">
              <TextInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the issue" />
            </FormField>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setSelectedSale(null)}>Cancel</Button>
              <Button
                variant="danger"
                type="button"
                disabled={!selectedSale || voidMutation.isPending}
                onClick={() => voidMutation.mutate({ saleId: selectedSale?.id, voidReason: reason })}
              >
                {voidMutation.isPending ? 'Voiding...' : 'Confirm void'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

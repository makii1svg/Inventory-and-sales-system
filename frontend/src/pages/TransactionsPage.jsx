import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CircleCheck, Receipt } from 'lucide-react'

import { Badge, Button, DataTable, FormField, KpiCard, TextInput } from '../components/shared/ui'
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Transactions" value={rows.length.toLocaleString()} icon={Receipt} trendUnavailable loading={salesQuery.isLoading} footer="Sales in your permitted list" />
        <KpiCard label="Completed" value={rows.filter((sale) => sale.status === 'completed').length.toLocaleString()} icon={CircleCheck} trendUnavailable loading={salesQuery.isLoading} footer="Completed transactions" />
        <KpiCard label="Voided" value={rows.filter((sale) => sale.status === 'voided').length.toLocaleString()} icon={Ban} trendUnavailable loading={salesQuery.isLoading} footer="Voided transactions" />
      </div>

      {salesQuery.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{salesQuery.error?.response?.data?.message ?? 'Could not load sales.'}</p> : null}
      {voidMutation.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{voidMutation.error?.response?.data?.message ?? 'Could not void sale.'}</p> : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={salesQuery.isLoading}
        query=""
        emptyMessage={isLimitedView ? 'No receipts are available.' : 'No transactions are available.'}
        toolbarActions={isLimitedView ? null : <span className="text-xs text-slate-500">Sales history</span>}
      />

      {canVoid ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-sale-title"
          className={selectedSale ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-0 sm:p-4' : 'hidden'}
        >
          <div className="flex h-dvh w-full max-w-md flex-col border border-[#E6EAF2] bg-white p-4 shadow-soft sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl sm:p-5">
            <div>
              <h3 id="void-sale-title" className="text-lg font-semibold text-slate-900">Void transaction</h3>
              <p className="mt-1 text-sm text-slate-500">This action returns the sale items to stock.</p>
            </div>
            <div className="flex-1 py-5">
              <FormField label="Reason for void">
                <TextInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the issue" />
              </FormField>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#EEF1F6] bg-white pt-3">
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

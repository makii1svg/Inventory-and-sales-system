import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleDollarSign, ClipboardCheck, Clock3, Plus } from 'lucide-react'

import { Badge, Button, DataTable, FormField, KpiCard, Modal, PageHeader, SelectInput, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'

const initialForm = {
  title: '',
  category: '',
  amount: '',
  incurred_on: localDate(),
  status: 'pending',
  notes: '',
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canManage = hasPermission(user, ['expenses.manage'])
  const [createOpen, setCreateOpen] = useState(false)
  const [dateRange, setDateRange] = useState('30')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(initialForm)
  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => (await apiClient.get('/api/expenses')).data,
  })
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/expenses', payload),
    onSuccess: () => {
      setCreateOpen(false)
      setForm({ ...initialForm, incurred_on: localDate() })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
  const rows = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data])
  const filteredRows = useMemo(() => {
    const earliest = new Date()
    if (dateRange !== 'all') earliest.setDate(earliest.getDate() - Number(dateRange) + 1)
    const earliestDate = dateRange === 'all' ? '' : localDate(earliest)

    return rows.filter((expense) => (
      (!earliestDate || expense.date >= earliestDate)
      && (!categoryFilter || expense.category === categoryFilter)
      && (!statusFilter || expense.status === statusFilter)
    ))
  }, [categoryFilter, dateRange, rows, statusFilter])
  const total = filteredRows.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const pendingTotal = filteredRows.filter((expense) => expense.status === 'pending')
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const approvedTotal = filteredRows.filter((expense) => expense.status === 'approved')
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const columns = [
    { key: 'title', label: 'Expense' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', render: (value) => formatCurrency(value) },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status', render: (value) => <Badge tone={value === 'approved' ? 'positive' : value === 'pending' ? 'warning' : 'default'}>{value}</Badge> },
  ]

  function submitExpense(event) {
    event.preventDefault()
    createMutation.mutate({
      ...form,
      amount: Number(form.amount),
      notes: form.notes || null,
    })
  }

  return (
    <div className="space-y-5">
      {expensesQuery.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{expensesQuery.error?.response?.data?.message ?? 'Could not load expenses.'}</p> : null}
      <PageHeader
        title="Expense Management"
        subtitle="Track operational costs and filtered totals."
        showDateRange={false}
        primaryAction={canManage ? <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Add expense</Button> : null}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Filtered total" value={formatCurrency(total)} icon={CircleDollarSign} trendUnavailable loading={expensesQuery.isLoading} footer="Expenses matching current filters" />
        <KpiCard label="Pending review" value={formatCurrency(pendingTotal)} icon={Clock3} trendUnavailable loading={expensesQuery.isLoading} footer="Pending expenses in this selection" />
        <KpiCard label="Approved" value={formatCurrency(approvedTotal)} icon={ClipboardCheck} trendUnavailable loading={expensesQuery.isLoading} footer="Approved expenses in this selection" />
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        loading={expensesQuery.isLoading}
        query={query}
        onSearch={setQuery}
        emptyMessage="No expenses are available."
        toolbarActions={(
          <>
            <SelectInput aria-label="Filter by date range" value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="sm:w-36">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All dates</option>
            </SelectInput>
            <SelectInput aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="sm:w-36">
              <option value="">All categories</option>
              {[...new Set(rows.map((expense) => expense.category).filter(Boolean))].map((category) => <option key={category} value={category}>{category}</option>)}
            </SelectInput>
            <SelectInput aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="sm:w-36">
              <option value="">All statuses</option>
              {[...new Set(rows.map((expense) => expense.status).filter(Boolean))].map((status) => <option key={status} value={status}>{status}</option>)}
            </SelectInput>
          </>
        )}
      />

      {canManage ? (
        <Modal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Add expense"
          description="Record an operational expense."
          footer={(
            <>
              <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-expense-form" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Save expense'}</Button>
            </>
          )}
        >
          <form id="create-expense-form" className="space-y-4" onSubmit={submitExpense}>
            {createMutation.error ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {createMutation.error?.response?.data?.message ?? 'Could not save expense.'}
              </p>
            ) : null}
            <FormField label="Expense title" error={createMutation.error?.response?.data?.errors?.title?.[0]}>
              <TextInput required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Category" error={createMutation.error?.response?.data?.errors?.category?.[0]}>
                <TextInput required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
              </FormField>
              <FormField label="Amount" error={createMutation.error?.response?.data?.errors?.amount?.[0]}>
                <TextInput required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
              </FormField>
              <FormField label="Date" error={createMutation.error?.response?.data?.errors?.incurred_on?.[0]}>
                <TextInput required type="date" value={form.incurred_on} onChange={(event) => setForm((current) => ({ ...current, incurred_on: event.target.value }))} />
              </FormField>
              <FormField label="Status">
                <SelectInput value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="review">Review</option>
                </SelectInput>
              </FormField>
            </div>
            <FormField label="Notes">
              <TextInput value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </FormField>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

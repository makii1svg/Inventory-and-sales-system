import { Plus } from 'lucide-react'

import { Button, DataTable, FormField, SelectInput, TextInput } from '../components/shared/ui'

const rows = [
  { id: 1, title: 'Electricity', category: 'Utilities', amount: 8200, date: '2026-11-12', status: 'Approved' },
  { id: 2, title: 'Courier fees', category: 'Shipping', amount: 2600, date: '2026-11-10', status: 'Pending' },
  { id: 3, title: 'Store supplies', category: 'Operations', amount: 5300, date: '2026-11-08', status: 'Approved' },
  { id: 4, title: 'Maintenance', category: 'Repairs', amount: 19300, date: '2026-11-06', status: 'Review' },
]

const columns = [
  { key: 'title', label: 'Expense' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', render: (value) => `₱${value.toLocaleString()}` },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
]

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-500">Track operational costs and filtered totals.</p>
        </div>
        <Button type="button" className="gap-2">
          <Plus className="h-4 w-4" />
          Add expense
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Filtered total', value: '₱34,400' },
          { label: 'Pending review', value: '₱18,300' },
          { label: 'Approved this month', value: '₱87,200' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <FormField label="Date range">
            <SelectInput>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </SelectInput>
          </FormField>
          <FormField label="Category">
            <SelectInput>
              <option>All categories</option>
              <option>Utilities</option>
              <option>Operations</option>
            </SelectInput>
          </FormField>
          <FormField label="Status">
            <SelectInput>
              <option>All</option>
              <option>Approved</option>
              <option>Pending</option>
            </SelectInput>
          </FormField>
          <FormField label="Search">
            <TextInput placeholder="Expense title" />
          </FormField>
        </div>
      </section>

      <DataTable columns={columns} rows={rows} query="" onSearch={() => {}} />
    </div>
  )
}

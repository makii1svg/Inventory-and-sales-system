import { Plus } from 'lucide-react'

import { Badge, Button, DataTable } from '../components/shared/ui'

const rows = [
  { id: 1, name: 'Ariana Cruz', role: 'Administrator', branch: 'Main', status: 'Active' },
  { id: 2, name: 'Rico Santos', role: 'Cashier', branch: 'Main', status: 'Active' },
  { id: 3, name: 'Lana Tan', role: 'Staff', branch: 'Branch 2', status: 'Inactive' },
  { id: 4, name: 'Marco Dela Vega', role: 'Manager', branch: 'Main', status: 'Active' },
]

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'branch', label: 'Branch' },
  { key: 'status', label: 'Status', render: (value) => <Badge tone={value === 'Active' ? 'positive' : 'default'}>{value}</Badge> },
  { key: 'action', label: 'Action', render: () => <Button type="button" variant="secondary">Deactivate</Button> },
]

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">Manage access, branch assignment, and account activity.</p>
        </div>
        <Button type="button" className="gap-2">
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      <DataTable columns={columns} rows={rows} query="" onSearch={() => {}} />
    </div>
  )
}

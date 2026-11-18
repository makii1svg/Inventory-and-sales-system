import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, UserCheck, UserRound, UserX } from 'lucide-react'

import { Badge, Button, DataTable, FormField, KpiCard, Modal, SelectInput, TextInput } from '../components/shared/ui'
import { apiClient } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../lib/permissions'

export default function UsersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' })
  const canManage = hasPermission(user, ['users.manage'])
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get('/api/users')).data,
  })
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await apiClient.get('/api/roles')).data,
    enabled: createOpen,
  })
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/users', payload),
    onSuccess: () => {
      setCreateOpen(false)
      setForm({ name: '', email: '', password: '', role: 'staff' })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/api/users/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const rows = usersQuery.data ?? []
  const activeUsers = rows.filter((user) => String(user.status).toLowerCase() === 'active').length
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status', render: (value) => <Badge tone={String(value).toLowerCase() === 'active' ? 'positive' : 'default'}>{value || 'Unknown'}</Badge> },
    ...(canManage ? [{
      key: 'action',
      label: 'Action',
      render: (_, row) => (
        <Button
          type="button"
          variant="secondary"
          disabled={statusMutation.isPending || Number(row.id) === Number(user?.id)}
          onClick={() => statusMutation.mutate({ id: row.id, status: String(row.status).toLowerCase() === 'active' ? 'inactive' : 'active' })}
        >
          {String(row.status).toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-5">
      {usersQuery.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{usersQuery.error?.response?.data?.message ?? 'Could not load users.'}</p> : null}
      {statusMutation.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{statusMutation.error?.response?.data?.message ?? 'Could not update user status.'}</p> : null}
      {createMutation.error && !createOpen ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{createMutation.error?.response?.data?.message ?? 'Could not create user.'}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total users" value={rows.length.toLocaleString()} icon={UserRound} trendUnavailable loading={usersQuery.isLoading} footer="Accounts returned by the user directory" />
        <KpiCard label="Active users" value={activeUsers.toLocaleString()} icon={UserCheck} trendUnavailable loading={usersQuery.isLoading} footer="Accounts marked active" />
        <KpiCard label="Inactive users" value={(rows.length - activeUsers).toLocaleString()} icon={UserX} trendUnavailable loading={usersQuery.isLoading} footer="Accounts not currently active" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={usersQuery.isLoading}
        query={query}
        onSearch={setQuery}
        emptyMessage="No users are available."
        toolbarActions={canManage ? <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Add user</Button> : null}
      />
      {canManage ? (
        <Modal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Add user"
          description="Create an account and assign a role."
          footer={(
            <>
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-user-form" disabled={createMutation.isPending || rolesQuery.isLoading}>{createMutation.isPending ? 'Saving...' : 'Create user'}</Button>
            </>
          )}
        >
          <form id="create-user-form" className="space-y-4" onSubmit={(event) => {
            event.preventDefault()
            createMutation.mutate(form)
          }}>
            {createMutation.error ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {createMutation.error?.response?.data?.message ?? 'Could not create user.'}
              </p>
            ) : null}
            {rolesQuery.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load roles.</p> : null}
            <FormField label="Full name" error={createMutation.error?.response?.data?.errors?.name?.[0]}>
              <TextInput required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </FormField>
            <FormField label="Email" error={createMutation.error?.response?.data?.errors?.email?.[0]}>
              <TextInput required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </FormField>
            <FormField label="Password" hint="Use at least 8 characters." error={createMutation.error?.response?.data?.errors?.password?.[0]}>
              <TextInput required type="password" minLength={8} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </FormField>
            <FormField label="Role" error={createMutation.error?.response?.data?.errors?.role?.[0]}>
              <SelectInput value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                {(rolesQuery.data ?? []).map((role) => <option key={role.id} value={role.name}>{role.display_name}</option>)}
              </SelectInput>
            </FormField>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

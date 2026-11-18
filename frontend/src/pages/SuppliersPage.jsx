import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, ContactRound, Mail, Plus } from 'lucide-react'

import { Button, DataTable, FormField, KpiCard, Modal, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'
import { hasPermission } from '../lib/permissions'

export default function SuppliersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const emptyForm = { name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }
  const [form, setForm] = useState(emptyForm)
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await apiClient.get('/api/suppliers')).data,
  })
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/suppliers', payload),
    onSuccess: () => {
      setCreateOpen(false)
      setForm(emptyForm)
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
  const { data = [], isLoading, error } = suppliersQuery
  const canManage = hasPermission(user, ['suppliers.manage'])

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total suppliers" value={data.length.toLocaleString()} icon={Building2} trendUnavailable loading={isLoading} footer="Suppliers in the directory" />
        <KpiCard label="With contact person" value={data.filter((supplier) => supplier.contact_person).length.toLocaleString()} icon={ContactRound} trendUnavailable loading={isLoading} footer="Records with a named contact" />
        <KpiCard label="With email" value={data.filter((supplier) => supplier.email).length.toLocaleString()} icon={Mail} trendUnavailable loading={isLoading} footer="Records with an email address" />
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error?.response?.data?.message ?? 'Could not load suppliers.'}</p> : null}
      <DataTable
        columns={[
          { key: 'name', label: 'Supplier' },
          { key: 'contact_person', label: 'Contact', render: (value) => value || '—' },
          { key: 'email', label: 'Email', render: (value) => value || '—' },
          { key: 'phone', label: 'Phone', render: (value) => value || '—' },
          { key: 'notes', label: 'Notes', render: (value) => value || '—' },
        ]}
        rows={data}
        loading={isLoading}
        query={query}
        onSearch={setQuery}
        emptyMessage="No suppliers are available."
        toolbarActions={canManage ? (
          <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Add supplier</Button>
        ) : null}
      />
      {canManage ? (
        <Modal
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Add supplier"
          description="Add a supplier to the directory."
          footer={(
            <>
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" form="create-supplier-form" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create supplier'}</Button>
            </>
          )}
        >
          <form id="create-supplier-form" className="space-y-4" onSubmit={(event) => {
            event.preventDefault()
            createMutation.mutate(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value || null])))
          }}>
            {createMutation.error ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {createMutation.error?.response?.data?.message ?? 'Could not create supplier.'}
              </p>
            ) : null}
            <FormField label="Supplier name" error={createMutation.error?.response?.data?.errors?.name?.[0]}>
              <TextInput required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </FormField>
            <FormField label="Contact person">
              <TextInput value={form.contact_person} onChange={(event) => setForm((current) => ({ ...current, contact_person: event.target.value }))} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Email" error={createMutation.error?.response?.data?.errors?.email?.[0]}>
                <TextInput type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </FormField>
              <FormField label="Phone">
                <TextInput value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </FormField>
            </div>
            <FormField label="Address">
              <TextInput value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            </FormField>
            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-20 w-full rounded-lg border border-[#E6EAF2] bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </FormField>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

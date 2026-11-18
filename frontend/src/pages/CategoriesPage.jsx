import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderTree, Plus } from 'lucide-react'

import { Button, DataTable, FormField, KpiCard, Modal, TextInput } from '../components/shared/ui'
import { apiClient } from '../lib/api'

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await apiClient.get('/api/categories')).data,
  })
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/categories', payload),
    onSuccess: () => {
      setCreateOpen(false)
      setName('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
  const { data = [], isLoading, error } = categoriesQuery

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total categories" value={data.length.toLocaleString()} icon={FolderTree} trendUnavailable loading={isLoading} footer="Categories in the catalog" />
        <KpiCard label="With description" value={data.filter((item) => item.description).length.toLocaleString()} icon={FolderTree} trendUnavailable loading={isLoading} footer="Categories with additional details" />
        <KpiCard label="Without description" value={data.filter((item) => !item.description).length.toLocaleString()} icon={FolderTree} trendUnavailable loading={isLoading} footer="Categories needing more detail" />
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error?.response?.data?.message ?? 'Could not load categories.'}</p> : null}
      <DataTable
        columns={[{ key: 'name', label: 'Category' }, { key: 'description', label: 'Description', render: (value) => value || '—' }]}
        rows={data}
        loading={isLoading}
        query={query}
        onSearch={setQuery}
        emptyMessage="No categories are available."
        toolbarActions={<Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Add category</Button>}
      />
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add category"
        description="Create a product category."
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-category-form" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create category'}</Button>
          </>
        )}
      >
        <form id="create-category-form" className="space-y-4" onSubmit={(event) => {
          event.preventDefault()
          createMutation.mutate({ name, description: description || null })
        }}>
          {createMutation.error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {createMutation.error?.response?.data?.message ?? 'Could not create category.'}
            </p>
          ) : null}
          <FormField label="Category name" error={createMutation.error?.response?.data?.errors?.name?.[0]}>
            <TextInput required value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Description" error={createMutation.error?.response?.data?.errors?.description?.[0]}>
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}

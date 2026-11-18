import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'

import { Button, FormField, PageHeader, TextInput } from '../components/shared/ui'
import { apiClient } from '../lib/api'

const defaults = {
  store_name: '',
  store_address: '',
  contact_number: '',
  receipt_footer: '',
  monthly_target: '180000',
  tax_rate: '12',
  expiry_warning_days: '7',
}

function settingsForm(values = {}) {
  return {
    ...defaults,
    ...values,
    monthly_target: String(values.monthly_target ?? defaults.monthly_target),
    tax_rate: String(values.tax_rate ?? defaults.tax_rate),
    expiry_warning_days: String(values.expiry_warning_days ?? defaults.expiry_warning_days),
  }
}

export default function SettingsPage() {
  const [form, setForm] = useState(null)
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await apiClient.get('/api/settings')).data,
  })
  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.patch('/api/settings', payload),
    onSuccess: (response) => {
      setForm(settingsForm(response.data))
    },
  })
  const values = settingsForm({ ...settingsQuery.data, ...form })

  function updateField(key, value) {
    setForm((current) => ({ ...values, ...current, [key]: value }))
    saveMutation.reset()
  }

  function saveSettings(event) {
    event.preventDefault()
    saveMutation.mutate({
      ...values,
      monthly_target: Number(values.monthly_target),
      tax_rate: Number(values.tax_rate),
      expiry_warning_days: Number(values.expiry_warning_days),
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Store preferences and operational defaults." showDateRange={false} />
      {settingsQuery.error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{settingsQuery.error?.response?.data?.message ?? 'Could not load settings.'}</p> : null}
      {saveMutation.error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {saveMutation.error?.response?.data?.message ?? 'Could not save settings.'}
        </p>
      ) : null}
      {saveMutation.isSuccess ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Settings saved.</p> : null}

      <form className="space-y-5" onSubmit={saveSettings}>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-[#E6EAF2] bg-white p-5 shadow-soft max-[767px]:p-4">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Store details</h2>
            <div className="space-y-4">
              <FormField label="Store name" error={saveMutation.error?.response?.data?.errors?.store_name?.[0]}>
                <TextInput required value={values.store_name} onChange={(event) => updateField('store_name', event.target.value)} disabled={settingsQuery.isLoading} />
              </FormField>
              <FormField label="Address">
                <TextInput value={values.store_address} onChange={(event) => updateField('store_address', event.target.value)} disabled={settingsQuery.isLoading} />
              </FormField>
              <FormField label="Contact number">
                <TextInput value={values.contact_number} onChange={(event) => updateField('contact_number', event.target.value)} disabled={settingsQuery.isLoading} />
              </FormField>
            </div>
          </section>

          <section className="rounded-xl border border-[#E6EAF2] bg-white p-5 shadow-soft max-[767px]:p-4">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Sales settings</h2>
            <div className="space-y-4">
              <FormField label="Receipt footer">
                <TextInput value={values.receipt_footer} onChange={(event) => updateField('receipt_footer', event.target.value)} disabled={settingsQuery.isLoading} />
              </FormField>
              <FormField label="Monthly target" error={saveMutation.error?.response?.data?.errors?.monthly_target?.[0]}>
                <TextInput required type="number" min="0" step="0.01" value={values.monthly_target} onChange={(event) => updateField('monthly_target', event.target.value)} disabled={settingsQuery.isLoading} />
              </FormField>
              <FormField label="Tax rate (%)" error={saveMutation.error?.response?.data?.errors?.tax_rate?.[0]}>
                <TextInput required type="number" min="0" max="100" step="0.01" value={values.tax_rate} onChange={(event) => updateField('tax_rate', event.target.value)} disabled={settingsQuery.isLoading} />
              </FormField>
              <FormField label="Expiry warning days" error={saveMutation.error?.response?.data?.errors?.expiry_warning_days?.[0]}>
                <TextInput required type="number" min="0" max="365" step="1" value={values.expiry_warning_days} onChange={(event) => updateField('expiry_warning_days', event.target.value)} disabled={settingsQuery.isLoading} />
              </FormField>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end border-t border-[#E6EAF2] bg-[#F2F5FA]/95 py-3 backdrop-blur">
          <Button type="submit" className="gap-2" disabled={settingsQuery.isLoading || saveMutation.isPending}>
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}

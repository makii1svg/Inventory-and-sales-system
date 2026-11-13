import { Save } from 'lucide-react'

import { Button, FormField, TextInput } from '../components/shared/ui'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Store preferences and operational defaults.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Store details</h3>
          <div className="space-y-4">
            <FormField label="Store name">
              <TextInput defaultValue="Sunrise Market" />
            </FormField>
            <FormField label="Address">
              <TextInput defaultValue="12 Sampaguita St., Quezon City" />
            </FormField>
            <FormField label="Contact number">
              <TextInput defaultValue="(02) 555-0101" />
            </FormField>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Sales settings</h3>
          <div className="space-y-4">
            <FormField label="Receipt footer">
              <TextInput defaultValue="Thank you for shopping with us." />
            </FormField>
            <FormField label="Monthly target">
              <TextInput defaultValue="180000" />
            </FormField>
            <FormField label="Expiry warning days">
              <TextInput defaultValue="7" />
            </FormField>
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <Button type="button" className="gap-2">
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </div>
    </div>
  )
}

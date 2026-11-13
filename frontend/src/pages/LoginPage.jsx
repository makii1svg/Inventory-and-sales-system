import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Mail, Store } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { Button, FormField, TextInput } from '../components/shared/ui'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: 'admin@sunrise.local', password: 'password' } })

  async function onSubmit(values) {
    await login(values)
    navigate((location.state && location.state.from) || '/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="hidden w-1/2 bg-[#0E1A33] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Inventory and sales</p>
            <p className="text-xl font-semibold">System</p>
          </div>
        </div>
        <div>
          <p className="text-4xl font-semibold leading-tight">Run the grocery operation from a single dashboard.</p>
          <p className="mt-4 max-w-md text-sm text-slate-300">Track stock, cash flow, purchases, and store performance in one place.</p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">Sign in</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Inventory and Sales System</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email" error={errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput {...register('email')} className="pl-10" placeholder="admin@sunrise.local" />
              </div>
            </FormField>

            <FormField label="Password" error={errors.password?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <TextInput {...register('password')} type="password" className="pl-10" placeholder="••••••••" />
              </div>
            </FormField>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

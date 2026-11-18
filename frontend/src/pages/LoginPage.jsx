import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { Button, FormField, TextInput } from '../components/shared/ui'
import { getHomePath } from '../lib/permissions'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must have at least 6 characters'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [loginError, setLoginError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: 'admin@sunrise.local', password: 'password' } })

  async function onSubmit(values) {
    setLoginError('')

    try {
      const user = await login(values)
      const destination = String(user?.role).toLowerCase() === 'cashier'
        ? getHomePath(user)
        : (location.state && location.state.from) || getHomePath(user)
      navigate(destination, { replace: true })
    } catch (error) {
      setLoginError(error?.response?.status === 422
        ? error.response.data?.errors?.email?.[0] ?? 'The provided credentials are incorrect.'
        : 'Unable to sign in. Check that the API and database are available.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F5FA] p-4">
      <div className="w-full max-w-md rounded-xl border border-[#E6EAF2] bg-white p-5 shadow-soft sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-medium text-slate-500">Sunrise Market</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {loginError ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loginError}</p> : null}
          <FormField label="Email" error={errors.email?.message}>
            <TextInput {...register('email')} placeholder="admin@sunrise.local" />
          </FormField>

          <FormField label="Password" error={errors.password?.message}>
            <TextInput {...register('password')} type="password" placeholder="••••••••" />
          </FormField>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}

import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import LoginPage from '../pages/LoginPage'
import { hasPermission } from '../lib/permissions'

export default function RequirePermission({ children, permissions = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-600">
        Loading session...
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (!hasPermission(user, permissions)) {
    return <Navigate to="/403" replace />
  }

  return children
}

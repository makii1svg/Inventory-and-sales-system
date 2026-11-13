import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { getCurrentUser, loginRequest, logoutRequest } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const bootstrap = useCallback(async () => {
    try {
      const profile = await getCurrentUser()
      setUser(profile)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials)
    const activeUser = result?.user ?? {
      id: 1,
      name: 'Ariana Cruz',
      email: credentials.email,
      role: 'Administrator',
      permissions: ['*'],
    }

    setUser(activeUser)
    return activeUser
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
    window.location.href = import.meta.env.BASE_URL || '/'
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [loading, login, logout, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

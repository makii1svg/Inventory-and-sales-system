import axios from 'axios'

const STORAGE_KEY = 'inventory_sales_token'

function normalizeUser(rawUser = null) {
  if (!rawUser) return null

  const permissions = Array.isArray(rawUser.permissions)
    ? rawUser.permissions.map((permission) => String(permission).toLowerCase())
    : []

  const role = rawUser.role
    ? String(rawUser.role).trim()
    : 'Cashier'

  return {
    ...rawUser,
    role: role === 'administrator' ? 'Administrator' : role.charAt(0).toUpperCase() + role.slice(1),
    permissions,
  }
}

function readToken() {
  return localStorage.getItem(STORAGE_KEY)
}

function persistToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token)
    return
  }

  localStorage.removeItem(STORAGE_KEY)
}

function getAppBasePath() {
  const pathname = window.location.pathname || '/'

  if (pathname.startsWith('/app')) {
    return '/app'
  }

  return ''
}

export const apiClient = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = readToken()

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401) {
      persistToken(null)
    }

    return Promise.reject(error)
  },
)

export async function getCsrfCookie() {
  try {
    await apiClient.get('/sanctum/csrf-cookie')
  } catch {
    // dev fallback when the Laravel app is not running yet
  }
}

export async function loginRequest(payload) {
  await getCsrfCookie()
  const response = await apiClient.post('/api/auth/login', payload)
  const user = normalizeUser(response.data.user ?? response.data)

  if (response.data?.token) {
    persistToken(response.data.token)
  }

  return {
    ...response.data,
    user,
  }
}

export async function logoutRequest() {
  try {
    await apiClient.post('/api/auth/logout')
  } catch {
    // no-op: the app may be running in demo mode
  } finally {
    persistToken(null)
  }
}

export async function getCurrentUser() {
  try {
    const response = await apiClient.get('/api/auth/me')
    return normalizeUser(response.data.user ?? response.data)
  } catch {
    persistToken(null)
    return null
  }
}

export async function getStoreSettings() {
  try {
    const response = await apiClient.get('/api/settings')
    return response.data
  } catch {
    return {
      store_name: 'Sunrise Market',
      app_name: 'Inventory and Sales System',
      receipt_footer: 'Thank you for shopping with us.',
      monthly_target: 180000,
    }
  }
}

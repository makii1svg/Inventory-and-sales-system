import { Suspense, lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell'
import { ToastProvider } from './components/shared/ToastProvider'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getHomePath } from './lib/permissions'
import RequirePermission from './routes/RequirePermission'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const InventorySectionPage = lazy(() => import('./pages/InventorySectionPage'))
const PurchasingSectionPage = lazy(() => import('./pages/PurchasingSectionPage'))
const SalesSectionPage = lazy(() => import('./pages/SalesSectionPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const UsersSectionPage = lazy(() => import('./pages/UsersSectionPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function AppRoutes() {
  const { isAuthenticated, user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getHomePath(user)} replace /> : <LoginPage />}
      />

      <Route path="/" element={<RequirePermission><AppShell /></RequirePermission>}>
        <Route index element={<Navigate to={getHomePath(user)} replace />} />
        <Route path="dashboard" element={<RequirePermission permissions={['dashboard.view']}><DashboardPage /></RequirePermission>} />
        <Route
          path="inventory"
          element={(
            <RequirePermission permissions={['products.view', 'categories.manage', 'stock.view', 'stock.in', 'stock.adjust', 'notifications.view']}>
              <InventorySectionPage />
            </RequirePermission>
          )}
        />
        <Route
          path="purchasing"
          element={(
            <RequirePermission permissions={['suppliers.view', 'suppliers.manage', 'purchases.view', 'purchases.create', 'purchases.receive']}>
              <PurchasingSectionPage />
            </RequirePermission>
          )}
        />
        <Route path="analytics" element={<RequirePermission permissions={['analytics.view', 'reports.view']}><AnalyticsPage /></RequirePermission>} />
        <Route path="sales/pos" element={<RequirePermission permissions={['pos.use']}><SalesSectionPage activeTab="pos" /></RequirePermission>} />
        <Route path="sales/transactions" element={<RequirePermission permissions={['sales.view_all', 'sales.view_own', 'sales.view_limited']}><SalesSectionPage activeTab="transactions" /></RequirePermission>} />
        <Route path="expenses" element={<RequirePermission permissions={['expenses.view', 'expenses.manage']}><ExpensesPage /></RequirePermission>} />
        <Route
          path="users"
          element={(
            <RequirePermission permissions={['users.view', 'roles.view', 'reports.view']}>
              <UsersSectionPage />
            </RequirePermission>
          )}
        />
        <Route path="settings" element={<RequirePermission permissions={['settings.manage']}><SettingsPage /></RequirePermission>} />
        <Route path="403" element={<ForbiddenPage />} />

        <Route path="products" element={<Navigate to="/inventory?tab=products" replace />} />
        <Route path="categories" element={<Navigate to="/inventory?tab=categories" replace />} />
        <Route path="stock" element={<Navigate to="/inventory?tab=stock-levels" replace />} />
        <Route path="pos" element={<Navigate to="/sales/pos?tab=pos" replace />} />
        <Route path="transactions" element={<Navigate to="/sales/transactions?tab=transactions" replace />} />
        <Route path="sales" element={<Navigate to="/sales/pos?tab=pos" replace />} />
        <Route path="purchase-orders" element={<Navigate to="/purchasing?tab=purchase-orders" replace />} />
        <Route path="suppliers" element={<Navigate to="/purchasing?tab=suppliers" replace />} />
        <Route path="reports" element={<Navigate to="/analytics?tab=reports" replace />} />
        <Route path="activity-log" element={<Navigate to="/users?tab=activity-log" replace />} />
        <Route path="roles" element={<Navigate to="/users?tab=roles" replace />} />
        <Route path="alerts" element={<Navigate to="/inventory?tab=expiry-alerts" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm font-medium text-slate-600">Loading...</div>}>
              <AppRoutes />
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

import { useQuery } from '@tanstack/react-query'
import { ChevronRight, LogOut, Settings, Target } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { hasPermission, isAdmin } from '../lib/permissions'
import { getStoreSettings } from '../lib/api'
import { ProgressBar } from './shared/ui'

const ADMIN_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', permissions: ['dashboard.view'] },
  { label: 'Data Analytics', path: '/analytics?tab=overview', permissions: ['analytics.view', 'reports.view'] },
  {
    label: 'Inventory',
    path: '/inventory?tab=products',
    permissions: ['products.view', 'categories.manage', 'stock.view', 'stock.in', 'stock.adjust'],
  },
  {
    label: 'Supplier and Purchase',
    path: '/purchasing?tab=suppliers',
    permissions: ['suppliers.view', 'suppliers.manage', 'purchases.view', 'purchases.create', 'purchases.receive'],
  },
  { label: 'Expenses', path: '/expenses', permissions: ['expenses.view', 'expenses.manage'] },
  {
    label: 'Users',
    path: '/users?tab=users',
    permissions: ['users.view', 'roles.view', 'reports.view'],
  },
]

const STAFF_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', permissions: ['dashboard.view'] },
  {
    label: 'Inventory',
    path: '/inventory?tab=products',
    permissions: ['products.view', 'categories.manage', 'stock.view', 'stock.in', 'stock.adjust'],
  },
  {
    label: 'Supplier and Purchase',
    path: '/purchasing?tab=suppliers',
    permissions: ['suppliers.view', 'suppliers.manage', 'purchases.view', 'purchases.create', 'purchases.receive'],
  },
]

const CASHIER_ITEMS = [
  { label: 'Sales / POS', path: '/sales/pos?tab=pos', permissions: ['pos.use'] },
]

function useStoreSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getStoreSettings,
    staleTime: 1000 * 60 * 5,
  })
}

function getNavigationItems(user) {
  const isCashier = String(user?.role ?? '').toLowerCase() === 'cashier'
  const items = isAdmin(user) ? ADMIN_ITEMS : isCashier ? CASHIER_ITEMS : STAFF_ITEMS

  return items.filter((item) => hasPermission(user, item.permissions))
}

function StoreBrand({ settings, user, mobile = false, onClose }) {
  return (
    <div className={`flex items-center justify-between ${mobile ? 'mb-6' : 'border-b border-slate-700 px-5 py-4'}`}>
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Store</p>
        <p className="mt-1 text-sm font-semibold text-white">{settings?.store_name ?? user?.storeName ?? 'Sunrise Market'}</p>
      </div>
      {mobile ? (
        <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-300 hover:bg-slate-800" aria-label="Close navigation">
          ×
        </button>
      ) : null}
    </div>
  )
}

function Navigation({ user, onClose }) {
  const items = getNavigationItems(user)

  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.path}
          onClick={onClose}
          className={({ isActive }) =>
            `flex min-h-11 items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="min-w-0 leading-5">{item.label}</span>
          {onClose ? <ChevronRight className="h-4 w-4" /> : null}
        </NavLink>
      ))}
    </nav>
  )
}

function MonthlyTarget() {
  return (
    <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200">
      <div className="mb-3 flex items-center justify-between text-slate-400">
        <span className="text-[10px] uppercase tracking-[0.12em]">Monthly target</span>
        <Target className="h-4 w-4" />
      </div>
      <p className="text-xl font-semibold text-white">₱146.4k</p>
      <p className="mt-2 text-xs text-slate-400">68% of target</p>
      <div className="mt-3">
        <ProgressBar value={68} max={100} tone="primary" />
      </div>
    </div>
  )
}

function UserMenu({ user, logout, mobile = false, onClose }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${mobile ? 'rounded-lg bg-slate-800/80 p-3' : 'rounded-lg bg-slate-800/60 px-2 py-2'}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{user?.name ?? 'Staff Member'}</p>
        <p className="text-xs text-slate-400">{user?.role ?? 'Staff'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isAdmin(user) ? (
          <NavLink
            to="/settings"
            onClick={onClose}
            className="rounded-md p-2 text-slate-300 hover:bg-slate-700"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </NavLink>
        ) : null}
        <button type="button" onClick={logout} className="rounded-md p-2 text-slate-300 hover:bg-slate-700" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { data: settings } = useStoreSettings()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col bg-[#0E1A33] text-slate-300 lg:flex">
      <StoreBrand settings={settings} user={user} />
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Navigation user={user} />
        {isAdmin(user) ? <MonthlyTarget /> : null}
      </div>
      <div className="border-t border-slate-700 px-4 py-3">
        <UserMenu user={user} logout={logout} />
      </div>
    </aside>
  )
}

export function MobileSidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const { data: settings } = useStoreSettings()

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
        onClick={onClose}
        aria-label="Close navigation"
      />
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[min(84vw,320px)] flex-col bg-[#0E1A33] p-4 text-slate-300 lg:hidden">
        <StoreBrand settings={settings} user={user} mobile onClose={onClose} />
        <div className="flex-1 overflow-y-auto">
          <Navigation user={user} onClose={onClose} />
          {isAdmin(user) ? <MonthlyTarget /> : null}
        </div>
        <div className="mt-4 border-t border-slate-700 pt-4">
          <UserMenu user={user} logout={logout} mobile onClose={onClose} />
        </div>
      </aside>
    </>
  )
}

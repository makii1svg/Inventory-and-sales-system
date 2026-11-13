import { Outlet, useLocation } from 'react-router-dom'

import Sidebar from './Sidebar'
import Topbar from './Topbar'

const PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: 'Performance overview across the store' },
  inventory: { title: 'Inventory Management', subtitle: 'Products, stock, and expiry alerts' },
  purchasing: { title: 'Supplier and Purchase Management', subtitle: 'Suppliers and incoming stock' },
  analytics: { title: 'Data Analytics', subtitle: 'Sales trends and operational metrics' },
  sales: { title: 'Sales Management', subtitle: 'Point of sale and transaction history' },
  expenses: { title: 'Expense Management', subtitle: 'Spending and cost tracking' },
  users: { title: 'User Management', subtitle: 'User access and branch activity' },
  settings: { title: 'Settings', subtitle: 'Store and operational preferences' },
}

export default function AppShell() {
  const { pathname } = useLocation()
  const key = pathname.split('/')[1] || 'dashboard'
  const meta = PAGE_META[key] ?? { title: 'Overview', subtitle: 'Performance overview across the store' }

  return (
    <div className="min-h-screen bg-[#F2F5FA] text-slate-900">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <main className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

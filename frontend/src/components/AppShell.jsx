import { Outlet } from 'react-router-dom'

import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[#F2F5FA] text-slate-900 [--sidebar-width:clamp(208px,18vw,240px)]">
      <Sidebar />
      <div className="min-w-0 lg:pl-[var(--sidebar-width)]">
        <Topbar hidePageControls />
        <main className="mx-auto min-w-0 w-full px-3 py-5 min-[480px]:px-4 min-[768px]:py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

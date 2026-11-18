import { Bell, Download, Menu, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { alerts, unreadAlertCount } from '../lib/alerts'
import { hasPermission } from '../lib/permissions'
import { Badge, Button, DateRangeControl } from './shared/ui'
import { MobileSidebar } from './Sidebar'

function NotificationsMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  if (!hasPermission(user, ['notifications.view'])) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        aria-label={`${unreadAlertCount} unread alerts`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {unreadAlertCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {unreadAlertCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E6EAF2] bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-[#EEF1F6] px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            <Badge tone="warning">{unreadAlertCount} unread</Badge>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {alerts.slice(0, 3).map((alert) => (
              <Link
                key={alert.id}
                to="/inventory?tab=expiry-alerts"
                onClick={() => setOpen(false)}
                className="block border-b border-[#EEF1F6] px-4 py-3 last:border-0 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">{alert.title}</span>
                  {alert.status === 'Unread' ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">{alert.source}</p>
              </Link>
            ))}
          </div>
          <Link
            to="/inventory?tab=expiry-alerts"
            onClick={() => setOpen(false)}
            className="block border-t border-[#EEF1F6] px-4 py-3 text-center text-sm font-medium text-primary hover:bg-slate-50"
          >
            View all alerts
          </Link>
        </div>
      ) : null}
    </div>
  )
}

export default function Topbar({ title, subtitle, hidePageControls = false }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [range, setRange] = useState('30D')

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#F2F5FA]/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            {!hidePageControls ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Store management</p>
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
              </div>
            ) : null}
          </div>

          {hidePageControls ? <NotificationsMenu /> : (
            <div className="hidden items-center gap-3 lg:flex">
              <DateRangeControl value={range} onChange={setRange} />
              <Button variant="secondary" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
              <Button variant="secondary" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <NotificationsMenu />
            </div>
          )}

          {!hidePageControls ? <div className="lg:hidden"><NotificationsMenu /></div> : null}
        </div>

        {!hidePageControls ? (
          <div className="mx-auto flex w-full items-center justify-between gap-3 px-4 pb-4 lg:hidden">
            <p className="text-sm text-slate-500">{subtitle}</p>
            <DateRangeControl value={range} onChange={setRange} />
          </div>
        ) : null}
      </header>

      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}

import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { ChevronDown, Info, Search, X } from 'lucide-react'

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }

  return (
    <button
      {...props}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-100 text-slate-700',
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  }

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function StatusDot({ tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-slate-400',
    positive: 'bg-emerald-500',
    negative: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${tones[tone]} ${className}`} />
}

export function FormField({ label, hint, error, children }) {
  return (
    <label className="block text-sm">
      {label ? <span className="mb-2 block font-medium text-slate-700">{label}</span> : null}
      {children}
      {hint ? <span className="mt-2 block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-2 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

export function TextInput({ className = '', ...props }) {
  return (
    <input
      {...props}
      className={`min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  )
}

export function SelectInput({ className = '', children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`min-h-[44px] w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  )
}

export function Modal({ open, onOpenChange, title, description, children, footer }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              {title ? <Dialog.Title className="text-lg font-semibold text-slate-900">{title}</Dialog.Title> : null}
              {description ? <Dialog.Description className="mt-1 text-sm text-slate-500">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close asChild>
              <button type="button" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-5">{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmText = 'Confirm', onConfirm }) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm?.()
              onOpenChange(false)
            }}
            type="button"
          >
            {confirmText}
          </Button>
        </>
      }
    />
  )
}

export function Drawer({ open, onOpenChange, title, children, footer }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/30 md:hidden" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-slate-200 bg-white p-5 shadow-xl focus:outline-none md:hidden">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-slate-900">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
          {footer ? <div className="mt-4 flex gap-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function DateRangeControl({ value, onChange }) {
  const ranges = ['7D', '30D', '90D', 'YTD']

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      {ranges.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors ${
            value === option ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function DeltaChip({ value, tone = 'positive' }) {
  const tones = {
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
  }

  return <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{value}</span>
}

export function MoneyText({ amount, digits = 0 }) {
  const value = Number(amount ?? 0)
  return <span>₱{value.toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits })}</span>
}

export function Sparkline({ data = [] }) {
  if (!data.length) {
    return <div className="h-10 w-24 rounded-md bg-slate-100" />
  }

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparklineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2457D6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2457D6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="#2457D6" strokeWidth={2} fill="url(#sparklineFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function KpiCard({ label, value, change, tone = 'positive', sparkline = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <DeltaChip value={change} tone={tone} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <Sparkline data={sparkline} />
      </div>
    </div>
  )
}

export function WidgetCard({ title, info, footerLabel = 'View details', footerHref = '#', children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {info ? (
          <button type="button" className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
            <Info className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {children}
      <div className="mt-4 border-t border-slate-200 pt-3">
        <a href={footerHref} className="text-sm font-medium text-primary hover:text-primary/80">{footerLabel}</a>
      </div>
    </section>
  )
}

export function ChartFrame({ title, subtitle, children, tableData = [] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="h-64 w-full">{children}</div>
      <div className="sr-only">
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function TabsList({ value, onValueChange, items }) {
  return (
    <Tabs.Root value={value} onValueChange={onValueChange} className="w-full">
      <Tabs.List className="flex flex-nowrap gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1">
        {items.map((item) => (
          <Tabs.Trigger
            key={item.value}
            value={item.value}
            className="min-h-[40px] shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  )
}

export function SegmentedBar({ data = [] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>{item.label}</span>
            <span>{item.value}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DonutChart({ data = [] }) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={44} outerRadius={70} paddingAngle={2} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProgressBar({ value, max = 100, tone = 'primary' }) {
  const percentage = Math.min((value / max) * 100, 100)
  const tones = {
    primary: 'bg-primary',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
  }

  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${percentage}%` }} />
    </div>
  )
}

export function DataTable({ columns, rows, loading = false, onSearch, query }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onSearch?.(event.target.value)}
            placeholder="Search records"
            className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="sticky top-0 border-b border-slate-200 px-4 py-3 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  Loading records...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id ?? row.name} className="border-b border-slate-200 hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={`${row.id ?? row.name}-${column.key}`} className="border-b border-slate-200 px-4 py-3 align-middle text-slate-700">
                      {typeof column.render === 'function' ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

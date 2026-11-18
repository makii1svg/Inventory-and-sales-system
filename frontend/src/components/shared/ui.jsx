import { useMemo, useState } from 'react'
import { forwardRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Info,
  Minus,
  Package,
  Search,
  X,
} from 'lucide-react'

const cardClassName = 'flex h-full flex-col rounded-xl border border-[#E6EAF2] bg-white p-5 shadow-soft max-[767px]:p-4'

export function Card({
  title,
  subtitle,
  icon,
  header,
  body,
  footer,
  children,
  className = '',
}) {
  const hasHeader = header || title || subtitle || icon

  return (
    <section className={`${cardClassName} ${className}`}>
      {hasHeader ? (
        header ?? (
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : null}
              {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
            </div>
            {icon ? <div className="shrink-0">{icon}</div> : null}
          </header>
        )
      ) : null}
      <div className="min-h-0 flex-1">{body ?? children}</div>
      {footer ? (
        <footer className="mt-auto border-t border-[#EEF1F6] pt-3 text-xs text-slate-500">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

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

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${tones[tone]}`}>{children}</span>
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
      {label ? <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span> : null}
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

export const TextInput = forwardRef(function TextInput({ className = '', ...props }, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={`min-h-10 w-full rounded-lg border border-[#E6EAF2] bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
    />
  )
})

export function SelectInput({ className = '', children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`min-h-10 w-full appearance-none rounded-lg border border-[#E6EAF2] bg-white px-3 pr-10 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${className}`}
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content className="fixed inset-0 z-50 flex max-h-dvh w-full flex-col overflow-hidden border border-[#E6EAF2] bg-white p-4 shadow-xl focus:outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[90vw] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-5">
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
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? <div className="sticky bottom-0 mt-4 flex justify-end gap-3 border-t border-[#EEF1F6] bg-white pt-3">{footer}</div> : null}
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/30 md:hidden" />
        <Dialog.Content className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden border border-[#E6EAF2] bg-white p-4 shadow-xl focus:outline-none md:hidden">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-slate-900">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? <div className="sticky bottom-0 mt-4 flex gap-3 border-t border-[#EEF1F6] bg-white pt-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function DateRangeControl({ value, onChange }) {
  const ranges = [
    { value: '1D', label: 'Today' },
    { value: '7D', label: '7D' },
    { value: '30D', label: '30D' },
    { value: '90D', label: '90D' },
    { value: 'YTD', label: 'YTD' },
  ]

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[#E6EAF2] bg-white p-1">
      {ranges.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors ${
            value === option.value ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function DeltaChip({ value, tone, goodDirection = 'up', direction }) {
  const tones = {
    positive: 'bg-emerald-100 text-emerald-700',
    negative: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    neutral: 'bg-slate-100 text-slate-600',
  }
  const text = String(value ?? '')
  const changeDirection = direction
    ?? (text.trim().startsWith('-') ? 'down' : Number.parseFloat(text.replace(/[^\d.-]/g, '')) > 0 ? 'up' : 'flat')
  const computedTone = tone ?? (changeDirection === 'flat' ? 'neutral' : changeDirection === goodDirection ? 'positive' : 'negative')
  const DirectionIcon = changeDirection === 'up' ? ArrowUpRight : changeDirection === 'down' ? ArrowDownRight : Minus

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${tones[computedTone] ?? tones.neutral}`}>
      <DirectionIcon aria-hidden="true" className="h-3.5 w-3.5" />
      {value}
    </span>
  )
}

export function MoneyText({ amount, digits = 0 }) {
  const value = Number(amount ?? 0)
  return <span>₱{value.toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits })}</span>
}

export function Sparkline({ data = [] }) {
  if (!data.length) {
    return (
      <div aria-label="Sparkline loading" className="flex h-10 w-24 items-end gap-1" role="img">
        {[35, 55, 42, 75, 58, 88, 68].map((height, index) => (
          <span key={index} className="w-2 rounded-t-sm bg-blue-100" style={{ height: `${height}%` }} />
        ))}
      </div>
    )
  }

  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area type="monotone" dataKey="value" stroke="#2457D6" strokeWidth={2} fill="#2457D6" fillOpacity={0.12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function KpiCard({
  label,
  value,
  change,
  tone,
  goodDirection = 'up',
  icon: Icon = Package,
  sparkline = [],
  loading = false,
  trendUnavailable = false,
  unavailableMessage,
  footer,
}) {
  return (
    <Card
      className="min-h-[168px]"
      footer={footer ?? 'Updated for the selected period'}
      body={loading ? (
        <div aria-label={`${label} loading`} className="flex h-full flex-col justify-between" role="status">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
            <span className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
          <span className="h-8 w-28 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E6EAF2] bg-white text-primary">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-[26px] font-semibold leading-8 text-slate-900 tabular-nums">{value}</p>
                {unavailableMessage ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{unavailableMessage}</p> : null}
              </div>
            </div>
            {!trendUnavailable ? <Sparkline data={sparkline} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {!trendUnavailable ? (
              <>
                <DeltaChip value={change ?? '0%'} tone={tone} goodDirection={goodDirection} />
                <span className="text-xs text-slate-500">vs previous period</span>
              </>
            ) : null}
          </div>
        </div>
      )}
    />
  )
}

export function WidgetCard({ title, info, footerLabel = 'View details', footerHref = '#', children }) {
  return (
    <Card
      title={title}
      icon={info ? (
        <button type="button" aria-label={`About ${title}`} className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
          <Info className="h-4 w-4" />
        </button>
      ) : null}
      footer={<a href={footerHref} className="font-medium text-primary hover:text-primary/80">{footerLabel}</a>}
    >
      {children}
    </Card>
  )
}

function ChartLegend({ items = [] }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {items.map((item) => {
        const entry = typeof item === 'string' ? { label: item } : item
        return (
          <span key={entry.label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? '#2457D6' }} />
            {entry.label}
          </span>
        )
      })}
    </div>
  )
}

export function ChartCard({
  title,
  subtitle,
  legend = [],
  footnote,
  footerLink,
  footerHref,
  children,
  tableData = [],
  loading = false,
  className = '',
}) {
  return (
    <Card
      className={`min-h-[320px] ${className}`}
      header={(
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {legend.length ? <ChartLegend items={legend} /> : null}
        </header>
      )}
      body={(
        <div className="relative flex h-[220px] min-h-[220px] w-full flex-1">
          {loading ? (
            <div aria-label={`${title} loading`} className="flex flex-1 flex-col justify-end gap-3 pb-2" role="status">
              <div className="flex h-full items-end gap-3">
                {[44, 72, 58, 90, 68, 80].map((height, index) => (
                  <span key={index} className="w-full animate-pulse rounded-t bg-slate-100" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          ) : children}
          <div className="sr-only">
            <table>
              <thead>
                <tr><th>Label</th><th>Value</th></tr>
              </thead>
              <tbody>
                {tableData.map((item) => (
                  <tr key={item.label}><td>{item.label}</td><td>{item.value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      footer={footnote || footerLink ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{footnote}</span>
          {footerHref ? (
            <a href={footerHref} className="font-medium text-primary hover:text-primary/80">{footerLink ?? 'View breakdown'}</a>
          ) : footerLink ? (
            <span className="font-medium text-primary">{footerLink}</span>
          ) : null}
        </div>
      ) : null}
    />
  )
}

export function ChartFrame({ title, subtitle, children, tableData = [] }) {
  return <ChartCard title={title} subtitle={subtitle} footerLink={null} tableData={tableData}>{children}</ChartCard>
}

export function DarkTooltip({ active, payload, label, formatter = (value) => value }) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-32 rounded-lg bg-[#0E1A33] px-3 py-2 text-xs text-white shadow-lg">
      {label ? <p className="mb-1 font-medium text-white/70">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <span className="text-white/75">{item.name ?? item.dataKey}</span>
            <span className="font-semibold tabular-nums">{formatter(item.value, item.dataKey)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const axisStyle = { fill: '#5B6779', fontSize: 12 }

export function GroupedBarChart({
  data = [],
  series = [],
  xKey = 'label',
  targetKey,
  targetValue,
  targetLabel = 'Target',
  calloutKey,
  calloutLabel,
  formatValue = (value) => value,
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: data.length <= 8 ? 20 : 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#EEF1F6" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<DarkTooltip formatter={formatValue} />} />
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color ?? '#2457D6'} radius={[4, 4, 0, 0]}>
            {data.length <= 8 || item.key === calloutKey ? (
              <LabelList
                dataKey={item.key}
                content={(props) => {
                  const { x, y, width, value, index } = props
                  const isLatest = item.key === calloutKey && index === data.length - 1
                  if (x == null || y == null || width == null || value == null) return null

                  if (isLatest) {
                    const text = calloutLabel ?? formatValue(value)
                    const labelWidth = Math.max(56, String(text).length * 6 + 16)
                    const labelX = x + width / 2 - labelWidth / 2
                    const labelY = Math.max(2, y - 26)
                    return (
                      <g>
                        <rect x={labelX} y={labelY} width={labelWidth} height={20} rx={10} fill="#0E1A33" />
                        <text x={labelX + labelWidth / 2} y={labelY + 13.5} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight={600}>
                          {text}
                        </text>
                      </g>
                    )
                  }

                  return data.length <= 8 ? (
                    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#5B6779" fontSize={10}>
                      {formatValue(value)}
                    </text>
                  ) : null
                }}
              />
            ) : null}
          </Bar>
        ))}
        {targetKey ? (
          <Line
            type="linear"
            dataKey={targetKey}
            name={targetLabel}
            stroke="#0E1A33"
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
          />
        ) : null}
        {targetValue !== undefined ? (
          <ReferenceLine
            y={targetValue}
            stroke="#0E1A33"
            strokeDasharray="5 4"
            label={{ value: targetLabel, position: 'insideTopRight', fill: '#0E1A33', fontSize: 11 }}
          />
        ) : null}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AreaTrendChart({
  data = [],
  dataKey,
  previousKey,
  xKey = 'label',
  formatValue = (value) => value,
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#EEF1F6" vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={44} />
        <Tooltip content={<DarkTooltip formatter={formatValue} />} />
        {previousKey ? (
          <Line type="monotone" dataKey={previousKey} name="Previous period" stroke="#9DB6EE" strokeWidth={2} dot={false} />
        ) : null}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="#2457D6"
          fill="#2457D6"
          fillOpacity={0.12}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function DashboardGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-1 items-stretch gap-4 min-[768px]:grid-cols-6 min-[1280px]:grid-cols-12 min-[1280px]:gap-5 ${className}`}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  dateRange = 'Last 30 days',
  range = '30D',
  onRangeChange,
  activeFilters = 0,
  onFilters,
  onExport,
  primaryAction,
  showDateRange = true,
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {primaryAction}
        {showDateRange ? onRangeChange ? (
          <>
            <DateRangeControl value={range} onChange={onRangeChange} />
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E6EAF2] bg-white px-3 text-xs font-medium text-slate-600">
              <CalendarDays aria-hidden="true" className="h-4 w-4 text-slate-500" />
              {dateRange}
            </span>
          </>
        ) : (
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E6EAF2] bg-white px-3 text-xs font-medium text-slate-600">
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-slate-500" />
            {dateRange}
          </span>
        ) : null}
        {onFilters ? (
          <Button type="button" variant="secondary" onClick={onFilters} className="gap-2">
            <Filter aria-hidden="true" className="h-4 w-4" />
            Filters
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] tabular-nums">
              {activeFilters}
            </span>
          </Button>
        ) : null}
        {onExport ? (
          <Button type="button" variant="secondary" onClick={onExport} className="gap-2">
            <Download aria-hidden="true" className="h-4 w-4" />
            Export
          </Button>
        ) : null}
      </div>
    </header>
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
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>{item.label}</span>
            <span className="tabular-nums">{item.value}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color ?? ['#2457D6', '#6F91E7', '#9DB6EE', '#C2D0F5'][index % 4] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DonutChart({ data = [], colors = ['#2457D6', '#6F91E7', '#9DB6EE', '#C2D0F5', '#DCE5FA'] }) {
  return (
    <div className="h-full min-h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="84%" paddingAngle={2}>
            {data.map((item, index) => <Cell key={item.label} fill={item.color ?? colors[index % colors.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DonutCard({
  title,
  subtitle,
  data = [],
  total,
  formatValue = (value) => Number(value).toLocaleString(),
  footer,
}) {
  const sum = data.reduce((value, item) => value + Number(item.value ?? 0), 0)
  const centerTotal = total ?? sum

  return (
    <Card
      title={title}
      subtitle={subtitle}
      className="min-h-[320px]"
      footer={footer ?? `${data.length} categories in this breakdown`}
      body={(
        <div className="grid min-h-[220px] flex-1 items-center gap-4 sm:grid-cols-[minmax(180px,1fr)_1fr]">
          <div className="relative mx-auto h-[220px] w-full max-w-[220px]">
            <DonutChart data={data} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-xl font-semibold text-slate-900 tabular-nums">{formatValue(centerTotal)}</span>
            </div>
          </div>
          {data.length ? (
            <ul className="space-y-3">
              {data.map((item, index) => {
                const percent = sum ? Math.round((Number(item.value) / sum) * 100) : 0
                const color = item.color ?? ['#2457D6', '#6F91E7', '#9DB6EE', '#C2D0F5', '#DCE5FA'][index % 5]
                return (
                  <li key={item.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="shrink-0 text-right font-medium text-slate-800 tabular-nums">
                      {formatValue(item.value)} <span className="text-slate-500">({percent}%)</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No category breakdown available for this period.</p>
          )}
        </div>
      )}
    />
  )
}

export function RankedList({
  title,
  subtitle,
  items = [],
  maxValue,
  formatValue = (value) => value,
  footer,
}) {
  const maximum = maxValue ?? Math.max(1, ...items.map((item) => Number(item.value ?? 0)))

  return (
    <Card
      title={title}
      subtitle={subtitle}
      className="min-h-[320px]"
      footer={footer ?? `Showing ${items.length} ranked items`}
      body={items.length ? (
          <ol className="flex h-full flex-col justify-between gap-3">
            {items.map((item, index) => (
              <li key={item.id ?? item.name} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3">
                <span className="text-xs font-medium text-slate-400 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-700">{item.name}</span>
                    <span className="shrink-0 text-slate-600 tabular-nums">{formatValue(item.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (Number(item.value ?? 0) / maximum) * 100)}%` }} />
                  </div>
                </div>
                {item.change !== undefined ? <DeltaChip value={item.change} goodDirection={item.goodDirection ?? 'up'} /> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-slate-500">No ranked results for this period.</p>
        )
      }
    />
  )
}

export function MetricsTable({ title, subtitle, rows = [], footer }) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      className="min-h-[320px]"
      footer={footer ?? 'Period-over-period comparison'}
      body={(
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EEF1F6] text-slate-500">
                <th className="py-2 pr-3 font-medium">Metric</th>
                <th className="px-3 py-2 text-right font-medium">This period</th>
                <th className="px-3 py-2 text-right font-medium">Previous</th>
                <th className="py-2 pl-3 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.metric} className="border-b border-[#EEF1F6] last:border-0">
                  <th scope="row" className="py-3 pr-3 font-medium text-slate-700">{row.metric}</th>
                  <td className="px-3 py-3 text-right text-slate-900 tabular-nums">{row.current}</td>
                  <td className="px-3 py-3 text-right text-slate-500 tabular-nums">{row.previous}</td>
                  <td className="py-3 pl-3 text-right">
                    <DeltaChip value={row.change} goodDirection={row.goodDirection ?? 'up'} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-slate-500">No metrics available for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    />
  )
}

export function StatusCard({
  title,
  count,
  countTone,
  items = [],
  footer,
  emptyMessage = 'All clear. No active items need attention.',
}) {
  return (
    <Card
      title={title}
      icon={<Badge tone={countTone ?? (Number(count) > 0 ? 'warning' : 'positive')}>{count}</Badge>}
      className="min-h-[240px]"
      footer={footer ?? 'Status updated recently'}
      body={items.length ? (
          <ul className="flex h-full flex-col justify-between gap-3">
            {items.map((item) => (
              <li key={item.id ?? item.title ?? item.label} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone === 'negative' ? 'bg-red-500' : item.tone === 'positive' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800">{item.title ?? item.label}</p>
                  {item.description ? <p className="mt-1 text-xs text-slate-500">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">{emptyMessage}</p>
        )
      }
    />
  )
}

export function CardSkeleton({ title = 'Loading', rows = 3 }) {
  return (
    <Card title={title} className="min-h-[240px]">
      <div aria-label={`${title} loading`} className="flex h-full flex-col justify-between gap-4" role="status">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
            <span className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
            <span className="h-3 w-12 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </Card>
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

export function DataTable({ columns, rows, loading = false, onSearch, query, toolbarActions, emptyMessage = 'No records found.' }) {
  const [searchText, setSearchText] = useState('')
  const [sortKey, setSortKey] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')
  const [page, setPage] = useState(0)
  const pageSize = 10
  const numericKeys = new Set(['amount', 'cost', 'price', 'quantity', 'stock', 'stock_quantity', 'reorder_level', 'total', 'total_amount', 'unit_price'])
  const activeSearch = query || searchText
  const filteredRows = useMemo(() => {
    const normalizedSearch = String(activeSearch ?? '').trim().toLocaleLowerCase()
    const matchingRows = rows.filter((row) => (
      !normalizedSearch || columns.some((column) => (
        String(row[column.key] ?? '').toLocaleLowerCase().includes(normalizedSearch)
      ))
    ))

    if (!sortKey) return matchingRows

    const direction = sortDirection === 'asc' ? 1 : -1
    return [...matchingRows].sort((left, right) => {
      const leftValue = left[sortKey]
      const rightValue = right[sortKey]
      if (leftValue == null || rightValue == null) {
        return leftValue == null ? (rightValue == null ? 0 : -direction) : direction
      }

      const leftNumber = Number(leftValue)
      const rightNumber = Number(rightValue)
      const comparison = String(leftValue).trim() !== '' && String(rightValue).trim() !== ''
        && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' })
      return comparison * direction
    })
  }, [activeSearch, columns, rows, sortDirection, sortKey])
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleRows = filteredRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-[#E6EAF2] bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-[#EEF1F6] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={activeSearch}
            onChange={(event) => {
              const value = event.target.value
              setSearchText(value)
              setPage(0)
              onSearch?.(value)
            }}
            placeholder="Search records"
            aria-label="Search records"
            className="min-h-10 w-full rounded-lg border border-[#E6EAF2] bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SelectInput
            aria-label="Sort by"
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value)
              setPage(0)
            }}
            className="sm:w-40"
          >
            <option value="">Sort by</option>
            {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
          </SelectInput>
          <SelectInput
            aria-label="Sort direction"
            value={sortDirection}
            onChange={(event) => {
              setSortDirection(event.target.value)
              setPage(0)
            }}
            disabled={!sortKey}
            className="sm:w-36"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </SelectInput>
          {toolbarActions}
        </div>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#F8FAFC] text-xs text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`h-11 border-b border-[#EEF1F6] px-4 text-xs font-medium ${column.align === 'right' || column.numeric || numericKeys.has(column.key) ? 'text-right' : 'text-left'}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }, (_, rowIndex) => (
                <tr key={`loading-${rowIndex}`} aria-hidden="true">
                  {columns.map((column, columnIndex) => (
                    <td key={column.key} className="h-11 border-b border-[#EEF1F6] px-4">
                      <span className={`block h-3 animate-pulse rounded bg-slate-100 ${columnIndex === 0 ? 'w-3/4' : 'w-1/2'}`} />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleRows.length ? (
              visibleRows.map((row) => (
                <tr key={row.id ?? row.name} className="border-b border-[#EEF1F6] hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={`${row.id ?? row.name}-${column.key}`} className={`h-11 border-b border-[#EEF1F6] px-4 align-middle text-sm text-slate-700 ${column.align === 'right' || column.numeric || numericKeys.has(column.key) ? 'text-right tabular-nums' : 'text-left'}`}>
                      {typeof column.render === 'function' ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-32 px-4 text-center text-xs text-slate-500">
                {activeSearch ? 'No records match your search.' : emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex min-h-12 items-center justify-between gap-3 border-t border-[#EEF1F6] px-4 py-2 text-xs text-slate-500">
        <span className="tabular-nums">{loading ? 'Loading records…' : `Showing ${filteredRows.length ? currentPage * pageSize + 1 : 0}–${Math.min((currentPage + 1) * pageSize, filteredRows.length)} of ${filteredRows.length.toLocaleString()} records`}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous page" disabled={loading || currentPage === 0} onClick={() => setPage(currentPage - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6EAF2] text-slate-400 disabled:cursor-not-allowed">
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="whitespace-nowrap font-medium text-slate-600">{currentPage + 1} of {pageCount} pages</span>
          <button type="button" aria-label="Next page" disabled={loading || currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6EAF2] text-slate-400 disabled:cursor-not-allowed">
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  )
}

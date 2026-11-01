import { ArrowDownRight, CalendarRange, ChevronRight, PiggyBank, TrendingUp, Wallet, Flame } from 'lucide-react' // eslint-disable-line no-unused-vars
import { Card, Input, Select } from './ui'
import { PERIODS, cn, money, moneyK } from '../lib/utils'

/* ---------- Period selector (with custom range) ---------- */
export function PeriodSelect({ value, onChange, custom, onCustomChange, className, compact }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <CalendarRange className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-teal" />
        <Select aria-label="Period" value={value} onChange={(e) => onChange(e.target.value)} className={cn('!pl-10 font-semibold sm:w-48', compact && '!h-10')}>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </div>
      {value === 'custom' && (
        <div className="anim-pop flex w-full items-center gap-2 sm:w-auto">
          <Input type="date" aria-label="Start date" value={custom.start || ''} onChange={(e) => onCustomChange({ ...custom, start: e.target.value })} className={cn('min-w-0 flex-1 sm:w-40', compact && '!h-10')} />
          <span className="text-xs text-faint">to</span>
          <Input type="date" aria-label="End date" value={custom.end || ''} onChange={(e) => onCustomChange({ ...custom, end: e.target.value })} className={cn('min-w-0 flex-1 sm:w-40', compact && '!h-10')} />
        </div>
      )}
    </div>
  )
}

/* ---------- 4 summary cards ---------- */
const STAT = {
  income: { label: 'Total income', short: 'Income', icon: TrendingUp, tone: 'inc' },
  expense: { label: 'Total expense', short: 'Expense', icon: ArrowDownRight, tone: 'exp' },
  investments: { label: 'Total investments', short: 'Invested', icon: Wallet, tone: 'inv' },
  net: { label: 'Net balance', short: 'Net', icon: PiggyBank, tone: 'net' },
}
const toneCls = {
  inc: { dot: 'bg-inc', text: 'text-inc' },
  exp: { dot: 'bg-exp', text: 'text-exp' },
  inv: { dot: 'bg-inv', text: 'text-inv' },
  net: { dot: 'bg-net', text: 'text-net' },
}

/** onSelect(key) makes each card a button that opens its details */
export function StatCards({ t, notes = {}, className, onSelect }) {
  return (
    <div className={cn('anim-rise grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4', className)}>
      {Object.entries(STAT).map(([key, s]) => {
        const c = toneCls[s.tone]
        const v = t[key]
        return (
          <Card key={key}
            {...(onSelect ? { role: 'button', tabIndex: 0, 'aria-label': `${s.label} details`, onClick: () => onSelect(key), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(key) } } } : {})}
            className={cn('relative overflow-hidden p-3.5 sm:p-5',
              onSelect && 'group cursor-pointer transition-colors hover:border-[color-mix(in_srgb,var(--fg)_22%,var(--line))] focus-visible:ring-2 focus-visible:ring-teal focus-visible:outline-none')}>
            {onSelect && <ChevronRight className="absolute right-3 bottom-3 size-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-fg" />}
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-medium text-muted sm:text-[13px]">
                <i className={cn('size-2 shrink-0 rounded-full', c.dot)} aria-hidden="true" />
                <span className="truncate"><span className="sm:hidden">{s.short}</span><span className="hidden sm:inline">{s.label}</span></span>
              </span>
            </div>
            <div className={cn('tabular mt-2 text-[20px] font-semibold tracking-tight sm:mt-2.5 sm:text-[26px]', key === 'net' && v < 0 && 'text-exp')}>
              <span className="sm:hidden">{moneyK(v)}</span><span className="hidden sm:inline">{money(v)}</span>
            </div>
            {notes[key] && <div className={cn('mt-1 truncate text-[11.5px] font-medium sm:text-[12.5px]', notes[key].tone ? toneCls[notes[key].tone]?.text : 'text-muted')}>{notes[key].text}</div>}
          </Card>
        )
      })}
    </div>
  )
}

/* ---------- Page hero ---------- */
export function PageHero({ title, subtitle, right, badge, className }) {
  return (
    <div className={cn('pt-1', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-tight font-bold tracking-tight text-fg sm:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-[13.5px] text-muted sm:text-[14px]">{subtitle}</p>}
          {badge && <div className="mt-2.5">{badge}</div>}
        </div>
        {right && <div className="relative flex flex-wrap items-center gap-2">{right}</div>}
      </div>
    </div>
  )
}

export function StreakBadge({ text }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2.5 py-0.5 text-[12px] font-medium text-teal">
      <Flame className="size-3.5" /> {text}
    </span>
  )
}

/* ---------- Tooltip for Recharts ---------- */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[12.5px] shadow-glow-strong">
      {label != null && <div className="mb-1 font-semibold text-fg">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted"><span className="size-2 rounded-full" style={{ background: p.color || p.payload?.color }} />{p.name}</span>
          <span className="tabular font-semibold text-fg">{valueFormatter(p.value, p)}</span>
        </div>
      ))}
    </div>
  )
}

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '../common'
import { cn, money, moneyK, monthLabel, monthShort, monthShortYear } from '../../lib/utils'

const tick = { fill: 'var(--muted)', fontSize: 11.5 }
const yearSpan = (series) => new Set(series.map((s) => s.month.slice(0, 4))).size > 1
const mLabel = (series) => (yearSpan(series) && series.length > 6 ? monthShortYear : monthShort)

/* ---------- Income vs expense, month by month ---------- */
export function IncomeExpenseChart({ series }) {
  const fmt = mLabel(series)
  const change = (cur, prev) => (prev ? ((cur - prev) / prev) * 100 : null)
  const Delta = ({ v, goodWhenUp }) => {
    if (v == null) return <span className="text-faint">—</span>
    const up = v >= 0
    const good = goodWhenUp ? up : !up
    return <span className={good ? 'text-inc' : 'text-exp'}>{up ? '↑' : '↓'}{Math.abs(v).toFixed(0)}%</span>
  }
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-60 flex-1 sm:min-h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} barGap={4} barCategoryGap="24%" margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="month" tickFormatter={fmt} tick={tick} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickFormatter={(v) => moneyK(v)} tick={tick} axisLine={false} tickLine={false} width={52} />
            <Tooltip cursor={{ fill: 'var(--card-2)', opacity: 0.6 }} content={<ChartTooltip labelFormatter={monthLabel} />} />
            <Bar dataKey="income" name="Income" fill="var(--inc)" radius={[8, 8, 3, 3]} maxBarSize={28} />
            <Bar dataKey="expense" name="Expense" fill="var(--exp)" radius={[8, 8, 3, 3]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(series.length, 12)}, minmax(0, 1fr))` }}>
        {series.slice(-12).map((s, i, arr) => {
          const prev = i > 0 ? arr[i - 1] : series[series.length - arr.length - 1]
          return (
            <div key={s.month} className="rounded-xl bg-card-2 px-1 py-1.5 text-center text-[10.5px] leading-tight font-semibold sm:text-[11px]" title={`${monthLabel(s.month)} vs previous month`}>
              <div className="text-faint">{fmt(s.month)}</div>
              <div className="tabular mt-0.5 hidden sm:block">In <Delta v={prev ? change(s.income, prev.income) : null} goodWhenUp /></div>
              <div className="tabular">Ex <Delta v={prev ? change(s.expense, prev.expense) : null} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Expense by category donut ---------- */
export function CategoryDonut({ items, total, label = 'Spent' }) {
  const top = items.slice(0, 6)
  const rest = items.slice(6)
  const data = rest.length ? [...top, { id: 'other', name: 'Others', color: '#94a3b8', value: rest.reduce((a, x) => a + x.value, 0) }] : top
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={data.length > 1 ? 2.5 : 0} cornerRadius={6} stroke="none">
              {data.map((d) => <Cell key={d.id} fill={d.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormatter={(v) => `${money(v)} · ${total ? Math.round((v / total) * 100) : 0}%`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><div className="text-[11px] text-muted">{label}</div><div className="tabular font-display text-lg font-extrabold">{moneyK(total)}</div></div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.id} className="flex items-center gap-2.5 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-fg">{d.name}</span>
            <span className="text-[11.5px] text-faint">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            <span className="tabular w-16 text-right font-semibold text-fg">{moneyK(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Savings vs goal (goal may change over time → step line) ---------- */
export function SavingsGoalChart({ series }) {
  const fmt = mLabel(series)
  const Label = (p) => {
    const { x, y, width, value, index } = p
    const row = series[index]
    if (value == null) return null
    const hit = row.goal != null && row.savings >= row.goal
    return <text x={x + width / 2} y={value >= 0 ? y - 6 : y + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={row.goal == null ? 'var(--muted)' : hit ? 'var(--inc)' : 'var(--warn)'}>{moneyK(value)}</text>
  }
  return (
    <div className="h-60 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 22, right: 6, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="month" tickFormatter={fmt} tick={tick} axisLine={false} tickLine={false} interval={0} />
          <YAxis tickFormatter={(v) => moneyK(v)} tick={tick} axisLine={false} tickLine={false} width={52} />
          <Tooltip cursor={{ fill: 'var(--card-2)', opacity: 0.6 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const r = payload[0].payload
              const hit = r.goal != null && r.savings >= r.goal
              return (
                <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[12.5px] shadow-glow-strong">
                  <div className="mb-1 font-semibold">{monthLabel(label)}</div>
                  <div className="flex justify-between gap-4"><span className="text-muted">Saved</span><b className="tabular">{money(r.savings)}</b></div>
                  <div className="flex justify-between gap-4"><span className="text-muted">Goal</span><b className="tabular">{r.goal != null ? money(r.goal) : '—'}</b></div>
                  {r.goal != null && <div className={cn('mt-1 font-semibold', hit ? 'text-inc' : 'text-warn')}>{hit ? 'Goal hit 🎉' : `${money(r.goal - r.savings)} short`}</div>}
                </div>
              )
            }} />
          <Bar dataKey="savings" name="Saved" radius={[9, 9, 4, 4]} maxBarSize={38}>
            {series.map((r) => <Cell key={r.month} fill={r.goal == null ? 'var(--net)' : r.savings >= r.goal ? 'var(--inc)' : 'var(--warn)'} />)}
            <LabelList dataKey="savings" content={<Label />} />
          </Bar>
          <Line dataKey="goal" name="Goal" type="step" stroke="var(--violet)" strokeWidth={2.2} strokeDasharray="6 5" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------- Investments ---------- */
export function AllocationPie({ items }) {
  const total = items.reduce((a, x) => a + x.value, 0)
  return <CategoryDonut items={items} total={total} label="Invested" />
}

export function ReturnsBar({ items }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" tickFormatter={(v) => moneyK(v)} tick={tick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ ...tick, fill: 'var(--fg)' }} axisLine={false} tickLine={false} width={92} />
          <Tooltip cursor={{ fill: 'var(--card-2)', opacity: 0.6 }} content={<ChartTooltip valueFormatter={(v, p) => `${money(v, { sign: true })} · ${(p.payload.pct ?? 0).toFixed(1)}%`} />} />
          <Bar dataKey="returns" name="Returns" radius={[4, 8, 8, 4]} maxBarSize={22}>
            {items.map((d) => <Cell key={d.name} fill={d.returns >= 0 ? 'var(--inc)' : 'var(--exp)'} />)}
            <LabelList dataKey="pct" position="right" formatter={(v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`} style={{ fill: 'var(--muted)', fontSize: 11, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

import { findCategory, isBudgetExpense } from '../lib/finance'
import { cn, fmtDateShort, fromISO, inRange, money, monthLabel, round2, sum, toISO, todayISO } from '../lib/utils'

const DAY = 86400000

/** The period just before `range`, month-aligned when the range is whole months */
export function previousRange(range) {
  if (!range?.start || !range?.end) return null
  const s = fromISO(range.start), e = fromISO(range.end)
  const wholeMonths = s.getDate() === 1 && new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1).getDate() === 1
  if (wholeMonths) {
    const n = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
    const ps = new Date(s.getFullYear(), s.getMonth() - n, 1)
    const pe = new Date(s.getFullYear(), s.getMonth(), 0)
    return { start: toISO(ps), end: toISO(pe), label: n === 1 ? monthLabel(toISO(ps).slice(0, 7)).split(' ')[0] : 'the period before' }
  }
  const len = Math.round((e - s) / DAY) + 1
  return { start: toISO(new Date(s.getTime() - len * DAY)), end: toISO(new Date(s.getTime() - DAY)), label: 'the period before' }
}

/**
 * Fills the space under "Where your money went" with real facts about the period:
 * the biggest single expense, the daily average, the change vs the period before,
 * and which categories moved the most.
 */
export default function SpendInsights({ data, range, period }) {
  const cur = data.transactions.filter((t) => isBudgetExpense(t) && inRange(t.date, range))
  if (!cur.length) return null
  const total = sum(cur, (t) => t.amount)
  const biggest = [...cur].sort((a, b) => b.amount - a.amount)[0]

  // Days counted for the average: up to today when the period is still running
  const end = range.end > todayISO() ? todayISO() : range.end
  const start = range.start || cur.reduce((m, t) => (t.date < m ? t.date : m), cur[0].date)
  const days = Math.max(1, Math.round((fromISO(end) - fromISO(start)) / DAY) + 1)

  const prev = period === 'all' ? null : previousRange(range)
  const prevTx = prev ? data.transactions.filter((t) => isBudgetExpense(t) && inRange(t.date, prev)) : []
  const prevTotal = sum(prevTx, (t) => t.amount)
  const change = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null

  const byCat = (list) => list.reduce((m, t) => m.set(t.categoryId, (m.get(t.categoryId) || 0) + t.amount), new Map())
  const a = byCat(cur), b = byCat(prevTx)
  const movers = prev && prevTx.length
    ? [...new Set([...a.keys(), ...b.keys()])]
        .map((id) => ({ id, name: findCategory(data, id).name, diff: round2((a.get(id) || 0) - (b.get(id) || 0)) }))
        .filter((m) => Math.abs(m.diff) >= 1)
        .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
        .slice(0, 3)
    : []

  const Fact = ({ label, value, sub, tone }) => (
    <div className="min-w-0">
      <div className="text-[12px] text-muted">{label}</div>
      <div className={cn('truncate text-[15px] font-semibold', tone)}>{value}</div>
      <div className="truncate text-[12px] text-muted">{sub}</div>
    </div>
  )

  return (
    <div className="mt-5 space-y-4 border-t border-line pt-4">
      <div className="grid grid-cols-3 gap-3">
        <Fact label="Biggest expense" value={money(biggest.amount)} sub={`${biggest.description || findCategory(data, biggest.categoryId).name} · ${fmtDateShort(biggest.date)}`} />
        <Fact label="Daily average" value={money(Math.round(total / days))} sub={`${days} day${days === 1 ? '' : 's'}`} />
        {change != null
          ? <Fact label={`vs ${prev.label}`} value={`${change >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(change))}%`} sub={`${total - prevTotal >= 0 ? '+' : '−'}${money(Math.abs(total - prevTotal))}`} tone={change > 0 ? 'text-exp' : 'text-inc'} />
          : <Fact label="Entries" value={String(cur.length)} sub={`${new Set(cur.map((t) => t.categoryId)).size} categories`} />}
      </div>
      {movers.length > 0 && (
        <div>
          <div className="mb-1.5 text-[12px] text-muted">Biggest changes vs {prev.label}</div>
          <ul className="divide-y divide-line">
            {movers.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5 text-[13px]">
                <span className="truncate text-fg">{m.name}</span>
                <span className={cn('font-semibold', m.diff > 0 ? 'text-exp' : 'text-inc')}>{m.diff > 0 ? '+' : '−'}{money(Math.abs(m.diff))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

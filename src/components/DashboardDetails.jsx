import { useEffect, useState } from 'react'
import { ArrowDownRight, ChevronDown, FileSpreadsheet, FileText, Scale, TrendingUp, Wallet } from 'lucide-react'
import { Button, Dialog, EmptyState } from './ui'
import { CategoryBubble } from './Icon'
import MonthlyBalance from './MonthlyBalance'
import { txnSubtitle, txnTitle } from './TransactionList'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { earliestDate, findCategory, isBudgetExpense, monthlyBalance, sortTxns } from '../lib/finance'
import { invCategoryColor } from '../lib/constants'
import { exportExcel, exportPdf } from '../lib/export'
import { cn, fmtDateShort, money, monthKeyOf, monthKeysBetween, monthLabel, round2, sum, todayISO } from '../lib/utils'

const KIND = {
  income: { title: 'Income details', icon: TrendingUp, tone: 'text-inc', sign: '+' },
  expense: { title: 'Expense details', icon: ArrowDownRight, tone: 'text-exp', sign: '−' },
  investments: { title: 'Investment details', icon: Wallet, tone: 'text-inv', sign: '' },
}

/**
 * Tap Total income / Total expense / Total investments: where the money came from or went,
 * grouped by category (investments by holding), each group expandable to its dated entries.
 */
export function BreakdownDialog({ kind, onOpenChange, txns, range }) {
  const { data } = useData()
  const [openGroup, setOpenGroup] = useState(null)
  useEffect(() => { setOpenGroup(null) }, [kind])
  if (!kind) return <Dialog open={false} onOpenChange={onOpenChange} title="" />
  const K = KIND[kind]
  const list = txns.filter((t) => (kind === 'income' ? t.type === 'income' : kind === 'expense' ? isBudgetExpense(t) : true))
  const groups = new Map()
  for (const t of list) {
    let key, name, color, icon
    if (kind === 'investments') {
      const inv = data.investments.find((i) => i.id === t.investmentId)
      key = t.investmentId || t.subcategory || 'other'
      name = inv?.name || t.description || t.subcategory || 'Investment'
      color = invCategoryColor(inv?.category || 'Custom')
      icon = 'TrendingUp'
    } else {
      const c = findCategory(data, t.categoryId)
      key = t.categoryId || 'none'; name = c.name; color = c.color; icon = c.icon
    }
    if (!groups.has(key)) groups.set(key, { key, name, color, icon, total: 0, items: [], sub: kind === 'investments' ? data.investments.find((i) => i.id === t.investmentId)?.category : '' })
    const g = groups.get(key)
    g.total += t.amount
    g.items.push(t)
  }
  const rows = [...groups.values()].map((g) => ({ ...g, total: round2(g.total), items: sortTxns(g.items) })).sort((a, b) => b.total - a.total)
  const total = round2(sum(list, (t) => t.amount))
  const periodText = kind === 'investments' ? `All time up to ${fmtDateShort(range.end)} ${range.end.slice(0, 4)}` : range.label

  return (
    <Dialog open={!!kind} onOpenChange={onOpenChange} size="lg" icon={K.icon} title={K.title}
      description={`${periodText} · ${money(total)} · ${list.length} entr${list.length === 1 ? 'y' : 'ies'}`}>
      {rows.length ? (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {rows.map((g) => {
            const open = openGroup === g.key
            return (
              <div key={g.key}>
                <button type="button" onClick={() => setOpenGroup(open ? null : g.key)} aria-expanded={open}
                  className={cn('flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition hover:bg-card-2', open && 'bg-card-2')}>
                  <CategoryBubble icon={g.icon} color={g.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-fg">{g.name}</span>
                    <span className="block text-[12px] text-muted">{g.sub ? `${g.sub} · ` : ''}{g.items.length} entr{g.items.length === 1 ? 'y' : 'ies'} · {total ? Math.round((g.total / total) * 100) : 0}%</span>
                  </span>
                  <span className={cn('tabular text-[14px] font-bold', K.tone)}>{K.sign}{money(g.total)}</span>
                  <ChevronDown className={cn('size-4 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
                </button>
                <div className="h-1 bg-card-2"><div className="h-1" style={{ width: `${total ? (g.total / total) * 100 : 0}%`, background: g.color }} /></div>
                {open && (
                  <div className="anim-pop divide-y divide-line bg-card-2/50">
                    {g.items.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 py-2.5 pr-3.5 pl-14 text-[13px]">
                        <span className="w-14 shrink-0 font-semibold text-faint">{fmtDateShort(t.date)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fg">{txnTitle(data, t)}</span>
                          <span className="block truncate text-[11.5px] text-muted">{txnSubtitle(data, t)}</span>
                        </span>
                        <span className="tabular font-semibold text-fg">{money(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : <EmptyState icon={K.icon} title="Nothing in this period" text="Try another period on the dashboard." />}
    </Dialog>
  )
}

/** Tap Net balance: lifetime month-by-month balance, with Excel/PDF export */
export function NetBalanceDialog({ open, onOpenChange }) {
  const { data } = useData()
  const toast = useToast()
  const first = earliestDate(data)
  const months = first ? monthKeysBetween(`${first.slice(0, 7)}-01`, todayISO()) : [monthKeyOf(new Date())]
  const rows = monthlyBalance(data.transactions, months)
  const last = rows.at(-1)

  const report = () => ({
    title: 'Monthly balance', subtitle: `${monthLabel(months[0])} – ${monthLabel(months.at(-1))}`, fileName: 'FinTrack-monthly-balance', sheetName: 'Monthly balance',
    summary: [['Net balance now', money(last?.running ?? 0)], ['Total income', money(sum(rows, (r) => r.income))], ['Total expense', money(sum(rows, (r) => r.expense))], ['Total invested', money(sum(rows, (r) => r.investments))], ['Total in buckets', money(sum(rows, (r) => r.bucket))], ['Months', String(rows.length)]],
    columns: [
      { header: 'Month', key: 'month', width: 16 }, { header: 'Income', key: 'income', width: 13, money: true }, { header: 'Expense', key: 'expense', width: 13, money: true },
      { header: 'Invested', key: 'investments', width: 13, money: true }, { header: 'Bucket', key: 'bucket', width: 13, money: true },
      { header: 'Left this month', key: 'left', width: 15, money: true }, { header: 'Net balance', key: 'running', width: 15, money: true },
    ],
    rows: rows.map((r) => ({ ...r, month: monthLabel(r.month) })),
  })
  const run = async (fn, label) => {
    try { await fn(report()); toast(`${label} downloaded`) } catch (e) { console.error(e); toast("Couldn't create the file. Try again.", 'error') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="xl" icon={Scale} title="Monthly balance"
      description={`Every month since you started · net balance ${money(last?.running ?? 0)}`}
      footer={<>
        <Button variant="secondary" onClick={() => run(exportExcel, 'Excel')}><FileSpreadsheet className="size-4" />Export Excel</Button>
        <Button variant="secondary" onClick={() => run(exportPdf, 'PDF')}><FileText className="size-4" />Export PDF</Button>
        <Button variant="primary" onClick={() => onOpenChange(false)}>Done</Button>
      </>}>
      {data.transactions.length ? <MonthlyBalance txns={data.transactions} months={months} plain /> : <EmptyState icon={Scale} title="No months to show yet" text="Add your first income or expense and your monthly balance starts here." />}
    </Dialog>
  )
}

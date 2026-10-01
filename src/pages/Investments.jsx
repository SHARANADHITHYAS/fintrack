import { useMemo, useState } from 'react'
import { BarChart3, ChartPie, Download, LineChart, MoreVertical, Pause, Pencil, Play, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp, Wallet, Coins, Percent, Sprout } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Menu, Segmented } from '../components/ui'
import { PageHero } from '../components/common'
import { AllocationPie, ReturnsBar } from '../components/charts'
import { InvestmentForm, UpdateValueDialog } from '../components/InvestmentForm'
import ExportDialog from '../components/ExportDialog'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { accountName, earliestDate, investmentStats } from '../lib/finance'
import { invCategoryColor, modeLabel } from '../lib/constants'
import { lineFor } from '../lib/greetings'
import { cn, fmtDate, fmtDMY, inRange, money, pct, round2, sum } from '../lib/utils'

function Stat({ label, value, sub, tone, icon: I }) {
  const t = { inv: 'bg-inv-soft text-inv before:bg-inv', net: 'bg-net-soft text-net before:bg-net', inc: 'bg-inc-soft text-inc before:bg-inc', exp: 'bg-exp-soft text-exp before:bg-exp' }[tone]
  return (
    <Card className={cn('relative overflow-hidden p-3.5 before:absolute before:inset-x-0 before:top-0 before:h-[2px] sm:p-5', t?.split(' ').find((c) => c.startsWith('before:')))}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-semibold text-muted sm:text-[13px]">{label}</span>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl sm:size-10', t?.split(' ').filter((c) => !c.startsWith('before:')).join(' '))}><I className="size-4 sm:size-5" /></span>
      </div>
      <div className={cn('tabular mt-2 font-display text-[19px] font-extrabold tracking-tight sm:mt-3 sm:text-[26px]', tone === 'inc' && 'text-inc', tone === 'exp' && 'text-exp')}>{value}</div>
      {sub && <div className="mt-1 truncate text-[11.5px] font-medium text-muted sm:text-[12.5px]">{sub}</div>}
    </Card>
  )
}

function Holding({ inv, s, onEdit, onValue, onDelete }) {
  const { data, setSipStatus } = useData()
  const toast = useToast()
  const color = invCategoryColor(inv.category)
  const up = s.returns >= 0
  const statusTone = { active: 'inc', stopped: 'warn', completed: 'net' }[s.status]
  const statusLabel = inv.type === 'lumpsum' ? 'Holding' : { active: 'Active', stopped: 'Stopped', completed: 'Completed' }[s.status]
  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}><Sprout className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-bold text-fg">{inv.name}</div>
          <div className="truncate text-[12px] text-muted">{inv.category}{inv.mode ? ` · ${modeLabel(inv.mode)}${inv.accountId ? ` · ${accountName(data, inv.mode, inv.accountId)}` : ''}` : ''}</div>
        </div>
        <Menu trigger={<Button variant="ghost" size="icon-sm" aria-label="Investment actions"><MoreVertical className="size-4" /></Button>}
          items={[
            { label: 'Update current value', icon: RefreshCw, onSelect: onValue },
            { label: 'Edit', icon: Pencil, onSelect: onEdit },
            inv.type === 'sip' && s.status !== 'completed' && (inv.status === 'stopped'
              ? { label: 'Resume SIP', icon: Play, onSelect: () => { setSipStatus(inv.id, 'active'); toast('SIP resumed. Back on track!') } }
              : { label: 'Stop SIP', icon: Pause, onSelect: () => { setSipStatus(inv.id, 'stopped'); toast('SIP stopped. No new installments will post.', 'info') } }),
            { label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
          ]} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="violet">{inv.type === 'sip' ? 'SIP' : 'Lumpsum'}</Badge>
        <Badge tone={inv.type === 'lumpsum' ? 'teal' : statusTone}>{statusLabel}</Badge>
        <span className="ml-auto text-[11.5px] font-medium text-faint">Started: {fmtDMY(inv.startDate)}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div><div className="text-[11.5px] text-muted">Invested</div><div className="tabular text-[15px] font-bold text-fg">{money(s.invested)}</div></div>
        <div><div className="text-[11.5px] text-muted">Current value</div><div className="tabular text-[15px] font-bold text-fg">{money(s.current)}</div></div>
      </div>

      <div className={cn('mt-3 flex items-center justify-between rounded-2xl px-3.5 py-2.5', up ? 'bg-inc-soft text-inc' : 'bg-exp-soft text-exp')}>
        <span className="tabular flex items-center gap-1.5 text-[14px] font-extrabold">{up ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{money(s.returns, { sign: true })}</span>
        <span className="tabular text-[14px] font-extrabold">{pct(s.returnsPct, 2)}</span>
      </div>

      <div className="mt-3 space-y-1.5 text-[12px] text-muted">
        {inv.type === 'sip' && (
          <>
            <div className="flex justify-between"><span>Installments</span><b className="text-fg">{s.count}{inv.tenureMonths ? ` of ${inv.tenureMonths}` : ' paid'}</b></div>
            {inv.tenureMonths && <div className="h-1.5 overflow-hidden rounded-full bg-card-2"><div className="h-full rounded-full bg-violet" style={{ width: `${Math.min(100, (s.count / inv.tenureMonths) * 100)}%` }} /></div>}
            <div className="flex justify-between"><span>{money(inv.amountPaid)} / month</span><span>{s.next ? <>Next: <b className="text-fg">{fmtDate(s.next)}</b></> : s.status === 'completed' ? 'All done 🎉' : 'Paused'}</span></div>
          </>
        )}
        {s.charges > 0 && <div className="flex justify-between"><span>Charges / GST paid</span><b className="text-warn">{money(s.charges)}</b></div>}
        {inv.description && <p className="truncate text-faint">{inv.description}</p>}
      </div>
      <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={onValue}><RefreshCw className="size-3.5" />Update value</Button>
    </Card>
  )
}

export default function Investments() {
  const { data, deleteInvestment } = useData()
  const toast = useToast()
  const [form, setForm] = useState({ open: false, initial: null })
  const [valueFor, setValueFor] = useState(null)
  const [del, setDel] = useState(null)
  const [filter, setFilter] = useState('all')
  const [exportOpen, setExportOpen] = useState(false)

  const rows = useMemo(() => data.investments.map((inv) => ({ inv, s: investmentStats(inv, data.transactions) })).sort((a, b) => b.s.current - a.s.current), [data])
  const shown = rows.filter((r) => filter === 'all' || r.inv.type === filter)
  const paid = sum(rows, (r) => r.s.paid), invested = sum(rows, (r) => r.s.invested), current = sum(rows, (r) => r.s.current)
  const returns = round2(current - invested)
  const byCat = Object.values(rows.reduce((m, { inv, s }) => {
    const k = inv.category
    m[k] ??= { id: k, name: k, color: invCategoryColor(k), value: 0, invested: 0, current: 0 }
    m[k].value += s.paid; m[k].invested += s.invested; m[k].current += s.current
    return m
  }, {})).map((c) => ({ ...c, value: round2(c.value), returns: round2(c.current - c.invested), pct: c.invested ? ((c.current - c.invested) / c.invested) * 100 : 0 })).sort((a, b) => b.value - a.value)
  const activeSips = rows.filter((r) => r.inv.type === 'sip' && r.s.status === 'active')
  const monthlySip = sum(activeSips, (r) => r.inv.amountPaid)

  const buildReport = (range) => {
    const r = rows.map(({ inv, s }) => {
      const inPeriod = s.linked.filter((t) => inRange(t.date, range))
      return { inv, s, periodPaid: round2(sum(inPeriod, (t) => t.amount)), periodCount: inPeriod.length }
    }).filter((x) => x.periodCount > 0 || range.start == null)
    return {
      title: 'Investments report', subtitle: range.label, fileName: `FinTrack-investments-${range.label}`, sheetName: 'Investments',
      summary: [['Amount paid (all time)', money(paid)], ['Invested', money(invested)], ['Current value', money(current)], ['Total returns', `${money(returns, { sign: true })} (${pct(invested ? (returns / invested) * 100 : 0, 2)})`], ['Paid in this period', money(sum(r, (x) => x.periodPaid))], ['Holdings', String(rows.length)]],
      columns: [
        { header: 'Name', key: 'name', width: 26 }, { header: 'Category', key: 'category', width: 14 }, { header: 'Type', key: 'type', width: 10 }, { header: 'Status', key: 'status', width: 11 },
        { header: 'Started', key: 'start', width: 13 }, { header: 'Installments', key: 'count', width: 12 }, { header: 'Paid in period', key: 'periodPaid', width: 14, money: true },
        { header: 'Invested', key: 'invested', width: 13, money: true }, { header: 'Current value', key: 'current', width: 14, money: true }, { header: 'Returns', key: 'returns', width: 13, money: true }, { header: 'Returns %', key: 'pct', width: 10 },
      ],
      rows: r.map(({ inv, s, periodPaid }) => ({
        name: inv.name, category: inv.category, type: inv.type === 'sip' ? 'SIP' : 'Lumpsum', status: inv.type === 'lumpsum' ? 'Holding' : s.status[0].toUpperCase() + s.status.slice(1),
        start: fmtDate(inv.startDate), count: inv.type === 'sip' ? `${s.count}${inv.tenureMonths ? `/${inv.tenureMonths}` : ''}` : '1', periodPaid,
        invested: s.invested, current: s.current, returns: s.returns, pct: `${s.returnsPct.toFixed(2)}%`,
      })),
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHero title="Investments" subtitle={lineFor('investments')}
        badge={activeSips.length ? <Badge tone="violet" className="!py-1 !text-[12.5px]"><LineChart className="size-3.5" />{activeSips.length} active SIP{activeSips.length > 1 ? 's' : ''} · {money(monthlySip)}/month on autopilot</Badge> : null}
        right={<>
          <Button variant="secondary" onClick={() => setExportOpen(true)}><Download className="size-4" />Export</Button>
          <Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus className="size-4" />Add investment</Button>
        </>} />

      <div className="anim-rise grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Invested cost" value={money(paid)} sub={paid !== invested ? `${money(invested)} after charges` : 'Total amount paid'} tone="inv" icon={Wallet} />
        <Stat label="Current value" value={money(current)} sub={`${rows.length} holding${rows.length === 1 ? '' : 's'}`} tone="net" icon={Coins} />
        <Stat label="Total returns" value={money(returns, { sign: true })} sub={returns >= 0 ? 'Your money is working 💪' : 'Markets dip, patience wins'} tone={returns >= 0 ? 'inc' : 'exp'} icon={returns >= 0 ? TrendingUp : TrendingDown} />
        <Stat label="Returns %" value={pct(invested ? (returns / invested) * 100 : 0, 2)} sub="On invested amount" tone={returns >= 0 ? 'inc' : 'exp'} icon={Percent} />
      </div>

      {rows.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-4 sm:p-6">
            <CardHeader icon={ChartPie} title="Where you invest the most" subtitle="Share of amount paid, by category" />
            <div className="mt-5"><AllocationPie items={byCat} /></div>
          </Card>
          <Card className="p-4 sm:p-6">
            <CardHeader icon={BarChart3} title="Returns by category" subtitle="Gain or loss on invested amount" />
            <div className="mt-4"><ReturnsBar items={byCat} /></div>
          </Card>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold">Holdings and active SIPs</h2>
          <Segmented size="sm" className="w-full sm:w-72" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'sip', label: 'SIPs' }, { value: 'lumpsum', label: 'Lumpsum' }]} />
        </div>
        {shown.length ? (
          <div className="anim-rise grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map(({ inv, s }) => (
              <Holding key={inv.id} inv={inv} s={s} onEdit={() => setForm({ open: true, initial: inv })} onValue={() => setValueFor(inv)} onDelete={() => setDel({ inv, s })} />
            ))}
          </div>
        ) : (
          <Card><EmptyState icon={Sprout} title={rows.length ? 'Nothing in this view' : 'Plant your first money tree 🌱'} text={rows.length ? 'Try another filter.' : 'Start a SIP or record a lumpsum. Even ₹500 a month grows into something big.'}
            action={!rows.length && <Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus className="size-4" />Add investment</Button>} /></Card>
        )}
      </div>

      <InvestmentForm open={form.open} onOpenChange={(o) => setForm((s) => ({ ...s, open: o }))} initial={form.initial} />
      <UpdateValueDialog open={!!valueFor} onOpenChange={(o) => !o && setValueFor(null)} inv={valueFor} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} icon={Trash2} title={`Delete “${del?.inv.name}”?`}
        points={del ? [`${del.s.count} linked transaction${del.s.count === 1 ? '' : 's'} (${money(del.s.paid)}) will be removed from Transactions too.`, 'Dashboard totals and charts update right away.'] : []}
        onConfirm={() => { deleteInvestment(del.inv.id); toast('Investment deleted', 'info') }} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} title="Export investments" defaultPeriod="all" earliest={earliestDate(data)} build={buildReport} />
    </div>
  )
}

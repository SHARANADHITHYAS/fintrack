import { useMemo, useState } from 'react'
import { Download, Plus, Search, SlidersHorizontal, X, Receipt, Upload } from 'lucide-react'
import { Button, Card, EmptyState, Input, Select, Dialog, Field } from '../components/ui'
import { PageHero, PeriodSelect, StatCards } from '../components/common'
import { GroupedTxnList, txnSubtitle, txnTitle } from '../components/TransactionList'
import ExportDialog from '../components/ExportDialog'
import ImportDialog from '../components/ImportDialog'
import { CategoryPicker } from '../components/Pickers'
import { useTxnEditor } from '../components/TxnEditor'
import { useData } from '../context/DataContext'
import { allCategories, earliestDate, filterRange, findCategory, sortTxns, totals, accountName } from '../lib/finance'
import { ALL_MODES, FRIEND_CC, modeLabel } from '../lib/constants'
import { lineFor } from '../lib/greetings'
import { fmtDate, money, periodRange } from '../lib/utils'
import { statNotes, usePeriodState } from './Dashboard'

export function txnReport(data, txns, { title, subtitle, fileName }) {
  const t = totals(txns)
  return {
    title, subtitle, fileName, sheetName: 'Transactions',
    summary: [['Total income', money(t.income)], ['Total expense', money(t.expense)], ['Total investments', money(t.investments)], ['Net balance', money(t.net)], ['Card payments (transfers)', money(t.transfers)], ['Entries', String(txns.length)]],
    columns: [
      { header: 'Date', key: 'date', width: 13 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Title', key: 'title', width: 28 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Payment mode', key: 'mode', width: 15 },
      { header: 'Account / card', key: 'account', width: 22 },
      { header: 'Amount (INR)', key: 'amount', width: 14, money: true },
      { header: 'Notes', key: 'notes', width: 30 },
    ],
    rows: txns.map((x) => {
      const c = findCategory(data, x.categoryId)
      return {
        date: fmtDate(x.date),
        type: x.type === 'transfer' ? 'Transfer' : x.type === 'bucket' ? 'Bucket' : x.type === 'income' ? 'Income' : 'Expense',
        title: txnTitle(data, x),
        category: x.type === 'bucket' ? (data.buckets || []).find((b) => b.id === x.bucketId)?.name || 'Bucket' : x.subcategory ? `${c.name} / ${x.subcategory}` : c.name,
        mode: modeLabel(x.mode),
        account: x.type === 'transfer' ? `${accountName(data, x.mode, x.accountId)} → ${x.toCardId === FRIEND_CC ? "Friend's card" : accountName(data, 'cc', x.toCardId)}` : accountName(data, x.mode, x.accountId),
        amount: x.type === 'income' || (x.type === 'bucket' && x.action === 'withdraw') ? x.amount : -x.amount,
        notes: [x.meta?.rechargeFor && `For ${x.meta.rechargeFor}`, x.meta?.friendName, x.meta?.incomeType, x.emiIndex && 'EMI installment', x.emiId && !x.emiIndex && 'Converted to EMI', x.sipIndex != null && `SIP #${x.sipIndex + 1}`].filter(Boolean).join(' · '),
      }
    }),
  }
}

export default function Transactions() {
  const { data } = useData()
  const { openNew, openEdit, dialogs } = useTxnEditor()
  const { period, setPeriod, custom, setCustom } = usePeriodState('txns')
  const [category, setCategory] = useState('all')
  const [mode, setMode] = useState('all')
  const [q, setQ] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const earliest = earliestDate(data)
  const range = periodRange(period, custom, earliest)
  const applyFilters = (list) => list.filter((t) => {
    if (category === 'type:expense' && t.type !== 'expense') return false
    else if (category === 'type:income' && t.type !== 'income') return false
    else if (category !== 'all' && !category.startsWith('type:') && t.categoryId !== category) return false
    if (mode !== 'all') {
      if (mode === 'friend') { if (t.accountId !== FRIEND_CC && t.toCardId !== FRIEND_CC) return false }
      else if (t.mode !== mode) return false
    }
    if (q.trim()) {
      const s = `${txnTitle(data, t)} ${txnSubtitle(data, t)} ${t.amount}`.toLowerCase()
      if (!s.includes(q.trim().toLowerCase())) return false
    }
    return true
  })
  const list = useMemo(() => sortTxns(applyFilters(filterRange(data.transactions, range))), [data, range.start, range.end, category, mode, q]) // eslint-disable-line react-hooks/exhaustive-deps
  const t = totals(list)
  const usedModes = ALL_MODES.filter((m) => m.value !== 'other' || data.transactions.some((x) => x.mode === 'other'))
  const filtersOn = category !== 'all' || mode !== 'all' || q
  const activeFilters = (period !== 'this-month' ? 1 : 0) + (category !== 'all' ? 1 : 0) + (mode !== 'all' ? 1 : 0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHero
        title="Transactions"
        subtitle={lineFor('transactions')}
        right={<>
          <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload className="size-4" />Import</Button>
          <Button variant="secondary" onClick={() => setExportOpen(true)}><Download className="size-4" />Export</Button>
          <Button variant="primary" onClick={() => openNew()} className="hidden md:inline-flex"><Plus className="size-4" />Record transaction</Button>
        </>}
      />

      <StatCards t={t} notes={statNotes(data, filtersOn ? null : period, t, range)} />

      {/* Phone: search plus one Filters button, so the list starts on the first screen */}
      <div className="flex gap-2 sm:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="!pl-10" aria-label="Search transactions" />
        </div>
        <Button variant="secondary" onClick={() => setFiltersOpen(true)} aria-label="Filters">
          <SlidersHorizontal className="size-4" />Filters{activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-on-primary">{activeFilters}</span>}
        </Button>
      </div>
      {filtersOn && (
        <div className="-mt-2 flex items-center justify-between gap-2 px-1 text-[12.5px] text-muted sm:hidden">
          <span><b className="text-fg">{list.length}</b> matching · {range.label}</span>
          <button className="flex cursor-pointer items-center gap-1 font-semibold text-teal" onClick={() => { setCategory('all'); setMode('all'); setQ('') }}><X className="size-3.5" />Clear</button>
        </div>
      )}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen} size="sm" icon={SlidersHorizontal} title="Filters"
        footer={<><Button variant="ghost" className="mr-auto" onClick={() => { setPeriod('this-month'); setCategory('all'); setMode('all') }}>Reset</Button><Button variant="primary" onClick={() => setFiltersOpen(false)}>Show {list.length} {list.length === 1 ? 'entry' : 'entries'}</Button></>}>
        <div className="space-y-3.5">
          <Field label="Period"><PeriodSelect value={period} onChange={setPeriod} custom={custom} onCustomChange={setCustom} className="[&>div:first-child]:w-full [&_select]:w-full" /></Field>
          <Field label="Category"><CategoryPicker filter value={category} onChange={setCategory} /></Field>
          <Field label="Payment mode">
            <Select aria-label="Payment mode filter" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="all">All payment modes</option>
              {usedModes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              <option value="friend">Friend's credit card</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      <Card className="hidden p-3 sm:block sm:p-4">
        <div className="mb-3 flex items-center gap-2 px-1 text-[13px] font-semibold text-fg"><SlidersHorizontal className="size-4 text-muted" />Filters</div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1.2fr]">
          <PeriodSelect value={period} onChange={setPeriod} custom={custom} onCustomChange={setCustom} className="sm:col-span-2 lg:col-span-1 [&_select]:w-full lg:[&_select]:w-48" />
          <CategoryPicker filter value={category} onChange={setCategory} />
          <Select aria-label="Payment mode filter" value={mode} onChange={(e) => setMode(e.target.value)} className="font-semibold">
            <option value="all">All payment modes</option>
            {usedModes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            <option value="friend">Friend's credit card</option>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, account, amount…" className="!pl-10" aria-label="Search transactions" />
          </div>
        </div>
        {filtersOn && (
          <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[12.5px] text-muted">
            <span><b className="text-fg">{list.length}</b> matching {list.length === 1 ? 'entry' : 'entries'}</span>
            <button className="flex cursor-pointer items-center gap-1 font-semibold text-teal hover:underline" onClick={() => { setCategory('all'); setMode('all'); setQ('') }}><X className="size-3.5" />Clear filters</button>
          </div>
        )}
      </Card>

      {list.length ? (
        <GroupedTxnList txns={list} onEdit={openEdit} />
      ) : (
        <Card>
          <EmptyState icon={Receipt}
            title={data.transactions.length ? 'Nothing matches these filters' : 'Your money story starts here'}
            text={data.transactions.length ? 'Try another period or clear the filters.' : 'Record your first income or expense. It takes two seconds, and it feels great.'}
            action={<Button variant="primary" onClick={() => openNew()}><Plus className="size-4" />Record transaction</Button>} />
        </Card>
      )}

      {/* Mobile floating action button */}
      <button onClick={() => openNew()} aria-label="Record transaction"
        className="fixed right-4 bottom-24 z-30 grid size-14 cursor-pointer place-items-center rounded-full bg-primary text-on-primary shadow-glow-strong transition active:scale-95 md:hidden">
        <Plus className="size-6" />
      </button>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} title="Export transactions" defaultPeriod={period} defaultCustom={custom} earliest={earliest}
        build={(r) => txnReport(data, sortTxns(applyFilters(filterRange(data.transactions, r))), { title: 'Transactions statement', subtitle: r.label, fileName: `FinTrack-transactions-${r.label}` })} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      {dialogs}
    </div>
  )
}

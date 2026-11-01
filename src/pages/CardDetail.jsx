import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Download, HandCoins, MoreVertical, Pencil, Plus, Receipt, Trash2, Wallet, Gauge, ShoppingCart, Upload } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Menu, Select } from '../components/ui'
import { CardFormDialog, CardVisual } from '../components/CardParts'
import { TxnRow } from '../components/TransactionList'
import { useTxnEditor } from '../components/TxnEditor'
import ExportDialog from '../components/ExportDialog'
import ImportDialog from '../components/ImportDialog'
import { MiniStat } from './Cards'
import { txnReport } from './Transactions'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { cardStats, filterRange, earliestDate } from '../lib/finance'
import { CAT, CARD_STATUSES } from '../lib/constants'
import { cn, fmtDate, money } from '../lib/utils'

export default function CardDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, setCardStatus, deleteCard, deleteEmi } = useData()
  const toast = useToast()
  const { openNew, openEdit, dialogs } = useTxnEditor()
  const [edit, setEdit] = useState(false)
  const [del, setDel] = useState(false)
  const [delEmi, setDelEmi] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const card = data.cards.find((c) => c.id === id)

  if (!card) {
    return <Card><EmptyState icon={Wallet} title="This card isn't here anymore" text="It may have been deleted." action={<Button variant="primary" onClick={() => nav('/cards')}>Back to cards</Button>} /></Card>
  }
  const s = cardStats(card, data)
  const payBill = () => openNew({ type: 'expense', categoryId: CAT.CC_PAYMENT, toCardId: card.id })
  const addTxn = () => openNew({ type: 'expense', mode: 'cc', accountId: card.id })

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/cards" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-fg"><ArrowLeft className="size-4" />All cards</Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}><Upload className="size-4" /><span className="hidden sm:inline">Import</span></Button>
          <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}><Download className="size-4" /><span className="hidden sm:inline">Export statement</span></Button>
          <Menu trigger={<Button variant="secondary" size="icon" className="!size-9" aria-label="Card actions"><MoreVertical className="size-4" /></Button>}
            items={[{ label: 'Edit card', icon: Pencil, onSelect: () => setEdit(true) }, { label: 'Delete card', icon: Trash2, danger: true, onSelect: () => setDel(true) }]} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <CardVisual card={card} stats={s} className="min-h-56" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={payBill}><HandCoins className="size-4" />Pay bill</Button>
            <Button variant="secondary" onClick={addTxn}><Plus className="size-4" />Add transaction</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Outstanding" value={money(s.outstanding)} icon={Receipt} tone="exp" sub={`${Math.round(s.usedPct)}% of limit used`} />
            <MiniStat label="Available" value={money(s.available)} icon={Gauge} tone="inc" sub={`Limit ${money(s.limit)}`} />
            <MiniStat label="Spent this cycle" value={money(s.cycleSpend)} icon={ShoppingCart} tone="net" sub={`Next bill ${fmtDate(s.nextBill)}`} />
            <MiniStat label="Monthly EMIs" value={money(s.monthlyEmi)} icon={CalendarClock} tone="violet" sub={`${s.activeEmis.length} active plan${s.activeEmis.length === 1 ? '' : 's'}`} />
          </div>
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Field label="Bill status" hint="Updates automatically when you record a bill payment." className="sm:w-64">
                <Select value={card.status || 'unpaid'} onChange={(e) => { setCardStatus(card.id, e.target.value); toast('Bill status updated') }}>
                  {CARD_STATUSES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </Select>
              </Field>
              <p className="text-[12.5px] text-muted sm:text-right">Total paid so far <b className="text-fg">{money(s.paidTotal)}</b><br />Total charged <b className="text-fg">{money(s.spent)}</b></p>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <CardHeader icon={CalendarClock} title="EMIs on this card" subtitle="Turn a card purchase into EMIs from Record transaction → Convert to EMI."
          action={<Button variant="soft" size="sm" onClick={addTxn}><Plus className="size-4" />New EMI purchase</Button>} />
        {s.plans.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {s.plans.map(({ plan, emi, paid, remaining, next, done, total }) => (
              <div key={plan.id} className={cn('rounded-2xl border border-line bg-card-2 p-4', done && 'opacity-70')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-fg">{plan.itemName}</div>
                    <div className="text-[12px] text-muted">{money(plan.principal)} · {plan.annualRate ? `${plan.annualRate}% p.a.` : 'No-cost EMI'}{plan.fee ? ` · fee ${money(plan.fee)}` : ''}</div>
                  </div>
                  {done ? <Badge tone="inc">Completed</Badge> : <Badge tone="violet">{money(emi)}/mo</Badge>}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-teal" style={{ width: `${(paid / plan.tenure) * 100}%` }} /></div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[12px] text-muted">
                  <span><b className="text-fg">{remaining}</b> of {plan.tenure} months remaining</span>
                  <span>{next ? <>Next: <b className="text-fg">{fmtDate(next)}</b></> : `Total ${money(total)}`}</span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-exp" onClick={() => setDelEmi(plan)}><Trash2 className="size-3.5" />Delete EMI</Button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState className="py-7" icon={CalendarClock} title="No EMIs on this card" text="Big purchase coming up? Convert it to EMIs and we'll post every installment for you." />}
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold">Card transactions</h2>
          <span className="text-[12.5px] text-muted">{s.txns.length} entr{s.txns.length === 1 ? 'y' : 'ies'} · synced with Transactions</span>
        </div>
        {s.txns.length ? (
          <div className="divide-y divide-line overflow-hidden rounded-3xl bg-card shadow-glow">
            {s.txns.map((t) => <TxnRow key={t.id} t={t} onEdit={openEdit} />)}
          </div>
        ) : <Card><EmptyState icon={Receipt} title="No transactions on this card yet" text="Spends and bill payments on this card show up here and in Transactions." action={<Button variant="primary" onClick={addTxn}><Plus className="size-4" />Add transaction</Button>} /></Card>}
      </div>

      <CardFormDialog open={edit} onOpenChange={setEdit} initial={card} />
      <ConfirmDialog open={del} onOpenChange={setDel} icon={Trash2} title={`Delete ${card.name}?`}
        points={[`Its ${s.txns.length} transactions stay in Transactions, marked as a removed card.`, s.plans.length ? `${s.plans.length} EMI plan(s) on this card will be removed.` : 'No EMI plans on this card.']}
        onConfirm={() => { deleteCard(card.id); toast('Card deleted', 'info'); nav('/cards') }} />
      <ConfirmDialog open={!!delEmi} onOpenChange={(o) => !o && setDelEmi(null)} icon={Trash2} title={`Delete EMI “${delEmi?.itemName}”?`}
        points={delEmi ? [`The EMI plan, its installments and the original ${money(delEmi.principal)} purchase are removed.`, `${card.name}'s available limit goes back up by ${money(delEmi.principal)}.`] : []}
        onConfirm={() => { deleteEmi(delEmi.id); toast('EMI plan deleted', 'info') }} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} title={`Export ${card.name} statement`} defaultPeriod="this-month" earliest={earliestDate(data)}
        build={(r) => {
          const rep = txnReport(data, filterRange(s.txns, r), { title: `${card.name} statement`, subtitle: r.label, fileName: `FinTrack-${card.name}-${r.label}` })
          rep.summary = [['Outstanding now', money(s.outstanding)], ['Available', money(s.available)], ['Credit limit', money(s.limit)], ['Bill status', CARD_STATUSES.find((x) => x.value === card.status)?.label || 'Unpaid'], ['Monthly EMIs', money(s.monthlyEmi)], ['Entries', String(rep.rows.length)]]
          if (s.plans.length) rep.rows.push(...s.plans.map(({ plan, emi, remaining }) => ({ date: fmtDate(plan.startDate), type: 'EMI plan', title: plan.itemName, category: '', mode: 'Credit card', account: card.name, amount: -plan.principal, notes: `${money(emi)}/mo · ${remaining} of ${plan.tenure} months left` })))
          return rep
        }} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      {dialogs}
    </div>
  )
}

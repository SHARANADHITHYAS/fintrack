import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CreditCard, Gauge, HandCoins, MoreVertical, Pencil, Plus, Trash2, Users, Wallet, ArrowRight } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Menu } from '../components/ui'
import { PageHero } from '../components/common'
import { CardFormDialog, CardVisual, StatusBadge } from '../components/CardParts'
import { useTxnEditor } from '../components/TxnEditor'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { cardStats, filterRange } from '../lib/finance'
import { CAT, FRIEND_CC } from '../lib/constants'
import { lineFor } from '../lib/greetings'
import { cn, money, periodRange, sum } from '../lib/utils'

export function MiniStat({ label, value, icon: I, tone = 'teal', sub }) {
  const cls = { teal: 'bg-teal-soft text-teal', exp: 'bg-exp-soft text-exp', inc: 'bg-inc-soft text-inc', violet: 'bg-violet-soft text-violet', net: 'bg-net-soft text-net', warn: 'bg-warn-soft text-warn' }[tone]
  return (
    <Card className="flex items-center gap-3 p-3.5 sm:p-4">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', cls)}><I className="size-5" /></span>
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold text-muted">{label}</div>
        <div className="tabular truncate font-display text-[17px] font-extrabold sm:text-[19px]">{value}</div>
        {sub && <div className="truncate text-[11.5px] text-faint">{sub}</div>}
      </div>
    </Card>
  )
}

export default function Cards() {
  const { data, deleteCard } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const { openNew, dialogs } = useTxnEditor()
  const [form, setForm] = useState({ open: false, initial: null })
  const [del, setDel] = useState(null)

  const list = data.cards.map((c) => ({ card: c, s: cardStats(c, data) }))
  const totLimit = sum(list, (x) => x.s.limit), totOut = sum(list, (x) => x.s.outstanding), totEmi = sum(list, (x) => x.s.monthlyEmi)
  const month = filterRange(data.transactions, periodRange('this-month'))
  const friendSpend = sum(month.filter((t) => t.type === 'expense' && t.accountId === FRIEND_CC), (t) => t.amount)
  const friendPaid = sum(month.filter((t) => t.type === 'transfer' && t.toCardId === FRIEND_CC), (t) => t.amount)

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHero title="Credit cards" subtitle={lineFor('cards')} right={<Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus className="size-4" />Add card</Button>} />

      {list.length > 0 && (
        <div className="anim-rise grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <MiniStat label="Total limit" value={money(totLimit)} icon={Gauge} tone="net" />
          <MiniStat label="Outstanding" value={money(totOut)} icon={HandCoins} tone="exp" sub={totLimit ? `${Math.round((totOut / totLimit) * 100)}% used` : undefined} />
          <MiniStat label="Available" value={money(totLimit - totOut)} icon={Wallet} tone="inc" />
          <MiniStat label="Monthly EMIs" value={money(totEmi)} icon={CalendarClock} tone="violet" sub={`${sum(list, (x) => x.s.activeEmis.length)} active`} />
        </div>
      )}

      {list.length ? (
        <div className="anim-rise grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(({ card, s }) => (
            <div key={card.id} className="space-y-3">
              <CardVisual card={card} stats={s} onClick={() => nav(`/cards/${card.id}`)}
                action={
                  <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <Menu trigger={<button className="grid size-8 cursor-pointer place-items-center rounded-lg bg-white/15 text-white backdrop-blur hover:bg-white/25" aria-label={`${card.name} actions`}><MoreVertical className="size-4" /></button>}
                      items={[
                        { label: 'Open details', icon: ArrowRight, onSelect: () => nav(`/cards/${card.id}`) },
                        { label: 'Pay bill', icon: HandCoins, onSelect: () => openNew({ type: 'expense', categoryId: CAT.CC_PAYMENT, toCardId: card.id }) },
                        { label: 'Add transaction', icon: Plus, onSelect: () => openNew({ type: 'expense', mode: 'cc', accountId: card.id }) },
                        { label: 'Edit card', icon: Pencil, onSelect: () => setForm({ open: true, initial: card }) },
                        { label: 'Delete card', icon: Trash2, danger: true, onSelect: () => setDel({ card, s }) },
                      ]} />
                  </span>
                } />
              <div className="flex flex-wrap items-center gap-2 px-1 text-[12.5px] text-muted">
                <StatusBadge status={card.status} />
                <span>This cycle <b className="text-fg">{money(s.cycleSpend)}</b></span>
                {s.activeEmis.length > 0 && <Badge tone="violet"><CalendarClock className="size-3" />{s.activeEmis.length} EMI · {money(s.monthlyEmi)}/mo</Badge>}
              </div>
            </div>
          ))}
          <button onClick={() => setForm({ open: true, initial: null })}
            className="grid min-h-52 cursor-pointer place-items-center rounded-[26px] border-2 border-dashed border-line text-muted transition hover:border-teal hover:text-teal">
            <span className="flex flex-col items-center gap-2 font-semibold"><Plus className="size-7" />Add another card</span>
          </button>
        </div>
      ) : (
        <Card><EmptyState icon={CreditCard} title="Add your first credit card" text="Track limits, outstanding balance, bill status and EMIs automatically. No card numbers, ever." action={<Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus className="size-4" />Add card</Button>} /></Card>
      )}

      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-card-2 text-muted"><Users className="size-5" /></span>
          <div>
            <div className="font-display text-[15px] font-bold">Friend's credit card</div>
            <div className="text-[12.5px] text-muted">Used for your spends this month: <b className="text-fg">{money(friendSpend)}</b> · paid back: <b className="text-fg">{money(friendPaid)}</b></div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openNew({ type: 'expense', mode: 'cc', accountId: FRIEND_CC })}><Plus className="size-4" />Spend</Button>
          <Button variant="soft" size="sm" onClick={() => openNew({ type: 'expense', categoryId: CAT.CC_PAYMENT, toCardId: FRIEND_CC })}><HandCoins className="size-4" />Pay friend</Button>
        </div>
      </Card>

      <CardFormDialog open={form.open} onOpenChange={(o) => setForm((s) => ({ ...s, open: o }))} initial={form.initial} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} icon={Trash2} title={`Delete ${del?.card.name}?`}
        points={del ? [`Its ${del.s.txns.length} transaction${del.s.txns.length === 1 ? '' : 's'} stay in Transactions, marked as a removed card.`, del.s.plans.length ? `${del.s.plans.length} EMI plan${del.s.plans.length > 1 ? 's' : ''} on this card will be removed.` : 'No EMI plans on this card.'] : []}
        onConfirm={() => { deleteCard(del.card.id); toast('Card deleted', 'info') }} />
      {dialogs}
    </div>
  )
}

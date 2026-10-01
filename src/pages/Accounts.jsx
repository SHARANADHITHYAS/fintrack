import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Banknote, Check, Gift, Info, Landmark, Pencil, Plus, Wallet, X } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Dialog, Field, Input, MoneyInput } from '../components/ui'
import { PageHero } from '../components/common'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { accountBalances } from '../lib/finance'
import { cn, fmtDate, money, moneyK, parseAmount, sum } from '../lib/utils'

const TYPE = {
  bank: { label: 'Bank accounts', icon: Landmark, tone: 'bg-net-soft text-net' },
  wallet: { label: 'Wallets', icon: Wallet, tone: 'bg-violet-soft text-violet' },
  giftcard: { label: 'Gift cards', icon: Gift, tone: 'bg-warn-soft text-warn' },
  cash: { label: 'Cash', icon: Banknote, tone: 'bg-inc-soft text-inc' },
}

/** Small dashboard card: total money across accounts + top balances */
export function AccountsSummary() {
  const { data } = useData()
  const accs = accountBalances(data)
  const total = sum(accs, (a) => a.balance)
  const shown = accs.filter((a) => a.balance !== 0 || a.count > 0).sort((a, b) => b.balance - a.balance).slice(0, 4)
  return (
    <Card className="p-4 sm:p-5">
      <CardHeader icon={Landmark} title="Your accounts" subtitle="Live balance across banks, wallets and cash"
        action={<Link to="/accounts" className="text-[13px] font-semibold whitespace-nowrap text-teal hover:underline">View all</Link>} />
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] sm:items-center">
        <div className="rounded-2xl bg-[linear-gradient(120deg,color-mix(in_srgb,var(--teal)_14%,var(--card-2)),color-mix(in_srgb,var(--violet)_14%,var(--card-2)))] p-4">
          <div className="text-[12px] font-semibold text-muted">Total available</div>
          <div className={cn('tabular font-display text-2xl font-extrabold', total < 0 && 'text-exp')}>{money(total)}</div>
        </div>
        {shown.length ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {shown.map((a) => {
              const T = TYPE[a.type]
              return (
                <Link key={a.id} to="/accounts" className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-line bg-card-2 p-3 transition hover:border-teal/50">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', T.tone)}><T.icon className="size-4" /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] text-muted">{a.name}</span>
                    <span className={cn('tabular block truncate text-[14px] font-bold', a.balance < 0 ? 'text-exp' : 'text-fg')}>{moneyK(a.balance)}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Set your current balances once on the <Link to="/accounts" className="font-semibold text-teal hover:underline">Accounts</Link> page, and every income and expense keeps them up to date.</p>
        )}
      </div>
    </Card>
  )
}

function BalanceDialog({ acc, onOpenChange }) {
  const { setAccountBalance } = useData()
  const toast = useToast()
  const [v, setV] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { if (acc) { setV(String(acc.balance)); setErr('') } }, [acc])
  if (!acc) return null
  const save = () => {
    const n = parseAmount(v)
    if (!Number.isFinite(n)) return setErr('Enter the balance you see in your account today.')
    setAccountBalance(acc.id, n)
    toast(`${acc.name} balance updated`)
    onOpenChange(false)
  }
  return (
    <Dialog open={!!acc} onOpenChange={onOpenChange} size="sm" icon={Pencil} title={`Set ${acc.name} balance`}
      description="Enter what your bank, app or wallet shows right now. We'll keep it updated from your transactions."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={save}>Save balance</Button></>}>
      <Field label="Current balance" error={err}>
        <MoneyInput big value={v} onChange={(x) => { setV(x); setErr('') }} autoFocus />
      </Field>
      <p className="mt-3 flex gap-2 text-[12px] text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />Tracked so far: +{money(acc.inflow)} in, −{money(acc.outflow).replace('−', '')} out. Your starting balance is adjusted to match.</p>
    </Dialog>
  )
}

function AddInline({ type, onDone }) {
  const { addBank, addWallet } = useData()
  const toast = useToast()
  const [name, setName] = useState('')
  const save = () => {
    if (!name.trim()) return
    type === 'bank' ? addBank(name) : addWallet(name, type === 'giftcard' ? 'giftcard' : 'wallet')
    toast(`${name.trim()} added`)
    onDone()
  }
  return (
    <div className="anim-pop flex gap-2 rounded-2xl border border-dashed border-teal/50 p-2.5">
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone() }}
        placeholder={type === 'bank' ? 'e.g. SBI Savings' : type === 'giftcard' ? 'e.g. Amazon gift card' : 'e.g. Paytm'} className="!h-10" />
      <Button size="icon" variant="primary" className="!size-10" aria-label="Add" onClick={save}><Check className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="!size-10" aria-label="Cancel" onClick={onDone}><X className="size-4" /></Button>
    </div>
  )
}

export default function Accounts() {
  const { data } = useData()
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(null)
  const accs = accountBalances(data)
  const total = sum(accs, (a) => a.balance)
  const monthIn = sum(accs, (a) => a.monthIn), monthOut = sum(accs, (a) => a.monthOut)

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-fg"><ArrowLeft className="size-4" />Dashboard</Link>
      <PageHero title="Accounts and wallets" subtitle="Know exactly where your money sits. Balances update with every transaction."
        right={<div className="rounded-2xl border border-line bg-card px-4 py-3 text-right shadow-glow">
          <div className="text-[12px] font-semibold text-muted">Total available</div>
          <div className={cn('tabular font-display text-2xl font-extrabold', total < 0 && 'text-exp')}>{money(total)}</div>
        </div>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="flex items-center gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl bg-inc-soft text-inc"><ArrowDownLeft className="size-5" /></span><div><div className="text-[12px] font-semibold text-muted">Money in this month</div><div className="tabular font-display text-lg font-extrabold text-inc">+{money(monthIn)}</div></div></Card>
        <Card className="flex items-center gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl bg-exp-soft text-exp"><ArrowUpRight className="size-5" /></span><div><div className="text-[12px] font-semibold text-muted">Money out this month</div><div className="tabular font-display text-lg font-extrabold text-exp">−{money(monthOut).replace('−', '')}</div></div></Card>
      </div>

      {['bank', 'wallet', 'giftcard', 'cash'].map((type) => {
        const list = accs.filter((a) => a.type === type)
        if (type === 'giftcard' && !list.length && adding !== 'giftcard') return null
        const T = TYPE[type]
        return (
          <section key={type}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold"><T.icon className="size-5 text-teal" />{T.label}
                <span className="tabular text-[13px] font-semibold text-muted">· {money(sum(list, (a) => a.balance))}</span></h2>
              {type !== 'cash' && <Button variant="soft" size="sm" onClick={() => setAdding(type)}><Plus className="size-4" />Add</Button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((a) => (
                <Card key={a.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', T.tone)}><T.icon className="size-5" /></span>
                      <div className="min-w-0">
                        <div className="truncate font-display text-[15px] font-bold">{a.name}</div>
                        <div className="text-[12px] text-faint">{a.last ? `Last activity ${fmtDate(a.last)}` : 'No activity yet'}</div>
                      </div>
                    </div>
                    {a.builtIn && type !== 'cash' && <Badge tone="muted">Default</Badge>}
                  </div>
                  <div className={cn('tabular mt-4 font-display text-[26px] font-extrabold tracking-tight', a.balance < 0 && 'text-exp')}>{money(a.balance)}</div>
                  {a.balance < 0 && <p className="text-[12px] text-exp">Below zero. Set your real balance so this stays accurate.</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                    <span>This month <b className="text-inc">+{moneyK(a.monthIn)}</b> / <b className="text-exp">−{moneyK(a.monthOut).replace('−', '')}</b></span>
                    <span>Starting {moneyK(a.opening)}</span>
                  </div>
                  <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setEditing(a)}><Pencil className="size-3.5" />Set current balance</Button>
                </Card>
              ))}
              {adding === type && <AddInline type={type} onDone={() => setAdding(null)} />}
            </div>
          </section>
        )
      })}
      {!accs.some((a) => a.type === 'giftcard') && adding !== 'giftcard' && (
        <button onClick={() => setAdding('giftcard')} className="cursor-pointer text-[13px] font-semibold text-teal hover:underline">+ Add a gift card</button>
      )}

      <p className="flex gap-2 rounded-2xl bg-card-2 px-4 py-3 text-[12.5px] text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-teal" />
        Income adds to the account it was received in. UPI, bank transfer, debit card and wallet payments subtract from the account used. Credit card spends don't touch your bank until you pay the bill. ATM withdrawals move money from your bank to cash.
      </p>
      <BalanceDialog acc={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  )
}

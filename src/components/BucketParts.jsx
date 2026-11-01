import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Bike, Car, Gem, Gift, GraduationCap, House, Info, Laptop, PiggyBank, Plane, ShoppingBag, Smartphone, TriangleAlert } from 'lucide-react'
import { Button, Dialog, Field, Input, MoneyInput, Textarea } from './ui'
import { AccountPicker, CategoryPicker, ModeChips } from './Pickers'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { bucketStats } from '../lib/finance'
import { EXPENSE_MODES } from '../lib/constants'
import { cn, money, parseAmount, todayISO } from '../lib/utils'

// Bucket money can come from (or go back to) any bank, wallet or cash
const MOVE_MODES = EXPENSE_MODES.filter((m) => m.value !== 'cc')

export const BUCKET_ICONS = ['PiggyBank', 'Smartphone', 'Bike', 'Car', 'Laptop', 'Plane', 'House', 'Gift', 'GraduationCap', 'Gem']

/** Create or edit a bucket (name + target) */
export function BucketFormDialog({ open, onOpenChange, initial }) {
  const { saveBucket } = useData()
  const toast = useToast()
  const [f, setF] = useState({ name: '', target: '', icon: 'PiggyBank', note: '' })
  const [e, setE] = useState({})
  useEffect(() => {
    if (open) { setE({}); setF(initial ? { name: initial.name, target: String(initial.target), icon: initial.icon || 'PiggyBank', note: initial.note || '' } : { name: '', target: '', icon: 'PiggyBank', note: '' }) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    const err = {}
    if (!f.name.trim()) err.name = 'Name your bucket, e.g. New mobile.'
    if (!(parseAmount(f.target) > 0)) err.target = 'Set a target amount.'
    setE(err)
    if (Object.keys(err).length) return
    saveBucket({ ...initial, name: f.name.trim(), target: parseAmount(f.target), icon: f.icon, note: f.note.trim() })
    toast(initial ? 'Bucket updated' : `“${f.name.trim()}” bucket created. Fill it little by little!`)
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm" icon={PiggyBank} title={initial ? 'Edit bucket' : 'New savings bucket'}
      description="Set money aside for one thing. It's kept apart from your savings and investments."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={save}>{initial ? 'Save changes' : 'Create bucket'}</Button></>}>
      <div className="space-y-4">
        <Field label="What are you saving for?" required error={e.name}>
          <Input autoFocus value={f.name} onChange={(x) => { setF({ ...f, name: x.target.value }); setE({ ...e, name: undefined }) }} placeholder="New mobile, Bike, Goa trip…" />
        </Field>
        <Field label="Target amount" required error={e.target}>
          <MoneyInput big value={f.target} onChange={(v) => { setF({ ...f, target: v }); setE({ ...e, target: undefined }) }} placeholder="30000" />
        </Field>
        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {BUCKET_ICONS.map((ic) => (
              <button key={ic} type="button" aria-label={ic} onClick={() => setF({ ...f, icon: ic })}
                className={cn('grid size-10 cursor-pointer place-items-center rounded-xl border transition-all', f.icon === ic ? 'border-violet bg-violet-soft text-violet' : 'border-line bg-card-2 text-muted hover:text-fg')}>
                <BucketIcon name={ic} className="size-[18px]" />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Note" optional>
          <Input value={f.note} onChange={(x) => setF({ ...f, note: x.target.value })} placeholder="e.g. Buy before Diwali" />
        </Field>
      </div>
    </Dialog>
  )
}

/** Add money / take money back / spend from a bucket. `initial` may be an existing bucket transaction to edit. */
export function BucketMoveDialog({ open, onOpenChange, bucket, action: actionProp, initial }) {
  const { data, saveBucketMove } = useData()
  const toast = useToast()
  const action = initial?.action || actionProp || 'deposit'
  const b = bucket || (data.buckets || []).find((x) => x.id === initial?.bucketId)
  const [f, setF] = useState({})
  const [e, setE] = useState({})
  const s = b ? bucketStats(b, data.transactions.filter((t) => t.id !== initial?.id)) : null

  useEffect(() => {
    if (!open || !b) return
    setE({})
    setF(initial
      ? { amount: String(initial.amount), date: initial.date, mode: initial.mode || '', accountId: initial.accountId || '', categoryId: initial.categoryId || '', description: initial.description || '' }
      : { amount: action === 'spend' && s ? String(s.balance) : '', date: todayISO(), mode: '', accountId: '', categoryId: '', description: action === 'spend' ? b.name : '' })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!b || !s) return null
  const amt = parseAmount(f.amount)
  const modeDef = MOVE_MODES.find((m) => m.value === f.mode)
  const early = action !== 'deposit' && !s.reached
  const meta = {
    deposit: { title: `Add money to ${b.name}`, icon: ArrowDownToLine, from: 'Take it from', btn: 'Add to bucket', desc: 'Any amount, any time. It leaves the account below and stays in this bucket.' },
    withdraw: { title: `Take money back from ${b.name}`, icon: ArrowUpFromLine, from: 'Put it back into', btn: 'Take money back', desc: 'Moves money from the bucket back into one of your accounts.' },
    spend: { title: `Spend from ${b.name}`, icon: ShoppingBag, from: null, btn: 'Record purchase', desc: "You've already set this money aside, so it isn't counted again as this month's expense." },
  }[action]

  const save = () => {
    const err = {}
    if (!(amt > 0)) err.amount = 'Enter an amount above ₹0.'
    else if (action !== 'deposit' && amt > s.balance) err.amount = `The bucket has only ${money(s.balance)}.`
    if (!f.date) err.date = 'Pick a date.'
    if (action !== 'spend') {
      if (!f.mode) err.mode = 'Choose where the money comes from or goes to.'
      else if (modeDef?.needs && !f.accountId) err.accountId = 'Choose the account.'
    }
    setE(err)
    if (Object.keys(err).length) return
    saveBucketMove({ id: initial?.id, bucketId: b.id, action, amount: amt, date: f.date, mode: f.mode, accountId: modeDef?.needs ? f.accountId : '', categoryId: f.categoryId, description: f.description })
    const left = action === 'deposit' ? s.balance + amt : s.balance - amt
    toast(initial ? 'Bucket entry updated'
      : action === 'deposit' ? (s.target && left >= s.target ? `🎉 ${b.name} target reached!` : `${money(amt)} added. ${money(Math.max(0, s.target - left))} to go!`)
      : action === 'spend' ? `Enjoy your ${b.name}! 🎉` : `${money(amt)} moved back`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm" icon={meta.icon} title={initial ? 'Edit bucket entry' : meta.title} description={meta.desc}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={save}>{initial ? 'Save changes' : meta.btn}</Button></>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-violet-soft px-4 py-3 text-[13px]">
          <span className="text-muted">In bucket now</span>
          <b className="tabular text-violet">{money(s.balance)} <span className="font-medium text-muted">of {money(s.target)}</span></b>
        </div>
        {early && (
          <p className="flex gap-2 rounded-2xl border border-warn/40 bg-warn-soft/60 px-3.5 py-2.5 text-[12.5px] text-fg">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />Target not reached yet ({money(s.remaining)} to go). You can still continue.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
          <Field label="Amount" required error={e.amount}>
            <MoneyInput big value={f.amount || ''} onChange={(v) => { setF({ ...f, amount: v }); setE({ ...e, amount: undefined }) }} placeholder="0" autoFocus />
          </Field>
          <Field label="Date" required error={e.date}>
            <Input type="date" value={f.date || ''} onChange={(x) => setF({ ...f, date: x.target.value })} className="sm:!h-12" />
          </Field>
        </div>
        {meta.from && (
          <Field label={meta.from} required error={e.mode || e.accountId}>
            <div className="space-y-2">
              <ModeChips modes={MOVE_MODES} value={f.mode} onChange={(m) => { setF({ ...f, mode: m, accountId: '' }); setE({}) }} invalid={!!e.mode} />
              {modeDef?.needs && <AccountPicker kind={modeDef.needs} value={f.accountId} onChange={(v) => { setF({ ...f, accountId: v }); setE({}) }} invalid={!!e.accountId}
                placeholder={modeDef.needs === 'bank' ? 'Which bank account?' : 'Which wallet?'} />}
            </div>
          </Field>
        )}
        {action === 'spend' && (
          <Field label="What did you buy? (category)" optional>
            <CategoryPicker type="expense" value={f.categoryId} onChange={(v) => setF({ ...f, categoryId: v })} />
          </Field>
        )}
        <Field label={action === 'spend' ? 'Description' : 'Note'} optional>
          <Textarea rows={2} value={f.description || ''} onChange={(x) => setF({ ...f, description: x.target.value })} placeholder={action === 'spend' ? 'e.g. iPhone 16 from Croma' : 'e.g. October savings'} />
        </Field>
        {action === 'deposit' && <p className="flex gap-2 text-[12px] text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />Counted as “Bucket” in your monthly balance, not as an expense, saving or investment.</p>}
      </div>
    </Dialog>
  )
}

/* Icons used for buckets */
const BICONS = { PiggyBank, Smartphone, Bike, Car, Laptop, Plane, House, Gift, GraduationCap, Gem }
export const BucketIcon = ({ name, ...p }) => { const I = BICONS[name] ?? PiggyBank; return <I {...p} /> }

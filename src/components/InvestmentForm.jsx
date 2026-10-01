import { useEffect, useMemo, useState } from 'react'
import { LineChart, Repeat, Wallet, Info, RefreshCw } from 'lucide-react'
import { Button, Dialog, Field, Input, MoneyInput, Select, Segmented, Textarea } from './ui'
import { AccountPicker, ModeChips } from './Pickers'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { EXPENSE_MODES, INVESTMENT_CATEGORIES } from '../lib/constants'
import { investmentStats, sipDates } from '../lib/finance'
import { fmtDate, money, ordinal, parseAmount, fromISO, todayISO, cn, pct } from '../lib/utils'

const blank = () => ({ name: '', category: 'Mutual Funds', customCategory: '', type: 'sip', amountPaid: '', investedAmount: '', currentValue: '', startDate: todayISO(), tenureMonths: '', mode: '', accountId: '', description: '' })

export function InvestmentForm({ open, onOpenChange, initial }) {
  const { data, saveInvestment } = useData()
  const toast = useToast()
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState({})
  const editing = !!initial?.id

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (!initial) return setF(blank())
    const known = INVESTMENT_CATEGORIES.some((c) => c.name === initial.category)
    const s = investmentStats(initial, data.transactions)
    setF({
      ...blank(), ...initial,
      category: known ? initial.category : 'Custom', customCategory: known ? '' : initial.category,
      amountPaid: String(initial.amountPaid ?? ''), investedAmount: initial.investedAmount != null && initial.investedAmount !== initial.amountPaid ? String(initial.investedAmount) : '',
      currentValue: String(s.current), tenureMonths: initial.tenureMonths ? String(initial.tenureMonths) : '',
      mode: initial.mode || '', accountId: initial.accountId || '',
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p) => { setF((s) => ({ ...s, ...p })); setErrors((e) => { const n = { ...e }; Object.keys(p).forEach((k) => delete n[k]); return n }) }
  const modeDef = EXPENSE_MODES.find((m) => m.value === f.mode)
  const paid = parseAmount(f.amountPaid)
  const invested = f.investedAmount === '' ? paid : parseAmount(f.investedAmount)

  const sipInfo = useMemo(() => {
    if (f.type !== 'sip' || !f.startDate) return null
    const posted = sipDates({ type: 'sip', startDate: f.startDate, tenureMonths: Number(f.tenureMonths) || null }).length
    return { posted, day: fromISO(f.startDate).getDate() }
  }, [f.type, f.startDate, f.tenureMonths])

  const submit = () => {
    const e = {}
    if (!f.name.trim()) e.name = 'Give this investment a name.'
    if (f.category === 'Custom' && !f.customCategory.trim()) e.customCategory = 'Name your custom category.'
    if (!(paid > 0)) e.amountPaid = 'Enter the amount paid.'
    if (f.investedAmount !== '' && !(invested > 0)) e.investedAmount = 'Enter a valid amount, or leave it blank.'
    if (f.investedAmount !== '' && invested > paid) e.investedAmount = 'Invested amount is usually equal to or less than the amount paid.'
    if (f.currentValue !== '' && !(parseAmount(f.currentValue) >= 0)) e.currentValue = 'Enter a valid value.'
    if (f.tenureMonths !== '' && !(Number(f.tenureMonths) >= 1)) e.tenureMonths = 'Enter months, e.g. 12.'
    if (modeDef?.needs && !f.accountId) e.accountId = 'Choose the account, or clear the payment mode.'
    setErrors(e)
    if (Object.keys(e).length) return
    saveInvestment({
      id: initial?.id,
      name: f.name.trim(),
      category: f.category === 'Custom' ? f.customCategory.trim() : f.category,
      type: f.type,
      amountPaid: paid,
      investedAmount: f.investedAmount === '' ? '' : invested,
      currentValue: f.currentValue === '' ? '' : parseAmount(f.currentValue),
      startDate: f.startDate || todayISO(),
      tenureMonths: f.type === 'sip' ? f.tenureMonths : '',
      mode: f.mode,
      accountId: modeDef?.needs ? f.accountId : '',
      description: f.description,
      status: initial?.status || 'active',
    })
    toast(editing ? 'Investment updated' : f.type === 'sip' ? 'SIP started. Future you says thanks!' : 'Investment recorded. Money at work!')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="lg" icon={LineChart}
      title={editing ? 'Edit investment' : 'Record asset / investment'}
      description="Small SIPs, big dreams. Every investment also shows up in Transactions."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={submit} className="min-w-32">{editing ? 'Save changes' : 'Save investment'}</Button></>}>
      <div className="space-y-4">
        <Segmented value={f.type} onChange={(v) => set({ type: v })} options={[{ value: 'sip', label: 'SIP (monthly)', icon: Repeat }, { value: 'lumpsum', label: 'Lumpsum', icon: Wallet }]} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" required error={errors.name}>
            <Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Nifty 50 Index Fund" invalid={!!errors.name} />
          </Field>
          <Field label="Category" required>
            <Select value={f.category} onChange={(e) => set({ category: e.target.value })}>
              {INVESTMENT_CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </Select>
          </Field>
          {f.category === 'Custom' && (
            <Field label="Custom category name" required error={errors.customCategory} className="sm:col-span-2">
              <Input value={f.customCategory} onChange={(e) => set({ customCategory: e.target.value })} placeholder="e.g. Sovereign Gold Bond" />
            </Field>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={f.type === 'sip' ? 'Amount paid / month' : 'Amount paid'} required error={errors.amountPaid} hint="What leaves your account">
            <MoneyInput value={f.amountPaid} onChange={(v) => set({ amountPaid: v })} placeholder="5000" invalid={!!errors.amountPaid} />
          </Field>
          <Field label="Invested amount" optional error={errors.investedAmount} hint="After GST or charges">
            <MoneyInput value={f.investedAmount} onChange={(v) => set({ investedAmount: v })} placeholder={f.amountPaid || 'Same as paid'} />
          </Field>
          <Field label="Current value" optional error={errors.currentValue} hint="Total value today">
            <MoneyInput value={f.currentValue} onChange={(v) => set({ currentValue: v })} placeholder="Auto" />
          </Field>
        </div>
        {paid > 0 && invested > 0 && paid !== invested && (
          <p className="-mt-2 text-[12px] text-muted">Charges: <b className="text-warn">{money(paid - invested)}</b> per {f.type === 'sip' ? 'installment' : 'purchase'}. Returns are measured on the invested amount.</p>
        )}

        <div className={cn('grid gap-3', f.type === 'sip' && 'sm:grid-cols-2')}>
          <Field label={f.type === 'sip' ? 'SIP start date' : 'Date'} optional hint={f.type === 'sip' && sipInfo ? `Repeats on the ${ordinal(sipInfo.day)} of every month` : 'Defaults to today'}>
            <Input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          {f.type === 'sip' && (
            <Field label="Tenure / duration (months)" optional error={errors.tenureMonths} hint="Leave blank to run until you stop it">
              <Input inputMode="numeric" value={f.tenureMonths} onChange={(e) => set({ tenureMonths: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="12, 24, 36…" />
            </Field>
          )}
        </div>
        {f.type === 'sip' && sipInfo && (
          <div className="flex gap-2.5 rounded-2xl border border-violet/35 bg-violet-soft/50 px-3.5 py-3 text-[12.5px] text-fg">
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-violet" />
            <span>
              {sipInfo.posted > 0 ? <><b>{sipInfo.posted}</b> installment{sipInfo.posted > 1 ? 's' : ''} up to today will be added to Transactions. </> : <>The first installment posts on <b>{fmtDate(f.startDate)}</b>. </>}
              After that, each month posts automatically on its date and updates your balance{editing ? '. Changing the amount updates every installment.' : '.'}
            </span>
          </div>
        )}

        <Field label="Payment mode" optional error={errors.accountId}>
          <div className="space-y-2">
            <ModeChips modes={EXPENSE_MODES} value={f.mode} onChange={(m) => set({ mode: m === f.mode ? '' : m, accountId: '' })} />
            {modeDef?.needs && <AccountPicker kind={modeDef.needs} allowFriend={false} value={f.accountId} onChange={(v) => set({ accountId: v })} invalid={!!errors.accountId}
              placeholder={modeDef.needs === 'bank' ? 'Which bank account?' : modeDef.needs === 'wallet' ? 'Which wallet?' : 'Which credit card?'} />}
          </div>
        </Field>

        <Field label="Description" optional>
          <Textarea rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Goal, folio number, notes…" />
        </Field>
      </div>
    </Dialog>
  )
}

export function UpdateValueDialog({ open, onOpenChange, inv }) {
  const { data, updateInvestmentValue } = useData()
  const toast = useToast()
  const [v, setV] = useState('')
  const [err, setErr] = useState('')
  const s = inv ? investmentStats(inv, data.transactions) : null
  useEffect(() => { if (open && s) { setV(String(s.current)); setErr('') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!inv || !s) return null
  const val = parseAmount(v)
  const ret = val - s.invested
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm" icon={RefreshCw} title="Update current value" description={`${inv.name} · invested ${money(s.invested)}`}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={() => {
        if (!(val >= 0)) return setErr('Enter the current value.')
        updateInvestmentValue(inv.id, val); toast('Value updated'); onOpenChange(false)
      }}>Update value</Button></>}>
      <Field label="Current value today" error={err}>
        <MoneyInput big value={v} onChange={(x) => { setV(x); setErr('') }} autoFocus />
      </Field>
      {val >= 0 && s.invested > 0 && (
        <div className={cn('mt-3 flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold', ret >= 0 ? 'bg-inc-soft text-inc' : 'bg-exp-soft text-exp')}>
          <span>{money(ret, { sign: true })}</span><span>{pct((ret / s.invested) * 100, 2)}</span>
        </div>
      )}
      <p className="mt-3 flex gap-2 text-[12px] text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />Future SIP installments are added on top of this value automatically.</p>
    </Dialog>
  )
}

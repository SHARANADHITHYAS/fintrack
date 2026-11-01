import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CreditCard, Info, Receipt, TrendingUp, Gift, Smartphone, Coins, CalendarClock, Repeat, Wallet } from 'lucide-react'
import { Button, Dialog, Field, Input, MoneyInput, Select, Segmented, Switch, Textarea } from './ui'
import { AccountPicker, CategoryGrid, ModeChips, SubcategoryPicker } from './Pickers'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { CAT, EMI_TENURES, EXPENSE_MODES, FRIEND_CC, INCOME_MODES, INVESTMENT_INCOME_TYPES, PAY_FROM_MODES, PAYMENT_STATUSES } from '../lib/constants'
import { cardStats, emiSchedule, findCategory } from '../lib/finance'
import { cn, fromISO, money, ordinal, parseAmount, round2, todayISO } from '../lib/utils'

const blank = () => ({
  type: 'expense', amount: '', date: todayISO(), description: '', categoryId: '', subcategory: '',
  mode: '', accountId: '',
  rechargeFor: '', friendName: '', incomeType: '', giftCardId: '',
  toCardId: '', paymentStatus: 'paid', outstandingAfter: '', outstandingTouched: false,
  emi: { enabled: false, tenure: 6, annualRate: '', fee: '' },
  invType: 'lumpsum', tenureMonths: '',
})

function fromTxn(t, data) {
  const f = blank()
  if (!t) return f
  const inv = t.investmentId ? data.investments.find((i) => i.id === t.investmentId) : null
  const plan = t.emiId ? data.emis.find((p) => p.id === t.emiId) : null
  return {
    ...f,
    ...t,
    type: t.type === 'transfer' ? 'expense' : t.type || 'expense',
    amount: t.amount != null ? String(t.amount) : '',
    date: t.date || todayISO(),
    description: inv ? inv.name : t.description || '',
    mode: t.mode || '',
    accountId: t.accountId || '',
    rechargeFor: t.meta?.rechargeFor || '',
    friendName: t.meta?.friendName || '',
    incomeType: t.meta?.incomeType || '',
    giftCardId: t.meta?.giftCardId || (t.categoryId === CAT.GIFT_CARD ? t.accountId : ''),
    toCardId: t.toCardId || '',
    paymentStatus: t.paymentStatus || 'paid',
    outstandingAfter: t.outstandingAfter != null ? String(t.outstandingAfter) : '',
    outstandingTouched: t.outstandingAfter != null,
    invType: inv?.type || 'lumpsum',
    tenureMonths: inv?.tenureMonths ? String(inv.tenureMonths) : '',
    emi: plan ? { enabled: true, tenure: plan.tenure, annualRate: plan.annualRate ? String(plan.annualRate) : '', fee: plan.fee ? String(plan.fee) : '' } : f.emi,
  }
}

const Box = ({ tone = 'teal', icon: I, title, children }) => (
  <div className={cn('anim-pop rounded-2xl border p-3.5 sm:p-4', tone === 'violet' ? 'border-violet/35 bg-violet-soft/50' : tone === 'warn' ? 'border-warn/35 bg-warn-soft/50' : 'border-teal/35 bg-teal-soft/40')}>
    <div className={cn('mb-3 flex items-center gap-2 text-[13px] font-bold', tone === 'violet' ? 'text-violet' : tone === 'warn' ? 'text-warn' : 'text-teal')}>
      {I && <I className="size-4" />} {title}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
)

export default function TransactionForm({ open, onOpenChange, initial, onSaved }) {
  const { data, saveTransaction } = useData()
  const toast = useToast()
  const [f, setF] = useState(() => fromTxn(initial, data))
  const [errors, setErrors] = useState({})
  const editing = !!initial?.id

  useEffect(() => { if (open) { setF(fromTxn(initial, data)); setErrors({}) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => { setF((s) => ({ ...s, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n }) }
  const cat = f.categoryId ? findCategory(data, f.categoryId) : null
  const isCcPay = f.type === 'expense' && f.categoryId === CAT.CC_PAYMENT
  const isInvesting = f.type === 'expense' && f.categoryId === CAT.INVESTING
  const isGift = f.type === 'income' && f.categoryId === CAT.GIFT_CARD
  const modes = f.type === 'income' ? INCOME_MODES : EXPENSE_MODES
  const modeDef = modes.find((m) => m.value === f.mode)
  const amount = parseAmount(f.amount)

  // Outstanding preview for bill payments (excluding this txn when editing)
  const payCard = isCcPay && f.toCardId && f.toCardId !== FRIEND_CC ? data.cards.find((c) => c.id === f.toCardId) : null
  const cardBefore = useMemo(() => {
    if (!payCard) return null
    const others = { ...data, transactions: data.transactions.filter((t) => t.id !== initial?.id) }
    return cardStats(payCard, others).outstanding
  }, [payCard, data, initial?.id])
  const suggestedOutstanding = cardBefore != null ? round2(Math.max(cardBefore - (amount || 0), 0)) : null
  useEffect(() => {
    if (!isCcPay || f.outstandingTouched || suggestedOutstanding == null) return
    setF((s) => ({ ...s, outstandingAfter: String(suggestedOutstanding) }))
  }, [suggestedOutstanding, isCcPay, f.outstandingTouched])

  const emiCard = f.type === 'expense' && !isCcPay && !isInvesting && f.mode === 'cc' && f.accountId && f.accountId !== FRIEND_CC
  const emiPreview = emiCard && f.emi.enabled && amount > 0 && f.emi.tenure >= 2
    ? emiSchedule({ principal: amount, tenure: Number(f.emi.tenure), annualRate: Number(f.emi.annualRate) || 0, fee: Number(f.emi.fee) || 0, startDate: f.date })
    : null

  const switchType = (type) => set({ type, categoryId: '', subcategory: '', mode: '', accountId: '', incomeType: '', giftCardId: '', emi: { ...f.emi, enabled: false } })
  const onCategory = (id) => {
    const patch = { categoryId: id, subcategory: '' }
    if (id === CAT.CC_PAYMENT) { patch.mode = ''; patch.accountId = '' }
    if (id === CAT.GIFT_CARD) { patch.mode = 'wallet'; patch.accountId = f.giftCardId || '' }
    else if (f.categoryId === CAT.GIFT_CARD) { patch.mode = ''; patch.accountId = '' }
    set(patch)
  }
  const onMode = (m) => set({ mode: m, accountId: '', emi: { ...f.emi, enabled: false } })

  const validate = () => {
    const e = {}
    if (!(amount > 0)) e.amount = 'Enter an amount above ₹0.'
    if (!f.date) e.date = 'Pick a date.'
    if (!f.categoryId) e.categoryId = 'Choose a category.'
    if (cat?.subRequired && !f.subcategory) e.subcategory = f.categoryId === CAT.OTT ? 'Which OTT is this for?' : 'Choose the bill type.'
    if (isCcPay) {
      if (!f.toCardId) e.toCardId = 'Choose which card you are paying.'
      if (!f.mode) e.mode = 'Choose how you paid.'
      else if (!f.accountId) e.accountId = 'Choose the bank or wallet.'
      if (f.paymentStatus !== 'paid' && f.outstandingAfter !== '' && !(parseAmount(f.outstandingAfter) >= 0)) e.outstandingAfter = 'Enter a valid amount.'
    } else if (isGift) {
      if (!f.giftCardId) e.giftCardId = 'Choose or add the gift card.'
    } else {
      if (!f.mode) e.mode = 'Choose a payment mode.'
      else if (modeDef?.needs && !f.accountId) e.accountId = modeDef.needs === 'bank' ? 'Choose the bank account.' : modeDef.needs === 'wallet' ? 'Choose the wallet.' : 'Choose the card.'
    }
    if (f.type === 'income' && f.categoryId === CAT.INV_INCOME && !f.incomeType) e.incomeType = 'What kind of investment income is it?'
    if (emiCard && f.emi.enabled && !(Number(f.emi.tenure) >= 2)) e.tenure = 'Tenure should be at least 2 months.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (ev) => {
    ev?.preventDefault()
    if (!validate()) return
    const meta = {}
    if (f.categoryId === CAT.RECHARGE && f.rechargeFor.trim()) meta.rechargeFor = f.rechargeFor.trim()
    if (isCcPay && f.toCardId === FRIEND_CC && f.friendName.trim()) meta.friendName = f.friendName.trim()
    if (f.categoryId === CAT.INV_INCOME) meta.incomeType = f.incomeType
    if (isGift) meta.giftCardId = f.giftCardId
    saveTransaction({
      id: initial?.id,
      type: f.type,
      amount,
      date: f.date,
      description: f.description,
      categoryId: f.categoryId,
      subcategory: f.subcategory,
      mode: isGift ? 'wallet' : f.mode,
      accountId: isGift ? f.giftCardId : (modes.find((m) => m.value === f.mode)?.needs || isCcPay ? f.accountId : ''),
      meta,
      toCardId: f.toCardId,
      paymentStatus: f.paymentStatus,
      // Only an amount the user typed overrides the running balance; otherwise the payment is simply subtracted.
      outstandingAfter: f.paymentStatus !== 'paid' && f.outstandingTouched && f.outstandingAfter !== '' ? parseAmount(f.outstandingAfter) : null,
      invType: isInvesting ? f.invType : undefined,
      tenureMonths: isInvesting && f.invType === 'sip' ? f.tenureMonths : '',
      emi: emiCard ? { enabled: f.emi.enabled, tenure: Number(f.emi.tenure), annualRate: Number(f.emi.annualRate) || 0, fee: Number(f.emi.fee) || 0 } : { enabled: false },
    })
    const msg = editing ? 'Transaction updated' : isInvesting ? (f.invType === 'sip' ? 'SIP started. It posts automatically every month!' : 'Investment recorded. Small steps, big wealth!') : isCcPay ? 'Bill payment recorded. Card updated.' : f.type === 'income' ? 'Income added. Nice one!' : 'Expense logged. Every rupee counts.'
    toast(msg)
    onOpenChange(false)
    onSaved?.()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      icon={Receipt}
      title={editing ? 'Edit transaction' : 'Record transaction'}
      description={editing ? 'Changes flow to cards, investments and your dashboard.' : 'A two-second entry today saves a month of guessing.'}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={submit} className="min-w-32">{editing ? 'Save changes' : 'Save transaction'}</Button></>}
    >
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <Segmented
          value={f.type}
          onChange={switchType}
          options={[
            { value: 'expense', label: 'Expense', icon: ArrowDownRight, activeClass: 'bg-card text-exp ring-1 ring-exp/40' },
            { value: 'income', label: 'Income', icon: ArrowUpRight, activeClass: 'bg-card text-inc ring-1 ring-inc/40' },
          ]}
        />

        <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <Field label={isCcPay ? 'Amount paid' : 'Amount'} required error={errors.amount}>
            <MoneyInput big value={f.amount} onChange={(v) => set({ amount: v })} placeholder="0" invalid={!!errors.amount} autoFocus />
          </Field>
          <Field label="Date" required error={errors.date}>
            <Input type="date" value={f.date} max="2100-12-31" onChange={(e) => set({ date: e.target.value })} className="sm:!h-12" invalid={!!errors.date} />
          </Field>
        </div>

        <div className="grid gap-3">
          <Field label="Category" required error={errors.categoryId}>
            <CategoryGrid type={f.type} value={f.categoryId} onChange={onCategory} invalid={!!errors.categoryId} />
          </Field>
          {cat?.subcategories?.length > 0 && (
            <Field label={isInvesting ? 'Subcategory preset' : cat.subLabel || 'Subcategory'} required={cat.subRequired} optional={!isInvesting && !cat.subRequired} error={errors.subcategory}>
              <SubcategoryPicker cat={cat} value={f.subcategory} onChange={(v) => set({ subcategory: v })} invalid={!!errors.subcategory}
                required={cat.subRequired} placeholder={isInvesting ? 'Choose a preset…' : undefined} />
            </Field>
          )}
        </div>

        {/* Mobile recharge */}
        {f.categoryId === CAT.RECHARGE && (
          <Box icon={Smartphone} title="Recharge details">
            <Field label="Recharge for / name" optional>
              <Input value={f.rechargeFor} onChange={(e) => set({ rechargeFor: e.target.value })} placeholder="Self, Mom, Friend's name…" />
            </Field>
          </Box>
        )}

        {/* Credit card bill payment */}
        {isCcPay && (
          <Box icon={CreditCard} title="Bill payment details">
            <Field label="Paying card" required error={errors.toCardId}>
              <AccountPicker kind="card" allowFriend value={f.toCardId} onChange={(v) => set({ toCardId: v, outstandingTouched: false })} invalid={!!errors.toCardId} placeholder="Which card are you paying?" />
            </Field>
            {f.toCardId === FRIEND_CC && (
              <Field label="Friend's name / note" optional hint="Counted as a transfer, so it isn't added to your expenses twice.">
                <Input value={f.friendName} onChange={(e) => set({ friendName: e.target.value })} placeholder="e.g. Karthik – Goa trip share" />
              </Field>
            )}
            <Field label="Pay from (bank / wallet)" required error={errors.mode || errors.accountId}>
              <div className="space-y-2">
                <ModeChips modes={PAY_FROM_MODES} value={f.mode} onChange={onMode} invalid={!!errors.mode} />
                {f.mode && <AccountPicker kind={f.mode === 'wallet' ? 'wallet' : 'bank'} value={f.accountId} onChange={(v) => set({ accountId: v })} invalid={!!errors.accountId} placeholder={f.mode === 'wallet' ? 'Which wallet?' : 'Which bank account?'} />}
              </div>
            </Field>
            {payCard && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Payment status">
                  <Select value={f.paymentStatus} onChange={(e) => set({ paymentStatus: e.target.value })}>
                    {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </Field>
                {f.paymentStatus !== 'paid' ? (
                  <Field label="Outstanding amount" error={errors.outstandingAfter} hint={cardBefore != null ? `Before this payment: ${money(cardBefore)}` : undefined}>
                    <MoneyInput value={f.outstandingAfter} onChange={(v) => set({ outstandingAfter: v, outstandingTouched: true })} placeholder="0" />
                  </Field>
                ) : (
                  <div className="flex items-end">
                    <p className="rounded-xl bg-card-2 px-3 py-2.5 text-[12.5px] text-muted">Outstanding after this: <b className="text-fg">{money(suggestedOutstanding ?? 0)}</b></p>
                  </div>
                )}
              </div>
            )}
          </Box>
        )}

        {/* Investment income type */}
        {f.type === 'income' && f.categoryId === CAT.INV_INCOME && (
          <Box icon={Coins} title="Investment income">
            <Field label="What kind?" required error={errors.incomeType}>
              <Select value={f.incomeType} onChange={(e) => set({ incomeType: e.target.value })} invalid={!!errors.incomeType}>
                <option value="" disabled>Choose type…</option>
                {INVESTMENT_INCOME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </Box>
        )}

        {/* Gift card */}
        {isGift && (
          <Box icon={Gift} title="Gift card">
            <Field label="Which gift card?" required error={errors.giftCardId} hint="New gift cards are saved to your wallets automatically.">
              <AccountPicker kind="giftcard" value={f.giftCardId} onChange={(v) => set({ giftCardId: v, accountId: v, mode: 'wallet' })} invalid={!!errors.giftCardId} placeholder="Choose a gift card…" />
            </Field>
          </Box>
        )}

        {/* Investing: SIP or lumpsum */}
        {isInvesting && (
          <Box tone="violet" icon={TrendingUp} title="Investment type">
            <Segmented size="sm" value={f.invType} onChange={(v) => set({ invType: v })}
              options={[{ value: 'sip', label: 'SIP (monthly)', icon: Repeat }, { value: 'lumpsum', label: 'Lumpsum', icon: Wallet }]} />
            {f.invType === 'sip' && (
              <Field label="Tenure / duration (months)" optional hint={f.date ? `Repeats on the ${ordinal(fromISO(f.date).getDate())} of every month. Leave blank to run until you stop it.` : undefined}>
                <Input inputMode="numeric" value={f.tenureMonths} onChange={(e) => set({ tenureMonths: e.target.value.replace(/D/g, '').slice(0, 3) })} placeholder="12, 24, 36…" />
              </Field>
            )}
            <p className="text-[12px] text-muted">
              {f.invType === 'sip'
                ? <>Each month's installment posts automatically on its date and updates your balance. Past dates are filled in for you.</>
                : <>A one-time investment.</>}{' '}It also appears as a holding in <b className="text-fg">Investments</b>, and editing or deleting either one updates the other.
            </p>
          </Box>
        )}

        {/* Payment / income mode */}
        {!isCcPay && !isGift && (
          <Field label={f.type === 'income' ? 'Received in' : 'Payment mode'} required error={errors.mode}>
            <div className="space-y-2">
              <ModeChips modes={modes} value={f.mode} onChange={onMode} invalid={!!errors.mode} />
              {modeDef?.needs && (
                <div className="anim-pop">
                  <AccountPicker
                    kind={modeDef.needs}
                    allowFriend={modeDef.needs === 'card'}
                    value={f.accountId}
                    onChange={(v) => set({ accountId: v })}
                    invalid={!!errors.accountId}
                    placeholder={modeDef.needs === 'bank' ? 'Which bank account?' : modeDef.needs === 'wallet' ? 'Which wallet?' : 'Which credit card?'}
                  />
                  {errors.accountId && <p className="mt-1.5 text-[12px] font-medium text-exp">{errors.accountId}</p>}
                  {f.accountId === FRIEND_CC && <p className="mt-1.5 text-[12px] text-faint">Counts as your expense. None of your own cards are affected.</p>}
                </div>
              )}
            </div>
          </Field>
        )}

        {/* EMI */}
        {emiCard && (
          <Box tone="violet" icon={CalendarClock} title="Convert to EMI">
            <label className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-fg">Pay this in monthly installments</span>
              <Switch checked={f.emi.enabled} onChange={(v) => set({ emi: { ...f.emi, enabled: v } })} label="Convert to EMI" />
            </label>
            {f.emi.enabled && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Tenure" error={errors.tenure}>
                    <Select value={f.emi.tenure} onChange={(e) => set({ emi: { ...f.emi, tenure: Number(e.target.value) } })}>
                      {EMI_TENURES.map((m) => <option key={m} value={m}>{m} months</option>)}
                    </Select>
                  </Field>
                  <Field label="Interest % p.a.">
                    <Input inputMode="decimal" value={f.emi.annualRate} placeholder="0 (no-cost)" onChange={(e) => set({ emi: { ...f.emi, annualRate: e.target.value.replace(/[^\d.]/g, '') } })} />
                  </Field>
                  <Field label="Processing fee">
                    <MoneyInput value={f.emi.fee} onChange={(v) => set({ emi: { ...f.emi, fee: v } })} placeholder="0" />
                  </Field>
                </div>
                {emiPreview && (
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-card-2 p-3 text-center">
                    <div><div className="text-[11px] text-muted">Monthly EMI</div><div className="tabular font-bold text-violet">{money(emiPreview.emi)}</div></div>
                    <div><div className="text-[11px] text-muted">Total payable</div><div className="tabular font-bold text-fg">{money(emiPreview.total)}</div></div>
                    <div><div className="text-[11px] text-muted">First EMI</div><div className="font-bold text-fg">{emiPreview.rows[0].date.split('-').reverse().slice(0, 2).join('/')}</div></div>
                  </div>
                )}
                <p className="flex gap-2 text-[12px] text-muted"><Info className="mt-0.5 size-3.5 shrink-0" />The full amount blocks your card limit now. Each month's EMI is posted automatically and counted in that month's expenses.</p>
              </>
            )}
          </Box>
        )}

        <Field label="Description" optional>
          <Textarea rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder={isInvesting ? 'e.g. Nifty 50 index fund' : f.type === 'income' ? 'e.g. September salary' : 'e.g. Dinner at Saravana Bhavan'} />
        </Field>
      </form>
    </Dialog>
  )
}

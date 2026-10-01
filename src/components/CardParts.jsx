import { useEffect, useState } from 'react'
import { CreditCard, Wifi } from 'lucide-react'
import { Badge, Button, Dialog, Field, Input, MoneyInput, Select } from './ui'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { CARD_STATUSES, CARD_THEMES, cardStatusLabel, cardTheme } from '../lib/constants'
import { cn, fmtDate, money, moneyK, ordinal, parseAmount } from '../lib/utils'

export const statusTone = (s) => CARD_STATUSES.find((x) => x.value === s)?.tone ?? 'warn'

/** Gradient visual card. Stores no card numbers, only what you see here. */
export function CardVisual({ card, stats, onClick, className, action }) {
  const th = cardTheme(card.theme)
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }}
      className={cn('group relative isolate overflow-hidden rounded-[26px] p-5 text-white shadow-[0_24px_50px_-24px_rgba(0,0,0,.6)] transition-transform', onClick && 'cursor-pointer hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-teal focus-visible:outline-none', className)}
      style={{ background: `linear-gradient(135deg, ${th.from} 0%, ${th.via} 55%, ${th.to} 100%)` }}
    >
      <div className="pointer-events-none absolute -top-16 -right-10 -z-10 size-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 -z-10 size-52 rounded-full bg-black/15 blur-2xl" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-display text-[17px] font-bold">{card.name}</div>
          <div className="mt-0.5 text-[11.5px] text-white/70">Bill day · {ordinal(card.billDay)} of every month</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="size-4 rotate-90 text-white/70" />
          {action}
        </div>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] tracking-wide text-white/70 uppercase">Available</div>
          <div className="tabular font-display text-2xl font-extrabold">{money(stats.available)}</div>
          <div className="text-[11.5px] text-white/75">of {money(stats.limit)} limit</div>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">{cardStatusLabel(card.status)}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${stats.usedPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-white/80">
        <span>Outstanding <b className="text-white">{moneyK(stats.outstanding)}</b></span>
        <span>Next bill {fmtDate(stats.nextBill).slice(0, 6)}</span>
      </div>
    </div>
  )
}

const blank = { name: '', billDay: '', limit: '', openingOutstanding: '', status: '', theme: 'aurora' }

export function CardFormDialog({ open, onOpenChange, initial }) {
  const { saveCard } = useData()
  const toast = useToast()
  const [f, setF] = useState(blank)
  const [e, setE] = useState({})
  const editing = !!initial?.id
  useEffect(() => {
    if (!open) return
    setE({})
    setF(initial ? { ...blank, ...initial, billDay: String(initial.billDay), limit: String(initial.limit), openingOutstanding: initial.openingOutstanding ? String(initial.openingOutstanding) : '', status: initial.status || '' } : blank)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p) => { setF((s) => ({ ...s, ...p })); setE((x) => { const n = { ...x }; Object.keys(p).forEach((k) => delete n[k]); return n }) }

  const submit = () => {
    const err = {}
    if (!f.name.trim()) err.name = 'Name your card, e.g. HDFC Millennia.'
    const day = Number(f.billDay)
    if (!(day >= 1 && day <= 31)) err.billDay = 'Bill day is 1–31.'
    if (!(parseAmount(f.limit) > 0)) err.limit = 'Enter the credit limit.'
    if (f.openingOutstanding !== '' && !(parseAmount(f.openingOutstanding) >= 0)) err.openingOutstanding = 'Enter a valid amount.'
    setE(err)
    if (Object.keys(err).length) return
    saveCard({ ...initial, name: f.name.trim(), billDay: day, limit: parseAmount(f.limit), openingOutstanding: f.openingOutstanding === '' ? 0 : parseAmount(f.openingOutstanding), status: f.status || initial?.status || 'unpaid', theme: f.theme })
    toast(editing ? 'Card updated' : `${f.name.trim()} added. Swipe smart!`)
    onOpenChange(false)
  }

  const previewStats = { available: (parseAmount(f.limit) || 0) - (parseAmount(f.openingOutstanding) || 0), limit: parseAmount(f.limit) || 0, outstanding: parseAmount(f.openingOutstanding) || 0, usedPct: parseAmount(f.limit) ? Math.min(100, ((parseAmount(f.openingOutstanding) || 0) / parseAmount(f.limit)) * 100) : 0, nextBill: new Date().toISOString().slice(0, 10) }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={CreditCard} title={editing ? 'Edit credit card' : 'Add a credit card'}
      description="Only the name, bill day, limit and balance are stored. No card number, CVV or expiry, ever."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={submit}>{editing ? 'Save changes' : 'Add card'}</Button></>}>
      <div className="space-y-4">
        <CardVisual card={{ ...f, name: f.name || 'Your card', billDay: Number(f.billDay) || 1, status: f.status || 'unpaid' }} stats={previewStats} />
        <div className="flex gap-2">
          {CARD_THEMES.map((t) => (
            <button key={t.id} type="button" aria-label={`${t.id} theme`} onClick={() => set({ theme: t.id })}
              className={cn('size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-card transition-all', f.theme === t.id && 'ring-2 ring-teal')}
              style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Card name" required error={e.name} className="sm:col-span-2"><Input value={f.name} onChange={(x) => set({ name: x.target.value })} placeholder="e.g. HDFC Millennia" /></Field>
          <Field label="Credit limit" required error={e.limit}><MoneyInput value={f.limit} onChange={(v) => set({ limit: v })} placeholder="100000" /></Field>
          <Field label="Bill day (1–31)" required error={e.billDay}><Input inputMode="numeric" value={f.billDay} onChange={(x) => set({ billDay: x.target.value.replace(/\D/g, '').slice(0, 2) })} placeholder="18" /></Field>
          <Field label={editing ? 'Starting outstanding' : 'Current outstanding'} optional error={e.openingOutstanding} hint={editing ? 'Balance before any tracked transaction' : 'What you owe right now'}>
            <MoneyInput value={f.openingOutstanding} onChange={(v) => set({ openingOutstanding: v })} placeholder="0" />
          </Field>
          <Field label="Bill status" optional>
            <Select value={f.status} onChange={(x) => set({ status: x.target.value })}>
              <option value="">Choose…</option>
              {CARD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  )
}

export const StatusBadge = ({ status }) => <Badge tone={statusTone(status)}>{cardStatusLabel(status)}</Badge>

import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Button, Input, Select } from './ui'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { allBanks, allWallets, categoriesOf, subcategoriesOf } from '../lib/finance'
import { FRIEND_CC } from '../lib/constants'
import { cn } from '../lib/utils'

const ADD = '__add__'

function InlineAdd({ placeholder, onSave, onCancel, extra }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const save = () => {
    if (!name.trim()) return setErr('Give it a name first.')
    const e = extra?.validate?.()
    if (e) return setErr(e)
    onSave(name.trim())
  }
  return (
    <div className="anim-pop mt-2 rounded-2xl border border-dashed border-teal/50 bg-teal-soft/40 p-2.5">
      <div className="flex gap-2">
        <Input autoFocus value={name} placeholder={placeholder} onChange={(e) => { setName(e.target.value); setErr('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') onCancel() }} className="!h-10" />
        <Button size="icon" variant="primary" aria-label="Add" onClick={save} className="!size-10"><Check className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Cancel" onClick={onCancel} className="!size-10"><X className="size-4" /></Button>
      </div>
      {extra?.node}
      {err && <p className="mt-1.5 text-[12px] font-medium text-exp">{err}</p>}
    </div>
  )
}

/** Bank / wallet / gift card / credit card picker with inline "+ Add" */
export function AccountPicker({ kind, value, onChange, invalid, allowFriend = false, placeholder }) {
  const { data, addBank, addWallet, saveCard } = useData()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [cardExtra, setCardExtra] = useState({ limit: '', billDay: '' })

  let options = []
  let addLabel = ''
  if (kind === 'bank') { options = allBanks(data).map((b) => ({ value: b.id, label: b.name })); addLabel = '+ Add bank account' }
  if (kind === 'wallet') { options = allWallets(data).map((w) => ({ value: w.id, label: w.kind === 'giftcard' ? `${w.name} (gift card)` : w.name })); addLabel = '+ Add wallet' }
  if (kind === 'giftcard') { options = allWallets(data).filter((w) => w.kind === 'giftcard').map((w) => ({ value: w.id, label: w.name })); addLabel = '+ Add new gift card' }
  if (kind === 'card') {
    options = data.cards.map((c) => ({ value: c.id, label: c.name }))
    if (allowFriend) options.push({ value: FRIEND_CC, label: "Friend's credit card" })
    addLabel = '+ Add credit card'
  }

  const onSelect = (v) => {
    if (v === ADD) { setAdding(true); return }
    onChange(v)
  }
  const onAdd = (name) => {
    let created
    if (kind === 'bank') created = addBank(name)
    else if (kind === 'wallet') created = addWallet(name, 'wallet')
    else if (kind === 'giftcard') created = addWallet(name, 'giftcard')
    else created = saveCard({ name, limit: Number(cardExtra.limit), billDay: Number(cardExtra.billDay) || 1, openingOutstanding: 0, status: 'unpaid' })
    onChange(created.id)
    setAdding(false)
    toast(`${name} added${kind === 'giftcard' ? ' to your wallets' : ''}`)
  }
  const cardExtraNode = kind === 'card' && {
    validate: () => (!Number(cardExtra.limit) ? 'Add the credit limit.' : Number(cardExtra.billDay) < 1 || Number(cardExtra.billDay) > 31 ? 'Bill day should be 1–31.' : ''),
    node: (
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input className="!h-10" inputMode="numeric" placeholder="Credit limit ₹" value={cardExtra.limit} onChange={(e) => setCardExtra({ ...cardExtra, limit: e.target.value.replace(/\D/g, '') })} />
        <Input className="!h-10" inputMode="numeric" placeholder="Bill day (1–31)" value={cardExtra.billDay} onChange={(e) => setCardExtra({ ...cardExtra, billDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
      </div>
    ),
  }

  return (
    <div>
      <Select value={value || ''} onChange={(e) => onSelect(e.target.value)} invalid={invalid}>
        <option value="" disabled>{placeholder || 'Choose…'}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value={ADD}>{addLabel}</option>
      </Select>
      {adding && (
        <InlineAdd
          placeholder={kind === 'bank' ? 'e.g. SBI Savings' : kind === 'card' ? 'e.g. Axis Ace' : kind === 'giftcard' ? 'e.g. Amazon gift card' : 'e.g. Paytm'}
          onSave={onAdd}
          onCancel={() => setAdding(false)}
          extra={cardExtraNode || undefined}
        />
      )}
    </div>
  )
}

/** Category dropdown: default + this user's custom categories + inline creator */
export function CategoryPicker({ type, value, onChange, invalid, exclude = [] }) {
  const { data, addCategory } = useData()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const cats = categoriesOf(data, type).filter((c) => !exclude.includes(c.id))
  const defaults = cats.filter((c) => !c.custom)
  const custom = cats.filter((c) => c.custom)
  return (
    <div>
      <Select value={value || ''} onChange={(e) => (e.target.value === ADD ? setAdding(true) : onChange(e.target.value))} invalid={invalid}>
        <option value="" disabled>Choose a category…</option>
        <optgroup label="Categories">{defaults.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
        {custom.length > 0 && <optgroup label="Your categories">{custom.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
        <option value={ADD}>+ Add new category</option>
      </Select>
      {adding && (
        <InlineAdd
          placeholder={type === 'income' ? 'e.g. Side hustle' : 'e.g. Pet care'}
          onCancel={() => setAdding(false)}
          onSave={(name) => {
            if (categoriesOf(data, type).some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast('That category already exists', 'info'); return }
            const c = addCategory(type, name)
            onChange(c.id)
            setAdding(false)
            toast(`“${name}” added. Only you can see it.`)
          }}
        />
      )}
    </div>
  )
}

/** Subcategory dropdown (Trip, Netflix, EB Bill…) + this user's own + inline "+ Add new" */
export function SubcategoryPicker({ cat, value, onChange, invalid, required, placeholder }) {
  const { data, addSubcategory } = useData()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const defaults = cat?.subcategories || []
  const custom = (data.customSubs || {})[cat?.id] || []
  return (
    <div>
      <Select value={value || ''} onChange={(e) => (e.target.value === ADD ? setAdding(true) : onChange(e.target.value))} invalid={invalid}>
        <option value="" disabled={required}>{placeholder || (required ? 'Choose…' : 'None')}</option>
        {defaults.map((s) => <option key={s} value={s}>{s}</option>)}
        {custom.length > 0 && <optgroup label="Added by you">{custom.map((s) => <option key={s} value={s}>{s}</option>)}</optgroup>}
        <option value={ADD}>+ Add new</option>
      </Select>
      {adding && (
        <InlineAdd
          placeholder={cat?.id === 'exp-ott' ? 'e.g. Apple TV+' : cat?.id === 'exp-utilities' ? 'e.g. Property tax' : 'e.g. Concert'}
          onCancel={() => setAdding(false)}
          onSave={(name) => {
            if (subcategoriesOf(data, cat).some((s) => s.toLowerCase() === name.toLowerCase())) { toast('That one already exists', 'info'); return }
            addSubcategory(cat.id, name)
            onChange(name)
            setAdding(false)
            toast(`“${name}” added under ${cat.name}. Only you can see it.`)
          }}
        />
      )}
    </div>
  )
}

/** Pill-style chooser for payment modes */
export function ModeChips({ modes, value, onChange, invalid }) {
  return (
    <div className={cn('grid gap-2', modes.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3', invalid && 'rounded-2xl ring-1 ring-exp ring-offset-2 ring-offset-card')}>
      {modes.map((m) => {
        const active = value === m.value
        return (
          <button key={m.value} type="button" onClick={() => onChange(m.value)} aria-pressed={active}
            className={cn('flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 text-[12.5px] font-semibold whitespace-nowrap transition-all',
              active ? 'border-teal bg-teal-soft text-teal shadow-[0_0_16px_-6px_var(--teal)]' : 'border-line bg-card-2 text-muted hover:text-fg')}>
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

export { Plus }

import { useEffect, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, ListChecks, Plus, Search, X } from 'lucide-react'
import { Icon } from './Icon'
import { Button, Input, Select } from './ui'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { allBanks, allCategories, allWallets, categoriesOf, subcategoriesOf } from '../lib/finance'
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

/**
 * Themed category dropdown (replaces the plain browser list).
 * Form use:   <CategoryPicker type="expense" value onChange />   → one type, "+ Add new category" at the bottom
 * Filter use: <CategoryPicker filter value onChange />           → "All categories" button + Expense / Income tabs
 */
export function CategoryPicker({ type, value, onChange, invalid, exclude = [], filter = false, className }) {
  const { data, addCategory } = useData()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const triggerRef = useRef(null)
  const [portalTo, setPortalTo] = useState(undefined)
  const typeAll = typeof value === 'string' && value.startsWith('type:') ? value.slice(5) : null
  const selected = value && value !== 'all' && !typeAll ? allCategories(data).find((c) => c.id === value) : null
  const [tab, setTab] = useState(type || typeAll || selected?.type || 'expense')
  const activeType = filter ? tab : type
  useEffect(() => { if (open) { setQ(''); setAdding(false); if (filter) setTab(typeAll || selected?.type || 'expense') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = categoriesOf(data, activeType).filter((c) => !exclude.includes(c.id) && c.name.toLowerCase().includes(q.trim().toLowerCase()))
  const pick = (id) => { onChange(id); setOpen(false) }

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setPortalTo(o ? triggerRef.current?.closest('[role="dialog"]') || undefined : portalTo); setOpen(o) }}>
      <Popover.Trigger asChild>
        <button ref={triggerRef} type="button" aria-invalid={invalid || undefined} aria-haspopup="listbox"
          className={cn('ft-input flex cursor-pointer items-center justify-between gap-2 text-left', open && '!border-teal', className)}>
          <span className="flex min-w-0 items-center gap-2.5">
            {selected ? (
              <><span className="grid size-6 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${selected.color} 18%, transparent)`, color: selected.color }}><Icon name={selected.icon} className="size-3.5" /></span>
                <span className="truncate font-semibold text-fg">{selected.name}</span></>
            ) : typeAll ? (
              <span className={cn('truncate font-semibold', typeAll === 'income' ? 'text-inc' : 'text-exp')}>{typeAll === 'income' ? 'All income' : 'All expenses'}</span>
            ) : <span className={cn('truncate', filter ? 'font-semibold text-fg' : 'text-faint')}>{filter ? 'All categories' : 'Choose a category'}</span>}
          </span>
          <ChevronDown className={cn('size-4 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
        </button>
      </Popover.Trigger>
      {/* Inside a popup (Dialog), render the list within it so scrolling and clicking work */}
      <Popover.Portal container={portalTo}>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} onOpenAutoFocus={(e) => e.preventDefault()}
          className="anim-pop z-[70] flex max-h-[min(var(--radix-popover-content-available-height),420px)] w-[max(var(--radix-popover-trigger-width),280px)] flex-col overflow-hidden rounded-2xl border border-line bg-card p-2 shadow-glow-strong">
          {filter && (
            <>
              <button type="button" onClick={() => pick('all')}
                className={cn('mb-2 flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[13.5px] font-semibold', value === 'all' || !value ? 'bg-teal-soft text-teal' : 'text-fg hover:bg-card-2')}>
                All categories {(value === 'all' || !value) && <Check className="size-4" />}
              </button>
              <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl border border-line bg-card-2 p-1">
                {['expense', 'income'].map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={cn('cursor-pointer rounded-lg py-1.5 text-[12.5px] font-semibold capitalize transition', tab === t ? (t === 'expense' ? 'bg-exp text-white' : 'bg-inc text-on-teal') : 'text-muted hover:text-fg')}>{t}</button>
                ))}
              </div>
            </>
          )}
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories" aria-label="Search categories"
              className="h-9 w-full rounded-xl border border-line bg-card-2 pr-3 pl-9 text-[13px] text-fg outline-none placeholder:text-faint focus:border-teal" />
          </div>
          <div role="listbox" className="min-h-0 flex-1 overflow-y-auto">
            {filter && !q.trim() && (() => {
              const on = value === `type:${tab}`
              return (
                <button type="button" role="option" aria-selected={on} onClick={() => pick(`type:${tab}`)}
                  className={cn('mb-1 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-semibold transition', on ? (tab === 'income' ? 'bg-inc-soft text-inc' : 'bg-exp-soft text-exp') : tab === 'income' ? 'text-inc hover:bg-inc-soft' : 'text-exp hover:bg-exp-soft')}>
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-full', tab === 'income' ? 'bg-inc-soft' : 'bg-exp-soft')}><ListChecks className="size-3.5" /></span>
                  <span className="flex-1">{tab === 'income' ? 'All income' : 'All expenses'}</span>
                  {on && <Check className="size-4 shrink-0" />}
                </button>
              )
            })()}
            {list.map((c) => {
              const on = c.id === value
              return (
                <button key={c.id} type="button" role="option" aria-selected={on} onClick={() => pick(c.id)}
                  className={cn('flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition', on ? 'bg-teal-soft font-semibold text-teal' : 'text-fg hover:bg-card-2')}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}><Icon name={c.icon} className="size-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {c.custom && <span className="text-[10.5px] font-semibold text-faint">yours</span>}
                  {on && <Check className="size-4 shrink-0" />}
                </button>
              )
            })}
            {!list.length && <p className="px-3 py-4 text-center text-[12.5px] text-muted">No category matches “{q}”.</p>}
          </div>
          {!filter && (
            <div className="mt-1.5 border-t border-line pt-1.5">
              {adding ? (
                <InlineAdd placeholder={activeType === 'income' ? 'e.g. Side hustle' : 'e.g. Pet care'} onCancel={() => setAdding(false)}
                  onSave={(name) => {
                    if (categoriesOf(data, activeType).some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast('That category already exists', 'info'); return }
                    const c = addCategory(activeType, name)
                    toast(`“${name}” added. Only you can see it.`)
                    pick(c.id)
                  }} />
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-semibold text-teal hover:bg-teal-soft">
                  <Plus className="size-4" />Add new category
                </button>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** Every category visible at once as compact tiles: one tap selects, no scrolling */
export function CategoryGrid({ type, value, onChange, invalid }) {
  const { data, addCategory } = useData()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const cats = categoriesOf(data, type)
  return (
    <div>
      <div role="radiogroup" aria-label="Category"
        className={cn('grid grid-cols-3 gap-1.5 sm:grid-cols-5', invalid && 'rounded-xl ring-1 ring-exp ring-offset-4 ring-offset-card')}>
        {cats.map((c) => {
          const on = c.id === value
          return (
            <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.id)} title={c.name}
              className={cn('flex min-h-[50px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border px-1 py-1.5 text-center text-[11.5px] leading-tight transition-colors',
                on ? 'border-teal bg-teal-soft font-semibold text-teal' : 'border-line bg-card text-fg hover:bg-card-2')}>
              <Icon name={c.icon} className={cn('size-4 shrink-0', on ? 'text-teal' : 'text-muted')} />
              <span className="line-clamp-2 break-words">{c.name}</span>
            </button>
          )
        })}
        <button type="button" onClick={() => setAdding(true)}
          className="flex min-h-[50px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-line px-1.5 text-[11.5px] font-semibold text-teal hover:bg-teal-soft">
          <Plus className="size-4" />New
        </button>
      </div>
      {adding && (
        <InlineAdd placeholder={type === 'income' ? 'e.g. Side hustle' : 'e.g. Pet care'} onCancel={() => setAdding(false)}
          onSave={(name) => {
            if (cats.some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast('That category already exists', 'info'); return }
            const c = addCategory(type, name)
            onChange(c.id)
            setAdding(false)
            toast(`“${name}” added. Only you can see it.`)
          }} />
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
            className={cn('flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border px-2 text-[12.5px] font-semibold whitespace-nowrap transition-all',
              active ? 'border-teal bg-teal-soft text-teal' : 'border-line bg-card text-muted hover:text-fg hover:bg-card-2')}>
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

export { Plus }

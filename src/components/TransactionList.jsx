import { useState } from 'react'
import { MoreVertical, Pencil, Trash2, Repeat, CalendarClock, Users } from 'lucide-react'
import { Badge, Button, ConfirmDialog, Menu } from './ui'
import { CategoryBubble } from './Icon'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { accountName, findCategory, isEmiPurchase, totals } from '../lib/finance'
import { CAT, FRIEND_CC, modeLabel } from '../lib/constants'
import { cn, fmtDateShort, money, monthKey, monthLabel } from '../lib/utils'

const bucketName = (data, t) => (data.buckets || []).find((b) => b.id === t.bucketId)?.name || 'bucket'

export function txnTitle(data, t) {
  if (t.type === 'bucket') return t.description || (t.action === 'deposit' ? `Added to ${bucketName(data, t)}` : t.action === 'withdraw' ? `Taken back from ${bucketName(data, t)}` : `Bought with ${bucketName(data, t)}`)
  const c = findCategory(data, t.categoryId)
  return t.description || (t.subcategory ? `${c.name} · ${t.subcategory}` : c.name)
}

export function txnSubtitle(data, t) {
  if (t.type === 'bucket') {
    const acc = accountName(data, t.mode, t.accountId) || modeLabel(t.mode)
    if (t.action === 'deposit') return `${acc} → ${bucketName(data, t)} bucket`
    if (t.action === 'withdraw') return `${bucketName(data, t)} bucket → ${acc}`
    return `Paid from ${bucketName(data, t)} bucket${t.categoryId ? ` · ${findCategory(data, t.categoryId).name}` : ''} · not counted as expense`
  }
  const c = findCategory(data, t.categoryId)
  const parts = []
  if (t.description) parts.push(t.subcategory ? `${c.name} · ${t.subcategory}` : c.name)
  if (t.type === 'transfer') {
    const to = t.toCardId === FRIEND_CC ? `Friend's card${t.meta?.friendName ? ` (${t.meta.friendName})` : ''}` : accountName(data, 'cc', t.toCardId)
    parts.push(`${accountName(data, t.mode, t.accountId) || modeLabel(t.mode)} → ${to}`)
  } else {
    const acc = accountName(data, t.mode, t.accountId)
    parts.push(acc ? `${modeLabel(t.mode)} · ${acc}` : modeLabel(t.mode))
  }
  if (t.meta?.rechargeFor) parts.push(`for ${t.meta.rechargeFor}`)
  if (t.meta?.incomeType) parts.push(t.meta.incomeType)
  return parts.join(' · ')
}

export function TxnRow({ t, onEdit, compact, effect }) {
  const { data, deleteTransaction, deleteImpact } = useData()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const c = findCategory(data, t.categoryId)
  const emiP = isEmiPurchase(t)
  const isBucket = t.type === 'bucket'
  let color = t.type === 'income' ? 'text-inc' : t.type === 'transfer' ? 'text-net' : isBucket ? 'text-violet' : 'text-exp'
  let sign = t.type === 'income' ? '+' : t.type === 'transfer' ? '↔' : isBucket ? (t.action === 'deposit' ? '→' : t.action === 'withdraw' ? '←' : '•') : '−'
  // In an account's own ledger, show money in (+) or out (−) of that account
  if (effect != null) { sign = effect >= 0 ? '+' : '−'; color = effect >= 0 ? 'text-inc' : 'text-exp' }
  return (
    <div className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-card-2/70 sm:px-4">
      <CategoryBubble icon={t.type === 'transfer' ? 'ArrowLeftRight' : isBucket ? 'PiggyBank' : c.icon} color={t.type === 'transfer' ? 'var(--net)' : isBucket ? 'var(--violet)' : c.color} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-fg">{txnTitle(data, t)}</span>
          {t.sipIndex != null && <Badge tone="inv" className="hidden sm:inline-flex"><Repeat className="size-3" />SIP</Badge>}
          {t.emiIndex && <Badge tone="violet" className="hidden sm:inline-flex"><CalendarClock className="size-3" />EMI</Badge>}
          {emiP && <Badge tone="violet" className="hidden sm:inline-flex">Converted to EMI</Badge>}
          {isBucket && <Badge tone="violet" className="hidden sm:inline-flex">Bucket</Badge>}
          {t.accountId === FRIEND_CC && <Badge tone="muted" className="hidden sm:inline-flex"><Users className="size-3" />Friend CC</Badge>}
        </div>
        <div className="truncate text-[12px] text-muted">
          <span className="font-medium text-faint">{fmtDateShort(t.date)}</span> · {txnSubtitle(data, t)}
        </div>
      </div>
      <div className="text-right">
        <div className={cn('tabular text-[14.5px] font-bold whitespace-nowrap', color, emiP && 'opacity-60')}>{sign}{money(effect != null ? Math.abs(effect) : t.amount).replace('−', '')}</div>
        {emiP && <div className="text-[10.5px] text-faint">on EMI</div>}
      </div>
      {!compact && (
        <Menu
          trigger={<Button variant="ghost" size="icon-sm" aria-label="Transaction actions" className="-mr-1"><MoreVertical className="size-4" /></Button>}
          items={[
            { label: t.sipIndex != null ? 'Edit SIP' : 'Edit', icon: Pencil, onSelect: () => onEdit?.(t) },
            { label: 'Delete', icon: Trash2, danger: true, onSelect: () => setConfirm(true) },
          ]}
        />
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        icon={Trash2}
        title={`Delete “${txnTitle(data, t)}”?`}
        points={[`${sign}${money(t.amount).replace('−', '')} on ${fmtDateShort(t.date)} will be removed.`, ...deleteImpact(t)]}
        confirmLabel={t.sipIndex != null ? 'Skip installment' : 'Delete'}
        onConfirm={() => { deleteTransaction(t.id); toast(t.sipIndex != null ? 'SIP installment skipped' : 'Transaction deleted', 'info') }}
      />
    </div>
  )
}

/** Month-grouped, strictly date-sorted list */
export function GroupedTxnList({ txns, onEdit }) {
  const groups = []
  for (const t of txns) {
    const k = monthKey(t.date)
    if (!groups.length || groups.at(-1).key !== k) groups.push({ key: k, items: [] })
    groups.at(-1).items.push(t)
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const tt = totals(g.items)
        return (
          <section key={g.key}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 px-1">
              <h3 className="font-display text-[14px] font-bold text-fg">{monthLabel(g.key)}</h3>
              <div className="tabular flex gap-3 text-[12px] font-semibold">
                <span className="text-inc">+{money(tt.income)}</span>
                <span className="text-exp">−{money(tt.expense + tt.investments).replace('−', '')}</span>
              </div>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-3xl bg-card shadow-glow">
              {g.items.map((t) => <TxnRow key={t.id} t={t} onEdit={onEdit} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export { CAT }

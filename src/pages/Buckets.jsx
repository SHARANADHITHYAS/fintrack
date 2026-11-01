import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, History, MoreVertical, Pencil, PiggyBank, Plus, ShoppingBag, Trash2, Trophy } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ConfirmDialog, Dialog, EmptyState, Menu } from '../components/ui'
import { PageHero } from '../components/common'
import { BucketFormDialog, BucketIcon, BucketMoveDialog } from '../components/BucketParts'
import { TxnRow } from '../components/TransactionList'
import { useTxnEditor } from '../components/TxnEditor'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { bucketStats } from '../lib/finance'
import { cn, fmtDate, money, sum } from '../lib/utils'

/** Dashboard card: everything saved in buckets, overall progress, each bucket with a quick "+ Add" */
export function BucketsSummary({ className }) {
  const { data } = useData()
  const [move, setMove] = useState({ open: false, bucket: null })
  const all = (data.buckets || []).map((b) => ({ b, s: bucketStats(b, data.transactions) }))
  const list = all.filter((x) => x.s.balance > 0 || !x.s.spent).sort((a, b) => b.s.pctDone - a.s.pctDone)
  const total = sum(list, (x) => x.s.balance)
  const targets = sum(list, (x) => x.s.target)
  const overall = targets ? Math.min(100, (total / targets) * 100) : 0
  const lastAdd = data.transactions.filter((t) => t.type === 'bucket' && t.action === 'deposit').sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
  const lastName = lastAdd ? (data.buckets || []).find((b) => b.id === lastAdd.bucketId)?.name : null
  const closest = list.find((x) => !x.s.reached && x.s.target > 0)
  const done = all.filter((x) => x.s.reached).length
  const shown = list.slice(0, 4)

  return (
    <Card className={cn('flex h-full flex-col p-4 sm:p-6', className)}>
      <CardHeader icon={PiggyBank} title="Savings buckets" subtitle="Money set aside for one thing, apart from savings and investments"
        action={<Link to="/buckets" className="text-[13px] font-semibold whitespace-nowrap text-teal hover:underline">{list.length ? 'View all' : 'Open'}</Link>} />
      {list.length ? (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-[12.5px] text-muted">Saved in buckets</div>
              <div className="text-[24px] font-semibold tracking-tight">{money(total)}</div>
            </div>
            <div className="text-right text-[12.5px] text-muted">
              <div>of {money(targets)} in targets</div>
              <div className="font-semibold text-fg">{Math.round(overall)}% overall</div>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-2"><div className="h-full rounded-full bg-teal" style={{ width: `${overall}%` }} /></div>

          <ul className="mt-4 flex-1 divide-y divide-line">
            {shown.map(({ b, s }) => (
              <li key={b.id} className="py-2.5 first:pt-0">
                <div className="flex items-center gap-2.5">
                  <BucketIcon name={b.icon} className="size-4 shrink-0 text-muted" />
                  <Link to="/buckets" className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-fg hover:underline">{b.name}</Link>
                  {s.reached
                    ? <Badge tone="inc">Target reached</Badge>
                    : <button type="button" onClick={() => setMove({ open: true, bucket: b })} className="cursor-pointer rounded-md px-2 py-0.5 text-[12.5px] font-semibold text-teal hover:bg-teal-soft" aria-label={`Add money to ${b.name}`}>+ Add</button>}
                </div>
                <div className="mt-1.5 ml-[26px] h-1 overflow-hidden rounded-full bg-card-2"><div className={cn('h-full rounded-full', s.reached ? 'bg-inc' : 'bg-teal')} style={{ width: `${s.pctDone}%` }} /></div>
                <div className="mt-1 ml-[26px] flex justify-between text-[12px] text-muted">
                  <span>{money(s.balance)} of {money(s.target)}</span>
                  <span>{s.reached ? 'Ready to spend' : `${money(s.remaining)} to go`}</span>
                </div>
              </li>
            ))}
            {list.length > shown.length && <li className="pt-2.5 text-[12.5px] text-muted">+ {list.length - shown.length} more on the buckets page</li>}
          </ul>

          <p className="mt-3 rounded-xl bg-card-2 px-3.5 py-2.5 text-[12.5px] text-muted">
            {closest ? <>Closest to done: <b className="text-fg">{closest.b.name}</b>, {money(closest.s.remaining)} to go.</> : done ? <>{done} bucket{done > 1 ? 's' : ''} ready to spend.</> : null}
            {lastAdd && <> Last added {money(lastAdd.amount)}{lastName ? ` to ${lastName}` : ''} on {fmtDate(lastAdd.date)}.</>}
          </p>
        </>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">
          <p className="text-[13.5px] text-muted">Saving up for something? Set a target and drop in any amount whenever you can. It stays apart from your savings and investments.</p>
          <div className="mt-4 grid flex-1 gap-2 sm:grid-cols-3">
            {[['Smartphone', 'New phone', '₹30,000'], ['Bike', 'Bike', '₹1,00,000'], ['Plane', 'A trip', '₹40,000']].map(([ic, n, t]) => (
              <Link key={n} to="/buckets" className="flex flex-col justify-between rounded-xl border border-dashed border-line p-3 transition hover:bg-card-2">
                <BucketIcon name={ic} className="size-4 text-muted" />
                <span className="mt-3 text-[13px] font-semibold text-fg">{n}</span>
                <span className="text-[12px] text-muted">e.g. {t}</span>
              </Link>
            ))}
          </div>
          <Link to="/buckets" className="mt-3 inline-flex h-10 items-center justify-center rounded-[10px] bg-primary text-[14px] font-semibold text-on-primary hover:opacity-90">Create a bucket</Link>
        </div>
      )}
      <BucketMoveDialog open={move.open} onOpenChange={(o) => setMove((x) => ({ ...x, open: o }))} bucket={move.bucket} action="deposit" />
    </Card>
  )
}

function BucketCard({ b, s, onMove, onEdit, onDelete, onHistory }) {
  return (
    <Card className={cn('flex flex-col p-4 sm:p-5', s.reached && 'ring-2 ring-inc/60')}>
      <div className="flex items-start gap-3">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', s.reached ? 'bg-inc-soft text-inc' : 'bg-violet-soft text-violet')}><BucketIcon name={b.icon} className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-bold">{b.name}</div>
          <div className="truncate text-[12px] text-muted">{b.note || `${s.deposits} deposit${s.deposits === 1 ? '' : 's'} so far`}</div>
        </div>
        {s.reached ? <Badge tone="inc"><Trophy className="size-3" />Target reached</Badge> : <Badge tone="violet">{Math.round(s.pctDone)}%</Badge>}
        <Menu trigger={<Button variant="ghost" size="icon-sm" aria-label={`${b.name} actions`}><MoreVertical className="size-4" /></Button>}
          items={[
            { label: 'History', icon: History, onSelect: onHistory },
            s.balance > 0 && { label: 'Take money back', icon: ArrowUpFromLine, onSelect: () => onMove('withdraw') },
            { label: 'Edit bucket', icon: Pencil, onSelect: onEdit },
            { label: 'Delete bucket', icon: Trash2, danger: true, onSelect: onDelete },
          ]} />
      </div>
      <div className="tabular mt-4 font-display text-[24px] font-extrabold">{money(s.balance)} <span className="text-[13px] font-medium text-muted">of {money(s.target)}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-2"><div className={cn('h-full rounded-full transition-all', s.reached ? 'bg-inc' : 'bg-teal')} style={{ width: `${s.pctDone}%` }} /></div>
      <div className="mt-2 flex justify-between text-[12px] text-muted">
        <span>{s.reached ? 'Ready when you are 🎉' : `${money(s.remaining)} to go`}</span>
        {s.spent > 0 && <span>Spent {money(s.spent)}</span>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant={s.reached ? 'secondary' : 'primary'} size="sm" onClick={() => onMove('deposit')}><ArrowDownToLine className="size-4" />Add money</Button>
        <Button variant={s.reached ? 'primary' : 'secondary'} size="sm" onClick={() => onMove('spend')} disabled={s.balance <= 0}><ShoppingBag className="size-4" />Spend</Button>
      </div>
    </Card>
  )
}

export default function Buckets() {
  const { data, deleteBucket } = useData()
  const toast = useToast()
  const { openEdit, dialogs } = useTxnEditor()
  const [form, setForm] = useState({ open: false, initial: null })
  const [move, setMove] = useState({ open: false, bucket: null, action: 'deposit' })
  const [del, setDel] = useState(null)
  const [hist, setHist] = useState(null)

  const rows = (data.buckets || []).map((b) => ({ b, s: bucketStats(b, data.transactions) }))
  const active = rows.filter((r) => !(r.s.balance <= 0 && r.s.spent > 0))
  const done = rows.filter((r) => r.s.balance <= 0 && r.s.spent > 0)
  const total = sum(rows, (r) => r.s.balance)
  const histRow = hist ? rows.find((r) => r.b.id === hist) : null

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-fg"><ArrowLeft className="size-4" />Dashboard</Link>
      <PageHero title="Savings buckets" subtitle="Little by little, a lot. Put any amount aside each month for the thing you really want."
        right={<>
          <div className="rounded-2xl border border-line bg-card px-4 py-2.5 text-right shadow-glow"><div className="text-[12px] font-semibold text-muted">In buckets</div><div className="tabular font-display text-xl font-extrabold text-violet">{money(total)}</div></div>
          <Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus className="size-4" />New bucket</Button>
        </>} />

      {active.length ? (
        <div className="anim-rise grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map(({ b, s }) => (
            <BucketCard key={b.id} b={b} s={s}
              onMove={(action) => setMove({ open: true, bucket: b, action })}
              onEdit={() => setForm({ open: true, initial: b })}
              onDelete={() => setDel({ b, s })}
              onHistory={() => setHist(b.id)} />
          ))}
        </div>
      ) : (
        <Card><EmptyState icon={PiggyBank} title="Start your first bucket" text="A new phone, a bike, a trip. Set a target, add whatever you can each month, and spend it guilt-free once it's full."
          action={<Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus className="size-4" />New bucket</Button>} /></Card>
      )}

      {done.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-extrabold">Completed 🎉</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {done.map(({ b, s }) => (
              <Card key={b.id} className="flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-inc-soft text-inc"><BucketIcon name={b.icon} className="size-5" /></span>
                <div className="min-w-0 flex-1"><div className="truncate font-bold">{b.name}</div><div className="text-[12px] text-muted">Spent {money(s.spent)}</div></div>
                <Button variant="ghost" size="sm" onClick={() => setHist(b.id)}>History</Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="rounded-2xl bg-card-2 px-4 py-3 text-[12.5px] text-muted">
        Money you add leaves the chosen account and shows as “Bucket” in your monthly balance, not as an expense, saving or investment. When you spend from a bucket, the purchase isn't counted again as that month's expense.
      </p>

      <BucketFormDialog open={form.open} onOpenChange={(o) => setForm((x) => ({ ...x, open: o }))} initial={form.initial} />
      <BucketMoveDialog open={move.open} onOpenChange={(o) => setMove((x) => ({ ...x, open: o }))} bucket={move.bucket} action={move.action} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} icon={Trash2} title={`Delete the “${del?.b.name}” bucket?`}
        points={del ? [`Its ${del.s.moves.length} entr${del.s.moves.length === 1 ? 'y is' : 'ies are'} removed too.`, del.s.balance > 0 ? `The ${money(del.s.balance)} still inside goes back to the accounts it came from.` : 'Nothing is left inside it.'] : []}
        onConfirm={() => { deleteBucket(del.b.id); toast('Bucket deleted', 'info') }} />
      <Dialog open={!!histRow} onOpenChange={(o) => !o && setHist(null)} size="lg" icon={History} title={histRow ? `${histRow.b.name} history` : ''} description={histRow ? `Added ${money(histRow.s.deposited)} · taken back ${money(histRow.s.withdrawn)} · spent ${money(histRow.s.spent)}` : ''}>
        {histRow?.s.moves.length ? (
          <div className="-mx-3 divide-y divide-line sm:-mx-4">{histRow.s.moves.map((t) => <TxnRow key={t.id} t={t} onEdit={openEdit} />)}</div>
        ) : <EmptyState icon={History} title="No entries yet" text="Add money to see it here." />}
      </Dialog>
      {dialogs}
    </div>
  )
}

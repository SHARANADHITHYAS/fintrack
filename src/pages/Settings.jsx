import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Database, PiggyBank, Gift, Landmark, LogOut, Moon, Palette, Pencil, Plus, Sparkles, Sun, Tag, Target, Trash2, User, Wallet, X, ShieldCheck, Download, FileUp, Upload } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ConfirmDialog, Input, Segmented, Select } from '../components/ui'
import { PageHero } from '../components/common'
import GoalDialog from '../components/GoalDialog'
import ImportDialog from '../components/ImportDialog'
import { downloadTemplate } from '../lib/importer'
import { CategoryBubble } from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { allBanks, allWallets, currentGoal } from '../lib/finance'
import { lineFor } from '../lib/greetings'
import { fmtDate, initials, moneyK, cn } from '../lib/utils'

function Row({ icon: I, title, sub, children, tone = 'violet' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone === 'violet' ? 'bg-violet-soft text-violet' : 'bg-teal-soft text-teal')}><I className="size-5" /></span>
        <div className="min-w-0"><div className="text-[14px] font-semibold text-fg">{title}</div>{sub && <div className="truncate text-[12.5px] text-muted">{sub}</div>}</div>
      </div>
      {children}
    </div>
  )
}

function SourceList({ title, icon, items, onAdd, onRemove, placeholder, usage }) {
  const [name, setName] = useState('')
  const [confirm, setConfirm] = useState(null)
  const add = () => { if (!name.trim()) return; onAdd(name.trim()); setName('') }
  return (
    <Card className="p-4 sm:p-6">
      <CardHeader icon={icon} title={title} subtitle="Default ones are shared by everyone. The ones you add are yours alone." />
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-card-2 px-3.5 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[14px] font-medium text-fg">
              {it.kind === 'giftcard' ? <Gift className="size-4 text-warn" /> : null}
              <span className="truncate">{it.name}</span>
              {it.builtIn && <Badge tone="muted">Default</Badge>}
              {it.kind === 'giftcard' && <Badge tone="warn">Gift card</Badge>}
            </span>
            {!it.builtIn && <Button variant="ghost" size="icon-sm" aria-label={`Remove ${it.name}`} onClick={() => setConfirm(it)}><Trash2 className="size-4 text-exp" /></Button>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === 'Enter' && add()} className="!h-10" />
        <Button variant="soft" onClick={add} className="!h-10"><Plus className="size-4" />Add</Button>
      </div>
      <ConfirmDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} icon={Trash2} title={`Remove ${confirm?.name}?`}
        points={confirm ? [usage(confirm.id) ? `${usage(confirm.id)} past transaction(s) keep their amounts but show “Removed”.` : 'No transactions use it.', 'You can add it again any time.'] : []}
        confirmLabel="Remove" onConfirm={() => onRemove(confirm.id)} />
    </Card>
  )
}

export default function SettingsPage() {
  const { user, logout, updateProfile } = useAuth()
  const { data, addBank, removeBank, addWallet, removeWallet, addCategory, removeCategory, loadDemo, resetData } = useData()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const nav = useNavigate()
  const [editName, setEditName] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [goalOpen, setGoalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [catType, setCatType] = useState('expense')
  const [catName, setCatName] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [confirmCat, setConfirmCat] = useState(null)
  const goal = currentGoal(data.goals)
  const usage = (id) => data.transactions.filter((t) => t.accountId === id).length
  const customCats = data.categories

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHero title="Settings" subtitle={lineFor('settings')} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <CardHeader icon={User} title="Profile" subtitle="Your basic details" />
          <div className="mt-5 flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-net font-display text-xl font-extrabold text-white">{initials(user?.name)}</span>
            <div className="min-w-0 flex-1">
              {editName ? (
                <div className="flex gap-2">
                  <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="!h-10" onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { updateProfile({ name: name.trim() }); setEditName(false); toast('Name updated') } }} />
                  <Button size="icon" variant="primary" className="!size-10" aria-label="Save name" onClick={() => { if (!name.trim()) return; updateProfile({ name: name.trim() }); setEditName(false); toast('Name updated') }}><Check className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="!size-10" aria-label="Cancel" onClick={() => { setName(user?.name); setEditName(false) }}><X className="size-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center gap-2"><span className="truncate font-display text-lg font-extrabold">{user?.name}</span><Button variant="ghost" size="icon-sm" aria-label="Edit name" onClick={() => setEditName(true)}><Pencil className="size-3.5" /></Button></div>
              )}
              <div className="truncate text-[13.5px] text-muted">{user?.email}</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-muted">Account status</div><div className="mt-0.5 flex items-center gap-1.5 font-bold text-inc"><span className="size-2 rounded-full bg-inc" />Active</div></div>
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-muted">Member since</div><div className="mt-0.5 font-bold text-fg">{user?.createdAt ? fmtDate(user.createdAt.slice(0, 10)) : '—'}</div></div>
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-muted">Transactions</div><div className="mt-0.5 font-bold text-fg">{data.transactions.length}</div></div>
            <div className="rounded-2xl bg-card-2 p-3"><div className="text-muted">Cards · Investments</div><div className="mt-0.5 font-bold text-fg">{data.cards.length} · {data.investments.length}</div></div>
          </div>
          <Button variant="danger-soft" size="lg" className="mt-5 w-full" onClick={() => { logout(); nav('/login') }}><LogOut className="size-4" />Log out</Button>
        </Card>

        <Card className="p-4 sm:p-6">
          <CardHeader icon={Palette} title="Preferences" subtitle="Make FinTrack feel like yours" />
          <div className="mt-2 divide-y divide-line">
            <Row icon={theme === 'dark' ? Moon : Sun} title="Theme" sub={theme === 'dark' ? 'Dark neon' : 'Light'}>
              <Segmented size="sm" className="w-56" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }]} />
            </Row>
            <Row icon={Target} title="Monthly savings goal" sub={goal ? (goal.mode === 'amount' ? `${moneyK(goal.value)} a month` : `${goal.value}% of income`) : 'Not set yet'}>
              <Button variant="soft" size="sm" onClick={() => setGoalOpen(true)}>{goal ? <><Pencil className="size-3.5" />Edit</> : <><Plus className="size-4" />Set goal</>}</Button>
            </Row>
            <Row icon={PiggyBank} tone="teal" title="Savings buckets" sub="Money set aside for a phone, bike, trip…">
              <Button variant="secondary" size="sm" onClick={() => nav('/buckets')}>Open</Button>
            </Row>
            <Row icon={Landmark} tone="teal" title="Account balances" sub="Set and track bank, wallet and cash balances">
              <Button variant="secondary" size="sm" onClick={() => nav('/accounts')}>Open</Button>
            </Row>
            <Row icon={ShieldCheck} tone="teal" title="Privacy" sub="Your data is visible only in your own login" />
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <CardHeader icon={FileUp} title="Import and export" subtitle="Bring in transactions from Excel: income, expenses, investments, card spends, bill payments and buckets." />
        <ol className="mt-4 grid gap-2 text-[13px] sm:grid-cols-3">
          {[['1', 'Download the template', 'It has examples and your exact bank, card and category names.'], ['2', 'Fill your rows', 'One row per transaction. DD-MM-YYYY dates.'], ['3', 'Upload it here', 'Check the preview, then confirm. Duplicates are skipped.']].map(([n, h, p]) => (
            <li key={n} className="flex gap-3 rounded-2xl bg-card-2 p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal-soft text-[12px] font-bold text-teal">{n}</span>
              <span><b className="block text-fg">{h}</b><span className="text-[12px] text-muted">{p}</span></span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => downloadTemplate(data).then(() => toast('Template downloaded'))}><Download className="size-4" />Download template</Button>
          <Button variant="primary" onClick={() => setImportOpen(true)}><Upload className="size-4" />Import file</Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <SourceList title="Bank accounts" icon={Landmark} items={allBanks(data)} onAdd={(n) => { addBank(n); toast(`${n} added`) }} onRemove={(id) => { removeBank(id); toast('Bank removed', 'info') }} placeholder="e.g. SBI Savings" usage={usage} />
        <SourceList title="Wallets and gift cards" icon={Wallet} items={allWallets(data)} onAdd={(n) => { addWallet(n); toast(`${n} added`) }} onRemove={(id) => { removeWallet(id); toast('Wallet removed', 'info') }} placeholder="e.g. Paytm, PhonePe" usage={usage} />
      </div>

      <Card className="p-4 sm:p-6">
        <CardHeader icon={Tag} title="Your categories" subtitle="Custom categories appear only in your login. The default ones are shared by everyone." />
        <div className="mt-4 flex flex-wrap gap-2">
          {customCats.length ? customCats.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-card-2 py-1 pr-1 pl-1.5 text-[13px] font-medium">
              <CategoryBubble icon={c.icon} color={c.color} size="sm" className="!size-6 [&_svg]:!size-3.5" />{c.name}
              <Badge tone={c.type === 'income' ? 'inc' : 'exp'}>{c.type}</Badge>
              <button className="grid size-6 cursor-pointer place-items-center rounded-full text-faint hover:bg-exp-soft hover:text-exp" aria-label={`Remove ${c.name}`} onClick={() => setConfirmCat(c)}><X className="size-3.5" /></button>
            </span>
          )) : <p className="text-[13px] text-muted">No custom categories yet. Add one below, or on the spot while recording a transaction.</p>}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Select value={catType} onChange={(e) => setCatType(e.target.value)} className="!h-10 sm:w-36"><option value="expense">Expense</option><option value="income">Income</option></Select>
          <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Pet care" className="!h-10"
            onKeyDown={(e) => { if (e.key === 'Enter' && catName.trim()) { addCategory(catType, catName); setCatName(''); toast('Category added') } }} />
          <Button variant="soft" className="!h-10" onClick={() => { if (!catName.trim()) return; addCategory(catType, catName); setCatName(''); toast('Category added') }}><Plus className="size-4" />Add category</Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <CardHeader icon={Database} title="Your data" subtitle="Saved securely in this browser for your account. Google Sheets and Drive sync can be connected later." />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setConfirmDemo(true)}><Sparkles className="size-4" />Load sample data</Button>
          <Button variant="danger-soft" onClick={() => setConfirmReset(true)}><Trash2 className="size-4" />Reset all my data</Button>
        </div>
      </Card>

      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog open={confirmDemo} onOpenChange={setConfirmDemo} icon={Sparkles} tone="primary" confirmLabel="Load sample data" title="Replace your data with sample data?"
        points={['6 months of sample income, expenses, 2 cards, an EMI, SIPs and a ₹5k goal.', 'Your current entries in this account are replaced. Other logins are not affected.']}
        onConfirm={() => { loadDemo(); toast('Sample data loaded. Explore away!') }} />
      <ConfirmDialog open={confirmReset} onOpenChange={setConfirmReset} icon={Trash2} confirmLabel="Reset everything" title="Reset all your data?"
        points={['All transactions, cards, investments, EMIs, goals and custom items in this account are deleted.', "This can't be undone. Other logins are not affected."]}
        onConfirm={() => { resetData(); toast('Fresh start. Your data was cleared.', 'info') }} />
      <ConfirmDialog open={!!confirmCat} onOpenChange={(o) => !o && setConfirmCat(null)} icon={Trash2} confirmLabel="Remove" title={`Remove “${confirmCat?.name}”?`}
        points={confirmCat ? [`${data.transactions.filter((t) => t.categoryId === confirmCat.id).length} transaction(s) using it will show as “Uncategorised”.`] : []}
        onConfirm={() => { removeCategory(confirmCat.id); toast('Category removed', 'info') }} />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, CreditCard, Donut, Pencil, PiggyBank, Rocket, Sparkles, Target, Activity } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState } from '../components/ui'
import { PageHero, PeriodSelect, StatCards, StreakBadge } from '../components/common'
import { CategoryDonut, IncomeExpenseChart, SavingsGoalChart } from '../components/charts'
import { TxnRow } from '../components/TransactionList'
import GoalDialog from '../components/GoalDialog'
import { AccountsSummary } from './Accounts'
import { useTxnEditor } from '../components/TxnEditor'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { categoryBreakdown, chartMonths, currentGoal, earliestDate, filterRange, goalAmount, goalEntryFor, monthlySeries, sortTxns, totals, totalsUpTo, trackingStreak, investmentStats } from '../lib/finance'
import { lineFor, streakText, timeGreeting } from '../lib/greetings'
import { firstName, moneyK, money, monthLabel, monthShort, periodRange, cn, round2 } from '../lib/utils'

export function usePeriodState(key, initial = 'this-month') {
  const [period, setPeriodRaw] = useState(() => sessionStorage.getItem(`ft:${key}:period`) || initial)
  const [custom, setCustomRaw] = useState(() => { try { return JSON.parse(sessionStorage.getItem(`ft:${key}:custom`)) || {} } catch { return {} } })
  const setPeriod = (p) => { sessionStorage.setItem(`ft:${key}:period`, p); setPeriodRaw(p) }
  const setCustom = (c) => { sessionStorage.setItem(`ft:${key}:custom`, JSON.stringify(c)); setCustomRaw(c) }
  return { period, setPeriod, custom, setCustom }
}

/** Notes under the 4 stat cards, comparing with the previous period when it makes sense */
export function statNotes(data, period, t, range) {
  const notes = {}
  const prevKey = period === 'this-month' ? 'last-month' : null
  if (prevKey) {
    const p = totals(filterRange(data.transactions, periodRange(prevKey)))
    const d = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : null)
    const di = d(t.income, p.income), de = d(t.expense, p.expense)
    // A month that has just started shouldn't read as "↓ 100%"
    if (!t.income) notes.income = { text: 'No income logged yet' }
    else if (di != null) notes.income = { text: `${di >= 0 ? '↑' : '↓'} ${Math.abs(di)}% vs last month`, tone: di >= 0 ? 'inc' : 'exp' }
    if (!t.expense) notes.expense = { text: 'Nothing spent yet 🙌' }
    else if (de != null) notes.expense = { text: `${de >= 0 ? '↑' : '↓'} ${Math.abs(de)}% vs last month`, tone: de > 0 ? 'exp' : 'inc' }
  }
  if (!notes.income) notes.income = { text: range.label }
  if (!notes.expense) notes.expense = { text: t.expense ? 'Excl. investments' : 'Nothing spent yet 🙌' }
  const activeSips = data.investments.filter((i) => i.type === 'sip' && investmentStats(i, data.transactions).status === 'active').length
  notes.investments = { text: activeSips ? `${activeSips} SIP${activeSips > 1 ? 's' : ''} running` : 'Put your money to work' }
  notes.net = { text: t.income > 0 ? `${Math.max(0, Math.round((t.net / t.income) * 100))}% of income saved` : 'Income − expense − invested' }
  return notes
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, setPrefs, loadDemo } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const { openEdit, dialogs } = useTxnEditor()
  const { period, setPeriod, custom, setCustom } = usePeriodState('dash')
  const [goalOpen, setGoalOpen] = useState(false)

  const earliest = earliestDate(data)
  const range = periodRange(period, custom, earliest)
  const inPeriod = useMemo(() => filterRange(data.transactions, range), [data.transactions, range.start, range.end]) // eslint-disable-line react-hooks/exhaustive-deps
  const t = totals(inPeriod)
  // Investments and net balance accumulate over time; leftover money carries into the next month.
  const upTo = totalsUpTo(data.transactions, range.end)
  const carried = round2(upTo.net - t.net)
  const cards = { income: t.income, expense: t.expense, investments: upTo.investments, net: upTo.net }
  const notes = statNotes(data, period, t, range)
  notes.investments = { text: t.investments ? `All time · ${moneyK(t.investments)} this period` : 'All time total' }
  notes.net = t.net < 0 && carried > 0
    ? { text: `Savings covered a ${moneyK(-t.net)} gap`, tone: 'net' }
    : carried
      ? { text: `Incl. ${moneyK(carried)} carried forward`, tone: carried > 0 ? 'inc' : 'exp' }
      : { text: 'Income − expense − invested' }
  const months = chartMonths(range, 6)
  const series = monthlySeries(data.transactions, months)
  const cats = categoryBreakdown(data, inPeriod)
  const streak = trackingStreak(data.transactions)
  const goal = currentGoal(data.goals)

  const savingsSeries = series.map((m) => ({ month: m.month, income: m.income, savings: m.net, goal: goalAmount(goalEntryFor(data.goals, m.month), m.income) }))
  const withGoal = savingsSeries.filter((s) => s.goal != null)
  const hits = withGoal.filter((s) => s.savings >= s.goal).length
  const changes = []
  for (let i = 1; i < savingsSeries.length; i++) {
    const a = goalEntryFor(data.goals, savingsSeries[i - 1].month), b = goalEntryFor(data.goals, savingsSeries[i].month)
    if (a && b && a !== b) changes.push({ month: savingsSeries[i].month, up: savingsSeries[i].goal > savingsSeries[i - 1].goal, value: b.mode === 'amount' ? moneyK(b.value) : `${b.value}%` })
  }
  const last = savingsSeries.at(-1)
  const recent = sortTxns(data.transactions).slice(0, 6)
  const empty = data.transactions.length === 0

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHero
        title={`${timeGreeting()}, ${firstName(user?.name)} 👋`}
        subtitle={lineFor('dashboard')}
        badge={<StreakBadge text={streakText(streak)} />}
        right={<PeriodSelect value={period} onChange={setPeriod} custom={custom} onCustomChange={setCustom} />}
      />

      {!data.prefs?.onboarded && (
        <Card className="anim-pop relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -top-20 -right-10 size-56 rounded-full bg-teal/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-soft text-teal"><Rocket className="size-6" /></span>
              <div>
                <h2 className="font-display text-lg font-extrabold">Welcome aboard, {firstName(user?.name)}! Let's set you up</h2>
                <p className="mt-1 text-[13.5px] text-muted">Three quick steps and FinTrack starts working for you. Everything is optional, and you can skip any step.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => setGoalOpen(true)}><Target className="size-4" />Set savings goal</Button>
              <Button variant="secondary" onClick={() => nav('/cards')}><CreditCard className="size-4" />Add a card</Button>
              {empty && <Button variant="secondary" onClick={() => { loadDemo(); toast('Sample data loaded. Explore away!') }}><Sparkles className="size-4" />Explore with sample data</Button>}
              <Button variant="ghost" onClick={() => setPrefs({ onboarded: true })}>Skip for now</Button>
            </div>
          </div>
        </Card>
      )}

      <StatCards t={cards} notes={notes} />

      <AccountsSummary />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="p-4 sm:p-6 lg:col-span-3">
          <CardHeader icon={BarChart3} title="Income vs expense" subtitle={`${months.length} months, compared month by month`}
            action={<div className="hidden gap-3 text-[12px] font-semibold text-muted sm:flex"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-inc" />Income</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-exp" />Expense</span></div>} />
          <div className="mt-4">{empty ? <EmptyState icon={BarChart3} title="Your chart is waiting" text="Add your first income or expense on the Transactions page and watch this fill up." action={<Button variant="primary" onClick={() => nav('/transactions')}>Go to Transactions <ArrowRight className="size-4" /></Button>} /> : <IncomeExpenseChart series={series} />}</div>
        </Card>
        <Card className="p-4 sm:p-6 lg:col-span-2">
          <CardHeader icon={Donut} title="Where your money went" subtitle={`${range.label} expenses`} />
          <div className="mt-5">{cats.length ? <CategoryDonut items={cats} total={t.expense} /> : <EmptyState icon={Donut} title="No expenses in this period" text="Nice and quiet. Spending shows up here by category." />}</div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="p-4 sm:p-6 lg:col-span-3">
          <CardHeader icon={PiggyBank} title="Monthly savings vs your goal" subtitle="Green months beat your goal, amber months fell a little short."
            action={goal ? (
              <Button variant="soft" size="sm" onClick={() => setGoalOpen(true)} title="Change your goal"><Target className="size-4" />Goal: {goal.mode === 'amount' ? moneyK(goal.value) : `${goal.value}%`}<Pencil className="size-3.5 opacity-70" /></Button>
            ) : null} />
          {!goal && data.goals.length === 0 ? (
            <EmptyState className="py-8" icon={Target} title="Give your savings a target" text="Set a monthly goal and we'll cheer every month you hit it." action={<Button variant="primary" onClick={() => setGoalOpen(true)}>Set a monthly goal</Button>} />
          ) : (
            <>
              {changes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {changes.map((c) => <Badge key={c.month} tone={c.up ? 'inc' : 'warn'}>{c.up ? '↑ Goal raised' : '↓ Goal lowered'} to {c.value} in {monthShort(c.month)}</Badge>)}
                </div>
              )}
              <div className="mt-3"><SavingsGoalChart series={savingsSeries} /></div>
              <div className="mt-2 flex flex-wrap gap-4 text-[12px] font-semibold text-muted">
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-inc" />Goal hit</span>
                <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-warn" />Below goal</span>
                <span className="text-violet">- - - Goal for that month</span>
              </div>
              {withGoal.length > 0 && (
                <p className="mt-3 rounded-2xl bg-card-2 px-4 py-3 text-[13px] text-fg">
                  You hit your goal in <b className="text-inc">{hits} of {withGoal.length} months</b>.{' '}
                  {last?.goal != null && (last.savings >= last.goal ? <>{monthLabel(last.month).split(' ')[0]}'s goal is done, nicely played 🎉</> : <>Save <b>{money(last.goal - last.savings)}</b> more to hit {monthLabel(last.month).split(' ')[0]}'s goal. You've got this 💪</>)}
                </p>
              )}
            </>
          )}
        </Card>
        <Card className="flex flex-col p-4 sm:p-6 lg:col-span-2">
          <CardHeader icon={Activity} title="Latest activity" subtitle="Your most recent entries" action={<Link to="/transactions" className="text-[13px] font-semibold text-teal hover:underline">View all</Link>} />
          <div className={cn('mt-3 -mx-3 flex-1 divide-y divide-line sm:-mx-4', !recent.length && 'grid place-items-center')}>
            {recent.length ? recent.map((x) => <TxnRow key={x.id} t={x} onEdit={openEdit} />) : <EmptyState icon={Activity} title="Nothing here yet… for now" text="Your first entry is one tap away on the Transactions page." />}
          </div>
        </Card>
      </div>

      <p className="pt-2 text-center text-[13px] text-faint italic">“Small, steady steps. Consistency beats intensity every single month.”</p>
      <GoalDialog open={goalOpen} onOpenChange={(o) => { setGoalOpen(o); if (!o && !data.prefs?.onboarded && data.goals.length) setPrefs({ onboarded: true }) }} />
      {dialogs}
    </div>
  )
}

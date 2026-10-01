import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { Button, Dialog, Field, MoneyInput, Segmented, Input } from './ui'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { currentGoal, totals, monthlySeries } from '../lib/finance'
import { cn, money, moneyK, monthKeyOf, parseAmount } from '../lib/utils'

export default function GoalDialog({ open, onOpenChange }) {
  const { data, setGoal, removeGoal } = useData()
  const toast = useToast()
  const g = currentGoal(data.goals)
  const [mode, setMode] = useState('amount')
  const [value, setValue] = useState('')
  const [apply, setApply] = useState('forward')
  const [err, setErr] = useState('')

  // Average monthly income over the last 6 months, for suggestions
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return monthKeyOf(d) })
  const inc = monthlySeries(data.transactions, months).map((m) => m.income).filter((v) => v > 0)
  const avgIncome = inc.length ? inc.reduce((a, b) => a + b, 0) / inc.length : totals(data.transactions).income

  useEffect(() => {
    if (!open) return
    setMode(g?.mode || 'amount'); setValue(g ? String(g.value) : ''); setApply(data.goals.length ? 'forward' : 'all'); setErr('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const v = parseAmount(value)
  const chips = mode === 'amount' ? [3000, 5000, 8000, 10000] : [10, 15, 20, 25]
  const save = () => {
    if (!(v > 0)) return setErr('Enter a goal above 0.')
    if (mode === 'percent' && v > 100) return setErr('Keep it at 100% or below.')
    setGoal({ mode, value: v, apply })
    toast("Goal saved. Let's make it happen 🚀")
    onOpenChange(false)
  }

  const Radio = ({ val, title, text }) => (
    <button type="button" onClick={() => setApply(val)} className={cn('flex w-full cursor-pointer gap-3 rounded-2xl border p-3 text-left transition-all', apply === val ? 'border-teal bg-teal-soft' : 'border-line bg-card-2 hover:border-teal/50')}>
      <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2', apply === val ? 'border-teal' : 'border-faint')}>{apply === val && <span className="size-2 rounded-full bg-teal" />}</span>
      <span><span className="block text-[13.5px] font-semibold text-fg">{title}</span><span className="block text-[12px] text-muted">{text}</span></span>
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm" icon={Target} title="Set your monthly savings goal" description="Small goals kept every month beat big goals forgotten."
      footer={<>
        {g && <Button variant="ghost" className="mr-auto text-exp" onClick={() => { removeGoal(); toast('Goal removed', 'info'); onOpenChange(false) }}>Remove goal</Button>}
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="primary" onClick={save}>Save goal</Button>
      </>}>
      <div className="space-y-4">
        <Segmented value={mode} onChange={(m) => { setMode(m); setValue(''); setErr('') }} options={[{ value: 'amount', label: 'Fixed amount ₹' }, { value: 'percent', label: '% of income' }]} />
        <Field error={err}>
          {mode === 'amount' ? (
            <MoneyInput big value={value} onChange={(x) => { setValue(x); setErr('') }} placeholder="5000" autoFocus />
          ) : (
            <div className="relative"><Input inputMode="decimal" autoFocus className="!h-14 !pr-10 !text-2xl !font-bold" value={value} placeholder="15" onChange={(e) => { setValue(e.target.value.replace(/[^\d.]/g, '')); setErr('') }} /><span className="absolute top-1/2 right-4 -translate-y-1/2 text-xl font-bold text-faint">%</span></div>
          )}
        </Field>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => { setValue(String(c)); setErr('') }}
              className={cn('cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all', Number(value) === c ? 'border-teal bg-teal-soft text-teal' : 'border-line text-fg hover:border-teal/60')}>
              {mode === 'amount' ? moneyK(c) : `${c}%`}
            </button>
          ))}
        </div>
        <p className="rounded-2xl bg-violet-soft px-3.5 py-2.5 text-[12.5px] text-fg">
          {avgIncome > 0
            ? v > 0
              ? mode === 'amount' ? <>That's about <b className="text-violet">{Math.round((v / avgIncome) * 100)}%</b> of your average income ({money(avgIncome)}).</> : <>That's about <b className="text-violet">{money((avgIncome * v) / 100)}</b> a month, and it adjusts when your income changes.</>
              : <>Tip: many people start with <b className="text-violet">15%</b> of income, about {money(avgIncome * 0.15)} for you.</>
            : <>Tip: a goal of 15–20% of your income is a healthy start.</>}
        </p>
        {data.goals.length > 0 && (
          <div className="space-y-2">
            <Radio val="forward" title="From this month onwards" text="Past months keep the goal they had, so your history stays honest." />
            <Radio val="all" title="Apply to all months" text="Re-check every past month against this new goal." />
          </div>
        )}
      </div>
    </Dialog>
  )
}

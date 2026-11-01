import { Scale } from 'lucide-react'
import { Card, CardHeader } from './ui'
import { monthlyBalance } from '../lib/finance'
import { cn, money, monthLabel } from '../lib/utils'

/**
 * Month-by-month: Income − Expense − Invested − Bucket = Left that month,
 * and the running net balance that carries into the next month.
 */
export default function MonthlyBalance({ txns, months, plain = false }) {
  const rows = monthlyBalance(txns, months)
  if (!rows.length) return null
  const first = rows[0], last = rows.at(-1)
  const cell = 'px-3 py-2.5 text-right tabular whitespace-nowrap'
  const Wrap = plain ? 'div' : Card
  return (
    <Wrap className={plain ? '' : 'p-4 sm:p-6'}>
      {!plain && <CardHeader icon={Scale} title="Monthly balance" subtitle="What's left each month after spending, investing and bucket savings, and how it carries forward" />}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="text-[12px] font-semibold text-muted">
              <th className="px-3 py-2 text-left font-semibold">Month</th>
              <th className="px-3 py-2 text-right font-semibold">Income</th>
              <th className="px-3 py-2 text-right font-semibold">Expense</th>
              <th className="px-3 py-2 text-right font-semibold">Invested</th>
              <th className="px-3 py-2 text-right font-semibold">Bucket</th>
              <th className="px-3 py-2 text-right font-semibold text-fg">Left this month</th>
              <th className="px-3 py-2 text-right font-semibold text-fg">Net balance</th>
            </tr>
          </thead>
          <tbody>
            {first.carriedIn !== 0 && (
              <tr className="border-t border-line text-[12px] text-muted">
                <td className="px-3 py-2" colSpan={6}>Carried from earlier months</td>
                <td className={cn(cell, 'py-2 font-semibold', first.carriedIn < 0 ? 'text-exp' : 'text-fg')}>{money(first.carriedIn)}</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.month} className={cn('border-t border-line', r === last && 'bg-card-2')}>
                <td className="px-3 py-2.5 font-semibold whitespace-nowrap text-fg">{monthLabel(r.month)}</td>
                <td className={cn(cell, 'text-inc')}>{money(r.income)}</td>
                <td className={cn(cell, 'text-exp')}>{money(r.expense)}</td>
                <td className={cn(cell, 'text-inv')}>{money(r.investments)}</td>
                <td className={cn(cell, 'text-net')}>{money(r.bucket)}</td>
                <td className={cn(cell, 'font-bold', r.left < 0 ? 'text-exp' : 'text-fg')}>{money(r.left)}</td>
                <td className={cn(cell, 'font-extrabold', r.running < 0 ? 'text-exp' : 'text-fg')}>{money(r.running)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-2xl bg-card-2 px-4 py-3 text-[12.5px] text-muted">
        <b className="text-fg">Left this month</b> = Income − Expense − Invested − Bucket. <b className="text-fg">Net balance</b> = last month's net balance + what's left this month, so a tight month is covered by what you carried forward.
        {' '}Your total net balance is <b className={last.running < 0 ? 'text-exp' : 'text-teal'}>{money(last.running)}</b>.
      </p>
    </Wrap>
  )
}

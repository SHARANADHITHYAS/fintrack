/* Sample data so a new user can explore every screen. Built relative to today. */
import { emptyData } from './storage'
import { CAT } from './constants'
import { toISO } from './utils'

export function buildDemoData() {
  const d = emptyData()
  const today = new Date()
  const iso = (i, day) => {
    const base = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
    let dd = Math.min(day, last)
    if (i === 0) dd = Math.min(dd, today.getDate())
    return toISO(new Date(base.getFullYear(), base.getMonth(), dd))
  }
  const at = (date) => new Date(`${date}T10:00:00`).toISOString()
  let n = 0
  const tx = (o) => d.transactions.push({ id: `demo_${n++}`, description: '', subcategory: '', meta: {}, createdAt: at(o.date), ...o })

  d.cards = [
    { id: 'card_hdfc', name: 'HDFC Millennia', billDay: 18, limit: 100000, openingOutstanding: 0, status: 'paid', theme: 'aurora', createdAt: at(iso(6, 1)) },
    { id: 'card_sbi', name: 'SBI SimplyClick', billDay: 5, limit: 60000, openingOutstanding: 0, status: 'unpaid', theme: 'violet', createdAt: at(iso(6, 1)) },
  ]

  d.investments = [
    { id: 'inv_ppfas', name: 'Parag Parikh Flexi Cap', category: 'Mutual Funds', type: 'sip', amountPaid: 5000, investedAmount: 4995, valueAdj: 2600, startDate: iso(5, 5), tenureMonths: 36, status: 'active', mode: 'bank', accountId: 'bank-indian', description: 'Long-term wealth', skipped: [], createdAt: at(iso(5, 5)) },
    { id: 'inv_chit', name: 'Sri Lakshmi Chit Fund', category: 'Chit Fund', type: 'sip', amountPaid: 2000, investedAmount: 2000, valueAdj: 0, startDate: iso(3, 10), tenureMonths: 20, status: 'active', mode: 'upi', accountId: 'bank-hdfc', description: '', skipped: [], createdAt: at(iso(3, 10)) },
    { id: 'inv_gold', name: 'Digital Gold', category: 'Gold', type: 'lumpsum', amountPaid: 3000, investedAmount: 2910, valueAdj: 240, startDate: iso(1, 8), tenureMonths: null, status: 'active', mode: 'wallet', accountId: 'wal-amazon', description: '3% GST included', skipped: [], createdAt: at(iso(1, 8)) },
  ]

  d.emis = [
    { id: 'emi_buds', cardId: 'card_hdfc', purchaseTxnId: 'demo_buds', itemName: 'Galaxy Buds', principal: 12000, tenure: 6, annualRate: 0, fee: 0, startDate: iso(3, 12), createdAt: at(iso(3, 12)) },
  ]
  d.transactions.push({ id: 'demo_buds', type: 'expense', amount: 12000, date: iso(3, 12), description: 'Galaxy Buds', categoryId: 'exp-shopping', subcategory: '', mode: 'cc', accountId: 'card_hdfc', meta: {}, emiId: 'emi_buds', createdAt: at(iso(3, 12)) })

  const income = [38000, 40000, 39000, 41000, 40000, 42000]
  const target = [6000, 3000, 5000, 4000, 7000, 5600]
  const invest = [5000, 5000, 7000, 7000, 10000, 7000]
  const emi = [0, 0, 0, 2000, 2000, 2000]

  for (let idx = 0; idx < 6; idx++) {
    const i = 5 - idx
    tx({ type: 'income', amount: income[idx], date: iso(i, 1), description: 'Monthly salary', categoryId: 'inc-salary', mode: 'bank', accountId: 'bank-indian' })
    const items = [
      { amount: 10000, day: 3, description: 'Flat rent', categoryId: 'exp-rent', mode: 'upi', accountId: 'bank-indian' },
      { amount: 299, day: 4, description: 'Jio prepaid', categoryId: CAT.RECHARGE, mode: 'upi', accountId: 'bank-hdfc', meta: { rechargeFor: idx % 2 ? 'Amma' : 'Self' } },
      { amount: 1800, day: 7, description: 'EB + internet', categoryId: 'exp-utilities', mode: 'bank', accountId: 'bank-hdfc' },
      { amount: 1500, day: 9, description: 'Metro card top-up', categoryId: 'exp-transport', mode: 'wallet', accountId: 'wal-amazon' },
      { amount: 3100, day: 11, description: 'Big basket order', categoryId: 'exp-groceries', mode: 'cc', accountId: 'card_hdfc' },
      { amount: 2900, day: 22, description: 'Weekly vegetables', categoryId: 'exp-groceries', mode: 'cc', accountId: 'card_sbi' },
      { amount: 800, day: 16, description: 'Salon', categoryId: 'exp-personal', mode: 'upi', accountId: 'bank-indian' },
      { amount: 2500, day: 19, description: 'Clothes', categoryId: 'exp-shopping', mode: 'cc', accountId: 'card_hdfc' },
    ]
    if (idx === 1) items.push({ amount: 4000, day: 25, description: 'Pondicherry weekend', categoryId: CAT.ENTERTAINMENT, subcategory: 'Trip', mode: 'cc', accountId: 'card_hdfc' })
    if (idx === 3) items.push({ amount: 1200, day: 14, description: 'Doctor visit', categoryId: 'exp-health', mode: 'debit', accountId: 'bank-indian' })
    const spend = income[idx] - invest[idx] - target[idx] - emi[idx]
    let fixed = items.reduce((a, x) => a + x.amount, 0)
    if (spend - fixed < 1500) { const s = items.findIndex((x) => x.categoryId === 'exp-shopping' && x.amount === 2500); fixed -= items[s].amount; items.splice(s, 1) }
    const food = spend - fixed
    items.push({ amount: Math.round(food * 0.6), day: 13, description: 'Swiggy & Zomato', categoryId: 'exp-food', mode: 'upi', accountId: 'bank-hdfc' })
    items.push({ amount: food - Math.round(food * 0.6), day: 24, description: 'Dinner with friends', categoryId: 'exp-food', mode: 'cash', accountId: '' })
    for (const it of items) tx({ type: 'expense', date: iso(i, it.day), ...it, day: undefined })

    if (idx > 0) {
      tx({ type: 'transfer', amount: 5600 + idx * 300, date: iso(i, 15), description: 'HDFC card bill', categoryId: CAT.CC_PAYMENT, mode: 'bank', accountId: 'bank-indian', toCardId: 'card_hdfc', paymentStatus: 'paid', outstandingAfter: null })
    }
  }
  tx({ type: 'transfer', amount: 1500, date: iso(0, 6), description: "Paid Karthik's card", categoryId: CAT.CC_PAYMENT, mode: 'upi', accountId: 'bank-hdfc', toCardId: 'friend', paymentStatus: 'paid', outstandingAfter: null, meta: { friendName: 'Karthik' } })

  d.openingBalances = { 'bank-indian': 18000, 'bank-hdfc': 38000, 'wal-amazon': 14000, 'wal-flipkart': 500, cash: 12000 }
  d.goals = [{ from: '0000-00', mode: 'amount', value: 5000, setAt: new Date().toISOString() }]
  return d
}

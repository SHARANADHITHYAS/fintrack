/*
 * The money engine. The transactions list is the single source of truth; cards, investments,
 * dashboard totals and charts are all derived from it here, which is what keeps every page in sync.
 */
import { CAT, DEFAULT_BANKS, DEFAULT_CATEGORIES, DEFAULT_WALLETS, FRIEND_CC, invCategoryToPreset, CUSTOM_COLORS } from './constants'
import { addMonths, inRange, monthKey, monthKeysBetween, round2, sum, todayISO, toISO, fromISO, monthKeyOf } from './utils'

/* ---------------- lookups ---------------- */
export const allCategories = (data) => [...DEFAULT_CATEGORIES, ...(data.categories || [])]
export const categoriesOf = (data, type) => allCategories(data).filter((c) => c.type === type)
export const findCategory = (data, id) =>
  allCategories(data).find((c) => c.id === id) ?? { id, name: 'Uncategorised', icon: 'Tag', color: '#94a3b8', type: 'expense' }

/** Default subcategories + the ones this user added */
export const subcategoriesOf = (data, cat) => [...(cat?.subcategories || []), ...((data.customSubs || {})[cat?.id] || [])]

export const allBanks = (data) => [...DEFAULT_BANKS, ...(data.banks || [])]
export const allWallets = (data) => [...DEFAULT_WALLETS, ...(data.wallets || [])]
export const nextCustomColor = (data) => CUSTOM_COLORS[(data.categories?.length ?? 0) % CUSTOM_COLORS.length]

export function accountName(data, mode, accountId) {
  if (!accountId) return ''
  if (accountId === FRIEND_CC) return "Friend's credit card"
  if (mode === 'cc') return data.cards.find((c) => c.id === accountId)?.name ?? 'Removed card'
  if (mode === 'wallet') return allWallets(data).find((w) => w.id === accountId)?.name ?? 'Removed wallet'
  return allBanks(data).find((b) => b.id === accountId)?.name ?? 'Removed bank'
}

/* ---------------- classification ---------------- */
export const isEmiPurchase = (t) => !!t.emiId && !t.emiIndex
export const isInvesting = (t) => t.type === 'expense' && t.categoryId === CAT.INVESTING
/** Counts toward "Total expense" (investments and EMI-converted purchases are excluded; EMI installments count). */
export const isBudgetExpense = (t) => t.type === 'expense' && t.categoryId !== CAT.INVESTING && !isEmiPurchase(t)

export function totals(txns) {
  const income = sum(txns.filter((t) => t.type === 'income'), (t) => t.amount)
  const expense = sum(txns.filter(isBudgetExpense), (t) => t.amount)
  const investments = sum(txns.filter(isInvesting), (t) => t.amount)
  const transfers = sum(txns.filter((t) => t.type === 'transfer'), (t) => t.amount)
  return { income: round2(income), expense: round2(expense), investments: round2(investments), transfers: round2(transfers), net: round2(income - expense - investments) }
}

export const sortTxns = (txns) =>
  [...txns].sort((a, b) => (a.date === b.date ? (b.createdAt || '').localeCompare(a.createdAt || '') : b.date.localeCompare(a.date)))

export const earliestDate = (data) => data.transactions.reduce((m, t) => (!m || t.date < m ? t.date : m), null)
export const filterRange = (txns, range) => txns.filter((t) => inRange(t.date, range))

/** Totals for everything dated on or before `endIso` (used for carried-forward net balance and all-time investments). */
export const totalsUpTo = (txns, endIso) => totals(txns.filter((t) => !endIso || t.date <= endIso))

/* ---------------- account balances ---------------- */
export const CASH_ID = 'cash'
const BANK_LIKE = ['bank', 'upi', 'debit', 'wallet']

/**
 * Live balance of every bank, wallet, gift card and cash in hand.
 * Credit card spends don't touch these until the bill is paid from one of them.
 */
export function accountBalances(data) {
  const accs = [
    ...allBanks(data).map((b) => ({ ...b, type: 'bank' })),
    ...allWallets(data).map((w) => ({ ...w, type: w.kind === 'giftcard' ? 'giftcard' : 'wallet' })),
    { id: CASH_ID, name: 'Cash in hand', type: 'cash', builtIn: true },
  ]
  const thisMonth = monthKeyOf(new Date())
  const map = Object.fromEntries(accs.map((a) => [a.id, { ...a, opening: Number(data.openingBalances?.[a.id]) || 0, inflow: 0, outflow: 0, monthIn: 0, monthOut: 0, count: 0, last: null }]))
  const move = (id, amt, t) => {
    const a = map[id]
    if (!a) return
    if (amt >= 0) a.inflow += amt; else a.outflow -= amt
    if (monthKey(t.date) === thisMonth) { if (amt >= 0) a.monthIn += amt; else a.monthOut -= amt }
    a.count++
    if (!a.last || t.date > a.last) a.last = t.date
  }
  for (const t of data.transactions) {
    const src = t.mode === 'cash' ? CASH_ID : BANK_LIKE.includes(t.mode) ? t.accountId : null
    if (t.type === 'income') { if (src) move(src, t.amount, t) }
    else if (t.type === 'expense') {
      if (t.mode === 'cc' || !src) continue
      move(src, -t.amount, t)
      if (t.categoryId === CAT.ATM && src !== CASH_ID) move(CASH_ID, t.amount, t) // ATM: bank → cash
    } else if (t.type === 'transfer' && src) move(src, -t.amount, t)
  }
  return accs.map((a) => {
    const x = map[a.id]
    return { ...x, inflow: round2(x.inflow), outflow: round2(x.outflow), monthIn: round2(x.monthIn), monthOut: round2(x.monthOut), balance: round2(x.opening + x.inflow - x.outflow) }
  })
}

/* ---------------- monthly series ---------------- */
export function monthlySeries(txns, months) {
  const by = Object.fromEntries(months.map((m) => [m, []]))
  for (const t of txns) { const k = monthKey(t.date); if (by[k]) by[k].push(t) }
  return months.map((m) => ({ month: m, ...totals(by[m]) }))
}

/** At least `min` months ending at the period end (or the whole period if longer). */
export function chartMonths(range, min = 6) {
  const end = range.end > todayISO() && monthKey(range.end) > monthKey(todayISO()) ? todayISO() : range.end
  const endKey = monthKey(end)
  const minStart = toISO(new Date(fromISO(end).getFullYear(), fromISO(end).getMonth() - (min - 1), 1))
  const start = range.start && range.start < minStart ? range.start : minStart
  const keys = monthKeysBetween(start, end)
  return keys.length > 24 ? keys.slice(-24) : keys.filter((k) => k <= endKey)
}

export function categoryBreakdown(data, txns) {
  const map = new Map()
  for (const t of txns.filter(isBudgetExpense)) map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount)
  return [...map.entries()]
    .map(([id, value]) => { const c = findCategory(data, id); return { id, name: c.name, color: c.color, icon: c.icon, value: round2(value) } })
    .sort((a, b) => b.value - a.value)
}

/* ---------------- goals ---------------- */
export function goalEntryFor(goals, mKey) {
  let g = null
  for (const e of [...(goals || [])].sort((a, b) => a.from.localeCompare(b.from))) if (e.from <= mKey) g = e
  return g
}
export function goalAmount(entry, income) {
  if (!entry) return null
  return entry.mode === 'percent' ? round2((income * entry.value) / 100) : entry.value
}
export const currentGoal = (goals) => goalEntryFor(goals, monthKeyOf(new Date()))

/* ---------------- streak ---------------- */
export function trackingStreak(txns) {
  const days = new Set(txns.filter((t) => !t.auto && t.createdAt).map((t) => toISO(new Date(t.createdAt))))
  let d = new Date()
  if (!days.has(toISO(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(toISO(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

/* ---------------- SIP / investments ---------------- */
export function sipDates(inv, today = todayISO()) {
  if (inv.type !== 'sip') return [inv.startDate]
  const out = []
  const anchor = fromISO(inv.startDate).getDate()
  for (let k = 0; k < 600; k++) {
    if (inv.tenureMonths && k >= inv.tenureMonths) break
    const date = addMonths(inv.startDate, k, anchor)
    if (date > today) break
    if (inv.status === 'stopped' && inv.stoppedOn && date > inv.stoppedOn) break
    out.push(date)
  }
  return out
}

export function nextSipDate(inv, today = todayISO()) {
  if (inv.type !== 'sip' || inv.status === 'stopped') return null
  const anchor = fromISO(inv.startDate).getDate()
  for (let k = 0; k < 600; k++) {
    if (inv.tenureMonths && k >= inv.tenureMonths) return null
    const date = addMonths(inv.startDate, k, anchor)
    if (date > today) return date
  }
  return null
}

export function investmentStats(inv, txns) {
  const linked = txns.filter((t) => t.investmentId === inv.id)
  const count = linked.length
  const paid = round2(sum(linked, (t) => t.amount))
  const perInvested = inv.investedAmount ?? inv.amountPaid
  const invested = round2(count * perInvested)
  const current = round2(Math.max(0, invested + (inv.valueAdj || 0)))
  const returns = round2(current - invested)
  const returnsPct = invested ? (returns / invested) * 100 : 0
  const completed = inv.type === 'sip' && inv.tenureMonths && count >= inv.tenureMonths
  const status = inv.type === 'lumpsum' ? 'active' : inv.status === 'stopped' ? 'stopped' : completed ? 'completed' : 'active'
  return { count, paid, invested, current, returns, returnsPct, charges: round2(paid - invested), status, next: nextSipDate(inv), linked }
}

/* ---------------- EMI ---------------- */
export function emiSchedule(plan) {
  const P = plan.principal, n = plan.tenure, r = (plan.annualRate || 0) / 12 / 100
  const emi = r > 0 ? (P * r * (1 + r) ** n) / ((1 + r) ** n - 1) : P / n
  let bal = P
  const rows = []
  for (let k = 1; k <= n; k++) {
    const interest = r > 0 ? bal * r : 0
    const principal = emi - interest
    bal -= principal
    const fee = k === 1 ? plan.fee || 0 : 0
    rows.push({ k, date: addMonths(plan.startDate, k, fromISO(plan.startDate).getDate()), amount: round2(emi + fee), principal: round2(principal), interest: round2(interest + fee), balance: round2(Math.max(bal, 0)) })
  }
  return { emi: round2(emi), total: round2(emi * n + (plan.fee || 0)), rows }
}

export function emiStats(plan, today = todayISO()) {
  const s = emiSchedule(plan)
  const paid = s.rows.filter((r) => r.date <= today).length
  const next = s.rows.find((r) => r.date > today)
  return { ...s, paid, remaining: plan.tenure - paid, next: next?.date ?? null, done: paid >= plan.tenure }
}

/* ---------------- credit cards ---------------- */
export function cardStats(card, data, today = todayISO()) {
  const txns = data.transactions
  const events = txns
    .filter((t) => (t.type === 'expense' && t.mode === 'cc' && t.accountId === card.id) || (t.type === 'transfer' && t.toCardId === card.id))
    .sort((a, b) => (a.date === b.date ? (a.createdAt || '').localeCompare(b.createdAt || '') : a.date.localeCompare(b.date)))
  let bal = Number(card.openingOutstanding) || 0
  let spent = 0, paidTotal = 0
  for (const t of events) {
    if (t.type === 'expense') {
      const add = t.emiIndex ? t.emiInterest || 0 : t.amount
      bal += add
      spent += add
    } else {
      paidTotal += t.amount
      bal = t.outstandingAfter != null && t.outstandingAfter !== '' ? Number(t.outstandingAfter) : bal - t.amount
    }
  }
  bal = round2(bal)
  const limit = Number(card.limit) || 0
  const available = round2(limit - bal)
  const usedPct = limit ? Math.min(100, Math.max(0, (bal / limit) * 100)) : 0

  // Next bill date = next occurrence of bill day
  const t = fromISO(today)
  const billDate = (y, m) => { const last = new Date(y, m + 1, 0).getDate(); return toISO(new Date(y, m, Math.min(card.billDay || 1, last))) }
  let nextBill = billDate(t.getFullYear(), t.getMonth())
  if (nextBill < today) nextBill = billDate(t.getFullYear(), t.getMonth() + 1)
  const lastBill = addMonths(nextBill, -1, card.billDay)
  const cycleSpend = round2(sum(events.filter((e) => e.type === 'expense' && e.date > lastBill && e.date <= today), (e) => (e.emiIndex ? e.amount : isEmiPurchase(e) ? 0 : e.amount)))

  const plans = (data.emis || []).filter((p) => p.cardId === card.id).map((p) => ({ plan: p, ...emiStats(p, today) }))
  const activeEmis = plans.filter((p) => !p.done)
  const monthlyEmi = round2(sum(activeEmis, (p) => p.emi))
  const txnList = sortTxns(events)
  return { outstanding: bal, available, limit, usedPct, spent: round2(spent), paidTotal: round2(paidTotal), nextBill, cycleSpend, plans, activeEmis, monthlyEmi, txns: txnList }
}

/* ---------------- recurring materialisation ---------------- */
/**
 * Regenerates investment and EMI transactions from their plans (idempotent: ids are deterministic).
 * Called after every change and on load, so SIPs and EMIs "post" automatically on their dates.
 */
export function materialize(data, today = todayISO()) {
  const invIds = new Set(data.investments.map((i) => i.id))
  const emiIds = new Set((data.emis || []).map((e) => e.id))
  const keep = data.transactions.filter((t) => {
    if (t.investmentId) return false // regenerated below
    if (t.emiIndex) return false // regenerated below
    if (t.emiId && !emiIds.has(t.emiId)) return false
    return true
  })
  const prev = new Map(data.transactions.map((t) => [t.id, t]))
  const generated = []

  for (const inv of data.investments) {
    const dates = sipDates(inv, today)
    dates.forEach((date, k) => {
      if (inv.type === 'sip' && inv.skipped?.includes(k)) return
      const id = inv.type === 'sip' ? `sip_${inv.id}_${k}` : `inv_${inv.id}`
      const old = prev.get(id)
      generated.push({
        id,
        type: 'expense',
        amount: round2(inv.amountPaid),
        date,
        description: inv.type === 'sip' ? `${inv.name} · SIP #${k + 1}` : inv.name,
        note: inv.description || '',
        categoryId: CAT.INVESTING,
        subcategory: invCategoryToPreset(inv.category) || inv.category,
        mode: inv.mode || 'bank',
        accountId: inv.accountId || '',
        investmentId: inv.id,
        sipIndex: inv.type === 'sip' ? k : undefined,
        auto: inv.type === 'sip' && k > 0,
        createdAt: old?.createdAt || (k === 0 ? inv.createdAt : new Date(fromISO(date).getTime() + 9 * 3600e3).toISOString()),
      })
    })
  }

  for (const plan of data.emis || []) {
    const purchase = keep.find((t) => t.id === plan.purchaseTxnId)
    if (!purchase) continue
    const sched = emiSchedule(plan)
    for (const row of sched.rows) {
      if (row.date > today) break
      const id = `emi_${plan.id}_${row.k}`
      const old = prev.get(id)
      generated.push({
        id,
        type: 'expense',
        amount: row.amount,
        emiInterest: row.interest,
        date: row.date,
        description: `${plan.itemName} · EMI ${row.k}/${plan.tenure}`,
        categoryId: purchase.categoryId,
        subcategory: purchase.subcategory,
        mode: 'cc',
        accountId: plan.cardId,
        emiId: plan.id,
        emiIndex: row.k,
        auto: true,
        createdAt: old?.createdAt || new Date(fromISO(row.date).getTime() + 9 * 3600e3).toISOString(),
      })
    }
  }
  // Drop investments whose plan vanished (safety)
  const txns = [...keep, ...generated].filter((t) => !t.investmentId || invIds.has(t.investmentId))
  return { ...data, transactions: txns }
}

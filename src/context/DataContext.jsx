import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { storage, emptyData } from '../lib/storage'
import { materialize, findCategory, accountName, nextCustomColor, investmentStats, sipDates, accountBalances } from '../lib/finance'
import { CAT, FRIEND_CC, presetToInvCategory } from '../lib/constants'
import { monthKeyOf, money, round2, todayISO, uid } from '../lib/utils'
import { buildDemoData } from '../lib/demo'
import { applyImport } from '../lib/importer'

const DataContext = createContext(null)
const now = () => new Date().toISOString()

export function DataProvider({ userId, children }) {
  const [data, setData] = useState(() => materialize(storage.loadData(userId)))
  const dayRef = useRef(todayISO())

  useEffect(() => { storage.saveData(userId, data) }, [userId, data])

  // Re-run SIP/EMI posting when the day changes (e.g. app left open overnight).
  useEffect(() => {
    const check = () => {
      if (dayRef.current !== todayISO()) { dayRef.current = todayISO(); setData((d) => materialize(d)) }
    }
    window.addEventListener('focus', check)
    const t = setInterval(check, 60_000)
    return () => { window.removeEventListener('focus', check); clearInterval(t) }
  }, [])

  const update = useCallback((fn) => setData((d) => materialize(fn(d))), [])

  /* ---------- categories & accounts ---------- */
  const addCategory = useCallback((type, name) => {
    const cat = { id: uid('cat'), type, name: name.trim(), icon: 'Tag', custom: true }
    update((d) => ({ ...d, categories: [...d.categories, { ...cat, color: nextCustomColor(d) }] }))
    return cat
  }, [update])
  /** Custom subcategory (e.g. a new OTT or bill type), saved only for this user */
  const addSubcategory = useCallback((catId, name) => update((d) => {
    const cur = d.customSubs?.[catId] || []
    if (cur.some((x) => x.toLowerCase() === name.trim().toLowerCase())) return d
    return { ...d, customSubs: { ...(d.customSubs || {}), [catId]: [...cur, name.trim()] } }
  }), [update])
  const removeCategory = useCallback((id) => update((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) })), [update])

  const addBank = useCallback((name) => {
    const b = { id: uid('bank'), name: name.trim() }
    update((d) => ({ ...d, banks: [...d.banks, b] }))
    return b
  }, [update])
  const removeBank = useCallback((id) => update((d) => ({ ...d, banks: d.banks.filter((b) => b.id !== id) })), [update])

  const addWallet = useCallback((name, kind = 'wallet') => {
    const w = { id: uid('wal'), name: name.trim(), kind }
    update((d) => ({ ...d, wallets: [...d.wallets, w] }))
    return w
  }, [update])
  const removeWallet = useCallback((id) => update((d) => ({ ...d, wallets: d.wallets.filter((w) => w.id !== id) })), [update])

  /* ---------- cards ---------- */
  const saveCard = useCallback((card) => {
    const id = card.id || uid('card')
    const next = {
      theme: 'aurora', status: 'unpaid', openingOutstanding: 0, ...card, id,
      limit: round2(card.limit), billDay: Number(card.billDay), openingOutstanding: round2(card.openingOutstanding || 0),
      createdAt: card.createdAt || now(),
    }
    update((d) => ({ ...d, cards: d.cards.some((c) => c.id === id) ? d.cards.map((c) => (c.id === id ? next : c)) : [...d.cards, next] }))
    return next
  }, [update])
  const setCardStatus = useCallback((id, status) => update((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, status, statusAt: now() } : c)) })), [update])
  const deleteCard = useCallback((id) => update((d) => {
    const planIds = new Set(d.emis.filter((p) => p.cardId === id).map((p) => p.id))
    return {
      ...d,
      cards: d.cards.filter((c) => c.id !== id),
      emis: d.emis.filter((p) => !planIds.has(p.id)),
      transactions: d.transactions.map((t) => (planIds.has(t.emiId) && !t.emiIndex ? { ...t, emiId: undefined } : t)),
    }
  }), [update])

  /* ---------- transactions ---------- */
  /**
   * Saves any transaction from the Record Transaction form and applies all side effects:
   * Investing → linked investment, CC payment → card status, CC + EMI → EMI plan.
   */
  const saveTransaction = useCallback((f) => {
    update((d) => {
      let { transactions, investments, emis, cards } = d
      const existing = f.id ? transactions.find((t) => t.id === f.id) : null
      const amount = round2(f.amount)

      // Leaving the Investing category: remove the linked lumpsum investment
      if (existing?.investmentId && !(f.type === 'expense' && f.categoryId === CAT.INVESTING)) {
        investments = investments.filter((i) => i.id !== existing.investmentId)
      }

      // Investing expense → the investment is the source of truth
      if (f.type === 'expense' && f.categoryId === CAT.INVESTING) {
        const linked = existing?.investmentId ? investments.find((i) => i.id === existing.investmentId) : null
        if (existing && !existing.investmentId) transactions = transactions.filter((t) => t.id !== existing.id)
        if (existing?.emiId) emis = emis.filter((p) => p.id !== existing.emiId)
        const sip = f.invType === 'sip'
        const base = {
          name: f.description?.trim() || f.subcategory || 'Investment',
          category: presetToInvCategory(f.subcategory),
          type: sip ? 'sip' : 'lumpsum',
          tenureMonths: sip && Number(f.tenureMonths) > 0 ? Number(f.tenureMonths) : null,
          amountPaid: amount,
          startDate: f.date,
          mode: f.mode,
          accountId: f.accountId,
        }
        if (linked) {
          const sameInvested = (linked.investedAmount ?? linked.amountPaid) === linked.amountPaid
          investments = investments.map((i) => (i.id === linked.id ? { ...i, ...base, investedAmount: sameInvested ? amount : i.investedAmount } : i))
        } else {
          investments = [...investments, { id: uid('inv'), status: 'active', valueAdj: 0, description: '', skipped: [], ...base, investedAmount: amount, createdAt: now() }]
        }
        return { ...d, transactions, investments, emis }
      }

      const id = existing && !existing.investmentId ? existing.id : uid('txn')
      const isCcPay = f.type === 'expense' && f.categoryId === CAT.CC_PAYMENT
      const txn = {
        id,
        type: isCcPay ? 'transfer' : f.type,
        amount,
        date: f.date,
        description: f.description?.trim() || '',
        categoryId: f.categoryId,
        subcategory: f.subcategory || '',
        mode: f.mode,
        accountId: f.accountId || '',
        meta: f.meta || {},
        createdAt: existing?.createdAt || now(),
        updatedAt: existing ? now() : undefined,
      }
      if (isCcPay) {
        txn.toCardId = f.toCardId
        txn.paymentStatus = f.paymentStatus
        txn.outstandingAfter = f.paymentStatus !== 'paid' && f.outstandingAfter !== '' && f.outstandingAfter != null ? round2(f.outstandingAfter) : null
        if (f.toCardId && f.toCardId !== FRIEND_CC) {
          const map = { paid: 'paid', partial: 'partial', outstanding: 'unpaid' }
          cards = cards.map((c) => (c.id === f.toCardId ? { ...c, status: map[f.paymentStatus] || c.status, statusAt: now() } : c))
        }
      }

      // EMI conversion
      const wantsEmi = f.type === 'expense' && !isCcPay && f.mode === 'cc' && f.accountId && f.accountId !== FRIEND_CC && f.emi?.enabled
      const oldPlanId = existing?.emiId
      if (wantsEmi) {
        const planId = oldPlanId || uid('emi')
        const plan = {
          id: planId, cardId: f.accountId, purchaseTxnId: id,
          itemName: txn.description || findCategory(d, f.categoryId).name,
          principal: amount, tenure: Number(f.emi.tenure), annualRate: Number(f.emi.annualRate) || 0, fee: round2(f.emi.fee || 0),
          startDate: f.date, createdAt: emis.find((p) => p.id === planId)?.createdAt || now(),
        }
        emis = emis.some((p) => p.id === planId) ? emis.map((p) => (p.id === planId ? plan : p)) : [...emis, plan]
        txn.emiId = planId
      } else if (oldPlanId) {
        emis = emis.filter((p) => p.id !== oldPlanId)
      }

      transactions = transactions.some((t) => t.id === id) ? transactions.map((t) => (t.id === id ? txn : t)) : [...transactions, txn]
      return { ...d, transactions, investments, emis, cards }
    })
  }, [update])

  const deleteTransaction = useCallback((id) => update((d) => {
    const t = d.transactions.find((x) => x.id === id)
    if (!t) return d
    if (t.investmentId) {
      const inv = d.investments.find((i) => i.id === t.investmentId)
      if (inv?.payments?.length > 1) {
        // Imported holding: remove just this payment
        return { ...d, investments: d.investments.map((i) => (i.id === inv.id ? { ...i, payments: i.payments.filter((_, k) => k !== t.payIndex) } : i)) }
      }
      if (inv?.type === 'sip') return { ...d, investments: d.investments.map((i) => (i.id === inv.id ? { ...i, skipped: [...(i.skipped || []), t.sipIndex] } : i)) }
      return { ...d, investments: d.investments.filter((i) => i.id !== t.investmentId) }
    }
    if (t.emiId) {
      const plan = d.emis.find((p) => p.id === t.emiId)
      return { ...d, emis: d.emis.filter((p) => p.id !== t.emiId), transactions: d.transactions.filter((x) => x.id !== t.id && x.id !== plan?.purchaseTxnId) }
    }
    return { ...d, transactions: d.transactions.filter((x) => x.id !== id) }
  }), [update])

  const deleteEmi = useCallback((planId) => update((d) => {
    const plan = d.emis.find((p) => p.id === planId)
    return { ...d, emis: d.emis.filter((p) => p.id !== planId), transactions: d.transactions.filter((t) => t.id !== plan?.purchaseTxnId) }
  }), [update])

  /* ---------- investments ---------- */
  const saveInvestment = useCallback((f) => {
    update((d) => {
      const existing = f.id ? d.investments.find((i) => i.id === f.id) : null
      const inv = {
        status: 'active', skipped: [], ...existing, ...f,
        id: existing?.id || uid('inv'),
        amountPaid: round2(f.amountPaid),
        investedAmount: f.investedAmount === '' || f.investedAmount == null ? round2(f.amountPaid) : round2(f.investedAmount),
        tenureMonths: f.type === 'sip' && f.tenureMonths ? Number(f.tenureMonths) : null,
        createdAt: existing?.createdAt || now(),
      }
      delete inv.currentValue
      if (f.currentValue !== '' && f.currentValue != null) {
        const count = sipDates(inv).filter((_, k) => !inv.skipped?.includes(k)).length
        inv.valueAdj = round2(Number(f.currentValue) - count * inv.investedAmount)
      } else if (!existing) inv.valueAdj = 0
      return { ...d, investments: existing ? d.investments.map((i) => (i.id === inv.id ? inv : i)) : [...d.investments, inv] }
    })
  }, [update])

  const updateInvestmentValue = useCallback((id, value) => update((d) => ({
    ...d,
    investments: d.investments.map((i) => {
      if (i.id !== id) return i
      const s = investmentStats(i, d.transactions)
      return { ...i, valueAdj: round2(Number(value) - s.invested), valueUpdatedAt: now() }
    }),
  })), [update])

  const setSipStatus = useCallback((id, status) => update((d) => ({
    ...d,
    investments: d.investments.map((i) => (i.id === id ? { ...i, status, stoppedOn: status === 'stopped' ? todayISO() : null } : i)),
  })), [update])

  const deleteInvestment = useCallback((id) => update((d) => ({ ...d, investments: d.investments.filter((i) => i.id !== id) })), [update])

  /* ---------- account balances ---------- */
  /** Set an account's real balance today; we store the matching starting balance. */
  /* ---------- import ---------- */
  const importTransactions = useCallback((items, maps) => update((d) => applyImport(d, items, maps)), [update])

  const setAccountBalance = useCallback((id, target) => update((d) => {
    const acc = accountBalances(d).find((a) => a.id === id)
    if (!acc) return d
    const opening = round2(Number(target) - (acc.inflow - acc.outflow))
    return { ...d, openingBalances: { ...(d.openingBalances || {}), [id]: opening } }
  }), [update])

  /* ---------- savings buckets ---------- */
  const saveBucket = useCallback((b) => {
    const id = b.id || uid('bkt')
    update((d) => {
      const list = d.buckets || []
      const next = { icon: 'PiggyBank', ...list.find((x) => x.id === id), ...b, id, target: round2(b.target), createdAt: b.createdAt || list.find((x) => x.id === id)?.createdAt || now() }
      return { ...d, buckets: list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? next : x)) : [...list, next] }
    })
    return id
  }, [update])
  /** Deleting a bucket removes its history; deposits go back to the accounts they came from */
  const deleteBucket = useCallback((id) => update((d) => ({ ...d, buckets: (d.buckets || []).filter((b) => b.id !== id), transactions: d.transactions.filter((t) => !(t.type === 'bucket' && t.bucketId === id)) })), [update])
  /** action: deposit (account → bucket) | withdraw (bucket → account) | spend (buy something with bucket money) */
  const saveBucketMove = useCallback((m) => update((d) => {
    const existing = m.id ? d.transactions.find((t) => t.id === m.id) : null
    const txn = {
      id: existing?.id || uid('bkm'), type: 'bucket', bucketId: m.bucketId, action: m.action,
      amount: round2(m.amount), date: m.date, description: m.description?.trim() || '',
      categoryId: m.action === 'spend' ? m.categoryId || '' : '', subcategory: '',
      mode: m.action === 'spend' ? '' : m.mode, accountId: m.action === 'spend' ? '' : m.accountId || '',
      meta: {}, createdAt: existing?.createdAt || now(),
    }
    const transactions = existing ? d.transactions.map((t) => (t.id === txn.id ? txn : t)) : [...d.transactions, txn]
    return { ...d, transactions }
  }), [update])

  /* ---------- goals & prefs ---------- */
  const setGoal = useCallback(({ mode, value, apply }) => update((d) => {
    const from = apply === 'all' ? '0000-00' : monthKeyOf(new Date())
    const entry = { from, mode, value: Number(value), setAt: now() }
    const goals = apply === 'all' ? [entry] : [...d.goals.filter((g) => g.from < from), entry]
    return { ...d, goals }
  }), [update])
  const removeGoal = useCallback(() => update((d) => ({ ...d, goals: [] })), [update])
  const setPrefs = useCallback((patch) => update((d) => ({ ...d, prefs: { ...d.prefs, ...patch } })), [update])

  const loadDemo = useCallback(() => update((d) => ({ ...buildDemoData(), prefs: { ...d.prefs, onboarded: true, demo: true } })), [update])
  const resetData = useCallback(() => update(() => ({ ...emptyData(), prefs: { onboarded: true } })), [update])

  /** Human explanation of what deleting a transaction will also change. */
  const deleteImpact = useCallback((t) => {
    const out = []
    if (t.investmentId) {
      const inv = data.investments.find((i) => i.id === t.investmentId)
      if (inv?.payments?.length > 1) out.push(`This removes one payment from “${inv.name}”. The holding and its other payments stay.`)
      else if (inv?.type === 'sip') out.push(`This skips SIP installment #${(t.sipIndex ?? 0) + 1} of “${inv.name}”. The SIP and its other installments stay.`)
      else out.push(`The linked investment “${inv?.name ?? 'Investment'}” is removed from Investments too.`)
    } else if (t.emiId) {
      const plan = data.emis.find((p) => p.id === t.emiId)
      if (plan) out.push(`This removes the EMI plan “${plan.itemName}”, all its installments and the original ${money(plan.principal)} purchase. The card's available limit goes back up by ${money(plan.principal)}.`)
    } else if (t.type === 'expense' && t.mode === 'cc' && t.accountId && t.accountId !== FRIEND_CC) {
      out.push(`${accountName(data, 'cc', t.accountId)}: outstanding drops by ${money(t.amount)} and available limit goes up.`)
    } else if (t.type === 'bucket') {
      const b = (data.buckets || []).find((x) => x.id === t.bucketId)
      out.push(t.action === 'deposit' ? `${money(t.amount)} goes back to ${accountName(data, t.mode, t.accountId) || 'your account'} and out of the “${b?.name ?? 'bucket'}” bucket.`
        : t.action === 'withdraw' ? `${money(t.amount)} goes back into the “${b?.name ?? 'bucket'}” bucket.`
        : `${money(t.amount)} is returned to the “${b?.name ?? 'bucket'}” bucket balance.`)
    } else if (t.type === 'transfer' && t.toCardId && t.toCardId !== FRIEND_CC) {
      out.push(`${accountName(data, 'cc', t.toCardId)}: this payment is undone, so outstanding goes back up by ${money(t.amount)}.`)
    }
    out.push('Dashboard totals and charts update right away.')
    return out
  }, [data])

  const value = useMemo(() => ({
    data, addCategory, removeCategory, addBank, removeBank, addWallet, removeWallet,
    saveCard, setCardStatus, deleteCard, saveTransaction, deleteTransaction, deleteEmi,
    saveInvestment, updateInvestmentValue, setSipStatus, deleteInvestment,
    setGoal, removeGoal, setPrefs, loadDemo, resetData, deleteImpact, setAccountBalance, addSubcategory, saveBucket, deleteBucket, saveBucketMove, importTransactions,
  }), [data, addCategory, removeCategory, addBank, removeBank, addWallet, removeWallet, saveCard, setCardStatus, deleteCard, saveTransaction, deleteTransaction, deleteEmi, saveInvestment, updateInvestmentValue, setSipStatus, deleteInvestment, setGoal, removeGoal, setPrefs, loadDemo, resetData, deleteImpact, setAccountBalance, addSubcategory, saveBucket, deleteBucket, saveBucketMove, importTransactions])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)

/*
 * Import transactions from Excel / CSV.
 * 1) downloadTemplate(data)  – an .xlsx with example rows, a "How to fill" guide and your valid names
 * 2) readImportFile(file)    – rows as plain objects
 * 3) analyzeImport(data, rows) – checks every row (ok / duplicate / error) and lists names that will be created
 * The DataContext then applies the approved rows in one go (see importTransactions there).
 */
import { CAT, CUSTOM_COLORS, DEFAULT_CATEGORIES, FRIEND_CC, INVESTMENT_INCOME_TYPES, presetToInvCategory } from './constants'
import { allBanks, allCategories, allWallets, subcategoriesOf } from './finance'
import { round2, toISO, uid } from './utils'

export const TEMPLATE_COLUMNS = [
  { key: 'date', header: 'Date', width: 13, help: 'Required. DD-MM-YYYY, e.g. 05-10-2026' },
  { key: 'type', header: 'Type', width: 13, help: 'Required. Income, Expense, Investment, CC payment, Bucket add or Bucket spend' },
  { key: 'amount', header: 'Amount', width: 11, help: 'Required. Numbers only, e.g. 1250 or 1,250.50' },
  { key: 'category', header: 'Category', width: 22, help: 'Required for Income and Expense. Use a name from the "Valid values" sheet, or a new one (it will be created)' },
  { key: 'subcategory', header: 'Subcategory', width: 18, help: 'Optional. e.g. Netflix (OTT), EB Bill (Utilities), Trip (Entertainment), Mutual Funds (Investment)' },
  { key: 'mode', header: 'Payment mode', width: 15, help: 'UPI, Bank transfer, Debit card, Wallet, Credit card, Cash or Other' },
  { key: 'account', header: 'Account / card', width: 22, help: 'Bank, wallet, gift card or credit card name. "Friend\'s credit card" also works' },
  { key: 'description', header: 'Description', width: 26, help: 'Optional. For investments, rows with the same description become one holding' },
  { key: 'payingCard', header: 'Paying card', width: 18, help: 'CC payment only: the card whose bill you paid (or "Friend\'s credit card")' },
  { key: 'paymentStatus', header: 'Payment status', width: 15, help: 'CC payment only, optional: Paid, Partially paid or Outstanding' },
  { key: 'rechargeFor', header: 'Recharge for', width: 14, help: 'Optional, Mobile Recharge only: Self, Mom…' },
  { key: 'incomeType', header: 'Investment income type', width: 22, help: `Investment Income only: ${INVESTMENT_INCOME_TYPES.join(', ')}` },
  { key: 'bucket', header: 'Bucket name', width: 16, help: 'Bucket add / Bucket spend only: e.g. New mobile' },
]

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

const EXAMPLES = [
  { date: '01-10-2026', type: 'Income', amount: 42000, category: 'Salary / Freelance', mode: 'Bank transfer', account: 'Indian Bank', description: 'October salary' },
  { date: '03-10-2026', type: 'Expense', amount: 10000, category: 'House Rent', mode: 'UPI', account: 'HDFC Bank', description: 'Flat rent' },
  { date: '04-10-2026', type: 'Expense', amount: 299, category: 'Mobile Recharge', mode: 'UPI', account: 'HDFC Bank', rechargeFor: 'Mom' },
  { date: '05-10-2026', type: 'Expense', amount: 649, category: 'OTT', subcategory: 'Netflix', mode: 'Credit card', account: 'HDFC Millennia', description: 'Netflix monthly' },
  { date: '07-10-2026', type: 'Expense', amount: 1800, category: 'Utilities', subcategory: 'EB Bill (Electricity)', mode: 'Bank transfer', account: 'HDFC Bank' },
  { date: '10-10-2026', type: 'Investment', amount: 5000, category: 'Investing', subcategory: 'Mutual Funds', mode: 'UPI', account: 'HDFC Bank', description: 'Nifty index fund' },
  { date: '12-10-2026', type: 'Income', amount: 350, category: 'Investment Income', mode: 'Bank transfer', account: 'Indian Bank', incomeType: 'Dividend' },
  { date: '15-10-2026', type: 'CC payment', amount: 8000, category: 'Credit Card Payment', mode: 'UPI', account: 'Indian Bank', payingCard: 'HDFC Millennia', paymentStatus: 'Paid' },
  { date: '20-10-2026', type: 'Bucket add', amount: 2500, mode: 'UPI', account: 'HDFC Bank', bucket: 'New mobile', description: 'October saving' },
]

/* ---------- template ---------- */
export async function downloadTemplate(data) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const head = TEMPLATE_COLUMNS.map((c) => c.header)
  const rows = EXAMPLES.map((e) => TEMPLATE_COLUMNS.map((c) => e[c.key] ?? ''))
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows])
  ws['!cols'] = TEMPLATE_COLUMNS.map((c) => ({ wch: c.width }))
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

  const guide = [
    ['How to fill the FinTrack import template'],
    [],
    ['1. Fill one row per transaction in the "Transactions" sheet. Delete the example rows first.'],
    ['2. Keep the header row exactly as it is. Columns can be left empty when they don\'t apply.'],
    ['3. Save the file and upload it in FinTrack → Settings → Import, or Transactions → Import.'],
    ['4. You\'ll see a preview first. Nothing is saved until you confirm.'],
    [],
    ['Column', 'What to enter'],
    ...TEMPLATE_COLUMNS.map((c) => [c.header, c.help]),
    [],
    ['Tips'],
    ['• Credit card spends: Type = Expense, Payment mode = Credit card, Account / card = the card name.'],
    ['• Card bill payments: Type = CC payment, Account / card = bank you paid from, Paying card = the card.'],
    ['• New banks, wallets, cards, categories, subcategories and buckets are created automatically.'],
    ['• Rows that match an existing entry (same date, type, amount and description) are skipped as duplicates.'],
  ]
  const wg = XLSX.utils.aoa_to_sheet(guide)
  wg['!cols'] = [{ wch: 26 }, { wch: 100 }]
  XLSX.utils.book_append_sheet(wb, wg, 'How to fill')

  const cats = allCategories(data)
  const lists = [
    ['Type', 'Payment mode', 'Expense categories', 'Income categories', 'Banks', 'Wallets / gift cards', 'Credit cards', 'Buckets'],
  ]
  const cols = [
    ['Income', 'Expense', 'Investment', 'CC payment', 'Bucket add', 'Bucket spend'],
    ['UPI', 'Bank transfer', 'Debit card', 'Wallet', 'Credit card', 'Cash', 'Other'],
    cats.filter((c) => c.type === 'expense').map((c) => { const subs = subcategoriesOf(data, c); return subs.length ? `${c.name}  (${subs.join(', ')})` : c.name }),
    cats.filter((c) => c.type === 'income').map((c) => c.name),
    allBanks(data).map((b) => b.name),
    allWallets(data).map((w) => w.name),
    [...data.cards.map((c) => c.name), "Friend's credit card"],
    (data.buckets || []).map((b) => b.name),
  ]
  const max = Math.max(...cols.map((c) => c.length))
  for (let i = 0; i < max; i++) lists.push(cols.map((c) => c[i] ?? ''))
  const wl = XLSX.utils.aoa_to_sheet(lists)
  wl['!cols'] = cols.map(() => ({ wch: 28 }))
  XLSX.utils.book_append_sheet(wb, wl, 'Valid values')

  XLSX.writeFile(wb, 'FinTrack-import-template.xlsx')
}

/* ---------- reading ---------- */
const HEADER_ALIASES = Object.fromEntries(TEMPLATE_COLUMNS.flatMap((c) => [[norm(c.header), c.key], [norm(c.key), c.key]]))
Object.assign(HEADER_ALIASES, { account: 'account', 'account/card': 'account', card: 'account', bank: 'account', mode: 'mode', 'sub category': 'subcategory', status: 'paymentStatus', note: 'description', notes: 'description', bucket: 'bucket' })

export async function readImportFile(file) {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, raw: false, dateNF: 'dd-mm-yyyy' })
  const sheetName = wb.SheetNames.find((n) => norm(n) === 'transactions') || wb.SheetNames[0]
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: '' })
  const headerIdx = aoa.findIndex((r) => r.some((c) => HEADER_ALIASES[norm(c)] === 'date'))
  if (headerIdx < 0) throw new Error("Couldn't find the header row. Use the FinTrack template, with a \"Date\" column.")
  const keys = aoa[headerIdx].map((h) => HEADER_ALIASES[norm(h)] || null)
  const rows = []
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const r = aoa[i]
    if (!r.some((c) => String(c).trim() !== '')) continue
    const o = { _row: i + 1 }
    keys.forEach((k, j) => { if (k) o[k] = r[j] })
    rows.push(o)
  }
  return { rows, sheetName }
}

/* ---------- parsing helpers ---------- */
export function parseDate(v) {
  if (v instanceof Date && !isNaN(v)) return toISO(v)
  if (typeof v === 'number' && v > 20000 && v < 80000) { // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400000))
    return toISO(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (m) return valid(+m[3], +m[2], +m[1])
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return valid(+m[1], +m[2], +m[3])
  return null
}
const valid = (y, mo, d) => {
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? toISO(dt) : null
}
export const parseAmountCell = (v) => {
  if (typeof v === 'number') return Math.abs(v)
  const n = parseFloat(String(v ?? '').replace(/[,₹\s]|rs\.?|inr/gi, ''))
  return Number.isFinite(n) ? Math.abs(n) : NaN
}

const TYPE_MAP = {
  income: 'income', credit: 'income', expense: 'expense', debit: 'expense', spend: 'expense',
  investment: 'investment', invest: 'investment', investing: 'investment', sip: 'investment',
  'cc payment': 'ccpay', 'credit card payment': 'ccpay', 'card payment': 'ccpay', 'bill payment': 'ccpay',
  'bucket add': 'bucket-add', bucket: 'bucket-add', 'bucket deposit': 'bucket-add', 'bucket spend': 'bucket-spend',
}
const MODE_MAP = {
  upi: 'upi', 'bank transfer': 'bank', bank: 'bank', neft: 'bank', imps: 'bank', 'net banking': 'bank', 'debit card': 'debit', debit: 'debit',
  wallet: 'wallet', 'credit card': 'cc', cc: 'cc', card: 'cc', cash: 'cash', other: 'other', 'gift card': 'wallet',
}
const STATUS_MAP = { paid: 'paid', 'partially paid': 'partial', partial: 'partial', outstanding: 'outstanding', unpaid: 'outstanding' }
const isFriend = (s) => /friend/i.test(String(s || ''))

/** Lookup helper over one user's data, plus a record of names that would be newly created */
export function makeResolver(data) {
  const banks = allBanks(data), wallets = allWallets(data), cards = data.cards, cats = allCategories(data)
  const created = { banks: new Map(), wallets: new Map(), giftcards: new Map(), cards: new Map(), categories: new Map(), subs: new Map(), buckets: new Map() }
  const findAcc = (name) => {
    const n = norm(name)
    if (!n) return null
    const b = banks.find((x) => norm(x.name) === n); if (b) return { kind: 'bank', id: b.id }
    const w = wallets.find((x) => norm(x.name) === n); if (w) return { kind: w.kind === 'giftcard' ? 'giftcard' : 'wallet', id: w.id }
    const c = cards.find((x) => norm(x.name) === n); if (c) return { kind: 'card', id: c.id }
    return null
  }
  return {
    created,
    /** Resolve an account for a mode; unknown names are queued for creation */
    account(name, mode, giftcard = false) {
      if (!String(name || '').trim()) return null
      if (mode === 'cc' && isFriend(name)) return { kind: 'friend', id: FRIEND_CC }
      const hit = findAcc(name)
      if (hit) return hit
      const clean = String(name).trim(), n = norm(name)
      const bag = mode === 'cc' ? 'cards' : giftcard ? 'giftcards' : mode === 'wallet' ? 'wallets' : 'banks'
      if (!created[bag].has(n)) created[bag].set(n, clean)
      return { kind: bag === 'cards' ? 'card' : bag === 'giftcards' ? 'giftcard' : bag === 'wallets' ? 'wallet' : 'bank', id: `new:${bag}:${n}`, isNew: true }
    },
    card(name) {
      if (isFriend(name)) return { kind: 'friend', id: FRIEND_CC }
      return this.account(name, 'cc')
    },
    category(name, type) {
      const n = norm(name)
      if (!n) return null
      const c = cats.find((x) => x.type === type && norm(x.name) === n)
      if (c) return c
      const key = `${type}:${n}`
      if (!created.categories.has(key)) created.categories.set(key, { type, name: String(name).trim() })
      return { id: `new:cat:${key}`, name: String(name).trim(), type, isNew: true }
    },
    subcategory(cat, name) {
      const clean = String(name || '').trim()
      if (!clean || !cat) return ''
      const known = cat.isNew ? [] : subcategoriesOf(data, cat)
      const hit = known.find((s) => norm(s) === norm(clean))
      if (hit) return hit
      const key = `${cat.id}::${norm(clean)}`
      if (!created.subs.has(key)) created.subs.set(key, { catId: cat.id, catName: cat.name, name: clean })
      return clean
    },
    bucket(name) {
      const n = norm(name)
      if (!n) return null
      const b = (data.buckets || []).find((x) => norm(x.name) === n)
      if (b) return { id: b.id, name: b.name }
      if (!created.buckets.has(n)) created.buckets.set(n, String(name).trim())
      return { id: `new:bkt:${n}`, name: String(name).trim(), isNew: true }
    },
  }
}

const dupKey = (date, kind, amount, desc) => `${date}|${kind}|${round2(amount)}|${norm(desc)}`
function existingKeys(data) {
  const keys = new Set()
  for (const t of data.transactions) {
    const kind = t.type === 'income' ? 'income' : t.type === 'transfer' ? 'ccpay' : t.type === 'bucket' ? `bucket-${t.action === 'spend' ? 'spend' : 'add'}` : t.categoryId === CAT.INVESTING ? 'investment' : 'expense'
    keys.add(dupKey(t.date, kind, t.amount, t.description))
  }
  return keys
}

/**
 * Checks every row. Each item: { row, status: 'ok'|'dup'|'error', errors[], kind, draft, title, amount }
 * `draft` uses ids, or placeholders "new:…" for things to create on import.
 */
export function analyzeImport(data, rows) {
  const R = makeResolver(data)
  const seen = existingKeys(data)
  const items = rows.map((r) => {
    const errors = []
    const date = parseDate(r.date)
    if (!date) errors.push(r.date ? `Date “${r.date}” isn't DD-MM-YYYY` : 'Date is missing')
    const amount = parseAmountCell(r.amount)
    if (!(amount > 0)) errors.push(String(r.amount ?? '').trim() ? `Amount “${r.amount}” isn't a number` : 'Amount is missing')

    let kind = TYPE_MAP[norm(r.type)]
    // Category can also decide the kind (e.g. Type Expense + Category Investing)
    const catN = norm(r.category)
    if (kind === 'expense' && catN === 'investing') kind = 'investment'
    if (kind === 'expense' && catN === 'credit card payment') kind = 'ccpay'
    if (!kind) errors.push(r.type ? `Type “${r.type}” isn't recognised` : 'Type is missing')

    const modeRaw = norm(r.mode)
    let mode = MODE_MAP[modeRaw] || ''
    if (modeRaw && !mode) errors.push(`Payment mode “${r.mode}” isn't recognised`)
    const desc = String(r.description ?? '').trim()
    const draft = { date, amount: round2(amount || 0), description: desc, meta: {} }
    let title = desc

    if (kind === 'income' || kind === 'expense') {
      const cat = R.category(r.category, kind)
      if (!cat) errors.push('Category is missing')
      draft.type = kind
      draft.categoryId = cat?.id
      draft.subcategory = R.subcategory(cat, r.subcategory)
      const gift = kind === 'income' && cat?.id === CAT.GIFT_CARD
      if (gift) { if (!r.account) errors.push('Gift card name is missing (Account / card)'); mode = 'wallet' }
      if (!mode && r.account) {
        const hit = R.account(r.account, '', gift)
        mode = hit?.kind === 'card' ? 'cc' : hit?.kind === 'wallet' || hit?.kind === 'giftcard' ? 'wallet' : 'bank'
      }
      if (!mode) mode = 'cash'
      if (kind === 'income' && ['upi', 'debit'].includes(mode)) mode = 'bank'
      if (kind === 'income' && mode === 'cc') errors.push("Income can't be received on a credit card")
      draft.mode = mode
      if (['upi', 'bank', 'debit', 'wallet', 'cc'].includes(mode)) {
        const acc = R.account(r.account, mode, gift)
        if (!acc) errors.push(mode === 'cc' ? 'Card name is missing (Account / card)' : 'Account name is missing (Account / card)')
        draft.accountId = acc?.id || ''
      } else draft.accountId = ''
      if (cat?.id === CAT.RECHARGE && r.rechargeFor) draft.meta.rechargeFor = String(r.rechargeFor).trim()
      if (cat?.id === CAT.INV_INCOME) {
        const it = INVESTMENT_INCOME_TYPES.find((x) => norm(x) === norm(r.incomeType)) || INVESTMENT_INCOME_TYPES.find((x) => norm(x).startsWith(norm(r.incomeType).split(' ')[0] || '~'))
        if (!it) errors.push(r.incomeType ? `Investment income type “${r.incomeType}” isn't recognised` : 'Investment income type is missing')
        draft.meta.incomeType = it
      }
      if (gift) draft.meta.giftCardId = draft.accountId
      title = title || (draft.subcategory ? `${cat?.name} · ${draft.subcategory}` : cat?.name) || 'Transaction'
    } else if (kind === 'investment') {
      if (mode === 'other') errors.push('Choose how the investment was paid')
      if (['upi', 'bank', 'debit', 'wallet', 'cc'].includes(mode)) {
        const acc = R.account(r.account, mode)
        if (!acc) errors.push('Account name is missing (Account / card)')
        draft.accountId = acc?.id || ''
      } else if (!mode && r.account) {
        const hit = R.account(r.account, '')
        mode = hit?.kind === 'card' ? 'cc' : hit?.kind === 'wallet' ? 'wallet' : 'bank'
        draft.accountId = hit?.id || ''
      }
      draft.mode = mode || ''
      draft.type = 'investment'
      const sub = String(r.subcategory || '').trim()
      draft.invCategory = presetToInvCategory(sub) !== 'Custom' ? presetToInvCategory(sub) : sub || 'Custom'
      draft.invName = desc || sub || 'Investment'
      title = `${draft.invName} (investment)`
    } else if (kind === 'ccpay') {
      const card = R.card(r.payingCard || (r.account && !r.payingCard && norm(r.mode) === 'credit card' ? r.account : ''))
      if (!card) errors.push('Paying card is missing')
      if (!mode || mode === 'cc' || mode === 'other') {
        if (mode === 'cc') errors.push('Pay a card bill from a bank, wallet or cash')
        mode = mode || (r.account ? 'bank' : 'cash')
      }
      const acc = mode === 'cash' ? null : R.account(r.account, mode)
      if (mode !== 'cash' && !acc) errors.push('Account you paid from is missing (Account / card)')
      Object.assign(draft, { type: 'transfer', categoryId: CAT.CC_PAYMENT, mode, accountId: acc?.id || '', toCardId: card?.id, paymentStatus: STATUS_MAP[norm(r.paymentStatus)] || 'paid', outstandingAfter: null })
      if (card?.id === FRIEND_CC && desc) draft.meta.friendName = desc
      title = desc || `Card bill · ${r.payingCard || 'card'}`
    } else if (kind === 'bucket-add' || kind === 'bucket-spend') {
      const b = R.bucket(r.bucket || (kind === 'bucket-spend' ? '' : ''))
      if (!b) errors.push('Bucket name is missing')
      draft.type = 'bucket'
      draft.action = kind === 'bucket-add' ? 'deposit' : 'spend'
      draft.bucketId = b?.id
      if (kind === 'bucket-add') {
        if (!mode || mode === 'cc' || mode === 'other') { if (mode) errors.push('Add to a bucket from a bank, wallet or cash'); mode = mode && mode !== 'cc' && mode !== 'other' ? mode : r.account ? 'bank' : 'cash' }
        const acc = mode === 'cash' ? null : R.account(r.account, mode)
        if (mode !== 'cash' && !acc) errors.push('Account is missing (Account / card)')
        draft.mode = mode; draft.accountId = acc?.id || ''
      } else {
        draft.mode = ''; draft.accountId = ''
        const cat = r.category ? R.category(r.category, 'expense') : null
        draft.categoryId = cat?.id || ''
      }
      title = desc || `${kind === 'bucket-add' ? 'Added to' : 'Bought with'} ${b?.name || 'bucket'}`
    }

    let status = errors.length ? 'error' : 'ok'
    if (status === 'ok') {
      const key = dupKey(date, kind, amount, kind === 'investment' ? draft.invName : desc)
      if (seen.has(key) || (kind === 'investment' && seen.has(dupKey(date, kind, amount, desc)))) status = 'dup'
      else seen.add(key) // a repeat later in the same file also counts as a duplicate
    }
    return { row: r._row, status, errors, kind, draft, title, amount: round2(amount || 0) }
  })
  const c = R.created
  return {
    items,
    maps: c, // raw name maps, needed by applyImport
    created: {
      banks: [...c.banks.values()], wallets: [...c.wallets.values()], giftcards: [...c.giftcards.values()], cards: [...c.cards.values()],
      categories: [...c.categories.values()], subs: [...c.subs.values()], buckets: [...c.buckets.values()],
    },
  }
}

export const isDefaultCategory = (id) => DEFAULT_CATEGORIES.some((c) => c.id === id)

/**
 * Applies approved import items to one user's data (pure; used inside DataContext.update).
 * Names marked "new:…" are created the first time a row uses them.
 */
export function applyImport(d, items, created) {
  const nowIso = new Date().toISOString()
  const banks = [...d.banks], wallets = [...d.wallets], cards = d.cards.map((c) => ({ ...c })), categories = [...d.categories]
  const buckets = [...(d.buckets || [])], customSubs = { ...(d.customSubs || {}) }
  const investments = d.investments.map((i) => (i.payments ? { ...i, payments: [...i.payments] } : i))
  const transactions = [...d.transactions]
  const idMap = new Map()
  const resolve = (id) => {
    if (!id || !String(id).startsWith('new:')) return id
    if (idMap.has(id)) return idMap.get(id)
    const [, bag, ...rest] = String(id).split(':')
    const key = rest.join(':')
    let newId
    if (bag === 'banks') { newId = uid('bank'); banks.push({ id: newId, name: created.banks.get(key) }) }
    else if (bag === 'wallets') { newId = uid('wal'); wallets.push({ id: newId, name: created.wallets.get(key), kind: 'wallet' }) }
    else if (bag === 'giftcards') { newId = uid('wal'); wallets.push({ id: newId, name: created.giftcards.get(key), kind: 'giftcard' }) }
    else if (bag === 'cards') { newId = uid('card'); cards.push({ id: newId, name: created.cards.get(key), billDay: 1, limit: 0, openingOutstanding: 0, status: 'unpaid', theme: 'midnight', createdAt: nowIso }) }
    else if (bag === 'cat') { const c = created.categories.get(key); newId = uid('cat'); categories.push({ id: newId, type: c.type, name: c.name, icon: 'Tag', custom: true, color: CUSTOM_COLORS[categories.length % CUSTOM_COLORS.length] }) }
    else if (bag === 'bkt') { newId = uid('bkt'); buckets.push({ id: newId, name: created.buckets.get(key), target: 0, icon: 'PiggyBank', note: 'Created by import. Set a target.', createdAt: nowIso }) }
    idMap.set(id, newId)
    return newId
  }
  const addSub = (catId, sub) => {
    if (!sub || !catId) return
    const cat = [...DEFAULT_CATEGORIES, ...categories].find((c) => c.id === catId)
    const all = [...(cat?.subcategories || []), ...(customSubs[catId] || [])]
    if (!all.some((s) => norm(s) === norm(sub))) customSubs[catId] = [...(customSubs[catId] || []), sub]
  }
  const cardStatus = new Map()
  const sorted = [...items].sort((a, b) => a.draft.date.localeCompare(b.draft.date))

  sorted.forEach((it, n) => {
    const x = it.draft
    const createdAt = new Date(Date.now() + n).toISOString()
    if (x.type === 'investment') {
      const accountId = resolve(x.accountId) || ''
      const key = `${norm(x.invName)}|${norm(x.invCategory)}`
      let inv = investments.find((i) => i.payments && `${norm(i.name)}|${norm(i.category)}` === key)
      if (!inv) {
        inv = { id: uid('inv'), type: 'lumpsum', name: x.invName, category: x.invCategory, amountPaid: x.amount, investedAmount: x.amount, valueAdj: 0, startDate: x.date, status: 'active', mode: x.mode, accountId, description: 'Imported', payments: [], skipped: [], createdAt }
        investments.push(inv)
      }
      inv.payments.push({ date: x.date, amount: x.amount, mode: x.mode, accountId, createdAt })
      return
    }
    const t = { id: uid('txn'), type: x.type, amount: x.amount, date: x.date, description: x.description, categoryId: resolve(x.categoryId) || '', subcategory: x.subcategory || '', mode: x.mode || '', accountId: resolve(x.accountId) || '', meta: { ...x.meta }, createdAt, imported: true }
    if (t.meta.giftCardId) t.meta.giftCardId = t.accountId
    if (x.type === 'transfer') {
      Object.assign(t, { toCardId: resolve(x.toCardId), paymentStatus: x.paymentStatus, outstandingAfter: null })
      if (t.toCardId && t.toCardId !== FRIEND_CC) cardStatus.set(t.toCardId, { paid: 'paid', partial: 'partial', outstanding: 'unpaid' }[x.paymentStatus] || 'paid')
    }
    if (x.type === 'bucket') Object.assign(t, { bucketId: resolve(x.bucketId), action: x.action })
    if (x.type === 'income' || x.type === 'expense') addSub(t.categoryId, t.subcategory)
    transactions.push(t)
  })
  for (const inv of investments) {
    if (!inv.payments?.length) continue
    inv.payments.sort((a, b) => a.date.localeCompare(b.date))
    inv.startDate = inv.payments[0].date
  }
  const cardsOut = cards.map((c) => (cardStatus.has(c.id) ? { ...c, status: cardStatus.get(c.id), statusAt: nowIso } : c))
  return { ...d, banks, wallets, cards: cardsOut, categories, buckets, customSubs, investments, transactions }
}

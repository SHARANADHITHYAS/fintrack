import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs) => twMerge(clsx(inputs))

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/* ---------- money ---------- */
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** ₹42,000 (whole rupees unless paise present) */
export function money(n, { sign = false } = {}) {
  const v = round2(n)
  const abs = Math.abs(v)
  const body = Number.isInteger(abs) ? inr.format(abs) : inr2.format(abs)
  const s = v < 0 ? '−' : sign && v > 0 ? '+' : ''
  return `${s}₹${body}`
}

/** ₹5.6k style for charts and compact tiles. Falls back to L for ≥ 1 lakh. */
export function moneyK(n, { sign = false } = {}) {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  const s = v < 0 ? '−' : sign && v > 0 ? '+' : ''
  let body
  if (abs >= 100000) body = `${+(abs / 100000).toFixed(2)}L`
  else if (abs >= 1000) body = `${+(abs / 1000).toFixed(1)}k`
  else body = `${Math.round(abs)}`
  return `${s}₹${body}`
}

export const pct = (n, digits = 1) => `${(Number(n) || 0) >= 0 ? '+' : '−'}${Math.abs(Number(n) || 0).toFixed(digits)}%`

export const parseAmount = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[,₹\s]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/* ---------- dates (always local YYYY-MM-DD strings) ---------- */
const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
export const todayISO = () => toISO(new Date())
export const monthKey = (iso) => String(iso).slice(0, 7)
export const monthKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

/** Add n months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso, n, anchorDay) {
  const d = fromISO(iso)
  const day = anchorDay ?? d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, last))
  return toISO(target)
}
export const monthsBetween = (aIso, bIso) => {
  const a = fromISO(aIso), b = fromISO(bIso)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const monthShort = (key) => MONTHS[Number(key.slice(5, 7)) - 1]
export const monthLabel = (key) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`
export const monthShortYear = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ’${key.slice(2, 4)}`
export const fmtDate = (iso) => {
  if (!iso) return ''
  const d = fromISO(iso)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
export const fmtDateShort = (iso) => {
  const d = fromISO(iso)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`
}
export const fmtDMY = (iso) => {
  const d = fromISO(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/* ---------- periods ---------- */
export const PERIODS = [
  { value: 'this-month', label: 'Current month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3', label: 'Last 3 months' },
  { value: 'last-6', label: 'Last 6 months' },
  { value: 'this-year', label: 'Current year' },
  { value: 'last-year', label: 'Last year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

/** Returns { start, end, label } as ISO strings (inclusive). start = null means open-ended. */
export function periodRange(period, custom = {}, earliest) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const first = (yy, mm) => toISO(new Date(yy, mm, 1))
  const last = (yy, mm) => toISO(new Date(yy, mm + 1, 0))
  const label = PERIODS.find((p) => p.value === period)?.label ?? ''
  switch (period) {
    case 'this-month': return { start: first(y, m), end: last(y, m), label }
    case 'last-month': return { start: first(y, m - 1), end: last(y, m - 1), label }
    case 'last-3': return { start: first(y, m - 2), end: last(y, m), label }
    case 'last-6': return { start: first(y, m - 5), end: last(y, m), label }
    case 'this-year': return { start: first(y, 0), end: last(y, 11), label }
    case 'last-year': return { start: first(y - 1, 0), end: last(y - 1, 11), label: `Last year (${y - 1})` }
    case 'custom': {
      const s = custom.start || first(y, m)
      const e = custom.end || todayISO()
      return s <= e ? { start: s, end: e, label: `${fmtDate(s)} – ${fmtDate(e)}` } : { start: e, end: s, label: `${fmtDate(e)} – ${fmtDate(s)}` }
    }
    case 'all':
    default: return { start: earliest || null, end: last(y, m), label: 'All time' }
  }
}
export const inRange = (iso, { start, end }) => (!start || iso >= start) && (!end || iso <= end)

/** List of month keys from start..end inclusive */
export function monthKeysBetween(startIso, endIso) {
  const out = []
  let d = new Date(fromISO(startIso).getFullYear(), fromISO(startIso).getMonth(), 1)
  const e = fromISO(endIso)
  while (d <= e) { out.push(monthKeyOf(d)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1) }
  return out
}

/* ---------- misc ---------- */
export async function hashPassword(pw) {
  const text = `fintrack::${pw}`
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return `weak${h}`
}

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there'

export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0)

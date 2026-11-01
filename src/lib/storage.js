/*
 * Storage adapter.
 * Everything the app persists goes through this file, so it can later be swapped for a
 * Google Sheets / Drive backend without touching the screens. Each user's data lives under
 * its own key, which keeps logins fully separate.
 */

const USERS_KEY = 'fintrack:users'
const SESSION_KEY = 'fintrack:session'
const dataKey = (userId) => `fintrack:data:${userId}`

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const emptyData = () => ({
  version: 1,
  categories: [],
  banks: [],
  wallets: [],
  cards: [],
  transactions: [],
  investments: [],
  emis: [],
  goals: [],
  openingBalances: {},
  customSubs: {},
  buckets: [],
  prefs: { onboarded: false },
})

export const storage = {
  getUsers: () => read(USERS_KEY, []),
  saveUsers: (users) => write(USERS_KEY, users),

  getSession: () => read(SESSION_KEY, null),
  setSession: (session) => write(SESSION_KEY, session),
  clearSession: () => localStorage.removeItem(SESSION_KEY),

  loadData: (userId) => ({ ...emptyData(), ...read(dataKey(userId), {}) }),
  saveData: (userId, data) => write(dataKey(userId), data),
  deleteData: (userId) => localStorage.removeItem(dataKey(userId)),
}

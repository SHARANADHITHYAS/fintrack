import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { storage } from '../lib/storage'
import { hashPassword, uid } from '../lib/utils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = storage.getSession()
    if (!s) return null
    return storage.getUsers().find((u) => u.id === s.userId) ?? null
  })

  const register = useCallback(async ({ name, email, password }) => {
    const users = storage.getUsers()
    const e = email.trim().toLowerCase()
    if (users.some((u) => u.email === e)) throw new Error('That email already has an account. Try logging in.')
    const u = { id: uid('user'), name: name.trim(), email: e, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() }
    storage.saveUsers([...users, u])
    storage.setSession({ userId: u.id, at: Date.now() })
    setUser(u)
    return u
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const e = email.trim().toLowerCase()
    const u = storage.getUsers().find((x) => x.email === e)
    if (!u || u.passwordHash !== (await hashPassword(password))) throw new Error("Email or password doesn't match. Give it another try.")
    storage.setSession({ userId: u.id, at: Date.now() })
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    storage.clearSession()
    setUser(null)
  }, [])

  const updateProfile = useCallback((patch) => {
    setUser((cur) => {
      if (!cur) return cur
      const next = { ...cur, ...patch }
      storage.saveUsers(storage.getUsers().map((u) => (u.id === cur.id ? next : u)))
      return next
    })
  }, [])

  const value = useMemo(() => ({ user, register, login, logout, updateProfile }), [user, register, login, logout, updateProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

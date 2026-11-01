import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

const ThemeContext = createContext(null)
const KEY = 'fintrack:theme'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b0c' : '#f7f8fa')
    localStorage.setItem(KEY, theme)
  }, [theme])

  // Smooth switch: a cross-fade via View Transitions where supported, else a short colour transition.
  const switchTo = useCallback((next) => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // Flip the class immediately so the View Transition captures the new look
    const apply = () => { document.documentElement.classList.toggle('dark', next === 'dark'); flushSync(() => setThemeState(next)) }
    if (reduce) return apply()
    if (document.startViewTransition) { document.startViewTransition(apply); return }
    const root = document.documentElement
    root.classList.add('theme-fading')
    apply()
    setTimeout(() => root.classList.remove('theme-fading'), 400)
  }, [])
  const setTheme = useCallback((t) => { if (t !== (document.documentElement.classList.contains('dark') ? 'dark' : 'light')) switchTo(t) }, [switchTo])
  const toggle = useCallback(() => switchTo(document.documentElement.classList.contains('dark') ? 'light' : 'dark'), [switchTo])
  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)

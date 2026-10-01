import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeftRight, ChartPie, CreditCard, LayoutDashboard, LogOut, Moon, Settings, Sun, User } from 'lucide-react'
import { Button, Menu } from './ui'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { cn, initials } from '../lib/utils'

export const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', short: 'Money', icon: ArrowLeftRight },
  { to: '/investments', label: 'Investments', short: 'Invest', icon: ChartPie },
  { to: '/cards', label: 'Credit Cards', short: 'Cards', icon: CreditCard },
  { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
]

export function Logo({ className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--teal),var(--violet))] font-display text-lg font-extrabold text-[#04110f] shadow-[0_0_22px_-6px_var(--teal)]">₹</span>
      <span className="font-display text-[19px] font-extrabold tracking-tight text-fg">Fin<span className="text-teal">Track</span></span>
    </div>
  )
}

export function ThemeButton() {
  const { theme, toggle } = useTheme()
  return (
    <Button variant="secondary" size="icon" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
      {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </Button>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])

  return (
    <div className="app-bg min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <NavLink to="/" aria-label="FinTrack home"><Logo /></NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-all lg:px-3.5',
                  isActive ? 'bg-teal text-on-teal shadow-[0_0_20px_-6px_var(--teal)]' : 'text-muted hover:bg-card-2 hover:text-fg')}>
                <n.icon className="size-[18px]" />
                <span className="hidden lg:inline">{n.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeButton />
            <Menu
              trigger={<button className="grid size-10 cursor-pointer place-items-center rounded-full bg-[linear-gradient(135deg,var(--net),var(--violet))] text-sm font-bold text-white ring-2 ring-transparent transition hover:ring-teal/50" aria-label="Account menu">{initials(user?.name)}</button>}
              items={[
                { label: user?.name || 'Profile', icon: User, onSelect: () => nav('/settings') },
                { label: 'Log out', icon: LogOut, danger: true, onSelect: () => { logout(); nav('/login') } },
              ]}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-5 pb-28 sm:px-6 sm:pt-7 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_srgb,var(--card)_88%,transparent)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-2 pb-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="flex flex-col items-center gap-1 text-[10.5px] font-semibold">
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-8 w-12 place-items-center rounded-xl transition-all', isActive ? 'bg-teal text-on-teal shadow-[0_0_18px_-4px_var(--teal)]' : 'text-muted')}>
                    <n.icon className="size-5" />
                  </span>
                  <span className={isActive ? 'text-teal' : 'text-muted'}>{n.short}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

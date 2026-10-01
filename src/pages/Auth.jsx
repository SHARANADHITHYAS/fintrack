import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, TrendingUp, User, PiggyBank, CreditCard } from 'lucide-react'
import { Button, Field, Input } from '../components/ui'
import { Logo, ThemeButton } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { timeGreeting } from '../lib/greetings'

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="app-bg grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand side */}
      <aside className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -top-40 -left-24 size-[480px] rounded-full bg-teal/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-40 size-[520px] rounded-full bg-violet/20 blur-3xl" />
        <Logo />
        <div className="relative">
          <h2 className="font-display text-[40px] leading-[1.1] font-extrabold tracking-tight text-fg">
            Every rupee,<br /><span className="bg-[linear-gradient(90deg,var(--teal),var(--violet))] bg-clip-text text-transparent">beautifully tracked.</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] text-muted">Income, expenses, SIPs, credit cards and EMIs in one calm place. Financial tracking is a habit, and it starts today.</p>
          <div className="mt-10 grid max-w-md gap-3">
            {[
              { i: TrendingUp, t: 'See where your money goes', s: 'Clear charts, month by month' },
              { i: PiggyBank, t: 'Hit your savings goal', s: 'Green bars feel good, trust us' },
              { i: CreditCard, t: 'Cards and EMIs in sync', s: 'Outstanding, limits and bills, all automatic' },
            ].map(({ i: I, t, s }) => (
              <div key={t} className="flex items-center gap-3.5 rounded-2xl border border-line bg-card/70 p-3.5 backdrop-blur">
                <span className="grid size-10 place-items-center rounded-xl bg-teal-soft text-teal"><I className="size-5" /></span>
                <div><div className="text-sm font-bold text-fg">{t}</div><div className="text-[12.5px] text-muted">{s}</div></div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-[12.5px] text-faint">“Small, steady steps. Consistency beats intensity.”</p>
      </aside>

      {/* Form side */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeButton />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="anim-pop">
            <h1 className="font-display text-[28px] leading-tight font-extrabold tracking-tight text-fg sm:text-[32px]">{title}</h1>
            <p className="mt-2 text-[14.5px] text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-center text-[14px] text-muted">{footer}</div>
            <p className="mt-8 flex items-center justify-center gap-2 text-[12px] text-faint"><ShieldCheck className="size-4 text-teal" />Demo login: your data stays private to your account on this device.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

const IconInput = ({ icon: I, right, ...p }) => (
  <div className="relative">
    <I className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-faint" />
    <Input {...p} className="!h-12 !pl-11 !pr-11" />
    {right && <div className="absolute top-1/2 right-2 -translate-y-1/2">{right}</div>}
  </div>
)

function PasswordInput(props) {
  const [show, setShow] = useState(false)
  return (
    <IconInput icon={Lock} type={show ? 'text' : 'password'} {...props}
      right={<button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-faint hover:text-fg" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const x = {}
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email.'
    if (!f.password) x.password = 'Enter your password.'
    setErr(x)
    if (Object.keys(x).length) return
    setBusy(true)
    try { await login(f); nav('/', { replace: true }) } catch (ex) { setErr({ form: ex.message }) } finally { setBusy(false) }
  }
  return (
    <Shell title={`${timeGreeting()}! Welcome back 👋`} subtitle="Good to see you again. Let's check in on your money."
      footer={<>New to FinTrack? <Link to="/register" className="font-bold text-teal hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={err.email}><IconInput icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={!!err.email} /></Field>
        <Field label="Password" error={err.password}><PasswordInput autoComplete="current-password" placeholder="Your password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {err.form && <p className="rounded-xl bg-exp-soft px-3.5 py-2.5 text-[13px] font-medium text-exp">{err.form}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? 'Signing in…' : <>Log in <ArrowRight className="size-4" /></>}</Button>
      </form>
    </Shell>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const x = {}
    if (f.name.trim().length < 2) x.name = 'Tell us your name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email.'
    if (f.password.length < 6) x.password = 'Use at least 6 characters.'
    if (f.confirm !== f.password) x.confirm = "Passwords don't match."
    setErr(x)
    if (Object.keys(x).length) return
    setBusy(true)
    try { await register(f); nav('/', { replace: true }) } catch (ex) { setErr({ form: ex.message }) } finally { setBusy(false) }
  }
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr((x) => ({ ...x, [k]: undefined, form: undefined })) }
  return (
    <Shell title="Start your money journey ✨" subtitle="Create your account in 20 seconds. Your future self will thank you."
      footer={<>Already have an account? <Link to="/login" className="font-bold text-teal hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Your name" error={err.name}><IconInput icon={User} autoComplete="name" placeholder="Sharan" value={f.name} onChange={set('name')} invalid={!!err.name} /></Field>
        <Field label="Email" error={err.email}><IconInput icon={Mail} type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set('email')} invalid={!!err.email} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" error={err.password}><PasswordInput autoComplete="new-password" placeholder="6+ characters" value={f.password} onChange={set('password')} /></Field>
          <Field label="Confirm password" error={err.confirm}><PasswordInput autoComplete="new-password" placeholder="Once more" value={f.confirm} onChange={set('confirm')} /></Field>
        </div>
        {err.form && <p className="rounded-xl bg-exp-soft px-3.5 py-2.5 text-[13px] font-medium text-exp">{err.form}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? 'Creating…' : <>Create account <ArrowRight className="size-4" /></>}</Button>
      </form>
    </Shell>
  )
}

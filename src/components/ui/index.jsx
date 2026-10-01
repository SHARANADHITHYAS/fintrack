/* shadcn/ui-style primitives, themed for FinTrack Neon. */
import { forwardRef, useId } from 'react'
import * as RDialog from '@radix-ui/react-dialog'
import * as RMenu from '@radix-ui/react-dropdown-menu'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

/* ---------- Button ---------- */
const variants = {
  primary: 'bg-teal text-on-teal shadow-[0_0_24px_-8px_var(--teal)] hover:brightness-110',
  secondary: 'bg-card-2 text-fg border border-line hover:border-teal/60',
  ghost: 'text-muted hover:text-fg hover:bg-card-2',
  soft: 'bg-teal-soft text-teal border border-teal/40 hover:shadow-[0_0_18px_-4px_var(--teal)]',
  danger: 'bg-exp text-white hover:brightness-110',
  'danger-soft': 'bg-exp-soft text-exp border border-exp/30 hover:brightness-110',
}
const sizes = {
  sm: 'h-9 px-3 text-[13px] rounded-xl gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-2xl gap-2',
  icon: 'size-10 rounded-xl',
  'icon-sm': 'size-8 rounded-lg',
}
export const Button = forwardRef(function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-teal/60 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)}
      {...props}
    />
  )
})

/* ---------- Card ---------- */
export const Card = ({ className, ...p }) => <div className={cn('rounded-3xl bg-card shadow-glow', className)} {...p} />
export const CardHeader = ({ title, subtitle, action, className, icon: Icon }) => (
  <div className={cn('flex items-start justify-between gap-3', className)}>
    <div className="flex min-w-0 items-start gap-3">
      {Icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-soft text-violet"><Icon className="size-[18px]" /></span>}
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-bold text-fg sm:text-base">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
)

/* ---------- Badge ---------- */
const tones = {
  teal: 'bg-teal-soft text-teal', inc: 'bg-inc-soft text-inc', exp: 'bg-exp-soft text-exp', inv: 'bg-inv-soft text-inv',
  net: 'bg-net-soft text-net', warn: 'bg-warn-soft text-warn', violet: 'bg-violet-soft text-violet', muted: 'bg-card-2 text-muted border border-line',
}
export const Badge = ({ tone = 'muted', className, ...p }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap', tones[tone], className)} {...p} />
)

/* ---------- Form fields ---------- */
export function Field({ label, required, optional, hint, error, children, className }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <span className="text-[12.5px] font-semibold text-muted">
          {label}
          {required && <span className="text-exp"> *</span>}
          {optional && <span className="font-normal text-faint"> (optional)</span>}
        </span>
      )}
      {children}
      {error ? <span className="text-[12px] font-medium text-exp">{error}</span> : hint ? <span className="text-[12px] text-faint">{hint}</span> : null}
    </div>
  )
}
export const Input = forwardRef(function Input({ className, invalid, ...p }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn('ft-input', className)} {...p} />
})
export const Textarea = forwardRef(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn('ft-input', className)} {...p} />
})
export const Select = forwardRef(function Select({ className, invalid, children, ...p }, ref) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={cn('ft-input', className)} {...p}>{children}</select>
})
export function MoneyInput({ value, onChange, invalid, className, big, ...p }) {
  return (
    <div className={cn('ft-input flex items-center gap-2 !px-3.5', big && '!h-14', invalid && '!border-exp', className)} style={{ padding: 0 }}>
      <span className={cn('font-bold text-faint', big ? 'text-xl' : 'text-base')}>₹</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
        className={cn('tabular h-full min-w-0 flex-1 bg-transparent font-bold text-fg outline-none placeholder:font-medium placeholder:text-faint', big ? 'text-2xl' : 'text-[15px]')}
        {...p}
      />
    </div>
  )
}

/* ---------- Segmented control ---------- */
export function Segmented({ value, onChange, options, className, size = 'md' }) {
  return (
    <div role="tablist" className={cn('grid gap-1 rounded-2xl border border-line bg-card-2 p-1', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn('flex cursor-pointer items-center justify-center gap-1.5 rounded-xl font-semibold transition-all', size === 'sm' ? 'h-8 text-[12.5px]' : 'h-10 text-sm',
              active ? (o.activeClass ?? 'bg-teal text-on-teal shadow-[0_0_18px_-6px_var(--teal)]') : 'text-muted hover:text-fg')}
          >
            {o.icon && <o.icon className="size-4" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Switch ---------- */
export function Switch({ checked, onChange, label, id }) {
  const auto = useId()
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} id={id ?? auto} onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors', checked ? 'border-teal bg-teal' : 'border-line bg-card-2')}>
      <span className={cn('absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

/* ---------- Dialog (bottom sheet on mobile) ---------- */
export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md', icon: Icon }) {
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' }[size]
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="anim-fade fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-sm" />
        <RDialog.Content
          aria-describedby={description ? undefined : undefined}
          className={cn('fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] bg-card shadow-glow-strong outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl', w,
            'anim-pop max-sm:animate-[ft-up_.28s_cubic-bezier(.2,.8,.2,1)]')}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line sm:hidden" />
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
            <div className="flex min-w-0 items-start gap-3">
              {Icon && <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-teal-soft text-teal"><Icon className="size-5" /></span>}
              <div className="min-w-0">
                <RDialog.Title className="font-display text-lg font-extrabold text-fg sm:text-xl">{title}</RDialog.Title>
                {description ? <RDialog.Description className="mt-0.5 text-[13px] text-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
              </div>
            </div>
            <RDialog.Close asChild><Button variant="ghost" size="icon-sm" aria-label="Close"><X className="size-5" /></Button></RDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">{children}</div>
          {footer && <div className="pb-safe flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5 sm:px-6">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, points = [], confirmLabel = 'Delete', onConfirm, tone = 'danger', icon }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} size="sm" icon={icon}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant={tone} onClick={() => { onConfirm(); onOpenChange(false) }}>{confirmLabel}</Button></>}>
      {points.length > 0 && (
        <ul className="space-y-2">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2.5 rounded-2xl border border-line bg-card-2 px-3.5 py-2.5 text-[13.5px] text-fg">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet" />{p}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

/* ---------- Dropdown menu ---------- */
export function Menu({ trigger, items, align = 'end' }) {
  return (
    <RMenu.Root modal={false}>
      <RMenu.Trigger asChild>{trigger}</RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content align={align} sideOffset={6} className="anim-pop z-[60] min-w-44 rounded-2xl border border-line bg-card p-1.5 shadow-glow-strong">
          {items.filter(Boolean).map((it) => (
            <RMenu.Item key={it.label} onSelect={it.onSelect}
              className={cn('flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-card-2', it.danger ? 'text-exp' : 'text-fg')}>
              {it.icon && <it.icon className="size-4" />}{it.label}
            </RMenu.Item>
          ))}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  )
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon: Icon, title, text, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      {Icon && <span className="grid size-14 place-items-center rounded-2xl bg-teal-soft text-teal shadow-[0_0_30px_-10px_var(--teal)]"><Icon className="size-7" /></span>}
      <h4 className="mt-4 font-display text-base font-bold text-fg">{title}</h4>
      {text && <p className="mt-1.5 max-w-sm text-[13.5px] text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-xl bg-card-2', className)} />

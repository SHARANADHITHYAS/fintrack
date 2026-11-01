import {
  Smartphone, CreditCard, House, GraduationCap, ShoppingBasket, Plane, HeartPulse, Zap, Bus, UtensilsCrossed, Clapperboard,
  Sparkles, ShoppingBag, Banknote, TrendingUp, Briefcase, Users, HeartHandshake, Coins, Award, Gift, Tag, Landmark, Wallet,
  CircleEllipsis, ArrowLeftRight, Repeat, CalendarClock, Tv, PiggyBank,
} from 'lucide-react'
import { cn } from '../lib/utils'

const ICONS = {
  Smartphone, CreditCard, House, GraduationCap, ShoppingBasket, Plane, HeartPulse, Zap, Bus, UtensilsCrossed, Clapperboard,
  Sparkles, ShoppingBag, Banknote, TrendingUp, Briefcase, Users, HeartHandshake, Coins, Award, Gift, Tag, Landmark, Wallet,
  CircleEllipsis, ArrowLeftRight, Repeat, CalendarClock, Tv, PiggyBank,
}

export const Icon = ({ name, ...p }) => {
  const I = ICONS[name] ?? Tag
  return <I {...p} />
}

/** Round, colour-tinted category icon used in transaction rows and pickers */
export function CategoryBubble({ icon, color, size = 'md', className }) {
  const s = size === 'sm' ? 'size-8 [&_svg]:size-4' : size === 'lg' ? 'size-12 [&_svg]:size-6' : 'size-10 [&_svg]:size-[18px]'
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full', s, className)} style={{ background: "var(--card-2)", color: "var(--muted)" }} data-color={color}>
      <Icon name={icon} />
    </span>
  )
}

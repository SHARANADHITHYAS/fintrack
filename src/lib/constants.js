/* Shared defaults. These are the same for every login; user-created items live in each user's own data. */

export const CAT = {
  RECHARGE: 'exp-recharge',
  CC_PAYMENT: 'exp-ccpay',
  ENTERTAINMENT: 'exp-entertainment',
  OTT: 'exp-ott',
  UTILITIES: 'exp-utilities',
  INVESTING: 'exp-investing',
  ATM: 'exp-atm',
  INV_INCOME: 'inc-investment',
  GIFT_CARD: 'inc-giftcard',
}

export const INVESTING_PRESETS = ['Mutual Funds', 'Stocks', 'Chit Fund', 'Gold', 'Silver', 'FD (Fixed Deposit)', 'RD (Recurring Deposit)']

export const DEFAULT_CATEGORIES = [
  { id: CAT.RECHARGE, type: 'expense', name: 'Mobile Recharge', icon: 'Smartphone', color: '#38bdf8' },
  { id: CAT.CC_PAYMENT, type: 'expense', name: 'Credit Card Payment', icon: 'CreditCard', color: '#60a5fa' },
  { id: 'exp-rent', type: 'expense', name: 'House Rent', icon: 'House', color: '#8c6d4f' },
  { id: 'exp-education', type: 'expense', name: 'Education', icon: 'GraduationCap', color: '#4f7cac' },
  { id: 'exp-groceries', type: 'expense', name: 'Groceries', icon: 'ShoppingBasket', color: '#34d399' },
  { id: 'exp-travel', type: 'expense', name: 'Travel', icon: 'Plane', color: '#22d3ee' },
  { id: 'exp-health', type: 'expense', name: 'Healthcare', icon: 'HeartPulse', color: '#f87171' },
  { id: CAT.UTILITIES, type: 'expense', name: 'Utilities', icon: 'Zap', color: '#facc15', subcategories: ['EB Bill (Electricity)', 'Water Bill', 'Gas Bill', 'Internet / Broadband', 'DTH / Cable TV', 'Apartment Maintenance'], subRequired: true, subLabel: 'Bill type' },
  { id: 'exp-transport', type: 'expense', name: 'Transportation', icon: 'Bus', color: '#fb923c' },
  { id: 'exp-food', type: 'expense', name: 'Food', icon: 'UtensilsCrossed', color: '#fb7185' },
  { id: CAT.ENTERTAINMENT, type: 'expense', name: 'Entertainment', icon: 'Clapperboard', color: '#f472b6', subcategories: ['Trip', 'Movie', 'Games'] },
  { id: CAT.OTT, type: 'expense', name: 'OTT', icon: 'Tv', color: '#e879f9', subcategories: ['Netflix', 'Amazon Prime Video', 'JioHotstar', 'SonyLIV', 'ZEE5', 'YouTube Premium', 'Spotify', 'Aha'], subRequired: true, subLabel: 'Which OTT?' },
  { id: 'exp-personal', type: 'expense', name: 'Personal Care', icon: 'Sparkles', color: '#d97757' },
  { id: 'exp-shopping', type: 'expense', name: 'Shopping', icon: 'ShoppingBag', color: '#fbbf24' },
  { id: CAT.ATM, type: 'expense', name: 'ATM Withdrawal', icon: 'Banknote', color: '#94a3b8' },
  { id: CAT.INVESTING, type: 'expense', name: 'Investing', icon: 'TrendingUp', color: '#2dd4bf', subcategories: INVESTING_PRESETS },

  { id: 'inc-salary', type: 'income', name: 'Salary / Freelance', icon: 'Briefcase', color: '#2dd4bf' },
  { id: 'inc-family', type: 'income', name: 'Family', icon: 'Users', color: '#4f7cac' },
  { id: 'inc-relations', type: 'income', name: 'Relations', icon: 'HeartHandshake', color: '#f472b6' },
  { id: CAT.INV_INCOME, type: 'income', name: 'Investment Income', icon: 'Coins', color: '#fbbf24' },
  { id: 'inc-bonus', type: 'income', name: 'Bonus', icon: 'Award', color: '#34d399' },
  { id: CAT.GIFT_CARD, type: 'income', name: 'Gift Card', icon: 'Gift', color: '#fb923c' },
]

export const CUSTOM_COLORS = ['#2dd4bf', '#8c6d4f', '#fb7185', '#60a5fa', '#fbbf24', '#34d399', '#f472b6', '#38bdf8', '#fb923c', '#a3e635', '#d97757', '#22d3ee', '#facc15', '#4f7cac', '#4ade80', '#f87171']

export const INVESTMENT_INCOME_TYPES = ['Dividend', 'FD Interest', 'Chit Fund Amount', 'Mutual Fund / Stock Gains', 'RD / Savings Interest', 'Rental Income']

export const DEFAULT_BANKS = [
  { id: 'bank-indian', name: 'Indian Bank', builtIn: true },
  { id: 'bank-hdfc', name: 'HDFC Bank', builtIn: true },
]
export const DEFAULT_WALLETS = [
  { id: 'wal-amazon', name: 'Amazon Pay', kind: 'wallet', builtIn: true },
  { id: 'wal-flipkart', name: 'Flipkart', kind: 'wallet', builtIn: true },
]

export const FRIEND_CC = 'friend'

export const EXPENSE_MODES = [
  { value: 'upi', label: 'UPI', needs: 'bank', icon: 'Smartphone' },
  { value: 'bank', label: 'Bank transfer', needs: 'bank', icon: 'Landmark' },
  { value: 'debit', label: 'Debit card', needs: 'bank', icon: 'CreditCard' },
  { value: 'wallet', label: 'Wallet', needs: 'wallet', icon: 'Wallet' },
  { value: 'cc', label: 'Credit card', needs: 'card', icon: 'CreditCard' },
  { value: 'cash', label: 'Cash', needs: null, icon: 'Banknote' },
]
export const PAY_FROM_MODES = EXPENSE_MODES.filter((m) => m.value !== 'cc' && m.value !== 'cash')
export const INCOME_MODES = [
  { value: 'bank', label: 'Bank account', needs: 'bank', icon: 'Landmark' },
  { value: 'wallet', label: 'Wallet', needs: 'wallet', icon: 'Wallet' },
  { value: 'cash', label: 'Cash', needs: null, icon: 'Banknote' },
  { value: 'other', label: 'Other', needs: null, icon: 'CircleEllipsis' },
]
export const ALL_MODES = [...EXPENSE_MODES, ...INCOME_MODES.filter((m) => m.value === 'other')]
export const modeLabel = (v) => ALL_MODES.find((m) => m.value === v)?.label ?? (v === 'bank' ? 'Bank account' : v || '—')

export const INVESTMENT_CATEGORIES = [
  { name: 'Mutual Funds', color: '#2f8f83' },
  { name: 'FD', color: '#60a5fa' },
  { name: 'RD', color: '#38bdf8' },
  { name: 'Gold', color: '#fbbf24' },
  { name: 'Silver', color: '#cbd5e1' },
  { name: 'Stocks', color: '#2dd4bf' },
  { name: 'PPF', color: '#34d399' },
  { name: 'NPS', color: '#4ade80' },
  { name: 'Real Estate', color: '#fb923c' },
  { name: 'Bonds', color: '#4f7cac' },
  { name: 'Crypto', color: '#f472b6' },
  { name: 'Chit Fund', color: '#fb7185' },
  { name: 'Custom', color: '#94a3b8' },
]
export const invCategoryColor = (name) =>
  INVESTMENT_CATEGORIES.find((c) => c.name === name)?.color ?? '#94a3b8'

/** Map a Record Transaction "Investing" preset to an investment category */
export const presetToInvCategory = (preset) => {
  if (!preset) return 'Custom'
  if (preset.startsWith('FD')) return 'FD'
  if (preset.startsWith('RD')) return 'RD'
  return INVESTMENT_CATEGORIES.some((c) => c.name === preset) ? preset : 'Custom'
}
export const invCategoryToPreset = (cat) =>
  cat === 'FD' ? 'FD (Fixed Deposit)' : cat === 'RD' ? 'RD (Recurring Deposit)' : INVESTING_PRESETS.includes(cat) ? cat : ''

export const CARD_STATUSES = [
  { value: 'unpaid', label: 'Unpaid', tone: 'warn' },
  { value: 'partial', label: 'Partially paid', tone: 'net' },
  { value: 'paid', label: 'Paid', tone: 'inc' },
  { value: 'overdue', label: 'Overdue', tone: 'exp' },
]
export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partially paid' },
  { value: 'outstanding', label: 'Outstanding' },
]
export const cardStatusLabel = (v) => CARD_STATUSES.find((s) => s.value === v)?.label ?? 'Unpaid'

export const CARD_THEMES = [
  { id: 'aurora', from: '#0f766e', via: '#0f5f59', to: '#0f766e' },
  { id: 'violet', from: '#7f1d1d', via: '#7a2e3a', to: '#7f1d1d' },
  { id: 'ocean', from: '#1e3a8a', via: '#2563eb', to: '#06b6d4' },
  { id: 'sunset', from: '#9a3412', via: '#a4471c', to: '#9a3412' },
  { id: 'midnight', from: '#0f172a', via: '#1e293b', to: '#334155' },
  { id: 'emerald', from: '#064e3b', via: '#047857', to: '#65a30d' },
]
export const cardTheme = (id) => CARD_THEMES.find((t) => t.id === id) ?? CARD_THEMES[0]

export const EMI_TENURES = [3, 6, 9, 12, 18, 24]

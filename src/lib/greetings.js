/* Friendly copy used across the app. One line is picked per day so it feels fresh but stable. */

export function timeGreeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

const LINES = {
  dashboard: [
    'Good to see you again. Tracking every rupee is how wealth quietly begins.',
    'Financial tracking is a habit, and you are building it one day at a time.',
    'Consistency beats intensity. Small steady steps, every single month.',
    'Your future self is already thanking you for showing up today.',
    'Know where your money goes, and you decide where it grows.',
  ],
  transactions: [
    'Every rupee tracked is a rupee understood.',
    'Log it now, thank yourself later.',
    'Clear records, calm mind.',
    'A two-second entry today saves a month of guessing.',
  ],
  investments: [
    'Small SIPs, big dreams.',
    'Time in the market beats timing the market.',
    'Your money is working while you sleep. Nice.',
    'Patience is the most underrated return.',
  ],
  cards: [
    'Swipe smart, pay on time.',
    'A card is a tool, not extra income. You have got this.',
    'Pay in full, sleep in peace.',
  ],
  settings: [
    'Make FinTrack feel like yours.',
    'Tune things your way.',
  ],
}

const dayIndex = () => Math.floor(Date.now() / 86400000)
export const lineFor = (page) => {
  const list = LINES[page] ?? LINES.dashboard
  return list[dayIndex() % list.length]
}

export function streakText(n) {
  if (n >= 30) return `${n}-day streak. You are unstoppable!`
  if (n >= 7) return `${n}-day streak. Consistency is your superpower`
  if (n >= 2) return `${n}-day tracking streak`
  if (n === 1) return 'Tracked today. Keep it going!'
  return 'Log one entry today to start a streak'
}

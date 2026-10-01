# FinTrack

A personal finance tracker in INR (₹), in the Neon style (dark and light).

Built with React, Tailwind CSS, shadcn/ui-style components (Radix), Recharts and Lucide icons.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173, register an account and start tracking. On the dashboard, **Explore with sample data** fills in 6 months of example data.

To build static files for hosting (output goes to `dist/`):

```bash
npm run build
```

## How it is organised

| Path | What it does |
|---|---|
| `src/lib/storage.js` | All persistence. Each login's data is stored separately. Swap this file for a Google Sheets / Drive backend later. |
| `src/lib/finance.js` | The money engine: totals, card balances, EMIs, SIPs and goals, all derived from one transactions list. |
| `src/lib/constants.js` | Default categories, banks, wallets, payment modes and investment types (shared by all logins). |
| `src/context/DataContext.jsx` | Every action (save or delete a transaction, card, investment or goal) and its sync side effects. |
| `src/components/TransactionForm.jsx` | The Record Transaction form with all its conditional fields. |
| `src/pages/*` | Dashboard, Transactions, Investments, Credit Cards (with detail page), Settings, Login and Register. |

## Sync rules

- **Investing expense:** a Record Transaction under Investing creates a linked holding. Editing or deleting either one updates the other.
- **SIPs:** each installment posts automatically on the same day every month, until the tenure ends or you stop the SIP.
- **Credit card spends:** raise that card's outstanding balance and lower its available limit.
- **Bill payments:** recorded as transfers, not expenses. They lower the outstanding balance and set the bill status (Paid, Partially paid or Outstanding).
- **EMIs:** the full purchase blocks the card limit. Each monthly installment posts automatically and counts as that month's expense. Deleting the EMI removes the plan and its purchase, and gives the limit back.
- **Friend's credit card:** a spend counts as your expense but doesn't touch any of your cards. Paying a friend's card is a transfer.
- **Dashboard cards:** Total income and Total expense cover only the selected period. Total investments is cumulative (all time up to the period end).
- **Net balance** = Income − Expenses − Investments, carried forward: any money left over in one month is added to the next month's balance, and covers a month where expenses exceed income. Card bill payments are not counted as expenses.
- **Account balances** (the Accounts page): starting balance + income received − UPI / bank transfer / debit card / wallet payments − card bill payments. ATM withdrawals move money from the bank to Cash in hand. Credit card spends only affect your bank when you pay the bill.

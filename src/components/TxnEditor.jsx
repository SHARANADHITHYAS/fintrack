import { useCallback, useState } from 'react'
import TransactionForm from './TransactionForm'
import { InvestmentForm } from './InvestmentForm'
import { BucketMoveDialog } from './BucketParts'
import { useData } from '../context/DataContext'

/**
 * One place that knows how to open the right editor:
 * SIP installments open their SIP, everything else opens the Record Transaction form.
 */
export function useTxnEditor() {
  const { data } = useData()
  const [txnState, setTxnState] = useState({ open: false, initial: null })
  const [invState, setInvState] = useState({ open: false, initial: null })
  const [bktState, setBktState] = useState({ open: false, initial: null })

  const openNew = useCallback((preset = null) => setTxnState({ open: true, initial: preset }), [])
  const openEdit = useCallback((t) => {
    if (t.type === 'bucket') return setBktState({ open: true, initial: t })
    if (t.investmentId) {
      const inv = data.investments.find((i) => i.id === t.investmentId)
      if (inv?.type === 'sip') return setInvState({ open: true, initial: inv })
    }
    if (t.emiIndex) {
      const plan = data.emis.find((p) => p.id === t.emiId)
      const purchase = data.transactions.find((x) => x.id === plan?.purchaseTxnId)
      if (purchase) return setTxnState({ open: true, initial: purchase })
    }
    setTxnState({ open: true, initial: t })
  }, [data])

  const dialogs = (
    <>
      <TransactionForm open={txnState.open} onOpenChange={(o) => setTxnState((s) => ({ ...s, open: o }))} initial={txnState.initial} />
      <BucketMoveDialog open={bktState.open} onOpenChange={(o) => setBktState((s) => ({ ...s, open: o }))} initial={bktState.initial} />
      <InvestmentForm open={invState.open} onOpenChange={(o) => setInvState((s) => ({ ...s, open: o }))} initial={invState.initial} />
    </>
  )
  return { openNew, openEdit, dialogs }
}

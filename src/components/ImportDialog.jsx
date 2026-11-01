import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Copy, Download, FileSpreadsheet, FileUp, Plus, Upload } from 'lucide-react'
import { Button, Dialog, Switch } from './ui'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { analyzeImport, downloadTemplate, readImportFile } from '../lib/importer'
import { cn, fmtDate, money } from '../lib/utils'

/** Upload an Excel/CSV, preview every row, then import the approved ones */
/** account (optional): { name, type: 'bank'|'wallet'|'giftcard'|'cash' }. Rows with no Account / card go there. */
export default function ImportDialog({ open, onOpenChange, account }) {
  const { data, importTransactions } = useData()
  const toast = useToast()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [includeDups, setIncludeDups] = useState(false)
  const [drag, setDrag] = useState(false)

  useEffect(() => { if (open) { setFile(null); setResult(null); setErr(''); setIncludeDups(false) } }, [open])

  const load = async (f) => {
    if (!f) return
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { setErr('Choose an Excel (.xlsx) or CSV file.'); return }
    setBusy(true); setErr(''); setFile(f)
    try {
      const { rows } = await readImportFile(f)
      if (!rows.length) throw new Error('No rows found below the header. Add your transactions and try again.')
      const fill = account ? rows.map((r) => {
        const isCard = /credit|^cc$/i.test(String(r.mode || '').trim())
        if (isCard || String(r.account || '').trim()) return r
        const mode = String(r.mode || '').trim() || (account.type === 'cash' ? 'Cash' : account.type === 'bank' ? 'Bank transfer' : 'Wallet')
        return { ...r, account: account.type === 'cash' ? '' : account.name, mode }
      }) : rows
      setResult(analyzeImport(data, fill))
    } catch (e) {
      console.error(e)
      setResult(null)
      setErr(e.message || "Couldn't read that file.")
    } finally { setBusy(false) }
  }

  const items = result?.items || []
  const ok = items.filter((i) => i.status === 'ok')
  const dups = items.filter((i) => i.status === 'dup')
  const bad = items.filter((i) => i.status === 'error')
  const toImport = includeDups ? [...ok, ...dups] : ok
  // Only names used by rows that will actually be imported
  const used = new Set(toImport.flatMap((i) => Object.values(i.draft).filter((v) => typeof v === 'string' && v.startsWith('new:'))))
  const newNames = result ? [
    ...[...result.maps.banks].filter(([k]) => used.has(`new:banks:${k}`)).map(([, n]) => `${n} (bank)`),
    ...[...result.maps.wallets].filter(([k]) => used.has(`new:wallets:${k}`)).map(([, n]) => `${n} (wallet)`),
    ...[...result.maps.giftcards].filter(([k]) => used.has(`new:giftcards:${k}`)).map(([, n]) => `${n} (gift card)`),
    ...[...result.maps.cards].filter(([k]) => used.has(`new:cards:${k}`)).map(([, n]) => `${n} (credit card)`),
    ...[...result.maps.categories].filter(([k]) => used.has(`new:cat:${k}`)).map(([, c]) => `${c.name} (${c.type} category)`),
    ...[...result.maps.buckets].filter(([k]) => used.has(`new:bkt:${k}`)).map(([, n]) => `${n} (bucket)`),
  ] : []

  const doImport = () => {
    importTransactions(toImport, result.maps)
    toast(`${toImport.length} transaction${toImport.length === 1 ? '' : 's'} imported. Everything is in sync!`)
    onOpenChange(false)
  }

  const Row = ({ it }) => {
    const sign = it.kind === 'income' ? '+' : it.kind === 'ccpay' ? '↔' : '−'
    const tone = it.status === 'error' ? 'text-exp' : it.status === 'dup' ? 'text-warn' : it.kind === 'income' ? 'text-inc' : it.kind === 'ccpay' ? 'text-net' : 'text-fg'
    return (
      <div className="flex items-start gap-3 px-3 py-2.5 text-[13px]">
        {it.status === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-inc" /> : it.status === 'dup' ? <Copy className="mt-0.5 size-4 shrink-0 text-warn" /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-exp" />}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-fg">Row {it.row} · {it.title || '—'}</div>
          <div className="text-[12px] text-muted">
            {it.status === 'error' ? it.errors.join(' · ') : <>{it.draft.date ? fmtDate(it.draft.date) : ''}{it.status === 'dup' ? ' · Looks already imported' : ''}</>}
          </div>
        </div>
        {it.amount > 0 && <span className={cn('tabular shrink-0 font-bold', tone)}>{sign}{money(it.amount)}</span>}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="lg" icon={FileUp} title={result ? 'Review your import' : account ? `Import into ${account.name}` : 'Import transactions'}
      description={result ? `${file?.name} · ${items.length} row${items.length === 1 ? '' : 's'}. Nothing is saved until you confirm.` : (account ? `Rows without an Account / card go to ${account.name}.` : 'Upload the FinTrack template filled with your transactions.')}
      footer={result ? (
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => { setResult(null); setFile(null) }}>Choose another file</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" onClick={doImport} disabled={!toImport.length}><Upload className="size-4" />Import {toImport.length} transaction{toImport.length === 1 ? '' : 's'}</Button>
        </>
      ) : <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>}>
      {!result ? (
        <div className="space-y-4">
          <button type="button" onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files?.[0]) }}
            className={cn('flex w-full cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition', drag ? 'border-teal bg-teal-soft' : 'border-line hover:border-teal/60')}>
            <span className="grid size-14 place-items-center rounded-2xl bg-teal-soft text-teal"><FileSpreadsheet className="size-7" /></span>
            <span className="font-display text-base font-bold text-fg">{busy ? 'Reading your file…' : 'Drop your file here, or tap to choose'}</span>
            <span className="text-[12.5px] text-muted">Excel (.xlsx) or CSV, using the FinTrack template columns</span>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { load(e.target.files?.[0]); e.target.value = '' }} />
          {err && <p className="rounded-xl bg-exp-soft px-3.5 py-2.5 text-[13px] font-medium text-exp">{err}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card-2 px-4 py-3 text-[13px] text-muted">
            <span>Don't have the template yet? It has examples and your exact names.</span>
            <Button variant="secondary" size="sm" onClick={() => downloadTemplate(data).then(() => toast('Template downloaded'))}><Download className="size-4" />Download template</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-inc-soft px-2 py-3 text-inc"><div className="tabular font-display text-xl font-extrabold">{ok.length}</div><div className="text-[12px] font-semibold">Ready</div></div>
            <div className="rounded-2xl bg-warn-soft px-2 py-3 text-warn"><div className="tabular font-display text-xl font-extrabold">{dups.length}</div><div className="text-[12px] font-semibold">Duplicates</div></div>
            <div className="rounded-2xl bg-exp-soft px-2 py-3 text-exp"><div className="tabular font-display text-xl font-extrabold">{bad.length}</div><div className="text-[12px] font-semibold">Need fixing</div></div>
          </div>
          {dups.length > 0 && (
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-[13px]">
              <span><b className="text-fg">Import duplicates anyway</b><span className="block text-[12px] text-muted">Rows with the same date, type, amount and description as an existing entry are skipped by default.</span></span>
              <Switch checked={includeDups} onChange={setIncludeDups} label="Import duplicates anyway" />
            </label>
          )}
          {newNames.length > 0 && (
            <div className="rounded-2xl border border-violet/35 bg-violet-soft/50 px-4 py-3 text-[13px]">
              <div className="mb-1.5 flex items-center gap-2 font-bold text-violet"><Plus className="size-4" />These will be added for you</div>
              <div className="flex flex-wrap gap-1.5">{newNames.map((n) => <span key={n} className="rounded-full bg-card px-2.5 py-1 text-[12px] font-medium text-fg">{n}</span>)}</div>
            </div>
          )}
          {bad.length > 0 && <p className="text-[12.5px] text-muted">Rows that need fixing are left out. Correct them in your file and import it again; the rows already imported will be skipped as duplicates.</p>}
          <div className="max-h-[42vh] divide-y divide-line overflow-y-auto rounded-2xl border border-line">
            {[...bad, ...dups, ...ok].map((it) => <Row key={it.row} it={it} />)}
          </div>
        </div>
      )}
    </Dialog>
  )
}

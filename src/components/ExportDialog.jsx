import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button, Dialog, Field } from './ui'
import { PeriodSelect } from './common'
import { useToast } from '../context/ToastContext'
import { exportExcel, exportPdf } from '../lib/export'
import { cn, periodRange } from '../lib/utils'

/** build(range) must return a report object (see lib/export.js) */
export default function ExportDialog({ open, onOpenChange, title, defaultPeriod = 'this-month', defaultCustom = {}, earliest, build }) {
  const toast = useToast()
  const [period, setPeriod] = useState(defaultPeriod)
  const [custom, setCustom] = useState(defaultCustom)
  const [format, setFormat] = useState('xlsx')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setPeriod(defaultPeriod); setCustom(defaultCustom) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const range = periodRange(period, custom, earliest)
  const report = open ? build(range) : null

  const go = async () => {
    setBusy(true)
    try {
      if (format === 'xlsx') await exportExcel(report)
      else await exportPdf(report)
      toast(`${format === 'xlsx' ? 'Excel' : 'PDF'} downloaded`)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast("Couldn't create the file. Try again.", 'error')
    } finally { setBusy(false) }
  }

  const Opt = ({ value, icon: I, label, text }) => (
    <button type="button" onClick={() => setFormat(value)}
      className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-all', format === value ? 'border-teal bg-teal-soft shadow-[0_0_20px_-8px_var(--teal)]' : 'border-line bg-card-2 hover:border-teal/50')}>
      <span className={cn('grid size-10 place-items-center rounded-xl', value === 'xlsx' ? 'bg-inc-soft text-inc' : 'bg-exp-soft text-exp')}><I className="size-5" /></span>
      <span><span className="block text-sm font-bold text-fg">{label}</span><span className="block text-[12px] text-muted">{text}</span></span>
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm" icon={Download} title={title} description="Pick a period and a format. The file includes a summary on top."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" onClick={go} disabled={busy}><Download className="size-4" />{busy ? 'Preparing…' : 'Download'}</Button></>}>
      <div className="space-y-4">
        <Field label="Period">
          <PeriodSelect value={period} onChange={setPeriod} custom={custom} onCustomChange={setCustom} className="[&_select]:!w-full [&>div:first-child]:w-full" />
        </Field>
        <Field label="Format">
          <div className="grid gap-2 sm:grid-cols-2">
            <Opt value="xlsx" icon={FileSpreadsheet} label="Excel (.xlsx)" text="Edit and sort in Excel or Sheets" />
            <Opt value="pdf" icon={FileText} label="PDF" text="Clean statement to share or print" />
          </div>
        </Field>
        {report && <p className="rounded-xl bg-card-2 px-3.5 py-2.5 text-[12.5px] text-muted"><b className="text-fg">{report.rows.length}</b> {report.rows.length === 1 ? 'record' : 'records'} · {range.label}</p>}
      </div>
    </Dialog>
  )
}

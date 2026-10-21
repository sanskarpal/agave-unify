import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import type { SourceInfo } from '../data/datasets'
import type { UnifiedDataset } from '../lib/types'
import { Card, Json } from './ui'

/** The native record an invoice came from, found by its invoice number. */
function rawInvoice(source: SourceInfo, invoiceNumber: string): unknown {
  const raw = source.raw() as Record<string, unknown[]>
  const [table, field] = {
    ledgerone: ['APINV', 'INV_NO'],
    buildbooks: ['Bills', 'RefNumber'],
    fieldcloud: ['payables', 'invoiceNumber'],
  }[source.id]
  return raw[table].find((r) => (r as Record<string, unknown>)[field] === invoiceNumber)
}

export function MappingView({ source, data }: { source: SourceInfo; data: UnifiedDataset }) {
  const [invoiceNumber, setInvoiceNumber] = useState('ISE-3377')
  const unified = data.invoices.find((i) => i.invoiceNumber === invoiceNumber)

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold">What the {source.name} adapter has to deal with</h3>
        <ul className="mt-2 grid gap-1.5 text-sm text-ink-muted sm:grid-cols-2">
          {source.quirks.map((q) => <li key={q} className="flex gap-2"><span className="text-brand-hover">•</span>{q}</li>)}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="inv" className="text-sm font-medium">Invoice</label>
        <select id="inv" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm">
          {data.invoices.map((i) => <option key={i.id} value={i.invoiceNumber}>{i.invoiceNumber} · {i.vendor}</option>)}
        </select>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{source.name} native record</div>
          <Json value={rawInvoice(source, invoiceNumber)} className="max-h-96" />
        </div>
        <ArrowRight className="mx-auto mt-10 hidden text-ink-muted lg:block" aria-hidden />
        <div className="min-w-0">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Unified invoice</div>
          <Json value={unified} className="max-h-96" />
        </div>
      </div>
      <p className="text-xs text-ink-muted">Switch the source system above: the native record changes shape completely, the unified one only changes its id prefix.</p>
    </div>
  )
}

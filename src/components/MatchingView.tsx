import { AlertTriangle } from 'lucide-react'
import type { CommitmentStatus, InvoiceMatch, MatchMethod } from '../lib/matching'
import { formatMoney } from '../lib/money'
import { Badge, Card, type Tone } from './ui'

const METHOD: Record<MatchMethod, { label: string; tone: Tone; help: string }> = {
  linked: { label: 'Linked by source', tone: 'good', help: 'The source system stores the link' },
  memo: { label: 'Found in memo', tone: 'brand', help: 'A PO or subcontract number typed into the memo' },
  'vendor-cost-code': { label: 'Vendor + cost code', tone: 'warn', help: 'The only commitment for this vendor and cost code on the job' },
  ambiguous: { label: 'Ambiguous', tone: 'warn', help: 'More than one commitment fits; needs a person' },
  unmatched: { label: 'No commitment', tone: 'muted', help: 'Nothing on the job fits; often a one-off rental or service' },
}

export function MatchingView({ matches, statuses, projectNames }: {
  matches: InvoiceMatch[]
  statuses: CommitmentStatus[]
  projectNames: Map<string, string>
}) {
  const counts = matches.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.method]: (acc[m.method] ?? 0) + 1 }), {})
  const over = matches.filter((m) => m.overBilledCents > 0)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(METHOD) as MatchMethod[]).filter((k) => counts[k]).map((k) => (
            <span key={k} title={METHOD[k].help}><Badge tone={METHOD[k].tone}>{METHOD[k].label}: {counts[k]}</Badge></span>
          ))}
        </div>
        {over.length > 0 && (
          <div className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} aria-hidden /> {over.length} invoice{over.length > 1 ? 's' : ''} bill past the commitment</div>
            <ul className="mt-1 space-y-0.5">
              {over.map((m) => (
                <li key={m.invoice.id}>{m.invoice.vendor} {m.invoice.invoiceNumber} puts {m.commitment?.number} over by <strong>{formatMoney(m.overBilledCents, true)}</strong>. Hold for a change order?</li>
              ))}
            </ul>
          </div>
        )}
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Vendor · invoice</th>
                <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="px-3 py-2.5 font-medium">Commitment</th>
                <th className="px-4 py-2.5 font-medium">How</th>
              </tr>
            </thead>
            <tbody>
              {[...matches].reverse().map((m) => (
                <tr key={m.invoice.id} className={`border-b border-line last:border-0 ${m.overBilledCents ? 'bg-bad/5' : ''}`}>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-ink-muted">{m.invoice.date}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.invoice.vendor}</div>
                    <div className="text-xs text-ink-muted">{m.invoice.invoiceNumber}{m.invoice.memo ? ` · “${m.invoice.memo}”` : ''}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(m.invoice.amountCents, true)}</td>
                  <td className="px-3 py-2">
                    {m.commitment ? (
                      <>
                        <span className="font-mono text-xs font-semibold">{m.commitment.number}</span>
                        <span className="block text-xs text-ink-muted">{projectNames.get(m.commitment.projectId)}</span>
                      </>
                    ) : m.candidates.length ? (
                      <span className="text-xs">{m.candidates.map((c) => c.number).join(' or ')}</span>
                    ) : <span className="text-ink-muted">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span title={METHOD[m.method].help}><Badge tone={METHOD[m.method].tone}>{METHOD[m.method].label}</Badge></span>
                    {m.overBilledCents > 0 && <span className="ml-1"><Badge tone="bad">Over by {formatMoney(m.overBilledCents)}</Badge></span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="h-fit p-4">
        <h3 className="text-sm font-semibold">Commitments billed to date</h3>
        <ul className="mt-3 space-y-3">
          {[...statuses].sort((a, b) => b.percentBilled - a.percentBilled).map((s) => {
            const pct = Math.round(s.percentBilled * 100)
            return (
              <li key={s.commitment.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span><span className="font-mono text-xs font-semibold">{s.commitment.number}</span> <span className="text-ink-muted">{s.commitment.vendor}</span></span>
                  <span className={`tabular-nums text-xs font-semibold ${pct > 100 ? 'text-bad' : ''}`}>{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface">
                  <div className={`h-full rounded-full ${pct > 100 ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

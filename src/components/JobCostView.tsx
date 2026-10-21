import { AlertTriangle } from 'lucide-react'
import type { ProjectSummary } from '../lib/jobcost'
import { formatCompactMoney, formatMoney } from '../lib/money'
import { Badge, Card, Stat } from './ui'

interface Props {
  projects: ProjectSummary[]
  selected: string
  onSelect: (number: string) => void
}

export function JobCostView({ projects, selected, onSelect }: Props) {
  const p = projects.find((x) => x.projectNumber === selected) ?? projects[0]
  const t = p.totals
  const billedPct = t.committedCents ? Math.round((t.actualCents / t.committedCents) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {projects.map((x) => (
          <button
            key={x.projectNumber}
            onClick={() => onSelect(x.projectNumber)}
            className={`min-w-60 rounded-xl border px-3 py-2 text-left ${x.projectNumber === p.projectNumber ? 'border-ink bg-bg' : 'border-line bg-surface hover:border-ink/30'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-ink-muted">{x.projectNumber}</span>
              {x.status === 'closed' ? <Badge>Closed</Badge> : x.codes.some((c) => c.varianceCents < 0) ? <Badge tone="bad">Overrun</Badge> : <Badge tone="good">On budget</Badge>}
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold">{x.name}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Budget" value={formatCompactMoney(t.budgetCents)} />
        <Stat label="Committed" value={formatCompactMoney(t.committedCents)} />
        <Stat label={`Invoiced (${billedPct}% of committed)`} value={formatCompactMoney(t.actualCents)} />
        <Stat label="Projected cost" value={formatCompactMoney(t.projectedCents)} />
        <Stat label="Variance" value={formatCompactMoney(t.varianceCents)} tone={t.varianceCents < 0 ? 'bad' : 'good'} />
      </div>

      {p.uncodedCents > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
          <AlertTriangle size={15} aria-hidden /> {formatMoney(p.uncodedCents)} of invoices can't be tied to a cost code.
        </p>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Cost code</th>
              <th className="px-3 py-2.5 text-right font-medium">Budget</th>
              <th className="px-3 py-2.5 text-right font-medium">Committed</th>
              <th className="px-3 py-2.5 text-right font-medium">Invoiced</th>
              <th className="px-3 py-2.5 font-medium">Spend vs budget</th>
              <th className="px-4 py-2.5 text-right font-medium">Variance</th>
            </tr>
          </thead>
          <tbody>
            {p.codes.map((c) => {
              const over = c.varianceCents < 0
              const scale = Math.max(c.budgetCents, c.projectedCents) || 1
              return (
                <tr key={c.code} className={`border-b border-line last:border-0 ${over ? 'bg-bad/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-ink-muted">{c.code}</span>{' '}
                    <span className="font-medium">{c.description}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(c.budgetCents)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(c.committedCents)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(c.actualCents)}</td>
                  <td className="px-3 py-2.5">
                    <div className="relative h-2.5 w-40 rounded-full bg-surface" title={`Committed ${formatMoney(c.committedCents)}, invoiced ${formatMoney(c.actualCents)}`}>
                      <div className="absolute inset-y-0 left-0 rounded-full bg-brand/35" style={{ width: `${(c.committedCents / scale) * 100}%` }} />
                      <div className={`absolute inset-y-0 left-0 rounded-full ${over ? 'bg-bad' : 'bg-brand'}`} style={{ width: `${(c.actualCents / scale) * 100}%` }} />
                      <div className="absolute -top-1 -bottom-1 w-0.5 bg-ink" style={{ left: `${(c.budgetCents / scale) * 100}%` }} aria-hidden />
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${over ? 'text-bad' : 'text-good'}`}>
                    {over ? '' : '+'}{formatMoney(c.varianceCents)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-ink-muted">Projected cost = the larger of committed and invoiced. Bar: light = committed, solid = invoiced, black tick = budget.</p>
    </div>
  )
}

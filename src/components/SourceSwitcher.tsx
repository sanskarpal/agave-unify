import { CheckCircle2, Cloud, Database, HardDrive, XCircle } from 'lucide-react'
import type { SourceInfo } from '../data/datasets'
import type { SourceId } from '../lib/types'

const ICONS = { ledgerone: Database, buildbooks: HardDrive, fieldcloud: Cloud }

interface Props {
  sources: SourceInfo[]
  active: SourceId
  onChange: (id: SourceId) => void
  consistent: boolean
}

export function SourceSwitcher({ sources, active, onChange, consistent }: Props) {
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Source system">
        {sources.map((s) => {
          const Icon = ICONS[s.id]
          const on = s.id === active
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={on}
              onClick={() => onChange(s.id)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-ink bg-bg shadow-sm' : 'border-line bg-surface hover:border-ink/30'}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${on ? 'bg-brand text-on-brand' : 'bg-bg text-ink-muted'}`}>
                <Icon size={18} aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{s.name}</span>
                <span className="block text-xs text-ink-muted">{s.kind}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className={`mt-2 flex items-center gap-1.5 text-sm ${consistent ? 'text-good' : 'text-bad'}`}>
        {consistent ? <CheckCircle2 size={15} aria-hidden /> : <XCircle size={15} aria-hidden />}
        {consistent
          ? 'Same books, three very different exports: all three adapters produce identical job-cost numbers.'
          : 'Adapters disagree: unified numbers differ between systems.'}
      </p>
    </div>
  )
}

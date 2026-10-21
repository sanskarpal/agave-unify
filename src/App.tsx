import { useMemo, useState } from 'react'
import { ApiExplorer } from './components/ApiExplorer'
import { Disclaimer } from './components/Disclaimer'
import { JobCostView } from './components/JobCostView'
import { MappingView } from './components/MappingView'
import { MatchingView } from './components/MatchingView'
import { SourceSwitcher } from './components/SourceSwitcher'
import { source, SOURCES } from './data/datasets'
import { fingerprint, jobCost } from './lib/jobcost'
import { commitmentStatuses, matchInvoices } from './lib/matching'
import type { SourceId, UnifiedDataset } from './lib/types'

const TABS = [
  { id: 'jobcost', label: 'Job cost' },
  { id: 'matching', label: 'Invoice matching' },
  { id: 'mapping', label: 'Field mapping' },
  { id: 'api', label: 'Unified API' },
] as const
type Tab = (typeof TABS)[number]['id']

// adapters are pure, so every source can be unified once up front
const UNIFIED = Object.fromEntries(SOURCES.map((s) => [s.id, s.load()])) as Record<SourceId, UnifiedDataset>
const CONSISTENT = new Set(SOURCES.map((s) => fingerprint(jobCost(UNIFIED[s.id])))).size === 1

export default function App() {
  const [sourceId, setSourceId] = useState<SourceId>('ledgerone')
  const [tab, setTab] = useState<Tab>('jobcost')
  const [project, setProject] = useState('24-117')

  const data = UNIFIED[sourceId]
  const summaries = useMemo(() => jobCost(data), [data])
  const matches = useMemo(() => matchInvoices(data), [data])
  const statuses = useMemo(() => commitmentStatuses(data, matches), [data, matches])
  const projectNames = useMemo(() => new Map(data.projects.map((p) => [p.id, `${p.number} ${p.name}`])), [data])

  return (
    <div className="min-h-screen bg-surface">
      <Disclaimer />
      <header className="border-b border-line bg-bg">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand font-display font-bold text-on-brand">U</span>
            <span className="font-display text-xl font-bold tracking-tight">Unify</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            One contractor's books, exported by three different construction systems, normalized into one job-cost model and one paginated API.
          </p>
          <div className="mt-4">
            <SourceSwitcher sources={SOURCES} active={sourceId} onChange={setSourceId} consistent={CONSISTENT} />
          </div>
          <nav className="-mb-5 mt-4 flex gap-1 overflow-x-auto" aria-label="Views">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${tab === t.id ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] px-4 py-6 sm:px-6">
        {tab === 'jobcost' && <JobCostView projects={summaries} selected={project} onSelect={setProject} />}
        {tab === 'matching' && <MatchingView matches={matches} statuses={statuses} projectNames={projectNames} />}
        {tab === 'mapping' && <MappingView source={source(sourceId)} data={data} />}
        {tab === 'api' && <ApiExplorer data={data} sourceId={sourceId} />}
      </main>
    </div>
  )
}

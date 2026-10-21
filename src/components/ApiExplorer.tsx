import { Play } from 'lucide-react'
import { useState } from 'react'
import { handle, RESOURCES, type Resource } from '../lib/api'
import type { SourceId, UnifiedDataset } from '../lib/types'
import { Badge, Card, Json } from './ui'

const FILTER_FIELDS: Record<Resource, string[]> = {
  projects: ['status'],
  'cost-codes': ['project_id'],
  commitments: ['project_id', 'vendor', 'kind'],
  invoices: ['project_id', 'vendor', 'status'],
}

interface Result {
  url: string
  status: number
  body: unknown
}

/**
 * Runs the exact handler the deployed /api/v1 function uses, in the browser,
 * so the explorer works offline and in dev; the copied curl hits the real one.
 */
export function ApiExplorer({ data, sourceId }: { data: UnifiedDataset; sourceId: SourceId }) {
  const [resource, setResource] = useState<Resource>('invoices')
  const [filters, setFilters] = useState<Record<string, string>>({ status: 'open' })
  const [limit, setLimit] = useState(3)
  const [result, setResult] = useState<Result | null>(null)

  const query = (cursor?: string) => {
    const params = new URLSearchParams()
    for (const f of FILTER_FIELDS[resource]) if (filters[f]) params.set(f, filters[f])
    params.set('limit', String(limit))
    if (cursor) params.set('cursor', cursor)
    return params
  }

  const run = (cursor?: string) => {
    const params = query(cursor)
    const { status, body } = handle(data, resource, params)
    const shown = new URLSearchParams([['source', sourceId], ...params])
    setResult({ url: `/api/v1/${resource}?${shown}`, status, body })
  }

  const nextCursor = result && typeof result.body === 'object' && result.body && 'next_cursor' in result.body
    ? (result.body as { next_cursor: string | null }).next_cursor : null
  const origin = typeof window === 'undefined' ? '' : window.location.origin

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit space-y-3 p-4">
        <label className="block text-sm">
          <span className="font-medium">Resource</span>
          <select value={resource} onChange={(e) => { setResource(e.target.value as Resource); setResult(null) }} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5">
            {RESOURCES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        {FILTER_FIELDS[resource].map((f) => (
          <label key={f} className="block text-sm">
            <span className="font-mono text-xs font-medium">{f}</span>
            {f === 'project_id' ? (
              <select value={filters[f] ?? ''} onChange={(e) => setFilters({ ...filters, [f]: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5">
                <option value="">any</option>
                {data.projects.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            ) : (
              <input value={filters[f] ?? ''} onChange={(e) => setFilters({ ...filters, [f]: e.target.value })} placeholder="any"
                className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 outline-none focus:border-ink" />
            )}
          </label>
        ))}
        <label className="block text-sm">
          <span className="font-mono text-xs font-medium">limit</span>
          <input type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 outline-none focus:border-ink" />
        </label>
        <button onClick={() => run()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 font-semibold text-on-brand hover:bg-brand-hover">
          <Play size={15} aria-hidden /> Send request
        </button>
      </Card>

      <div className="min-w-0 space-y-2">
        {result ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={result.status === 200 ? 'good' : 'bad'}>{result.status}</Badge>
              <code className="break-all text-xs">GET {result.url}</code>
            </div>
            <Json value={result.body} className="max-h-[28rem]" />
            <div className="flex flex-wrap items-center gap-3">
              {nextCursor && (
                <button onClick={() => run(nextCursor)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-ink">
                  Next page →
                </button>
              )}
              <code className="break-all text-xs text-ink-muted">curl '{origin}{result.url}'</code>
            </div>
          </>
        ) : (
          <Card className="grid h-64 place-items-center p-6 text-center text-sm text-ink-muted">
            Build a query and send it. Records come back in stable id order with an opaque <code className="mx-1">next_cursor</code> that remembers its filters.
          </Card>
        )}
      </div>
    </div>
  )
}

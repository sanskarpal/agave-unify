// The unified API, written as a plain Request → Response handler so the same
// code runs as a Vercel function (api/v1/[resource].ts) and in the browser's
// API explorer.
import type { UnifiedDataset } from './types.js'

export const RESOURCES = ['projects', 'cost-codes', 'commitments', 'invoices'] as const
export type Resource = (typeof RESOURCES)[number]

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 25

// filters each resource accepts, mapped to the record field they compare
const FILTERS: Record<Resource, Record<string, string>> = {
  projects: { status: 'status' },
  'cost-codes': { project_id: 'projectId' },
  commitments: { project_id: 'projectId', vendor: 'vendor', kind: 'kind' },
  invoices: { project_id: 'projectId', vendor: 'vendor', status: 'status', commitment_id: 'commitmentId' },
}

export interface ApiError {
  error: { code: 'bad_request' | 'not_found'; message: string }
}

export interface Page<T> {
  data: T[]
  next_cursor: string | null
  total: number
}

function records(data: UnifiedDataset, r: Resource): object[] {
  switch (r) {
    case 'projects': return data.projects
    case 'cost-codes': return data.costCodes
    case 'commitments': return data.commitments
    case 'invoices': return data.invoices
  }
}

export function encodeCursor(offset: number, filterKey: string): string {
  return btoa(JSON.stringify({ o: offset, f: filterKey })).replace(/=+$/, '')
}

export function decodeCursor(cursor: string): { o: number; f: string } | null {
  try {
    const v = JSON.parse(atob(cursor))
    return Number.isInteger(v.o) && v.o >= 0 && typeof v.f === 'string' ? v : null
  } catch {
    return null
  }
}

/**
 * GET /api/v1/{resource}?{filters}&limit=&cursor=
 * Records are sorted by id so pages are stable; the cursor remembers the
 * filters it was issued for, so it can't be replayed against a different query.
 */
export function handle(data: UnifiedDataset, resource: string, params: URLSearchParams): { status: number; body: Page<object> | ApiError } {
  if (!RESOURCES.includes(resource as Resource)) {
    return { status: 404, body: { error: { code: 'not_found', message: `Unknown resource "${resource}". Try: ${RESOURCES.join(', ')}` } } }
  }
  const r = resource as Resource
  const allowed = FILTERS[r]
  const unknown = [...params.keys()].filter((k) => k !== 'limit' && k !== 'cursor' && !(k in allowed))
  if (unknown.length) {
    return { status: 400, body: { error: { code: 'bad_request', message: `Unsupported filter "${unknown[0]}" for ${r}. Supported: ${Object.keys(allowed).join(', ') || 'none'}` } } }
  }

  const limitRaw = params.get('limit')
  const limit = limitRaw === null ? DEFAULT_LIMIT : Number(limitRaw)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { status: 400, body: { error: { code: 'bad_request', message: `limit must be an integer from 1 to ${MAX_LIMIT}` } } }
  }

  const filters = Object.entries(allowed).flatMap(([param, field]) => {
    const v = params.get(param)
    return v === null ? [] : [[field, v.toLowerCase()] as const]
  })
  const filterKey = filters.map(([f, v]) => `${f}=${v}`).sort().join('&')

  let offset = 0
  const cursor = params.get('cursor')
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (!decoded || decoded.f !== filterKey) {
      return { status: 400, body: { error: { code: 'bad_request', message: 'cursor is invalid or was issued for different filters' } } }
    }
    offset = decoded.o
  }

  const rows = records(data, r)
    .filter((rec) => filters.every(([field, v]) => String((rec as Record<string, unknown>)[field] ?? '').toLowerCase() === v))
    .sort((a, b) => String((a as { id: string }).id).localeCompare(String((b as { id: string }).id)))
  const page = rows.slice(offset, offset + limit)
  const next = offset + limit < rows.length ? encodeCursor(offset + limit, filterKey) : null
  return { status: 200, body: { data: page, next_cursor: next, total: rows.length } }
}

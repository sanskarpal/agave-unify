// Vercel function: GET /api/v1/{projects|cost-codes|commitments|invoices}?source=ledgerone&...
// Thin wrapper; all behavior lives in src/lib/api.ts and is unit tested there.
import { SOURCES } from '../../src/data/datasets.js'
import { handle } from '../../src/lib/api.js'

export function GET(request: Request): Response {
  const url = new URL(request.url)
  const resource = url.pathname.split('/').filter(Boolean).pop() ?? ''
  const params = new URLSearchParams(url.searchParams)
  const sourceId = params.get('source') ?? 'fieldcloud'
  params.delete('source')

  const src = SOURCES.find((s) => s.id === sourceId)
  if (!src) {
    return Response.json(
      { error: { code: 'bad_request', message: `source must be one of ${SOURCES.map((s) => s.id).join(', ')}` } },
      { status: 400 },
    )
  }
  const { status, body } = handle(src.load(), resource, params)
  return Response.json(body, { status, headers: { 'cache-control': 'public, max-age=60' } })
}

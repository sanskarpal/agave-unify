import { describe, expect, it } from 'vitest'
import { GET } from '../../api/v1/[resource]'

const call = (path: string) => GET(new Request(`https://example.test${path}`))

describe('GET /api/v1/[resource]', () => {
  it('serves a page from the chosen source', async () => {
    const res = call('/api/v1/invoices?source=buildbooks&status=paid&limit=2')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].id).toMatch(/^buildbooks:/)
    expect(body.next_cursor).toEqual(expect.any(String))
  })

  it('ignores the route param Vercel copies into the query string', async () => {
    const res = call('/api/v1/invoices?resource=invoices&source=fieldcloud&limit=1')
    expect(res.status).toBe(200)
  })

  it('rejects an unknown source', async () => {
    const res = call('/api/v1/projects?source=excel')
    expect(res.status).toBe(400)
    expect((await res.json()).error.message).toMatch(/source must be one of/)
  })
})

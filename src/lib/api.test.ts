import { describe, expect, it } from 'vitest'
import { source } from '../data/datasets'
import { encodeCursor, handle, type Page } from './api'

const data = source('fieldcloud').load()
const get = (resource: string, query = '') => handle(data, resource, new URLSearchParams(query))

describe('unified API', () => {
  it('pages through results with a cursor until it runs out', () => {
    const seen: string[] = []
    let query = 'limit=5'
    for (let i = 0; i < 10; i++) {
      const res = get('invoices', query)
      expect(res.status).toBe(200)
      const page = res.body as Page<{ id: string }>
      seen.push(...page.data.map((r) => r.id))
      if (!page.next_cursor) break
      query = `limit=5&cursor=${page.next_cursor}`
    }
    expect(seen).toHaveLength(16)
    expect(new Set(seen).size).toBe(16)
    expect([...seen].sort()).toEqual(seen) // stable id order
  })

  it('filters case-insensitively and reports the filtered total', () => {
    const page = get('invoices', 'vendor=granite peak concrete&status=paid').body as Page<object>
    expect(page.total).toBe(2)
  })

  it('rejects a cursor reused with different filters', () => {
    const cursor = encodeCursor(5, '')
    expect(get('invoices', `status=open&cursor=${cursor}`)).toMatchObject({ status: 400 })
  })

  it('explains bad requests', () => {
    expect(get('invoices', 'limit=500').body).toMatchObject({ error: { message: 'limit must be an integer from 1 to 100' } })
    expect(get('invoices', 'color=red').body).toMatchObject({ error: { code: 'bad_request' } })
    expect(get('widgets')).toMatchObject({ status: 404 })
  })
})

import { describe, expect, it } from 'vitest'
import { COMMITMENTS, INVOICES, PROJECTS } from '../data/canonical'
import { SOURCES } from '../data/datasets'
import { mdyToIso, normalizeCommitmentNumber, splitClass } from './adapters/buildbooks'
import { yyyymmddToIso } from './adapters/ledgerone'
import { fingerprint, jobCost } from './jobcost'
import { matchInvoices, memoReferences } from './matching'
import { parseMoney } from './money'

const datasets = Object.fromEntries(SOURCES.map((s) => [s.id, s.load()]))

describe('adapters', () => {
  it.each(SOURCES.map((s) => s.id))('%s maps every record without warnings', (id) => {
    const d = datasets[id]
    expect(d.warnings).toEqual([])
    expect(d.projects).toHaveLength(PROJECTS.length)
    expect(d.commitments).toHaveLength(COMMITMENTS.length)
    expect(d.invoices).toHaveLength(INVOICES.length)
  })

  it('all three systems produce identical job-cost numbers', () => {
    const prints = SOURCES.map((s) => fingerprint(jobCost(datasets[s.id])))
    expect(new Set(prints).size).toBe(1)
  })

  it('sums LedgerOne budgets that are split across cost categories', () => {
    const concrete = datasets.ledgerone.costCodes.find((c) => c.id === 'ledgerone:24-117/03-300')!
    expect(concrete.budgetCents).toBe(412_000_00)
  })

  it('adds FieldCloud approved changes to the original budget', () => {
    const concrete = datasets.fieldcloud.costCodes.find((c) => c.id === 'fieldcloud:24-117/03-300')!
    expect(concrete.budgetCents).toBe(412_000_00)
  })

  it('restores names from LedgerOne upper-case', () => {
    expect(datasets.ledgerone.projects.find((p) => p.number === '23-088')!.name).toBe('Marlow St. Retail Shell')
  })
})

describe('field parsers', () => {
  it('parses money in every format the sources use', () => {
    expect(parseMoney('$1,234.56')).toBe(123456)
    expect(parseMoney('412000.00')).toBe(41200000)
    expect(parseMoney('(12.5)')).toBe(-1250)
    expect(parseMoney(131480.5)).toBe(13148050)
    expect(() => parseMoney('12.345')).toThrow()
  })
  it('normalizes dates and classes', () => {
    expect(yyyymmddToIso('20260630')).toBe('2026-06-30')
    expect(mdyToIso('6/3/2026')).toBe('2026-06-03')
    expect(splitClass('03-300 Cast-in-place concrete')).toEqual({ code: '03-300', description: 'Cast-in-place concrete' })
  })
  it('normalizes commitment numbers', () => {
    expect(normalizeCommitmentNumber('2207')).toBe('PO-2207')
    expect(normalizeCommitmentNumber('sc 1042')).toBe('SC-1042')
    expect(memoReferences('Pay app #2 - SC 1042, see also PO#2207')).toEqual(['SC-1042', 'PO-2207'])
  })
})

describe('matching', () => {
  const methods = (id: string) => {
    const counts: Record<string, number> = {}
    for (const m of matchInvoices(datasets[id])) counts[m.method] = (counts[m.method] ?? 0) + 1
    return counts
  }

  it('uses the strongest evidence each system offers', () => {
    expect(methods('ledgerone')).toEqual({ linked: 12, memo: 3, unmatched: 1 })
    expect(methods('buildbooks')).toEqual({ memo: 15, unmatched: 1 })
    expect(methods('fieldcloud')).toEqual({ linked: 14, 'vendor-cost-code': 1, unmatched: 1 })
  })

  it('lands every invoice on the same commitment regardless of source', () => {
    const pairs = (id: string) => matchInvoices(datasets[id]).map((m) => `${m.invoice.invoiceNumber}→${m.commitment?.number ?? '-'}`).sort()
    expect(pairs('buildbooks')).toEqual(pairs('ledgerone'))
    expect(pairs('fieldcloud')).toEqual(pairs('ledgerone'))
  })

  it('flags the invoice that pushes a commitment past 100%', () => {
    const over = matchInvoices(datasets.fieldcloud).filter((m) => m.overBilledCents > 0)
    expect(over.map((m) => [m.invoice.invoiceNumber, m.overBilledCents])).toEqual([
      ['CGS-131', 3_530_00],
      ['GPC-7902', 13_450_00],
    ])
  })

  it('reports ambiguity instead of guessing', () => {
    const d = structuredClone(datasets.fieldcloud)
    const twin = { ...d.commitments.find((c) => c.number === 'SC-1043')!, id: 'twin', number: 'SC-1099' }
    d.commitments.push(twin)
    const m = matchInvoices(d).find((x) => x.invoice.invoiceNumber === 'ISE-3377')!
    expect(m.method).toBe('ambiguous')
    expect(m.candidates.map((c) => c.number).sort()).toEqual(['SC-1043', 'SC-1099'])
  })
})

describe('jobCost', () => {
  const hilltop = jobCost(datasets.ledgerone).find((p) => p.projectNumber === '24-117')!
  it('projects cost as the larger of committed and invoiced', () => {
    const concrete = hilltop.codes.find((c) => c.code === '03-300')!
    expect(concrete).toMatchObject({ committedCents: 398_500_00, actualCents: 411_950_00, projectedCents: 411_950_00, varianceCents: 50_00 })
  })
  it('shows a commitment over budget as a negative variance', () => {
    expect(hilltop.codes.find((c) => c.code === '05-120')!.varianceCents).toBe(-6_200_00)
  })
})

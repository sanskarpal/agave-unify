// LedgerOne: a (fictional) on-prem accounting system read over SQL. Upper-case
// columns, budgets split by phase *and* cost category, dates as YYYYMMDD,
// invoice amounts in integer cents, and subcontracts (not POs) linked on the bill.
import { parseMoney } from '../money.js'
import type { AdapterWarning, CostCode, UnifiedDataset } from '../types.js'

export interface LedgerOneExport {
  JCJOB: { JOB_NO: string; JOB_DESC: string; CUST_NAME: string; STATUS: 'A' | 'C' }[]
  JCCOST: { JOB_NO: string; PHASE: string; CAT: 'L' | 'M' | 'S'; DESC: string; BUDGET_AMT: string }[]
  APVEND: { VENDOR_ID: string; VENDOR_NAME: string }[]
  CMCOMMIT: { COMMIT_NO: string; JOB_NO: string; VENDOR_ID: string; TYPE: 'SC' | 'PO' }[]
  CMLINE: { COMMIT_NO: string; LINE: number; PHASE: string; CAT: 'L' | 'M' | 'S'; AMT: string }[]
  APINV: {
    INV_ID: number; JOB_NO: string; VENDOR_ID: string; INV_NO: string; INV_DATE: string
    AMT_CENTS: number; PHASE: string; COMMIT_NO: string; STATUS: 'O' | 'A' | 'P'; MEMO: string
  }[]
}

const SRC = 'ledgerone'
const id = (...parts: (string | number)[]) => `${SRC}:${parts.join('/')}`
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (m) => m.toUpperCase())

export function yyyymmddToIso(d: string): string {
  if (!/^\d{8}$/.test(d)) throw new Error(`Bad LedgerOne date "${d}"`)
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

export function adaptLedgerOne(raw: LedgerOneExport): UnifiedDataset {
  const warnings: AdapterWarning[] = []
  const vendors = new Map(raw.APVEND.map((v) => [v.VENDOR_ID, v.VENDOR_NAME]))
  const vendorName = (vid: string, recordId: string) => {
    const name = vendors.get(vid)
    if (!name) warnings.push({ recordId, message: `Unknown vendor id ${vid}` })
    return name ?? vid
  }

  const projects = raw.JCJOB.map((j) => ({
    id: id(j.JOB_NO), number: j.JOB_NO, name: titleCase(j.JOB_DESC), customer: j.CUST_NAME,
    status: j.STATUS === 'A' ? ('active' as const) : ('closed' as const),
  }))

  // One unified cost code per job + phase; LedgerOne's categories are summed.
  const codes = new Map<string, CostCode>()
  for (const row of raw.JCCOST) {
    const key = id(row.JOB_NO, row.PHASE)
    const existing = codes.get(key)
    const cents = parseMoney(row.BUDGET_AMT)
    if (existing) existing.budgetCents += cents
    else codes.set(key, { id: key, projectId: id(row.JOB_NO), code: row.PHASE, description: row.DESC, budgetCents: cents })
  }

  const commitments = raw.CMCOMMIT.map((c) => {
    const lines = new Map<string, number>()
    for (const l of raw.CMLINE.filter((x) => x.COMMIT_NO === c.COMMIT_NO)) {
      const codeId = id(c.JOB_NO, l.PHASE)
      if (!codes.has(codeId)) warnings.push({ recordId: id('commit', c.COMMIT_NO, l.LINE), message: `Phase ${l.PHASE} has no budget on job ${c.JOB_NO}` })
      lines.set(codeId, (lines.get(codeId) ?? 0) + parseMoney(l.AMT))
    }
    return {
      id: id('commit', c.COMMIT_NO), projectId: id(c.JOB_NO), number: c.COMMIT_NO,
      vendor: vendorName(c.VENDOR_ID, id('commit', c.COMMIT_NO)),
      kind: c.TYPE === 'SC' ? ('subcontract' as const) : ('purchase_order' as const),
      lines: [...lines].map(([costCodeId, amountCents]) => ({ costCodeId, amountCents })),
    }
  })

  const STATUS = { O: 'open', A: 'approved', P: 'paid' } as const
  const invoices = raw.APINV.map((i) => {
    const recordId = id('inv', i.INV_ID)
    const codeId = i.PHASE ? id(i.JOB_NO, i.PHASE) : null
    if (codeId && !codes.has(codeId)) warnings.push({ recordId, message: `Phase ${i.PHASE} has no budget on job ${i.JOB_NO}` })
    return {
      id: recordId, projectId: id(i.JOB_NO), vendor: vendorName(i.VENDOR_ID, recordId), invoiceNumber: i.INV_NO,
      date: yyyymmddToIso(i.INV_DATE), amountCents: i.AMT_CENTS, costCodeId: codeId,
      commitmentId: i.COMMIT_NO ? id('commit', i.COMMIT_NO) : null, memo: i.MEMO, status: STATUS[i.STATUS],
    }
  })

  return { source: SRC, projects, costCodes: [...codes.values()], commitments, invoices, warnings }
}

// BuildBooks: a (fictional) desktop accounting product exported to JSON.
// Jobs are "Customer:Job" strings, cost codes are "Classes" with the code and
// description in one field, money is display text, dates are MM/DD/YYYY,
// PO numbers lose their prefix, and bills never link to a commitment: the
// reference, if any, is typed into the memo.
import { parseMoney } from '../money'
import type { AdapterWarning, Commitment, CostCode, Invoice, Project, UnifiedDataset } from '../types'

export interface BuildBooksExport {
  Customers: { FullName: string; JobNumber: string; JobStatus: 'In progress' | 'Closed' }[]
  Estimates: { CustomerJob: string; Lines: { Class: string; Amount: string }[] }[]
  PurchaseOrders: { RefNumber: string; Vendor: string; CustomerJob: string; Memo: string; Lines: { Class: string; Amount: string }[] }[]
  Bills: {
    TxnID: string; Vendor: string; RefNumber: string; TxnDate: string; AmountDue: string
    Lines: { Class: string; CustomerJob: string; Amount: string }[]; Memo: string; IsPaid: boolean; IsApproved: boolean
  }[]
}

const SRC = 'buildbooks'

export function splitClass(cls: string): { code: string; description: string } {
  const m = /^(\d{2}-\d{3})\s+(.+)$/.exec(cls.trim())
  if (!m) throw new Error(`Class "${cls}" does not start with a cost code`)
  return { code: m[1], description: m[2] }
}

export function mdyToIso(d: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d)
  if (!m) throw new Error(`Bad BuildBooks date "${d}"`)
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

/** "2207" → "PO-2207"; numbers that already carry a prefix are kept. */
export function normalizeCommitmentNumber(ref: string): string {
  const r = ref.trim().toUpperCase()
  return /^\d+$/.test(r) ? `PO-${r}` : r.replace(/^(SC|PO)\s*#?\s*-?\s*/, '$1-')
}

export function adaptBuildBooks(raw: BuildBooksExport): UnifiedDataset {
  const warnings: AdapterWarning[] = []
  const jobNumber = new Map(raw.Customers.map((c) => [c.FullName, c.JobNumber]))
  const projectId = (customerJob: string, recordId: string) => {
    const n = jobNumber.get(customerJob)
    if (!n) warnings.push({ recordId, message: `Job "${customerJob}" not found in customer list` })
    return `${SRC}:${n ?? customerJob}`
  }
  const codeId = (pid: string, cls: string) => `${pid}/${splitClass(cls).code}`

  const projects: Project[] = raw.Customers.map((c) => {
    const [customer, ...rest] = c.FullName.split(':')
    return { id: `${SRC}:${c.JobNumber}`, number: c.JobNumber, name: rest.join(':'), customer, status: c.JobStatus === 'Closed' ? 'closed' : 'active' }
  })

  const costCodes: CostCode[] = raw.Estimates.flatMap((e) => {
    const pid = projectId(e.CustomerJob, `estimate:${e.CustomerJob}`)
    return e.Lines.map((l) => ({ id: codeId(pid, l.Class), projectId: pid, ...splitClass(l.Class), budgetCents: parseMoney(l.Amount) }))
  })
  const knownCodes = new Set(costCodes.map((c) => c.id))

  const commitments: Commitment[] = raw.PurchaseOrders.map((po) => {
    const pid = projectId(po.CustomerJob, `po:${po.RefNumber}`)
    const number = normalizeCommitmentNumber(po.RefNumber)
    return {
      id: `${SRC}:commit/${number}`, projectId: pid, number, vendor: po.Vendor,
      kind: number.startsWith('SC-') ? 'subcontract' : 'purchase_order',
      lines: po.Lines.map((l) => ({ costCodeId: codeId(pid, l.Class), amountCents: parseMoney(l.Amount) })),
    }
  })

  const invoices: Invoice[] = raw.Bills.flatMap((b) => {
    const recordId = `${SRC}:bill/${b.TxnID}`
    const total = parseMoney(b.AmountDue)
    const lineTotal = b.Lines.reduce((s, l) => s + parseMoney(l.Amount), 0)
    if (lineTotal !== total) warnings.push({ recordId, message: `Lines sum to ${lineTotal} cents but AmountDue is ${total}` })
    // A bill split across jobs becomes one unified invoice per line.
    return b.Lines.map((l, i) => {
      const pid = projectId(l.CustomerJob, recordId)
      const cid = codeId(pid, l.Class)
      if (!knownCodes.has(cid)) warnings.push({ recordId, message: `Class "${l.Class}" has no estimate on ${l.CustomerJob}` })
      return {
        id: b.Lines.length > 1 ? `${recordId}#${i + 1}` : recordId, projectId: pid, vendor: b.Vendor,
        invoiceNumber: b.RefNumber, date: mdyToIso(b.TxnDate), amountCents: parseMoney(l.Amount), costCodeId: cid,
        commitmentId: null, memo: b.Memo, status: b.IsPaid ? 'paid' : b.IsApproved ? 'approved' : 'open',
      }
    })
  })

  return { source: SRC, projects, costCodes, commitments, invoices, warnings }
}

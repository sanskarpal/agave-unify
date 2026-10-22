import { normalizeCommitmentNumber } from './adapters/buildbooks.js'
import type { Commitment, Invoice, UnifiedDataset } from './types.js'

export type MatchMethod = 'linked' | 'memo' | 'vendor-cost-code' | 'ambiguous' | 'unmatched'

export interface InvoiceMatch {
  invoice: Invoice
  method: MatchMethod
  commitment: Commitment | null
  candidates: Commitment[] // for ambiguous matches
  /** Set when this invoice pushes its commitment past 100% billed. */
  overBilledCents: number
}

const MEMO_REF = /\b(SC|PO)\s*[#-]?\s*(\d{3,5})\b/gi

/** Commitment numbers mentioned in free text: "Pay app #2 - SC 1042", "PO#2207". */
export function memoReferences(memo: string): string[] {
  return [...memo.matchAll(MEMO_REF)].map((m) => normalizeCommitmentNumber(`${m[1]}-${m[2]}`))
}

/**
 * Ties each invoice to the commitment it bills against, strongest evidence
 * first: an explicit link from the source system, then a reference typed into
 * the memo, then a unique vendor + cost code match within the project.
 */
export function matchInvoices(data: UnifiedDataset): InvoiceMatch[] {
  const byId = new Map(data.commitments.map((c) => [c.id, c]))
  const matches = [...data.invoices]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((invoice): InvoiceMatch => {
      const base = { invoice, candidates: [] as Commitment[], overBilledCents: 0 }
      const linked = invoice.commitmentId ? byId.get(invoice.commitmentId) : undefined
      if (linked) return { ...base, method: 'linked', commitment: linked }

      const inProject = data.commitments.filter((c) => c.projectId === invoice.projectId)
      const refs = memoReferences(invoice.memo)
      const byMemo = inProject.find((c) => refs.includes(c.number))
      if (byMemo) return { ...base, method: 'memo', commitment: byMemo }

      const candidates = inProject.filter((c) =>
        c.vendor.toLowerCase() === invoice.vendor.toLowerCase() &&
        (!invoice.costCodeId || c.lines.some((l) => l.costCodeId === invoice.costCodeId)))
      if (candidates.length === 1) return { ...base, method: 'vendor-cost-code', commitment: candidates[0] }
      if (candidates.length > 1) return { ...base, method: 'ambiguous', commitment: null, candidates }
      return { ...base, method: 'unmatched', commitment: null }
    })

  // walk invoices in date order and flag the one that crosses each commitment's total
  const billed = new Map<string, number>()
  for (const m of matches) {
    if (!m.commitment) continue
    const total = commitmentTotal(m.commitment)
    const before = billed.get(m.commitment.id) ?? 0
    const after = before + m.invoice.amountCents
    billed.set(m.commitment.id, after)
    if (after > total) m.overBilledCents = after - Math.max(total, before)
  }
  return matches
}

export function commitmentTotal(c: Commitment): number {
  return c.lines.reduce((s, l) => s + l.amountCents, 0)
}

export interface CommitmentStatus {
  commitment: Commitment
  totalCents: number
  billedCents: number
  percentBilled: number
}

export function commitmentStatuses(data: UnifiedDataset, matches: InvoiceMatch[]): CommitmentStatus[] {
  return data.commitments.map((c) => {
    const totalCents = commitmentTotal(c)
    const billedCents = matches.filter((m) => m.commitment?.id === c.id).reduce((s, m) => s + m.invoice.amountCents, 0)
    return { commitment: c, totalCents, billedCents, percentBilled: totalCents ? billedCents / totalCents : 0 }
  })
}

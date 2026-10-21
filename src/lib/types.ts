// The unified model every source system is normalized into. Money is integer
// cents everywhere, dates are ISO yyyy-mm-dd, ids are `${source}:${nativeId}`.

export type SourceId = 'ledgerone' | 'buildbooks' | 'fieldcloud'

export interface Project {
  id: string
  number: string // the contractor's job number, e.g. "24-117"
  name: string
  customer: string
  status: 'active' | 'closed'
}

export interface CostCode {
  id: string
  projectId: string
  code: string // CSI-style, e.g. "03-300"
  description: string
  budgetCents: number
}

export interface CommitmentLine {
  costCodeId: string
  amountCents: number
}

export interface Commitment {
  id: string
  projectId: string
  number: string // PO / subcontract number as printed on paperwork
  vendor: string
  kind: 'subcontract' | 'purchase_order'
  lines: CommitmentLine[]
}

export interface Invoice {
  id: string
  projectId: string
  vendor: string
  invoiceNumber: string
  date: string
  amountCents: number
  costCodeId: string | null
  /** Set when the source system links the bill to a commitment itself. */
  commitmentId: string | null
  /** Free text from the source; some systems only reference the PO here. */
  memo: string
  status: 'open' | 'approved' | 'paid'
}

export interface UnifiedDataset {
  source: SourceId
  projects: Project[]
  costCodes: CostCode[]
  commitments: Commitment[]
  invoices: Invoice[]
  /** Records the adapter could read but not fully map. Never silently dropped. */
  warnings: AdapterWarning[]
}

export interface AdapterWarning {
  recordId: string
  message: string
}

// FieldCloud: a (fictional) cloud project-management API. Nested camelCase
// JSON, opaque ids, money as float dollars, budgets as original + approved
// changes, and payables that usually (not always) point at their commitment.
import { parseMoney } from '../money.js'
import type { AdapterWarning, Commitment, CostCode, Invoice, Project, UnifiedDataset } from '../types.js'

export interface FieldCloudExport {
  projects: {
    id: string; projectNumber: string; displayName: string; client: { name: string }; archived: boolean
    budget: { lineItems: { costCode: { code: string; name: string }; originalBudget: number; approvedChanges: number }[] }
  }[]
  commitments: {
    id: string; projectId: string; number: string; vendor: { companyName: string }; type: 'subcontract' | 'purchaseOrder'
    lineItems: { costCode: string; amount: number }[]
  }[]
  payables: {
    id: string; projectId: string; vendor: { companyName: string }; invoiceNumber: string; invoiceDate: string
    total: number; costCode: string | null; commitmentId: string | null; notes: string; state: 'pending' | 'approved' | 'paid'
  }[]
}

const SRC = 'fieldcloud'

export function adaptFieldCloud(raw: FieldCloudExport): UnifiedDataset {
  const warnings: AdapterWarning[] = []
  const numberOf = new Map(raw.projects.map((p) => [p.id, p.projectNumber]))
  const pid = (fcId: string, recordId: string) => {
    const n = numberOf.get(fcId)
    if (!n) warnings.push({ recordId, message: `Unknown project ${fcId}` })
    return `${SRC}:${n ?? fcId}`
  }

  const projects: Project[] = raw.projects.map((p) => ({
    id: `${SRC}:${p.projectNumber}`, number: p.projectNumber, name: p.displayName, customer: p.client.name,
    status: p.archived ? 'closed' : 'active',
  }))

  const costCodes: CostCode[] = raw.projects.flatMap((p) => p.budget.lineItems.map((li) => ({
    id: `${SRC}:${p.projectNumber}/${li.costCode.code}`, projectId: `${SRC}:${p.projectNumber}`, code: li.costCode.code,
    description: li.costCode.name, budgetCents: parseMoney(li.originalBudget) + parseMoney(li.approvedChanges),
  })))

  const commitmentIds = new Map<string, string>()
  const commitments: Commitment[] = raw.commitments.map((c) => {
    const id = `${SRC}:commit/${c.number}`
    commitmentIds.set(c.id, id)
    const project = pid(c.projectId, id)
    return {
      id, projectId: project, number: c.number, vendor: c.vendor.companyName,
      kind: c.type === 'subcontract' ? 'subcontract' : 'purchase_order',
      lines: c.lineItems.map((l) => ({ costCodeId: `${project}/${l.costCode}`, amountCents: parseMoney(l.amount) })),
    }
  })

  const STATE = { pending: 'open', approved: 'approved', paid: 'paid' } as const
  const invoices: Invoice[] = raw.payables.map((p) => {
    const id = `${SRC}:payable/${p.id}`
    const project = pid(p.projectId, id)
    let commitmentId: string | null = null
    if (p.commitmentId) {
      commitmentId = commitmentIds.get(p.commitmentId) ?? null
      if (!commitmentId) warnings.push({ recordId: id, message: `Commitment ${p.commitmentId} not in export` })
    }
    return {
      id, projectId: project, vendor: p.vendor.companyName, invoiceNumber: p.invoiceNumber,
      date: p.invoiceDate.slice(0, 10), amountCents: parseMoney(p.total),
      costCodeId: p.costCode ? `${project}/${p.costCode}` : null, commitmentId, memo: p.notes, status: STATE[p.state],
    }
  })

  return { source: SRC, projects, costCodes, commitments, invoices, warnings }
}

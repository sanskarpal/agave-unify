import type { UnifiedDataset } from './types'

export interface CostCodeSummary {
  projectNumber: string
  code: string
  description: string
  budgetCents: number
  committedCents: number
  actualCents: number // invoiced to date
  projectedCents: number // what this code will likely cost: the larger of committed and actual
  varianceCents: number // budget − projected; negative is an overrun
}

export interface ProjectSummary {
  projectNumber: string
  name: string
  customer: string
  status: 'active' | 'closed'
  codes: CostCodeSummary[]
  totals: Omit<CostCodeSummary, 'projectNumber' | 'code' | 'description'>
  uncodedCents: number // invoices that could not be tied to a cost code
}

export function jobCost(data: UnifiedDataset): ProjectSummary[] {
  const commitmentById = new Map(data.commitments.map((c) => [c.id, c]))

  /** An uncoded bill inherits the cost code of a single-line commitment it is linked to. */
  const resolveCode = (costCodeId: string | null, commitmentId: string | null): string | null => {
    if (costCodeId) return costCodeId
    const c = commitmentId ? commitmentById.get(commitmentId) : undefined
    return c && c.lines.length === 1 ? c.lines[0].costCodeId : null
  }

  return data.projects
    .map((p): ProjectSummary => {
      const invoices = data.invoices.filter((i) => i.projectId === p.id)
      const codes = data.costCodes
        .filter((c) => c.projectId === p.id)
        .map((cc): CostCodeSummary => {
          const committedCents = data.commitments
            .flatMap((c) => c.lines)
            .filter((l) => l.costCodeId === cc.id)
            .reduce((s, l) => s + l.amountCents, 0)
          const actualCents = invoices
            .filter((i) => resolveCode(i.costCodeId, i.commitmentId) === cc.id)
            .reduce((s, i) => s + i.amountCents, 0)
          const projectedCents = Math.max(committedCents, actualCents)
          return {
            projectNumber: p.number, code: cc.code, description: cc.description, budgetCents: cc.budgetCents,
            committedCents, actualCents, projectedCents, varianceCents: cc.budgetCents - projectedCents,
          }
        })
        .sort((a, b) => a.code.localeCompare(b.code))

      const sum = (k: keyof ProjectSummary['totals']) => codes.reduce((s, c) => s + c[k], 0)
      return {
        projectNumber: p.number, name: p.name, customer: p.customer, status: p.status, codes,
        totals: {
          budgetCents: sum('budgetCents'), committedCents: sum('committedCents'), actualCents: sum('actualCents'),
          projectedCents: sum('projectedCents'), varianceCents: sum('varianceCents'),
        },
        uncodedCents: invoices.filter((i) => !resolveCode(i.costCodeId, i.commitmentId)).reduce((s, i) => s + i.amountCents, 0),
      }
    })
    .sort((a, b) => b.projectNumber.localeCompare(a.projectNumber))
}

/** Source-independent fingerprint: equal across systems iff the numbers agree. */
export function fingerprint(summaries: ProjectSummary[]): string {
  return JSON.stringify(summaries.map((p) => [p.projectNumber, p.codes.map((c) =>
    [c.code, c.budgetCents, c.committedCents, c.actualCents])]))
}

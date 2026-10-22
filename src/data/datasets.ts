import { adaptBuildBooks } from '../lib/adapters/buildbooks.js'
import { adaptFieldCloud } from '../lib/adapters/fieldcloud.js'
import { adaptLedgerOne } from '../lib/adapters/ledgerone.js'
import type { SourceId, UnifiedDataset } from '../lib/types.js'
import { buildBooksExport, fieldCloudExport, ledgerOneExport } from './sources.js'

export interface SourceInfo {
  id: SourceId
  name: string
  kind: string
  quirks: string[]
  raw: () => unknown
  load: () => UnifiedDataset
}

export const SOURCES: SourceInfo[] = [
  {
    id: 'ledgerone', name: 'LedgerOne', kind: 'On-prem accounting, read over SQL',
    quirks: ['Upper-case columns and job names', 'Budgets split by phase and cost category', 'Dates as YYYYMMDD, bills in integer cents', 'Only subcontract bills carry a commitment link; PO bills mention the PO in the memo'],
    raw: ledgerOneExport, load: () => adaptLedgerOne(ledgerOneExport()),
  },
  {
    id: 'buildbooks', name: 'BuildBooks', kind: 'Desktop accounting, file export',
    quirks: ['Jobs are "Customer:Job" strings', 'Cost code and description share one "Class" field', 'Money as "$1,234.56", dates as M/D/YYYY', 'PO numbers lose their prefix; bills only reference commitments in the memo'],
    raw: buildBooksExport, load: () => adaptBuildBooks(buildBooksExport()),
  },
  {
    id: 'fieldcloud', name: 'FieldCloud', kind: 'Cloud project management, REST API',
    quirks: ['Nested camelCase JSON with opaque ids', 'Money as float dollars', 'Budget = original + approved changes', 'Payables usually link to commitments, but not always'],
    raw: fieldCloudExport, load: () => adaptFieldCloud(fieldCloudExport()),
  },
]

export function source(id: SourceId): SourceInfo {
  return SOURCES.find((s) => s.id === id)!
}

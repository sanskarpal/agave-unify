// One fictional contractor's books, written once. The fixtures in ./sources
// re-express this data the way three different systems would store it; the
// adapters must turn each back into the same job-cost numbers.

export interface CanonicalProject {
  number: string
  name: string
  customer: string
  status: 'active' | 'closed'
  costCodes: { code: string; description: string; budget: number }[] // dollars
}

export interface CanonicalCommitment {
  number: string
  project: string
  vendor: string
  kind: 'subcontract' | 'purchase_order'
  lines: { code: string; amount: number }[]
}

export interface CanonicalInvoice {
  key: string
  project: string
  vendor: string
  invoiceNumber: string
  date: string
  amount: number
  code: string | null
  commitment: string | null // the PO / subcontract this bill belongs to
  status: 'open' | 'approved' | 'paid'
}

export const PROJECTS: CanonicalProject[] = [
  {
    number: '24-117', name: 'Hilltop Medical Office, Phase 2', customer: 'Hilltop Health Partners', status: 'active',
    costCodes: [
      { code: '01-500', description: 'Temporary facilities', budget: 48_000 },
      { code: '03-300', description: 'Cast-in-place concrete', budget: 412_000 },
      { code: '05-120', description: 'Structural steel', budget: 365_000 },
      { code: '09-250', description: 'Gypsum board', budget: 188_000 },
      { code: '23-000', description: 'HVAC', budget: 296_000 },
      { code: '26-000', description: 'Electrical', budget: 274_000 },
    ],
  },
  {
    number: '24-131', name: 'Riverside Elementary Gym Addition', customer: 'Riverside Unified School District', status: 'active',
    costCodes: [
      { code: '03-300', description: 'Cast-in-place concrete', budget: 156_000 },
      { code: '06-100', description: 'Rough carpentry', budget: 72_000 },
      { code: '07-500', description: 'Membrane roofing', budget: 118_000 },
      { code: '09-650', description: 'Resilient flooring', budget: 64_000 },
    ],
  },
  {
    number: '23-088', name: 'Marlow St. Retail Shell', customer: 'Marlow Street Holdings', status: 'closed',
    costCodes: [
      { code: '03-300', description: 'Cast-in-place concrete', budget: 98_000 },
      { code: '05-120', description: 'Structural steel', budget: 140_000 },
      { code: '08-410', description: 'Storefronts', budget: 86_000 },
    ],
  },
]

export const COMMITMENTS: CanonicalCommitment[] = [
  { number: 'SC-1042', project: '24-117', vendor: 'Granite Peak Concrete', kind: 'subcontract', lines: [{ code: '03-300', amount: 398_500 }] },
  { number: 'SC-1043', project: '24-117', vendor: 'Ironline Steel Erectors', kind: 'subcontract', lines: [{ code: '05-120', amount: 371_200 }] },
  { number: 'SC-1051', project: '24-117', vendor: 'Coastal Mechanical', kind: 'subcontract', lines: [{ code: '23-000', amount: 284_000 }] },
  { number: 'SC-1052', project: '24-117', vendor: 'Brightwire Electric', kind: 'subcontract', lines: [{ code: '26-000', amount: 241_000 }, { code: '01-500', amount: 9_600 }] },
  { number: 'PO-2207', project: '24-117', vendor: 'Summit Building Supply', kind: 'purchase_order', lines: [{ code: '09-250', amount: 61_300 }, { code: '01-500', amount: 12_400 }] },
  { number: 'SC-1060', project: '24-131', vendor: 'Granite Peak Concrete', kind: 'subcontract', lines: [{ code: '03-300', amount: 149_800 }] },
  { number: 'SC-1061', project: '24-131', vendor: 'Tallgrass Roofing', kind: 'subcontract', lines: [{ code: '07-500', amount: 121_500 }] },
  { number: 'PO-2231', project: '24-131', vendor: 'Summit Building Supply', kind: 'purchase_order', lines: [{ code: '06-100', amount: 38_900 }] },
  { number: 'SC-0977', project: '23-088', vendor: 'Ironline Steel Erectors', kind: 'subcontract', lines: [{ code: '05-120', amount: 136_000 }] },
  { number: 'SC-0981', project: '23-088', vendor: 'Clearview Glass & Storefront', kind: 'subcontract', lines: [{ code: '08-410', amount: 88_250 }] },
]

const inv = (key: string, project: string, vendor: string, invoiceNumber: string, date: string, amount: number,
  code: string | null, commitment: string | null, status: CanonicalInvoice['status']): CanonicalInvoice =>
  ({ key, project, vendor, invoiceNumber, date, amount, code, commitment, status })

export const INVOICES: CanonicalInvoice[] = [
  inv('i01', '24-117', 'Granite Peak Concrete', 'GPC-7781', '2026-06-30', 118_400.0, '03-300', 'SC-1042', 'paid'),
  inv('i02', '24-117', 'Granite Peak Concrete', 'GPC-7840', '2026-07-31', 142_250.0, '03-300', 'SC-1042', 'paid'),
  inv('i03', '24-117', 'Granite Peak Concrete', 'GPC-7902', '2026-08-31', 151_300.0, '03-300', 'SC-1042', 'approved'),
  inv('i04', '24-117', 'Ironline Steel Erectors', 'ISE-3310', '2026-08-15', 205_000.0, '05-120', 'SC-1043', 'paid'),
  inv('i05', '24-117', 'Ironline Steel Erectors', 'ISE-3377', '2026-09-15', 131_480.5, '05-120', 'SC-1043', 'open'),
  inv('i06', '24-117', 'Coastal Mechanical', 'CM-21-118', '2026-09-30', 96_750.0, '23-000', 'SC-1051', 'approved'),
  inv('i07', '24-117', 'Brightwire Electric', 'BWE-5520', '2026-09-30', 88_100.0, '26-000', 'SC-1052', 'open'),
  inv('i08', '24-117', 'Summit Building Supply', '448812', '2026-09-12', 23_418.77, '09-250', 'PO-2207', 'paid'),
  inv('i09', '24-117', 'Summit Building Supply', '449950', '2026-10-03', 9_842.1, '01-500', 'PO-2207', 'open'),
  inv('i10', '24-117', 'Rapid Rentals', 'RR-90311', '2026-10-01', 4_275.0, '01-500', null, 'open'),
  inv('i11', '24-131', 'Granite Peak Concrete', 'GPC-7955', '2026-09-30', 61_200.0, '03-300', 'SC-1060', 'approved'),
  inv('i12', '24-131', 'Tallgrass Roofing', 'TR-0412', '2026-10-05', 42_000.0, '07-500', 'SC-1061', 'open'),
  inv('i13', '24-131', 'Summit Building Supply', '450117', '2026-10-08', 17_930.4, '06-100', 'PO-2231', 'open'),
  inv('i14', '23-088', 'Ironline Steel Erectors', 'ISE-2988', '2025-11-20', 136_000.0, '05-120', 'SC-0977', 'paid'),
  inv('i15', '23-088', 'Clearview Glass & Storefront', 'CGS-118', '2025-12-15', 70_600.0, '08-410', 'SC-0981', 'paid'),
  inv('i16', '23-088', 'Clearview Glass & Storefront', 'CGS-131', '2026-01-30', 21_180.0, '08-410', 'SC-0981', 'paid'),
]

// Simulated exports: the canonical books re-expressed in each system's native
// shape and quirks, standing in for what an integration would actually pull.
import type { BuildBooksExport } from '../lib/adapters/buildbooks.js'
import type { FieldCloudExport } from '../lib/adapters/fieldcloud.js'
import type { LedgerOneExport } from '../lib/adapters/ledgerone.js'
import { COMMITMENTS, INVOICES, PROJECTS } from './canonical.js'

const money = (dollars: number) =>
  `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const cents = (dollars: number) => Math.round(dollars * 100)
const vendorId = (name: string) => name.replace(/[^A-Za-z ]/g, '').split(' ').map((w) => w.slice(0, 3)).join('').toUpperCase().slice(0, 8)
const project = (number: string) => PROJECTS.find((p) => p.number === number)!
const customerJob = (number: string) => `${project(number).customer}:${project(number).name}`
const description = (number: string, code: string) => project(number).costCodes.find((c) => c.code === code)!.description

export function ledgerOneExport(): LedgerOneExport {
  const vendors = [...new Set([...COMMITMENTS.map((c) => c.vendor), ...INVOICES.map((i) => i.vendor)])]
  return {
    JCJOB: PROJECTS.map((p) => ({ JOB_NO: p.number, JOB_DESC: p.name.toUpperCase(), CUST_NAME: p.customer, STATUS: p.status === 'active' ? 'A' : 'C' })),
    // budgets are carried per cost category; concrete-type phases split subcontract / material
    JCCOST: PROJECTS.flatMap((p) => p.costCodes.flatMap((c) => {
      if (!c.code.startsWith('03')) return [{ JOB_NO: p.number, PHASE: c.code, CAT: 'S' as const, DESC: c.description, BUDGET_AMT: c.budget.toFixed(2) }]
      const sub = Math.round(c.budget * 0.7)
      return [
        { JOB_NO: p.number, PHASE: c.code, CAT: 'S' as const, DESC: c.description, BUDGET_AMT: sub.toFixed(2) },
        { JOB_NO: p.number, PHASE: c.code, CAT: 'M' as const, DESC: c.description, BUDGET_AMT: (c.budget - sub).toFixed(2) },
      ]
    })),
    APVEND: vendors.map((v) => ({ VENDOR_ID: vendorId(v), VENDOR_NAME: v })),
    CMCOMMIT: COMMITMENTS.map((c) => ({ COMMIT_NO: c.number, JOB_NO: c.project, VENDOR_ID: vendorId(c.vendor), TYPE: c.kind === 'subcontract' ? 'SC' : 'PO' })),
    CMLINE: COMMITMENTS.flatMap((c) => c.lines.map((l, i) => ({ COMMIT_NO: c.number, LINE: i + 1, PHASE: l.code, CAT: c.kind === 'subcontract' ? 'S' as const : 'M' as const, AMT: l.amount.toFixed(2) }))),
    APINV: INVOICES.map((inv, i) => ({
      INV_ID: 50_100 + i, JOB_NO: inv.project, VENDOR_ID: vendorId(inv.vendor), INV_NO: inv.invoiceNumber,
      INV_DATE: inv.date.replaceAll('-', ''), AMT_CENTS: cents(inv.amount), PHASE: inv.code ?? '',
      // LedgerOne links subcontract pay apps; PO bills only mention the PO in the memo
      COMMIT_NO: inv.commitment?.startsWith('SC-') ? inv.commitment : '',
      STATUS: inv.status === 'open' ? 'O' : inv.status === 'approved' ? 'A' : 'P',
      MEMO: inv.commitment?.startsWith('PO-') ? `PO ${inv.commitment.slice(3)} RECEIVED` : '',
    })),
  }
}

export function buildBooksExport(): BuildBooksExport {
  return {
    Customers: PROJECTS.map((p) => ({ FullName: customerJob(p.number), JobNumber: p.number, JobStatus: p.status === 'active' ? 'In progress' : 'Closed' })),
    Estimates: PROJECTS.map((p) => ({ CustomerJob: customerJob(p.number), Lines: p.costCodes.map((c) => ({ Class: `${c.code} ${c.description}`, Amount: money(c.budget) })) })),
    PurchaseOrders: COMMITMENTS.map((c) => ({
      RefNumber: c.kind === 'purchase_order' ? c.number.slice(3) : c.number, // the PO- prefix doesn't survive
      Vendor: c.vendor, CustomerJob: customerJob(c.project), Memo: '',
      Lines: c.lines.map((l) => ({ Class: `${l.code} ${description(c.project, l.code)}`, Amount: money(l.amount) })),
    })),
    Bills: INVOICES.map((inv, i) => {
      const [y, m, d] = inv.date.split('-')
      const memo = !inv.commitment ? 'Light tower rental, Oct'
        : inv.commitment.startsWith('PO-') ? `PO#${inv.commitment.slice(3)}`
        : `Pay app #${(i % 3) + 1} - ${inv.commitment.replace('-', ' ')}`
      return {
        TxnID: `8F2-${1600 + i}`, Vendor: inv.vendor, RefNumber: inv.invoiceNumber, TxnDate: `${Number(m)}/${Number(d)}/${y}`,
        AmountDue: money(inv.amount), Memo: memo, IsPaid: inv.status === 'paid', IsApproved: inv.status !== 'open',
        Lines: [{ Class: `${inv.code} ${description(inv.project, inv.code!)}`, CustomerJob: customerJob(inv.project), Amount: money(inv.amount) }],
      }
    }),
  }
}

export function fieldCloudExport(): FieldCloudExport {
  const prj = (n: string) => `prj_${n.replace('-', '')}`
  const cmt = (n: string) => `cmt_${n.replace('-', '').toLowerCase()}`
  return {
    projects: PROJECTS.map((p) => ({
      id: prj(p.number), projectNumber: p.number, displayName: p.name, client: { name: p.customer }, archived: p.status === 'closed',
      budget: {
        // concrete carries an approved change order; the budget is original + changes
        lineItems: p.costCodes.map((c) => {
          const change = c.code === '03-300' && p.number === '24-117' ? 12_000 : 0
          return { costCode: { code: c.code, name: c.description }, originalBudget: c.budget - change, approvedChanges: change }
        }),
      },
    })),
    commitments: COMMITMENTS.map((c) => ({
      id: cmt(c.number), projectId: prj(c.project), number: c.number, vendor: { companyName: c.vendor },
      type: c.kind === 'subcontract' ? 'subcontract' : 'purchaseOrder',
      lineItems: c.lines.map((l) => ({ costCode: l.code, amount: l.amount })),
    })),
    payables: INVOICES.map((inv) => ({
      id: `pay_${inv.key}`, projectId: prj(inv.project), vendor: { companyName: inv.vendor }, invoiceNumber: inv.invoiceNumber,
      invoiceDate: `${inv.date}T00:00:00.000Z`, total: inv.amount, costCode: inv.code,
      // one payable arrives without its link, as real syncs often do
      commitmentId: inv.commitment && inv.key !== 'i05' ? cmt(inv.commitment) : null,
      notes: '', state: inv.status === 'open' ? 'pending' : inv.status,
    })),
  }
}

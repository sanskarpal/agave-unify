/** "$1,234.56", "1234.56", "-$12.00", "(12.00)" → cents. Throws on anything else. */
export function parseMoney(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error(`Invalid amount: ${input}`)
    return Math.round(input * 100)
  }
  const s = input.trim()
  const negative = /^-|^\(.*\)$/.test(s)
  const digits = s.replace(/[$,()\s-]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(digits)) throw new Error(`Invalid amount: "${input}"`)
  const [whole, frac = ''] = digits.split('.')
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return negative ? -cents : cents
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatMoney(cents: number, withCents = false): string {
  return (withCents ? usdCents : usd).format(cents / 100)
}

export function formatCompactMoney(cents: number): string {
  const d = Math.abs(cents) / 100
  const sign = cents < 0 ? '-' : ''
  if (d >= 1_000_000) return `${sign}$${(d / 1_000_000).toFixed(2)}M`
  if (d >= 1_000) return `${sign}$${(d / 1_000).toFixed(d >= 100_000 ? 0 : 1)}k`
  return `${sign}$${d.toFixed(0)}`
}

import type { ReactNode } from 'react'

export type Tone = 'brand' | 'good' | 'warn' | 'bad' | 'muted'

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-hover',
  good: 'bg-good/10 text-good',
  warn: 'bg-warn/10 text-warn',
  bad: 'bg-bad/10 text-bad',
  muted: 'bg-surface text-ink-muted',
}

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-bg ${className}`}>{children}</div>
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className={`mt-1 font-display text-xl font-semibold tabular-nums ${tone === 'bad' ? 'text-bad' : tone === 'good' ? 'text-good' : ''}`}>{value}</div>
    </Card>
  )
}

export function Json({ value, className = '' }: { value: unknown; className?: string }) {
  return (
    <pre className={`overflow-auto rounded-lg bg-[#0b1512] p-3 font-mono text-xs leading-relaxed text-[#d7f5e3] ${className}`}>
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

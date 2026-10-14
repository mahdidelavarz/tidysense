import type { ReactNode } from 'react'
import { formatNumber } from '../../../shared/lib/date'
import { type AppIcon, CircleAlert } from '../../../shared/ui/icons'
import { ErrorState, LoadingState } from '../../../shared/ui/StateUi'
import type { MetricResultDto } from '../types/operations.types'

/** A figure whose denominator is under this is labelled a small sample (027 §10): a size label, never a threshold. */
export const SmallSampleBelow = 10

export const count = (value: number | string) => formatNumber(Number(value))

/** One row of a figure as plain numbers. A segment the server did not return is zero over zero. */
export interface Ratio {
  numerator: number
  denominator: number
}

const none: Ratio = { numerator: 0, denominator: 0 }

export function rowOf(figures: readonly MetricResultDto[] | undefined, id: string, segment = ''): Ratio {
  const row = figures?.find(x => x.id === id)?.rows.find(x => x.segment === segment)
  return row ? { numerator: Number(row.numerator), denominator: Number(row.denominator) } : none
}

export function rowsOf(figures: readonly MetricResultDto[] | undefined, id: string) {
  return (figures?.find(x => x.id === id)?.rows ?? [])
    .map(x => ({ segment: x.segment, numerator: Number(x.numerator), denominator: Number(x.denominator) }))
}

/** «۱۸ از ۲۵»: every rate as x of y, with the small-sample label when y is under 10. */
export function OfCount({ value, unit, faint = false }: { value: Ratio; unit?: string; faint?: boolean }) {
  return (
    <span className={faint ? 'ops-of ops-faint' : 'ops-of'}>
      <b className="ops-of-n">{count(value.numerator)}</b> از {count(value.denominator)}{unit ? ` ${unit}` : ''}
      {!faint && value.denominator < SmallSampleBelow && <SmallSample />}
    </span>
  )
}

export function SmallSample() {
  return (
    <span className="ops-small" title="مخرج کمتر از ۱۰ است">
      <CircleAlert size={12} aria-hidden="true" />
      نمونه‌ی کم
    </span>
  )
}

/** A neutral bar for a share: one colour for every value, so length is the only thing it says. */
export function Meter({ value, tone }: { value: Ratio; tone?: string }) {
  const share = value.denominator > 0 ? Math.min(1, value.numerator / value.denominator) : 0
  return (
    <span className="ops-meter" aria-hidden="true">
      <span className={`ops-meter-fill ${tone ?? ''}`} style={{ inlineSize: `${share * 100}%` }} />
    </span>
  )
}

export function Card({ title, note, children, className = '' }: {
  title: string
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card ops-card ${className}`} aria-label={title}>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[1.0625rem] font-extrabold">{title}</h2>
        {note && <p className="text-xs leading-6 text-text-secondary">{note}</p>}
      </header>
      {children}
    </section>
  )
}

export function Tile({ icon: Icon, label, children, hint }: {
  icon: AppIcon
  label: string
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="card ops-tile">
      <p className="flex items-center gap-2 text-[0.8125rem] font-bold text-text-secondary">
        <span className="lane-tile size-8 rounded-lg"><Icon size={17} aria-hidden="true" /></span>
        {label}
      </p>
      <div className="ops-tile-value">{children}</div>
      {hint && <div className="mt-1.5 text-xs leading-6 text-text-secondary">{hint}</div>}
    </div>
  )
}

/** Waits for one read of the page; a failed read keeps the rest of the page. */
export function Loaded<T>({ query, pendingText, children }: {
  query: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => unknown }
  pendingText: string
  children: (data: T) => ReactNode
}) {
  if (query.isPending) return <LoadingState text={pendingText} />
  if (query.error || query.data === undefined) {
    return <ErrorState onRetry={() => query.refetch()} description="ارتباط را بررسی کنید و دوباره تلاش کنید." />
  }
  return <>{children(query.data)}</>
}

/** Codes and identifiers are Latin and read left to right inside the RTL page. */
export function Code({ children }: { children: ReactNode }) {
  return <code dir="ltr" className="ops-code">{children}</code>
}

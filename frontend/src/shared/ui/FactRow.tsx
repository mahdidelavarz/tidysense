import type { AppIcon } from './icons'
import type { ReactNode } from 'react'

/**
 * One fact as a row of a facts card: an icon tile and the label on the start
 * side, the value (and a quieter line under it) on the end side. `tone`
 * tints the tile when the fact needs attention, such as a near deadline.
 */
export function FactRow({ icon: Icon, label, value, sub, dateTime, tone }: {
  icon: AppIcon
  label: string
  value: ReactNode
  sub?: ReactNode
  dateTime?: string | null
  tone?: 'caution'
}) {
  return (
    <div className="fact-row">
      <span className="fact-icon" data-tone={tone} aria-hidden="true"><Icon size={18} /></span>
      <dt className="flex-1 text-sm text-text-secondary">{label}</dt>
      <dd className="text-end">
        <span className="block font-extrabold leading-6">{dateTime ? <time dateTime={dateTime}>{value}</time> : value}</span>
        {sub && <span className={`block text-xs font-semibold leading-5 ${tone === 'caution' ? 'text-caution' : 'text-text-tertiary'}`}>{sub}</span>}
      </dd>
    </div>
  )
}

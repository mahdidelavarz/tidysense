import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** One icon + label + value fact inside an entity detail `<dl>`. Wraps `value` in `<time>` when `dateTime` is given. */
export function DetailTerm({ icon: Icon, label, value, dateTime }: {
  icon: LucideIcon
  label: string
  value: ReactNode
  dateTime?: string | null
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-text-secondary" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-text-secondary">{label}</dt>
        <dd className="font-bold">{dateTime ? <time dateTime={dateTime}>{value}</time> : value}</dd>
      </div>
    </div>
  )
}

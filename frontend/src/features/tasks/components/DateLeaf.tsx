import { CalendarOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { parseIsoDate } from '../../../shared/lib/date'

const dayNumber = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })
const monthName = new Intl.DateTimeFormat('fa-IR', { month: 'short' })

/** «۱۹ مهر» for an ISO local date, or that there is none. Said next to a leaf, which is decorative. */
export function leafDateText(date: string | null | undefined) {
  if (!date) return 'بدون تاریخ'
  const parsed = parseIsoDate(date)
  return `${dayNumber.format(parsed)} ${monthName.format(parsed)}`
}

/**
 * A planned date as a small calendar leaf: day over month. `when` colours it
 * (today, an earlier day, a later day, none, or closed work); `children`
 * replace the date, for a Task that has ended.
 */
export function DateLeaf({ date, when, children }: {
  date: string | null | undefined
  when: 'today' | 'earlier' | 'later' | 'none' | 'closed'
  children?: ReactNode
}) {
  const parsed = date ? parseIsoDate(date) : null
  return (
    <span className="date-leaf" data-when={when} aria-hidden="true">
      {children ?? (parsed
        ? (
          <>
            <span className="text-base font-extrabold leading-5">{dayNumber.format(parsed)}</span>
            <span className="text-[0.625rem] font-bold leading-4">{monthName.format(parsed)}</span>
          </>
        )
        : <CalendarOff size={20} />)}
    </span>
  )
}

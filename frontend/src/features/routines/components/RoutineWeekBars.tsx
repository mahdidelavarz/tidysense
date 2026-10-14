import { formatNumber } from '../../../shared/lib/date'
import type { RoutineWeekDto } from '../types/routine.types'

/** The Jalali week from Saturday, one letter per day. */
const letters = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

/** How many of the week's scheduled days are complete, and how many are scheduled. */
export function weekProgress(week: RoutineWeekDto) {
  const scheduled = week.days.slice(-7).filter(day => Number(day.scheduled) > 0)
  return {
    complete: scheduled.filter(day => Number(day.done) >= Number(day.scheduled)).length,
    scheduled: scheduled.length,
  }
}

/**
 * A Routine's local week (Saturday to Friday): one bar for each day it is
 * scheduled, filled by the share of that day's slots done. Earlier days keep
 * an outline where something was left; today is outlined in the Routine
 * colour; later days are quiet. A missed slot is a fact, never a debt.
 * Only this week's days are drawn (the last seven of `week.days`).
 */
export function RoutineWeekBars({ week, today, everyDay = false }: {
  week: RoutineWeekDto
  today: string
  /** Keep a quiet place for the days it is not scheduled too, so rows line up in a list. */
  everyDay?: boolean
}) {
  const { complete, scheduled } = weekProgress(week)
  return (
    <div className="week-bars" data-wide={everyDay || undefined} role="img" aria-label={`این هفته: ${formatNumber(complete)} روز کامل از ${formatNumber(scheduled)} روز`}>
      {week.days.slice(-7).map((day, index) => {
        const slots = Number(day.scheduled)
        if (slots === 0) {
          return everyDay ? <span key={day.localDate} className="week-day" data-when="off"><span className="week-bar" />{letters[index]}</span> : null
        }
        const done = Math.min(Number(day.done), slots)
        const when = day.localDate < today ? 'past' : day.localDate === today ? 'today' : 'later'
        return (
          <span
            key={day.localDate}
            className="week-day"
            data-when={when}
            data-complete={done === slots}
            style={{ '--fill': `${(done / slots) * 100}%` } as React.CSSProperties}
          >
            <span className="week-bar" />
            {letters[index]}
          </span>
        )
      })}
    </div>
  )
}

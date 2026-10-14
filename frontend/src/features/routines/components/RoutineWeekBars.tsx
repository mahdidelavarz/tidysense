import { formatNumber } from '../../../shared/lib/date'
import type { RoutineWeekDto } from '../types/routine.types'

/** The Jalali week from Saturday, one letter per day. */
const letters = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

/** How many of the week's scheduled days are complete, and how many are scheduled. */
export function weekProgress(week: RoutineWeekDto) {
  const scheduled = week.days.filter(day => Number(day.scheduled) > 0)
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
 */
export function RoutineWeekBars({ week, today }: { week: RoutineWeekDto; today: string }) {
  const { complete, scheduled } = weekProgress(week)
  return (
    <div className="week-bars" role="img" aria-label={`این هفته: ${formatNumber(complete)} روز کامل از ${formatNumber(scheduled)} روز`}>
      {week.days.map((day, index) => {
        const slots = Number(day.scheduled)
        if (slots === 0) return null
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

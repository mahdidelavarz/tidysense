import { formatNumber, parseIsoDate } from '../../../shared/lib/date'
import type { RoutineWeekDto } from '../types/routine.types'

const letters = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const dayNumber = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })
const fullDate = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * The last four weeks of one Routine as a calendar, Saturday first. A day it
 * was scheduled is filled by the share of its slots done; one with nothing
 * done is a quiet grey, never red; days ahead are outlined, today is ringed.
 */
export function RoutineMonth({ weeks, today }: { weeks: RoutineWeekDto; today: string }) {
  const slots = Number(weeks.slotsPerDay)
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5" aria-hidden="true">
        {letters.map(letter => (
          <span key={letter} className="text-center text-[0.6875rem] font-bold text-text-secondary">{letter}</span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label="چهار هفته‌ی اخیر">
        {weeks.days.map(day => {
          const scheduled = Number(day.scheduled)
          const done = Math.min(Number(day.done), scheduled)
          const when = day.localDate < today ? 'past' : day.localDate === today ? 'today' : 'later'
          const state = scheduled === 0 ? 'off' : when === 'later' ? 'later' : done === scheduled ? 'full' : done > 0 ? 'part' : 'none'
          const words = state === 'off' ? 'نوبتی نداشت' : state === 'later' ? 'در پیش' : `${formatNumber(done)} از ${formatNumber(scheduled)} نوبت انجام شد`
          return (
            <li
              key={day.localDate}
              className="month-day"
              data-state={state}
              data-today={when === 'today'}
              style={{ '--fill': `${scheduled ? (done / scheduled) * 100 : 0}%` } as React.CSSProperties}
            >
              <span aria-hidden="true">{dayNumber.format(parseIsoDate(day.localDate))}</span>
              <span className="sr-only">{fullDate.format(parseIsoDate(day.localDate))}: {words}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] font-semibold text-text-secondary" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="month-key" data-state="full" />{slots > 1 ? 'همه‌ی نوبت‌ها' : 'انجام شد'}</span>
        {slots > 1 && <span className="flex items-center gap-1.5"><span className="month-key" data-state="part" style={{ '--fill': '50%' } as React.CSSProperties} />بخشی از نوبت‌ها</span>}
        <span className="flex items-center gap-1.5"><span className="month-key" data-state="none" />انجام نشد</span>
      </p>
    </div>
  )
}

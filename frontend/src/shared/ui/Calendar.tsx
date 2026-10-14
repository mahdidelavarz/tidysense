import { addDays, addMonths, getDate, getDay, getDaysInMonth, startOfMonth } from 'date-fns-jalali'
import { ChevronLeft, ChevronRight } from './icons'
import { useState } from 'react'
import { formatNumber, parseIsoDate, toIsoDate } from '../lib/date'

const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const monthFormatter = new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' })
const dayFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** «مهر ۱۴۰۵» — assembled from parts because the default fa-IR order puts the year first. */
function monthLabel(date: Date) {
  const parts = monthFormatter.formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('month')} ${part('year')}`
}

/**
 * A Jalali month grid, Saturday first. Values in and out are ISO `yyyy-MM-dd`.
 * Days before `min` cannot be chosen. A day can carry a deadline mark and a
 * count of what is already planned on it, so a choice is made in context.
 */
export function Calendar({ value, onChange, today = toIsoDate(new Date()), min, deadline, counts }: {
  value: string
  onChange: (value: string) => void
  today?: string
  /** The earliest day that can be chosen. */
  min?: string
  deadline?: string | null
  /** How many items are already planned on a day. */
  counts?: Record<string, number>
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(parseIsoDate(value || today)))
  // The Jalali week starts on Saturday; JS getDay() counts from Sunday.
  const leadingBlanks = (getDay(viewMonth) + 1) % 7
  const days = Array.from({ length: getDaysInMonth(viewMonth) }, (_, index) => addDays(viewMonth, index))

  return (
    <div>
      <div className="flex items-center justify-between">
        <button className="icon-button" type="button" aria-label="ماه قبل" onClick={() => setViewMonth(month => addMonths(month, -1))}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
        <p className="text-sm font-bold" aria-live="polite">{monthLabel(viewMonth)}</p>
        <button className="icon-button" type="button" aria-label="ماه بعد" onClick={() => setViewMonth(month => addMonths(month, 1))}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs text-text-secondary" aria-hidden="true">
        {weekdays.map(day => <span key={day} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const iso = toIsoDate(day)
          const count = counts?.[iso] ?? 0
          const extras = [
            iso === deadline ? 'مهلت' : null,
            count > 0 ? `${formatNumber(count)} کار` : null,
          ].filter(Boolean).join('، ')
          return (
            <button
              key={iso}
              className="calendar-day relative flex-col"
              type="button"
              // The first day is pushed to its weekday column; the rest flow after it.
              style={index === 0 ? { gridColumnStart: leadingBlanks + 1 } : undefined}
              data-date={iso}
              data-today={iso === today}
              disabled={Boolean(min && iso < min)}
              aria-pressed={iso === value}
              aria-label={extras ? `${dayFormatter.format(day)}، ${extras}` : dayFormatter.format(day)}
              onClick={() => onChange(iso)}
            >
              {formatNumber(getDate(day))}
              {iso === deadline && <span className="absolute top-1 left-1 size-1.5 rounded-full bg-caution" aria-hidden="true" />}
              {count > 0 && (
                <span className="absolute bottom-1 flex gap-0.5" aria-hidden="true">
                  {['a', 'b', 'c'].slice(0, Math.min(count, 3)).map(dot => <span key={dot} className="size-1 rounded-full bg-current opacity-60" />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

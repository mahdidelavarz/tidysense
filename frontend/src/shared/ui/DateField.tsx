import { addDays, addMonths, getDate, getDay, getDaysInMonth, startOfMonth } from 'date-fns-jalali'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { formatLocalDate, formatNumber, parseIsoDate, toIsoDate } from '../lib/date'

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
 * Jalali date picker. The value in and out is the ISO Gregorian `yyyy-MM-dd`
 * string the API uses (empty string = no date); only the presentation is
 * Jalali. The calendar expands inline under the field instead of floating,
 * so it is never clipped inside a scrolling sheet.
 */
export function DateField({ label, value, onChange, error, hint }: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
}) {
  const id = useId()
  const panelId = `${id}-panel`
  const errorId = error ? `${id}-error` : undefined
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value ? parseIsoDate(value) : new Date()))
  const todayIso = toIsoDate(new Date())
  const calendar = useRef<HTMLDivElement>(null)

  // Inside a scrolling sheet the calendar can open below the fold; bring it into view.
  useEffect(() => {
    if (open) calendar.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [open])

  function toggle() {
    if (!open) setViewMonth(startOfMonth(value ? parseIsoDate(value) : new Date()))
    setOpen(current => !current)
  }

  function choose(iso: string) {
    onChange(iso)
    setOpen(false)
  }

  // The Jalali week starts on Saturday; JS getDay() counts from Sunday.
  const leadingBlanks = (getDay(viewMonth) + 1) % 7
  const days = Array.from({ length: getDaysInMonth(viewMonth) }, (_, index) => addDays(viewMonth, index))

  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      {hint && <span className="field-hint">{hint}</span>}
      <button
        id={id}
        className="field-input flex items-center justify-between gap-3 text-start"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onClick={toggle}
      >
        <span className={value ? '' : 'text-text-tertiary'}>{value ? formatLocalDate(value) : 'انتخاب تاریخ'}</span>
        <CalendarDays size={20} className="shrink-0 text-text-secondary" aria-hidden="true" />
      </button>
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}

      {open && (
        <div className="mt-2 scroll-mb-24 rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm" id={panelId} ref={calendar}>
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
              return (
                <button
                  key={iso}
                  className="calendar-day"
                  type="button"
                  // The first day is pushed to its weekday column; the rest flow after it.
                  style={index === 0 ? { gridColumnStart: leadingBlanks + 1 } : undefined}
                  data-date={iso}
                  data-today={iso === todayIso}
                  aria-pressed={iso === value}
                  aria-label={dayFormatter.format(day)}
                  onClick={() => choose(iso)}
                >
                  {formatNumber(getDate(day))}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
            <button className="secondary-button min-h-9 px-3" type="button" onClick={() => choose(todayIso)}>امروز</button>
            <button className="secondary-button min-h-9 px-3" type="button" onClick={() => choose(toIsoDate(addDays(new Date(), 1)))}>فردا</button>
            {value && <button className="ghost-button min-h-9 px-3" type="button" onClick={() => choose('')}>بدون تاریخ</button>}
          </div>
        </div>
      )}
    </div>
  )
}

import { addDays } from 'date-fns-jalali'
import { CalendarDays, ChevronDown } from './icons'
import { useEffect, useId, useRef, useState } from 'react'
import { formatLocalDate, toIsoDate } from '../lib/date'
import { Calendar } from './Calendar'
import { LabelText } from './FormUi'

/**
 * Jalali date picker. The value in and out is the ISO Gregorian `yyyy-MM-dd`
 * string the API uses (empty string = no date); only the presentation is
 * Jalali. The calendar expands inline under the field instead of floating,
 * so it is never clipped inside a scrolling sheet.
 */
export function DateField({ label, value, onChange, error, hint, defaultOpen = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  /** Opens with the calendar showing, when the field was asked for to pick a day. */
  defaultOpen?: boolean
}) {
  const id = useId()
  const panelId = `${id}-panel`
  const errorId = error ? `${id}-error` : undefined
  const [open, setOpen] = useState(defaultOpen)
  const todayIso = toIsoDate(new Date())
  const calendar = useRef<HTMLDivElement>(null)

  // Inside a scrolling sheet the calendar can open below the fold; bring it into view.
  useEffect(() => {
    if (open) calendar.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [open])

  function toggle() {
    setOpen(current => !current)
  }

  function choose(iso: string) {
    onChange(iso)
    setOpen(false)
  }

  return (
    <div>
      <label className="field-label" htmlFor={id}><LabelText>{label}</LabelText></label>
      <button
        id={id}
        className="field-input flex items-center gap-3 text-start"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onClick={toggle}
      >
        <CalendarDays size={20} className={`shrink-0 ${value ? 'text-accent' : 'text-text-tertiary'}`} aria-hidden="true" />
        <span className={`min-w-0 flex-1 truncate ${value ? '' : 'text-text-tertiary'}`}>{value ? formatLocalDate(value) : 'انتخاب تاریخ'}</span>
        <ChevronDown size={20} className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
      {hint && <span className="field-hint">{hint}</span>}

      {open && (
        <div className="mt-2 scroll-mb-24 animate-pop-in rounded-2xl border border-border-subtle bg-surface p-3 shadow-md" id={panelId} ref={calendar}>
          <Calendar value={value} today={todayIso} onChange={choose} />
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
            <button className="choice-chip min-h-9 px-3" type="button" onClick={() => choose(todayIso)}>امروز</button>
            <button className="choice-chip min-h-9 px-3" type="button" onClick={() => choose(toIsoDate(addDays(new Date(), 1)))}>فردا</button>
            {value && <button className="ghost-button min-h-9 px-3" type="button" onClick={() => choose('')}>بدون تاریخ</button>}
          </div>
        </div>
      )}
    </div>
  )
}

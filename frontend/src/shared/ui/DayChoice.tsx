import { addDays } from 'date-fns-jalali'
import { CalendarDays } from './icons'
import { useId, useState } from 'react'
import { parseIsoDate, toIsoDate } from '../lib/date'
import { Calendar } from './Calendar'

const dayMonth = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * When something is for, as one-press choices: today, tomorrow, a day picked
 * on the calendar or, where allowed, no date. The value is an ISO date or ''.
 */
export function DayChoice({ label, value, today, allowNone = true, onChange, error }: {
  label: string
  value: string
  today: string
  allowNone?: boolean
  onChange: (value: string) => void
  error?: string
}) {
  const id = useId()
  const tomorrow = toIsoDate(addDays(parseIsoDate(today), 1))
  const custom = Boolean(value) && value !== today && value !== tomorrow
  const [picking, setPicking] = useState(false)
  const chip = (pressed: boolean, text: React.ReactNode, onClick: () => void) => (
    <button className="choice-chip" type="button" aria-pressed={pressed} onClick={onClick}>{text}</button>
  )
  return (
    <div>
      <span className="field-label flex items-center gap-1.5" id={id}>
        <CalendarDays size={16} className="text-text-secondary" aria-hidden="true" />
        {label}
      </span>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here. */}
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {chip(value === today, 'امروز', () => { setPicking(false); onChange(today) })}
        {chip(value === tomorrow, 'فردا', () => { setPicking(false); onChange(tomorrow) })}
        {chip(custom || picking, custom ? dayMonth.format(parseIsoDate(value)) : 'انتخاب روز…', () => setPicking(current => !current))}
        {allowNone && chip(!value, 'بدون تاریخ', () => { setPicking(false); onChange('') })}
      </div>
      {error && <span className="field-error" role="alert">{error}</span>}
      {picking && (
        <div className="mt-2 animate-pop-in rounded-2xl border border-border-subtle bg-surface p-3 shadow-md">
          <Calendar value={value} today={today} onChange={day => { onChange(day); setPicking(false) }} />
        </div>
      )}
    </div>
  )
}

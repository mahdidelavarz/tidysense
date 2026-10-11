import { addDays } from 'date-fns-jalali'
import { useEffect, useRef } from 'react'
import { parseIsoDate, toIsoDate } from '../../../shared/lib/date'

const dayNumber = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })
const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' })
const fullDate = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })

/** How many days the strip offers, starting with today. */
const span = 10

/**
 * The days ahead as a row of tiles, today first. Today is what the page is
 * for; a later day shows what is already planned for it.
 */
export function DayStrip({ today, selected, onSelect }: {
  today: string
  selected: string
  onSelect: (date: string) => void
}) {
  const current = useRef<HTMLButtonElement>(null)
  const start = parseIsoDate(today)
  const days = Array.from({ length: span }, (_, index) => addDays(start, index))

  // On a phone the row scrolls sideways; keep the chosen day in view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the chosen day changes.
  useEffect(() => {
    current.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  }, [selected])

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here.
    <div className="day-strip" role="group" aria-label="انتخاب روز">
      {days.map(day => {
        const iso = toIsoDate(day)
        const isSelected = iso === selected
        return (
          <button
            key={iso}
            ref={isSelected ? current : undefined}
            className="day-tile"
            type="button"
            aria-pressed={isSelected}
            aria-label={iso === today ? `امروز، ${fullDate.format(day)}` : fullDate.format(day)}
            data-today={iso === today}
            onClick={() => onSelect(iso)}
          >
            <span className="text-lg font-extrabold leading-6">{dayNumber.format(day)}</span>
            <span className="text-[0.6875rem] leading-4">{iso === today ? 'امروز' : weekday.format(day)}</span>
          </button>
        )
      })}
    </div>
  )
}

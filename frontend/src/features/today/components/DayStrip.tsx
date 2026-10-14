import { addDays } from 'date-fns-jalali'
import { parseIsoDate, toIsoDate } from '../../../shared/lib/date'

const dayNumber = new Intl.DateTimeFormat('fa-IR', { day: 'numeric' })
const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' })
const fullDate = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })

/** How many days can be chosen, starting with today. */
const span = 10
/** Days before today shown as context only. */
const before = 3

/** Where a tile sits by its distance from the chosen day: offset (px), scale and opacity. */
const offsets = [0, 56, 106, 148, 187, 225]
function place(distance: number) {
  const step = Math.abs(distance)
  const x = (offsets[step] ?? 225 + (step - 5) * 38) * Math.sign(distance)
  return {
    // Later days lie to the left, as Persian reads.
    x: -x,
    scale: [1, 0.87, 0.74, 0.61][step] ?? 0.6,
    opacity: [1, 0.8, 0.6, 0.4, 0.25][step] ?? 0,
  }
}

/**
 * The days as a wheel with the chosen day in the middle: today, and the
 * days ahead that show what is already planned for them. The days just
 * before today are there for context and cannot be chosen; earlier work is
 * Reconcile's.
 */
export function DayStrip({ today, selected, onSelect }: {
  today: string
  selected: string
  onSelect: (date: string) => void
}) {
  const start = parseIsoDate(today)
  const chosen = Math.round((parseIsoDate(selected).getTime() - start.getTime()) / 86_400_000)
  const days = Array.from({ length: before + span }, (_, index) => index - before)

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here.
    <div className="day-wheel" role="group" aria-label="انتخاب روز">
      {days.map(offset => {
        const day = addDays(start, offset)
        const iso = toIsoDate(day)
        const { x, scale, opacity } = place(offset - chosen)
        const style = { '--x': `${x}px`, '--s': scale, '--o': opacity, zIndex: 10 - Math.abs(offset - chosen) } as React.CSSProperties
        const face = (
          <>
            <span className="text-[1.1875rem] font-extrabold leading-[1.375rem]">{dayNumber.format(day)}</span>
            <span className="text-[0.65625rem] font-semibold leading-3.5 whitespace-nowrap opacity-90">{offset === 0 ? 'امروز' : weekday.format(day)}</span>
            <span className="day-tile-dot" aria-hidden="true" />
          </>
        )
        if (offset < 0) {
          return <span key={iso} className="day-tile" data-past="true" style={style} aria-hidden="true">{face}</span>
        }
        const hidden = opacity === 0
        return (
          <button
            key={iso}
            className="day-tile"
            type="button"
            style={style}
            aria-pressed={iso === selected}
            aria-label={offset === 0 ? `امروز، ${fullDate.format(day)}` : fullDate.format(day)}
            // Days faded out of the wheel are out of reach until a nearer day is chosen.
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : undefined}
            data-today={offset === 0}
            onClick={() => onSelect(iso)}
          >
            {face}
          </button>
        )
      })}
    </div>
  )
}

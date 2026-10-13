import { type ReactNode, useEffect, useState } from 'react'
import type { RoutineOccurrenceDto } from '../../routines/types/routine.types'

type Phase = 'dawn' | 'day' | 'dusk' | 'night'

const phaseLabel: Record<Phase, string> = { dawn: 'صبح', day: 'روز', dusk: 'غروب', night: 'شب' }

/** The sun's path: an arc across the sky from sunrise (05:00) to sunset (19:30), the moon's from then to dawn. */
const sunrise = 5
const sunset = 19.5

function phaseAt(hour: number): Phase {
  if (hour >= sunrise && hour < 9.5) return 'dawn'
  if (hour >= 9.5 && hour < 16) return 'day'
  if (hour >= 16 && hour < sunset) return 'dusk'
  return 'night'
}

/** Where on the arc a fraction of the day (0 = rising, 1 = setting) falls. Rising is on the right, as Persian reads. */
function arcPoint(fraction: number) {
  const angle = Math.PI * Math.min(Math.max(fraction, 0), 1)
  return { x: Math.round(195 + 160 * Math.cos(angle)), y: Math.round(150 - 96 * Math.sin(angle)) }
}

function hoursOf(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

/** The browser's clock, refreshed each minute. The pilot runs in one time zone, so it is also the user's. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

/**
 * Collapsed while the reader scrolls down past the sky; open again as soon as
 * they scroll up or reach the top.
 */
function useCollapsed(threshold = 120) {
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (y < threshold) setCollapsed(false)
        else if (y > last + 4) setCollapsed(true)
        else if (y < last - 4) setCollapsed(false)
        last = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [threshold])
  return collapsed
}

/**
 * The top of Today: the day's sky. Its colours follow the time of day (and
 * the theme), the sun or moon sits where it is on its path, and today's timed
 * Routines are marked on that path by their hour. It holds the page title,
 * the date line and the page's action, collapses to a band on scroll down
 * and opens again on scroll up.
 */
export function SkyHeader({ dateLine, start, action, routines }: {
  dateLine: ReactNode
  /** The menu button (below desktop). */
  start?: ReactNode
  action?: ReactNode
  routines: RoutineOccurrenceDto[]
}) {
  const now = useNow()
  const collapsed = useCollapsed()
  const hour = now.getHours() + now.getMinutes() / 60
  const phase = phaseAt(hour)
  const fraction = phase === 'night'
    ? ((hour < sunrise ? hour + 24 : hour) - sunset) / (24 - sunset + sunrise)
    : (hour - sunrise) / (sunset - sunrise)
  const body = arcPoint(fraction)
  const timed = routines.filter(occurrence => occurrence.scheduledLocalTime)
  const label = `آسمان امروز: الان ${phaseLabel[phase]} است${timed.length > 0 ? `؛ ${new Intl.NumberFormat('fa-IR').format(timed.length)} نوبت روتین روی مسیر خورشید` : ''}.`

  return (
    <header className="sky" data-phase={phase} data-collapsed={collapsed}>
      <div className="sky-inner">
        <div className="sky-top">
          <div className="flex min-w-0 items-center gap-3">
            {start}
            <div className="min-w-0">
              <p className="sky-date">{dateLine}</p>
              <h1 className="sky-title">امروز</h1>
            </div>
          </div>
          {action}
        </div>
        <svg className="sky-path" viewBox="0 0 390 170" role="img" aria-label={label}>
          <defs>
            <radialGradient id="sky-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" className="sky-glow-stop" stopOpacity="0.95" />
              <stop offset="0.5" className="sky-glow-stop" stopOpacity="0.35" />
              <stop offset="1" className="sky-glow-stop" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="sky-stars">
            <circle cx="40" cy="30" r="1.2" />
            <circle cx="88" cy="62" r="0.9" />
            <circle cx="150" cy="22" r="1.1" />
            <circle cx="230" cy="48" r="0.8" />
            <circle cx="300" cy="18" r="1.3" />
            <circle cx="352" cy="70" r="0.9" />
            <circle cx="262" cy="96" r="0.7" />
            <circle cx="118" cy="104" r="0.8" />
          </g>
          <path className="sky-arc" d="M355 150 A160 96 0 0 0 35 150" />
          <circle className="sky-halo" cx={body.x} cy={body.y} r="58" fill="url(#sky-glow)" />
          <circle className="sky-body" cx={body.x} cy={body.y} r="13" />
          {phase === 'night' && <circle className="sky-crescent" cx={body.x - 6} cy={body.y - 4} r="11" />}
          {timed.map(occurrence => {
            const point = arcPoint((hoursOf(occurrence.scheduledLocalTime ?? '00:00') - sunrise) / (sunset - sunrise))
            return (
              <g key={occurrence.id} className="sky-marker" data-done={occurrence.status === 'DONE'}>
                <circle cx={point.x} cy={point.y} r="6.5" />
                <circle className="sky-marker-dot" cx={point.x} cy={point.y} r="2.2" />
              </g>
            )
          })}
        </svg>
        <svg className="sky-hills" viewBox="0 100 390 110" preserveAspectRatio="none" aria-hidden="true">
          <path className="sky-hill-1" d="M0 148 C50 124 92 138 134 131 S226 104 276 120 S354 140 390 124 V210 H0Z" />
          <path className="sky-hill-2" d="M0 170 C70 152 124 168 190 159 S292 140 344 152 S382 162 390 158 V210 H0Z" />
          <path className="sky-hill-3" d="M0 192 C92 180 172 194 252 186 S362 180 390 186 V210 H0Z" />
        </svg>
      </div>
    </header>
  )
}

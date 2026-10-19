import { CalendarClock, Flag } from '../../../shared/ui/icons'
import { formatNumber, parseIsoDate } from '../../../shared/lib/date'

const dayMonth = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' })
const daysBetween = (from: string, to: string) => Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000)

/**
 * «۶۰٪ · X از Y کار انجام شد» over a bar in the item's own colour. The share
 * counts Tasks only: dropped ones are left out and Routines are not progress
 * (owner decision 2026-10-19).
 */
export function ProgressBar({ done, total, large = false }: { done: number; total: number; large?: boolean }) {
  const share = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <p className={large ? 'flex items-baseline gap-1.5' : 'text-xs font-bold text-text-secondary'}>
        {large ? (
          <>
            <b className="entity-ink font-display text-[1.875rem] leading-none">{formatNumber(share)}٪</b>
            <span className="text-sm font-bold text-text-secondary">{formatNumber(done)} از {formatNumber(total)} کار انجام شد</span>
          </>
        ) : (
          <><b className="entity-ink">{formatNumber(share)}٪</b> · {formatNumber(done)} از {formatNumber(total)} کار انجام شد</>
        )}
      </p>
      <div
        className="progress-bar mt-2"
        role="progressbar"
        aria-label="کارهای انجام‌شده"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${formatNumber(share)}٪`}
        style={{ '--share': `${share}%` } as React.CSSProperties}
      />
    </div>
  )
}

/**
 * A target date in words: «تا ۳۰ اسفند», or how many days remain once it is
 * within two weeks (in the caution colour), or that there is none.
 */
export function TargetNote({ date, today }: { date?: string | null; today: string }) {
  if (!date) return <span className="timeline-meta"><Flag size={12} aria-hidden="true" />بدون تاریخ</span>
  const days = daysBetween(today, date)
  if (days >= 0 && days <= 14) {
    return (
      <span className="timeline-meta" data-tone="caution">
        <Flag size={12} aria-hidden="true" />
        {days === 0 ? 'تا امروز' : `${formatNumber(days)} روز مانده`}
      </span>
    )
  }
  return <span className="timeline-meta"><Flag size={12} aria-hidden="true" />تا {dayMonth.format(parseIsoDate(date))}</span>
}

/** When an item's next review is: «بازبینی ۲۰ دی», or that it is due. */
export function ReviewNote({ date, today }: { date: string; today: string }) {
  return (
    <span className="timeline-meta" data-tone={date <= today ? 'caution' : undefined}>
      <CalendarClock size={12} aria-hidden="true" />
      {date <= today ? 'زمان بازبینی رسیده' : `بازبینی ${dayMonth.format(parseIsoDate(date))}`}
    </span>
  )
}

/** The item due for attention soonest within a week (or overdue), for the glass card on the photograph. */
export function soonest<T>(items: T[], dateOf: (item: T) => string | null | undefined, today: string): { item: T; days: number } | null {
  let best: { item: T; days: number } | null = null
  for (const item of items) {
    const date = dateOf(item)
    if (!date) continue
    const days = daysBetween(today, date)
    if (days > 7) continue
    if (!best || days < best.days) best = { item, days }
  }
  return best
}

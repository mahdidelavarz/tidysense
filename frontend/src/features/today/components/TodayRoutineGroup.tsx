import { Link } from '@tanstack/react-router'
import { Check, LoaderCircle, Repeat } from '../../../shared/ui/icons'
import { formatNumber, formatTime } from '../../../shared/lib/date'
import { RoutineWeekBars, weekProgress } from '../../routines/components/RoutineWeekBars'
import { recurrenceLabel } from '../../routines/types/routine.format'
import type { RoutineOccurrenceDto, RoutineWeekDto } from '../../routines/types/routine.types'

/**
 * One Routine in Today's timeline: its schedule, this week so far, and a pill
 * per slot today. A pending slot is completed with one press, and a done one
 * pressed again undoes it; a missed one can be corrected if it was actually done. A missed slot is a neutral fact, not a
 * debt, so it is never carried. The card opens the Routine.
 */
export function TodayRoutineGroup({ occurrences, week, today, busyId, onComplete, onUndo, onCorrect }: {
  occurrences: RoutineOccurrenceDto[]
  /** This week of the Routine; absent once it is stopped (today's slots still stand). */
  week?: RoutineWeekDto
  today: string
  busyId?: string
  onComplete: (occurrence: RoutineOccurrenceDto) => void
  onUndo: (occurrence: RoutineOccurrenceDto) => void
  onCorrect: (occurrence: RoutineOccurrenceDto) => void
}) {
  const [first] = occurrences
  const progress = week && weekProgress(week)
  return (
    <li className="timeline-row">
      <div className="timeline-node">
        <span className="timeline-mark">
          <span className="ring-routine" aria-hidden="true"><Repeat size={16} /></span>
        </span>
      </div>
      <div className="timeline-card">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="timeline-title">
            <Link className="stretched-link" to="/routines/$routineId" params={{ routineId: first.routineId }}>{first.routineTitle}</Link>
          </h3>
          {progress && progress.scheduled > 0 && (
            <span className="entity-routine entity-ink shrink-0 text-[0.8125rem] font-extrabold">
              {formatNumber(progress.complete)}
              <span className="text-[0.65625rem] font-semibold text-text-secondary"> از {formatNumber(progress.scheduled)} این هفته</span>
            </span>
          )}
        </div>
        {week && (
          <p className="mt-0.5 text-[0.71875rem] font-semibold text-text-secondary">
            {recurrenceLabel(week.recurrence)}، {formatNumber(Number(week.slotsPerDay))} نوبت
          </p>
        )}
        {week && <RoutineWeekBars week={week} today={today} />}
        <ul className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {occurrences.map(occurrence => {
            const slot = occurrence.scheduledLocalTime ? formatTime(occurrence.scheduledLocalTime) : 'امروز'
            const time = <bdi dir={occurrence.scheduledLocalTime ? 'ltr' : undefined}>{slot}</bdi>
            const busy = busyId === occurrence.id
            return (
              <li key={occurrence.id} className="flex items-center gap-1">
                {occurrence.status === 'PENDING' ? (
                  <button
                    className="slot-pill"
                    type="button"
                    aria-label={`انجام شد: ${first.routineTitle}، ${slot}`}
                    disabled={busy}
                    onClick={() => onComplete(occurrence)}
                  >
                    {busy
                      ? <LoaderCircle size={20} className="animate-spin text-entity-routine" aria-hidden="true" />
                      : <span className="slot-ring" aria-hidden="true" />}
                    {time}
                  </button>
                ) : occurrence.status === 'DONE' ? (
                  <button
                    className="slot-pill"
                    type="button"
                    data-status="DONE"
                    aria-label={`لغو انجام: ${first.routineTitle}، ${slot}`}
                    disabled={busy}
                    onClick={() => onUndo(occurrence)}
                  >
                    {busy
                      ? <LoaderCircle size={20} className="animate-spin text-entity-routine" aria-hidden="true" />
                      : <span className="slot-done" aria-hidden="true"><Check size={13} /></span>}
                    {time}
                  </button>
                ) : (
                  <span className="slot-pill" data-status={occurrence.status}>
                    {occurrence.status === 'DONE'
                      ? <span className="slot-done" aria-hidden="true"><Check size={13} /></span>
                      : <span className="slot-missed" aria-hidden="true" />}
                    {time}
                    <span className="sr-only">{occurrence.status === 'DONE' ? '، انجام شد' : '، انجام نشد'}</span>
                  </span>
                )}
                {occurrence.status === 'MISSED' && (
                  <button className="text-link relative z-1 min-h-9 px-1.5 text-xs" type="button" disabled={busy} onClick={() => onCorrect(occurrence)}>
                    انجام داده بودم
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </li>
  )
}

import { Link } from '@tanstack/react-router'
import { Clock, Repeat } from '../../../shared/ui/icons'
import { formatNumber, formatTime } from '../../../shared/lib/date'
import { StatusBadge } from '../../../shared/ui/EntityUi'
import { TaskParent } from '../../tasks/components/TaskFacts'
import { recurrenceLabel, slotsLabel } from '../types/routine.format'
import type { RoutineDto, RoutineOccurrenceDto, RoutineWeekDto } from '../types/routine.types'
import { RoutineWeekBars, weekProgress } from './RoutineWeekBars'

/**
 * One Routine in the Routines list; the card opens it. Its schedule in
 * words, this week as bars, where it belongs and, when it has slots today,
 * the next one still open.
 */
export function RoutineCard({ routine, parentTitle, week, today, slots }: {
  routine: RoutineDto
  /** Title of the Goal or Project the Routine belongs to, when it is known. */
  parentTitle?: string
  week?: RoutineWeekDto
  today: string
  /** Its occurrences today, if any. */
  slots: RoutineOccurrenceDto[]
}) {
  const closed = routine.status !== 'ACTIVE'
  const progress = week && weekProgress(week)
  const next = slots.find(slot => slot.status === 'PENDING')
  return (
    <article className="timeline-card entity-routine p-3.5" data-state={closed ? 'done' : undefined}>
      <div className="flex items-start gap-3">
        <span className="entity-icon size-11 rounded-[0.875rem]" aria-hidden="true"><Repeat size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="timeline-title text-base">
              <Link className="stretched-link" to="/routines/$routineId" params={{ routineId: routine.id }}>{routine.title}</Link>
            </h3>
            {progress && progress.scheduled > 0 && (
              <span className="entity-ink shrink-0 text-[0.8125rem] font-extrabold">
                {formatNumber(progress.complete)}
                <span className="text-[0.6875rem] font-semibold text-text-secondary"> از {formatNumber(progress.scheduled)}</span>
                <span className="sr-only"> روز کامل این هفته</span>
              </span>
            )}
            {closed && <StatusBadge status={routine.status} />}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-text-secondary">
            {recurrenceLabel(routine.recurrence)}، {routine.timesOfDay.length > 0 ? slotsLabel(routine.timesOfDay) : 'بدون ساعت'}
          </p>
        </div>
      </div>
      {week && !closed && <RoutineWeekBars week={week} today={today} everyDay />}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <TaskParent task={routine} parentTitle={parentTitle} />
        {next ? (
          <span className="entity-chip shrink-0">
            <Clock size={13} aria-hidden="true" />
            {next.scheduledLocalTime ? <>بعدی <bdi dir="ltr">{formatTime(next.scheduledLocalTime)}</bdi></> : 'امروز'}
          </span>
        ) : slots.length > 0 && slots.every(slot => slot.status !== 'PENDING') ? (
          <span className="text-xs font-bold text-text-secondary">امروز تمام شد</span>
        ) : null}
      </div>
    </article>
  )
}

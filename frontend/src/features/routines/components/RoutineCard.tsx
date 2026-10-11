import { Link } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, CircleDashed, Clock, FolderKanban, Target } from 'lucide-react'
import { formatTime } from '../../../shared/lib/date'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import { recurrenceLabel, weekdayOptions } from '../types/routine.format'
import type { RoutineDto } from '../types/routine.types'

/**
 * One Routine row in the Routines list. The whole row opens the Routine.
 * Its week is drawn as seven dots, so the rhythm reads without the words.
 */
export function RoutineCard({ routine, parentTitle }: {
  routine: RoutineDto
  /** Title of the Goal or Project the Routine belongs to, when it is known. */
  parentTitle?: string
}) {
  const ParentIcon = routine.projectId ? FolderKanban : routine.goalId ? Target : CircleDashed
  const parentKind = routine.projectId ? 'پروژه' : routine.goalId ? 'هدف' : 'مستقل'
  const monthly = routine.recurrence.type === 'MONTHLY_ON_DAY'
  const weekdays = (routine.recurrence.daysOfWeek ?? []).map(Number)
  const closed = routine.status !== 'ACTIVE'
  return (
    <Link className="list-row" to="/routines/$routineId" params={{ routineId: routine.id }}>
      <EntityIcon entity="routine" />
      <div className="min-w-0 flex-1">
        <h2 className={`truncate font-bold leading-7 ${closed ? 'text-text-secondary' : ''}`}>{routine.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {monthly ? (
            <span className="meta-chip">
              <CalendarDays size={13} className="shrink-0" aria-hidden="true" />
              {recurrenceLabel(routine.recurrence)}
            </span>
          ) : (
            <>
              <span className="sr-only">{recurrenceLabel(routine.recurrence)}</span>
              <span className="flex gap-1" aria-hidden="true">
                {weekdayOptions.map(day => (
                  <span
                    key={day.value}
                    className="week-dot"
                    data-on={!closed && (routine.recurrence.type === 'DAILY' || weekdays.includes(day.value))}
                  >
                    {day.label.charAt(0)}
                  </span>
                ))}
              </span>
            </>
          )}
          {routine.timesOfDay.length > 0 && (
            <span className="meta-chip">
              <Clock size={13} className="shrink-0" aria-hidden="true" />
              {/* Each time is its own left-to-right run, so a list of them keeps its order in RTL. */}
              {routine.timesOfDay.map((time, index) => (
                <span key={time}>
                  {index > 0 && '، '}
                  <bdi dir="ltr">{formatTime(time)}</bdi>
                </span>
              ))}
            </span>
          )}
          <span className="meta-chip">
            <ParentIcon size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{parentTitle ? `${parentKind}: ${parentTitle}` : parentKind}</span>
          </span>
          {closed && <StatusBadge status={routine.status} />}
        </div>
      </div>
      <ChevronLeft size={20} className="shrink-0 text-text-tertiary" aria-hidden="true" />
    </Link>
  )
}

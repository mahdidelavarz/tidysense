import { Link } from '@tanstack/react-router'
import { Check, Eye, LoaderCircle, Repeat } from '../../../shared/ui/icons'
import { formatTime } from '../../../shared/lib/date'
import { StatusBadge } from '../../../shared/ui/EntityUi'
import type { RoutineOccurrenceDto } from '../../routines/types/routine.types'
import { TodayCard } from './TodayCard'

/**
 * One Routine in Today with a row per slot. Each slot keeps its own state:
 * pending can be marked done, missed can be corrected if it was actually
 * done. A missed slot is a neutral fact, not a debt, so it is never carried.
 */
export function TodayRoutineGroup({ occurrences, busyId, onComplete, onCorrect }: {
  occurrences: RoutineOccurrenceDto[]
  busyId?: string
  onComplete: (occurrence: RoutineOccurrenceDto) => void
  onCorrect: (occurrence: RoutineOccurrenceDto) => void
}) {
  const [first] = occurrences
  return (
    <TodayCard
      tone="routine"
      label={first.routineTitle}
      actionCount={1}
      actions={(
        <Link className="today-action" to="/routines/$routineId" params={{ routineId: first.routineId }} aria-label={`جزئیات: ${first.routineTitle}`}>
          <Eye size={20} aria-hidden="true" />
          جزئیات
        </Link>
      )}
    >
      <span className="routine-tile mt-0.5" aria-hidden="true">
        <Repeat size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="wrap-break-word text-[0.96875rem] font-semibold leading-7">{first.routineTitle}</h3>
        <p className="today-badge">روتین</p>
        <ul className="mt-3 space-y-2">
          {occurrences.map(occurrence => {
            const slot = occurrence.scheduledLocalTime ? formatTime(occurrence.scheduledLocalTime) : 'امروز'
            const busy = busyId === occurrence.id
            return (
              <li key={occurrence.id} className="flex min-h-11 items-center gap-3">
                {occurrence.status === 'PENDING' ? (
                  <button
                    className="check-button"
                    type="button"
                    aria-label={`انجام شد: ${first.routineTitle}، ${slot}`}
                    disabled={busy}
                    onClick={() => onComplete(occurrence)}
                  >
                    {busy
                      ? <LoaderCircle size={20} className="animate-spin text-text-secondary" aria-hidden="true" />
                      : <Check size={16} aria-hidden="true" />}
                  </button>
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden="true">
                    {occurrence.status === 'DONE'
                      ? <span className="check-done"><Check size={16} /></span>
                      : <span className="size-7 rounded-full border-2 border-dashed border-border" />}
                  </span>
                )}
                <bdi className="font-bold" dir={occurrence.scheduledLocalTime ? 'ltr' : undefined}>{slot}</bdi>
                {occurrence.status !== 'PENDING' && <StatusBadge status={occurrence.status} />}
                {occurrence.status === 'MISSED' && (
                  <button className="ghost-button ms-auto min-h-9 px-2.5" type="button" disabled={busy} onClick={() => onCorrect(occurrence)}>
                    انجام داده بودم
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </TodayCard>
  )
}

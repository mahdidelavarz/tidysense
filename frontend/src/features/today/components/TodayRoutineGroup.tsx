import { Link } from '@tanstack/react-router'
import { Check, ChevronLeft, LoaderCircle } from 'lucide-react'
import { formatTime } from '../../../shared/lib/date'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import type { RoutineOccurrenceDto } from '../../routines/types/routine.types'

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
    <article className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <EntityIcon entity="routine" />
        <h3 className="min-w-0 flex-1 wrap-break-word font-bold leading-7">{first.routineTitle}</h3>
        <Link className="icon-button -me-2" to="/routines/$routineId" params={{ routineId: first.routineId }} aria-label={`جزئیات: ${first.routineTitle}`}>
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-border-subtle">
        {occurrences.map(occurrence => {
          const slot = occurrence.scheduledLocalTime ? formatTime(occurrence.scheduledLocalTime) : 'امروز'
          const busy = busyId === occurrence.id
          return (
            <li key={occurrence.id} className="flex min-h-14 items-center gap-3 py-2">
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
                    : <Check size={20} strokeWidth={3} aria-hidden="true" />}
                </button>
              ) : (
                <span className="flex size-11 shrink-0 items-center justify-center" aria-hidden="true">
                  {occurrence.status === 'DONE' && <Check size={20} strokeWidth={3} className="text-positive" />}
                </span>
              )}
              <bdi className="min-w-0 flex-1 font-bold" dir={occurrence.scheduledLocalTime ? 'ltr' : undefined}>{slot}</bdi>
              {occurrence.status !== 'PENDING' && <StatusBadge status={occurrence.status} />}
              {occurrence.status === 'MISSED' && (
                <button className="ghost-button" type="button" disabled={busy} onClick={() => onCorrect(occurrence)}>
                  انجام داده بودم
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </article>
  )
}

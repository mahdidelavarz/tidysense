import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import { recurrenceLabel, routineOwnerLabel, slotsLabel } from '../types/routine.format'
import type { RoutineDto } from '../types/routine.types'

/** One Routine row in the Routines list. The whole row opens the Routine. */
export function RoutineCard({ routine }: { routine: RoutineDto }) {
  return (
    <Link className="row-link" to="/routines/$routineId" params={{ routineId: routine.id }}>
      <EntityIcon entity="routine" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-bold leading-7">{routine.title}</h2>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-text-secondary">
          <span>{routineOwnerLabel(routine)}</span>
          <span>{recurrenceLabel(routine.recurrence)}</span>
          <span>{slotsLabel(routine.timesOfDay)}</span>
        </p>
      </div>
      {routine.status !== 'ACTIVE' && <StatusBadge status={routine.status} />}
      <ChevronLeft size={20} className="shrink-0 text-text-tertiary" aria-hidden="true" />
    </Link>
  )
}

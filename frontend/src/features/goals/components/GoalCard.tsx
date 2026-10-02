import { Link } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'
import { formatLocalDate } from '../../../shared/lib/date'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import type { GoalDto } from '../types/goal.types'

/** One Goal in the Goals list. The whole card opens the Goal. */
export function GoalCard({ goal }: { goal: GoalDto }) {
  return (
    <Link className="card-link" to="/goals/$goalId" params={{ goalId: goal.id }}>
      <div className="flex items-start gap-3">
        <EntityIcon entity="goal" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-snug">{goal.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-7 text-text-secondary">{goal.desiredOutcome}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <p className="flex items-center gap-1.5 text-xs text-text-secondary">
          <CalendarClock size={14} aria-hidden="true" />
          بازبینی <time dateTime={goal.reviewDate}>{formatLocalDate(goal.reviewDate)}</time>
        </p>
        <StatusBadge status={goal.status} />
      </div>
    </Link>
  )
}

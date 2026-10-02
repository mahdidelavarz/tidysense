import { Link } from '@tanstack/react-router'
import { formatLocalDate } from '../../../shared/lib/date'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import type { GoalDto } from '../types/goal.types'

/** One Goal summary card in the Goals panel list. */
export function GoalCard({ goal }: { goal: GoalDto }) {
  return (
    <Link className="resource-card entity-goal h-full" to="/goals/$goalId" params={{ goalId: goal.id }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <EntityLabel entity="goal" />
          <h3 className="mt-2 truncate text-lg font-bold leading-snug">{goal.title}</h3>
        </div>
        <StatusBadge status={goal.status} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-7 text-text-secondary">{goal.desiredOutcome}</p>
      <p className="mt-5 border-t border-border-subtle pt-3 text-xs text-text-secondary">
        بازبینی <time dateTime={goal.reviewDate}>{formatLocalDate(goal.reviewDate)}</time>
      </p>
    </Link>
  )
}

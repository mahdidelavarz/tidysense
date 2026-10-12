import { Link } from '@tanstack/react-router'
import { CalendarClock, Flag, FolderKanban } from '../../../shared/ui/icons'
import { formatLocalDate, formatNumber } from '../../../shared/lib/date'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import type { GoalDto } from '../types/goal.types'

/** One Goal in the Goals list. The whole card opens the Goal. */
export function GoalCard({ goal, today, projectCount }: {
  goal: GoalDto
  /** Today's ISO local date, to tell when the review date has arrived. */
  today: string
  /** Active Projects under this Goal, when the lookup has arrived. */
  projectCount?: number
}) {
  const active = goal.status === 'ACTIVE'
  const reviewDue = active && goal.reviewDate <= today
  return (
    <Link className="entity-card entity-goal" data-closed={!active} to="/goals/$goalId" params={{ goalId: goal.id }}>
      <div className="flex items-start justify-between gap-3">
        <EntityIcon entity="goal" />
        <StatusBadge status={goal.status} />
      </div>
      <h2 className="mt-4 truncate text-lg font-bold leading-snug">{goal.title}</h2>
      <p className="mt-1 line-clamp-2 min-h-14 text-sm leading-7 text-text-secondary">{goal.desiredOutcome}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {goal.targetDate && (
          <span className="meta-chip">
            <Flag size={13} className="shrink-0" aria-hidden="true" />
            تا <time dateTime={goal.targetDate}>{formatLocalDate(goal.targetDate)}</time>
          </span>
        )}
        <span className={`meta-chip ${reviewDue ? 'bg-caution-tint text-caution' : ''}`}>
          <CalendarClock size={13} className="shrink-0" aria-hidden="true" />
          {reviewDue ? 'زمان بازبینی رسیده' : <>بازبینی <time dateTime={goal.reviewDate}>{formatLocalDate(goal.reviewDate)}</time></>}
        </span>
        {projectCount !== undefined && projectCount > 0 && (
          <span className="meta-chip">
            <FolderKanban size={13} className="shrink-0" aria-hidden="true" />
            {formatNumber(projectCount)} پروژه فعال
          </span>
        )}
      </div>
    </Link>
  )
}

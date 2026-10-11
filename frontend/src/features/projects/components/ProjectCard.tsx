import { Link } from '@tanstack/react-router'
import { CalendarClock, CircleDashed, Flag, Target } from 'lucide-react'
import { formatLocalDate } from '../../../shared/lib/date'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import type { ProjectDto } from '../types/project.types'

/** One Project in the Projects list. The whole card opens the Project. */
export function ProjectCard({ project, today, goalTitle }: {
  project: ProjectDto
  /** Today's ISO local date, to tell when the review date has arrived. */
  today: string
  /** Title of the Goal the Project sits under, when the lookup has arrived. */
  goalTitle?: string
}) {
  const active = project.status === 'ACTIVE'
  const reviewDue = active && project.reviewDate <= today
  const ParentIcon = project.goalId ? Target : CircleDashed
  return (
    <Link className="entity-card entity-project" data-closed={!active} to="/projects/$projectId" params={{ projectId: project.id }}>
      <div className="flex items-start justify-between gap-3">
        <EntityIcon entity="project" />
        <StatusBadge status={project.status} />
      </div>
      <h2 className="mt-4 truncate text-lg font-bold leading-snug">{project.title}</h2>
      <p className="mt-1 line-clamp-2 min-h-14 text-sm leading-7 text-text-secondary">
        {project.completionMeaning ?? 'معنای تکمیل هنوز نوشته نشده است.'}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="meta-chip">
          <ParentIcon size={13} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{project.goalId ? (goalTitle ? `هدف: ${goalTitle}` : 'زیر یک هدف') : 'مستقل'}</span>
        </span>
        {project.targetDate && (
          <span className="meta-chip">
            <Flag size={13} className="shrink-0" aria-hidden="true" />
            تا <time dateTime={project.targetDate}>{formatLocalDate(project.targetDate)}</time>
          </span>
        )}
        <span className={`meta-chip ${reviewDue ? 'bg-caution-tint text-caution' : ''}`}>
          <CalendarClock size={13} className="shrink-0" aria-hidden="true" />
          {reviewDue ? 'زمان بازبینی رسیده' : <>بازبینی <time dateTime={project.reviewDate}>{formatLocalDate(project.reviewDate)}</time></>}
        </span>
      </div>
    </Link>
  )
}

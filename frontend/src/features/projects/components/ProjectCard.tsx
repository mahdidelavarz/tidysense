import { Link } from '@tanstack/react-router'
import { CalendarClock } from 'lucide-react'
import { formatLocalDate } from '../../../shared/lib/date'
import { EntityIcon, StatusBadge } from '../../../shared/ui/EntityUi'
import type { ProjectDto } from '../types/project.types'

/** One Project in the Projects list. The whole card opens the Project. */
export function ProjectCard({ project }: { project: ProjectDto }) {
  return (
    <Link className="card-link" to="/projects/$projectId" params={{ projectId: project.id }}>
      <div className="flex items-start gap-3">
        <EntityIcon entity="project" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-snug">{project.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-7 text-text-secondary">
            {project.completionMeaning ?? (project.goalId ? 'زیر یک هدف' : 'پروژه مستقل')}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <p className="flex items-center gap-1.5 text-xs text-text-secondary">
          <CalendarClock size={14} aria-hidden="true" />
          بازبینی <time dateTime={project.reviewDate}>{formatLocalDate(project.reviewDate)}</time>
        </p>
        <StatusBadge status={project.status} />
      </div>
    </Link>
  )
}

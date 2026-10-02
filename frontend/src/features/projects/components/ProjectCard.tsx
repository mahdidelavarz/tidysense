import { Link } from '@tanstack/react-router'
import { formatLocalDate } from '../../../shared/lib/date'
import { EntityLabel, StatusBadge } from '../../../shared/ui/EntityUi'
import type { ProjectDto } from '../types/project.types'

/** One Project summary card in the Projects panel list. */
export function ProjectCard({ project }: { project: ProjectDto }) {
  return (
    <Link className="resource-card entity-project h-full" to="/projects/$projectId" params={{ projectId: project.id }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <EntityLabel entity="project" />
          <h3 className="mt-2 truncate text-lg font-bold leading-snug">{project.title}</h3>
        </div>
        <StatusBadge status={project.status} />
      </div>
      {project.completionMeaning && <p className="mt-3 line-clamp-2 text-sm leading-7 text-text-secondary">{project.completionMeaning}</p>}
      <p className="mt-5 border-t border-border-subtle pt-3 text-xs text-text-secondary">
        بازبینی <time dateTime={project.reviewDate}>{formatLocalDate(project.reviewDate)}</time>
      </p>
    </Link>
  )
}

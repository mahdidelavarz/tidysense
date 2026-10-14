import { Link } from '@tanstack/react-router'
import { formatNumber } from '../../../shared/lib/date'
import { FolderKanban, Target } from '../../../shared/ui/icons'

/**
 * Goals and Projects are one place with two views: this switch on the
 * photograph moves between them, each with its count of active items.
 */
export function StructureSwitch({ current, goals, projects }: {
  current: 'goals' | 'projects'
  goals?: number
  projects?: number
}) {
  return (
    <nav className="structure-switch" aria-label="نمای هدف‌ها و پروژه‌ها">
      <Link className="structure-tab entity-goal" to="/goals" aria-current={current === 'goals' ? 'page' : undefined}>
        <Target size={17} aria-hidden="true" />
        هدف‌ها
        {goals !== undefined && <span className="count-pill">{formatNumber(goals)}</span>}
      </Link>
      <Link className="structure-tab entity-project" to="/projects" aria-current={current === 'projects' ? 'page' : undefined}>
        <FolderKanban size={17} aria-hidden="true" />
        پروژه‌ها
        {projects !== undefined && <span className="count-pill">{formatNumber(projects)}</span>}
      </Link>
    </nav>
  )
}

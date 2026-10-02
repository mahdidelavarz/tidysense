import type { UseFormRegisterReturn } from 'react-hook-form'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'

/**
 * Picks ownership: standalone, under a Goal, or under a Project. Task and
 * Routine share the same exclusive-parent rule, so the Routine form reuses it.
 */
export function TaskParentSelect({ goals, projects, currentGoalId, currentProjectId, standaloneLabel = 'کار مستقل', registration }: {
  goals: GoalDto[]
  projects: ProjectDto[]
  currentGoalId?: string | null
  currentProjectId?: string | null
  standaloneLabel?: string
  registration: UseFormRegisterReturn
}) {
  return (
    <label className="field-label">
      وابستگی
      <select className="field-input" {...registration}>
        <option value="none">{standaloneLabel}</option>
        {goals.filter(goal => goal.status === 'ACTIVE' || goal.id === currentGoalId).map(goal => (
          <option key={goal.id} value={`goal:${goal.id}`}>هدف: {goal.title}</option>
        ))}
        {projects.filter(project => project.status === 'ACTIVE' || project.id === currentProjectId).map(project => (
          <option key={project.id} value={`project:${project.id}`}>پروژه: {project.title}</option>
        ))}
      </select>
    </label>
  )
}

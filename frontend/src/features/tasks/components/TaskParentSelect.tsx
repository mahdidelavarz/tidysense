import { CircleDashed } from 'lucide-react'
import { EntityMark } from '../../../shared/ui/EntityUi'
import { SelectField, type SelectOption } from '../../../shared/ui/SelectField'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'

/**
 * Picks ownership: standalone, under a Goal, or under a Project. Task and
 * Routine share the same exclusive-parent rule, so the Routine form reuses it.
 * The value is `none`, `goal:<id>` or `project:<id>`.
 */
export function TaskParentSelect({ goals, projects, currentGoalId, currentProjectId, standaloneLabel = 'کار مستقل', value, onChange }: {
  goals: GoalDto[]
  projects: ProjectDto[]
  currentGoalId?: string | null
  currentProjectId?: string | null
  standaloneLabel?: string
  value: string
  onChange: (value: string) => void
}) {
  const options: SelectOption[] = [
    { value: 'none', label: standaloneLabel, icon: <CircleDashed size={20} className="shrink-0 text-text-tertiary" aria-hidden="true" /> },
    ...goals.filter(goal => goal.status === 'ACTIVE' || goal.id === currentGoalId).map(goal => (
      { value: `goal:${goal.id}`, label: goal.title, group: 'هدف‌ها', icon: <EntityMark entity="goal" /> }
    )),
    ...projects.filter(project => project.status === 'ACTIVE' || project.id === currentProjectId).map(project => (
      { value: `project:${project.id}`, label: project.title, group: 'پروژه‌ها', icon: <EntityMark entity="project" /> }
    )),
  ]
  return <SelectField label="وابستگی" value={value} options={options} onChange={onChange} searchPlaceholder="نام هدف یا پروژه…" />
}

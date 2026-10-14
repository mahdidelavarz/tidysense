import { CircleDashed, FolderKanban, Search, Target } from '../../../shared/ui/icons'
import { useId, useState } from 'react'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'
import { TaskParentSelect } from './TaskParentSelect'

/**
 * Who a new item belongs to, as one-press chips: the first active Projects
 * and Goals, the chosen one if it is further down, and standalone. The search
 * button opens the full list. The value is `none`, `goal:<id>` or `project:<id>`.
 */
export function ParentChoice({ goals, projects, value, onChange, standaloneLabel = 'مستقل' }: {
  goals: GoalDto[]
  projects: ProjectDto[]
  value: string
  onChange: (value: string) => void
  standaloneLabel?: string
}) {
  const id = useId()
  const [searching, setSearching] = useState(false)
  const all = [
    ...projects.filter(project => project.status === 'ACTIVE').map(project => ({ value: `project:${project.id}`, title: project.title, kind: 'project' as const })),
    ...goals.filter(goal => goal.status === 'ACTIVE').map(goal => ({ value: `goal:${goal.id}`, title: goal.title, kind: 'goal' as const })),
  ]
  const shown = all.slice(0, 2)
  const chosen = all.find(item => item.value === value)
  if (chosen && !shown.includes(chosen)) shown.unshift(chosen)
  return (
    <div>
      <span className="field-label" id={id}>برای کدام هدف یا پروژه؟</span>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add an unwanted visible legend/border here. */}
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {shown.map(item => {
          const Icon = item.kind === 'project' ? FolderKanban : Target
          return (
            <button
              key={item.value}
              className={`choice-chip entity-chip-choice entity-${item.kind} max-w-full`}
              type="button"
              aria-pressed={value === item.value}
              onClick={() => onChange(item.value)}
            >
              <Icon size={15} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{item.title}</span>
            </button>
          )
        })}
        <button className="choice-chip" type="button" aria-pressed={value === 'none'} onClick={() => onChange('none')}>
          <CircleDashed size={15} aria-hidden="true" />
          {standaloneLabel}
        </button>
        {all.length > shown.length && (
          <button
            className="choice-chip w-11 border-dashed px-0"
            type="button"
            aria-label="جست‌وجوی هدف یا پروژه"
            aria-expanded={searching}
            onClick={() => setSearching(current => !current)}
          >
            <Search size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {searching && (
        <div className="mt-3">
          <TaskParentSelect
            goals={goals}
            projects={projects}
            value={value}
            onChange={next => { onChange(next); setSearching(false) }}
          />
        </div>
      )}
    </div>
  )
}

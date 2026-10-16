import { SelectField } from '../../../shared/ui/SelectField'
import type { TaskDto } from '../types/task.types'
import { followCandidates } from './TaskSequenceSheet'

/**
 * Where a new Task sits: on its own, or «بعد از» an active Task of the same
 * owner, which it then waits for (029 §9.2). The choice is applied right after
 * the Task is made, through the same previewed change as on the Task page.
 */
export function TaskSequenceSelect({ tasks, parentScope, value, onChange }: {
  tasks: TaskDto[]
  parentScope: string
  value: string
  onChange: (value: string) => void
}) {
  const [scope, parentId] = parentScope.split(':')
  const owner = { id: '', goalId: scope === 'goal' ? parentId : null, projectId: scope === 'project' ? parentId : null }
  const options = [
    { value: 'none', label: 'مستقل، منتظر کاری نیست' },
    ...followCandidates(owner, tasks).map(task => ({ value: `after:${task.id}`, label: `بعد از «${task.title}»` })),
  ]
  return (
    <SelectField
      label="ترتیب انجام (اختیاری)"
      hint="کاری که بعد از کار دیگری می‌آید، تا انجام آن منتظر می‌ماند."
      value={value}
      options={options}
      onChange={onChange}
      searchPlaceholder="نام کار…"
    />
  )
}

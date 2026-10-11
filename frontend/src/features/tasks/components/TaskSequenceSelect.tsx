import { SelectField } from '../../../shared/ui/SelectField'
import type { TaskDto } from '../types/task.types'

/** Picks where a new Task sits in a same-scope dependency sequence, or starts/skips one. Create-only; an existing Task's sequence position is immutable here. */
export function TaskSequenceSelect({ tasks, parentScope, value, onChange }: {
  tasks: TaskDto[]
  parentScope: string
  value: string
  onChange: (value: string) => void
}) {
  const options = [
    { value: 'none', label: 'بدون ترتیب' },
    { value: 'new', label: 'شروع دنباله جدید' },
    ...sequenceChoices(tasks, parentScope).map(option => ({ value: option.value, label: `ادامه پس از «${option.label}»` })),
  ]
  return (
    <SelectField
      label="ترتیب انجام (اختیاری)"
      hint="کارهای بعدی تا تکمیل همه کارهای پیشین دنباله مسدود می‌مانند."
      value={value}
      options={options}
      onChange={onChange}
      searchPlaceholder="نام کار…"
    />
  )
}

/** For each same-scope sequence, finds its current last Task so a new one can continue after it. */
function sequenceChoices(tasks: TaskDto[], parentScope: string) {
  const [scope, parentId] = parentScope.split(':')
  const choices = new Map<string, { value: string; label: string; order: number }>()
  for (const task of tasks) {
    if (!task.sequenceId || task.sequenceOrder == null) continue
    const sameScope = scope === 'goal'
      ? task.goalId === parentId
      : scope === 'project'
        ? task.projectId === parentId
        : !task.goalId && !task.projectId
    if (!sameScope) continue
    const current = choices.get(task.sequenceId)
    const order = Number(task.sequenceOrder)
    if (!current || order > current.order) {
      choices.set(task.sequenceId, { value: `sequence:${task.sequenceId}:${order + 10}`, label: task.title, order })
    }
  }
  return [...choices.values()]
}

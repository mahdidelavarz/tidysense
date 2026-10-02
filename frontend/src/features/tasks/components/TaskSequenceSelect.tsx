import type { UseFormRegisterReturn } from 'react-hook-form'
import type { TaskDto } from '../types/task.types'

/** Picks where a new Task sits in a same-scope dependency sequence, or starts/skips one. Create-only; an existing Task's sequence position is immutable here. */
export function TaskSequenceSelect({ tasks, parentScope, registration }: {
  tasks: TaskDto[]
  parentScope: string
  registration: UseFormRegisterReturn
}) {
  const options = sequenceChoices(tasks, parentScope)
  return (
    <label className="field-label">
      ترتیب انجام (اختیاری)
      <span className="field-hint">کارهای بعدی تا تکمیل همه کارهای پیشین دنباله مسدود می‌مانند.</span>
      <select className="field-input" {...registration}>
        <option value="none">بدون ترتیب</option>
        <option value="new">شروع دنباله جدید</option>
        {options.map(option => <option key={option.value} value={option.value}>ادامه پس از «{option.label}»</option>)}
      </select>
    </label>
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

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { formatNumber } from '../../../shared/lib/date'
import { DateField } from '../../../shared/ui/DateField'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'
import { type TaskFields, taskFieldsSchema } from '../types/task.schema'
import type { CreateTaskRequest, TaskDto, UpdateTaskRequest } from '../types/task.types'
import { TaskParentSelect } from './TaskParentSelect'
import { TaskSequenceSelect } from './TaskSequenceSelect'

/**
 * Create/edit form for a Task, rendered as the body of a Sheet. Sequence
 * placement is offered only on create; an existing Task's position is
 * immutable here.
 */
export function TaskForm({ task, goals, projects, tasks = [], pending, error, onSubmit, onCancel }: {
  task?: TaskDto
  goals: GoalDto[]
  projects: ProjectDto[]
  tasks?: TaskDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateTaskRequest | UpdateTaskRequest) => void
  onCancel: () => void
}) {
  const form = useForm<TaskFields>({
    resolver: zodResolver(taskFieldsSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      parentScope: task?.goalId ? `goal:${task.goalId}` : task?.projectId ? `project:${task.projectId}` : 'none',
      plannedDate: task?.plannedDate ?? '',
      deadline: task?.deadline ?? '',
      sequenceChoice: 'none',
    },
  })
  const { errors } = form.formState
  const submit = form.handleSubmit(values => {
    const [scope, parentId] = values.parentScope.split(':')
    const sequence = task
      ? { sequenceId: task.sequenceId, sequenceOrder: task.sequenceOrder }
      : parseSequence(values.sequenceChoice)
    onSubmit({
      title: values.title,
      description: emptyToNull(values.description),
      goalId: scope === 'goal' ? parentId : null,
      projectId: scope === 'project' ? parentId : null,
      plannedDate: emptyToNull(values.plannedDate),
      deadline: emptyToNull(values.deadline),
      ...sequence,
      ...(task ? { expectedVersion: task.version } : {}),
    })
  })

  return (
    <form className="form-stack" onSubmit={submit} noValidate aria-busy={pending}>
      <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
      <FormField label="عنوان کار" name="title" required maxLength={200} registration={form.register('title')} error={errors.title?.message} />
      <FormField label="توضیحات (اختیاری)" name="description" multiline maxLength={2000} registration={form.register('description')} error={errors.description?.message} />
      <TaskParentSelect
        goals={goals}
        projects={projects}
        currentGoalId={task?.goalId}
        currentProjectId={task?.projectId}
        registration={form.register('parentScope')}
      />
      <div className="form-grid">
        <Controller
          control={form.control}
          name="plannedDate"
          render={({ field }) => <DateField label="تاریخ برنامه‌ریزی" value={field.value} onChange={field.onChange} error={errors.plannedDate?.message} />}
        />
        <Controller
          control={form.control}
          name="deadline"
          render={({ field }) => <DateField label="مهلت (اختیاری)" value={field.value} onChange={field.onChange} error={errors.deadline?.message} />}
        />
      </div>
      {!task && <TaskSequenceSelect tasks={tasks} parentScope={form.watch('parentScope')} registration={form.register('sequenceChoice')} />}
      {task?.sequenceId && task.sequenceOrder != null && (
        <p className="notice">جایگاه این کار در دنباله حفظ می‌شود (ترتیب {formatNumber(Number(task.sequenceOrder))}).</p>
      )}
      <FormError error={error} />
      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره…' : task ? 'ذخیره تغییرات' : 'ساخت کار'}
        </button>
      </div>
    </form>
  )
}

function parseSequence(value: string): Pick<CreateTaskRequest, 'sequenceId' | 'sequenceOrder'> {
  if (value === 'new') return { sequenceId: crypto.randomUUID(), sequenceOrder: 10 }
  if (value.startsWith('sequence:')) {
    const [, sequenceId, order] = value.split(':')
    return { sequenceId, sequenceOrder: Number(order) }
  }
  return { sequenceId: null, sequenceOrder: null }
}

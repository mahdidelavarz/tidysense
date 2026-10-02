import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'
import { type TaskFields, taskFieldsSchema } from '../types/task.schema'
import type { CreateTaskRequest, TaskDto, UpdateTaskRequest } from '../types/task.types'
import { TaskParentSelect } from './TaskParentSelect'
import { TaskSequenceSelect } from './TaskSequenceSelect'

/** Create/edit form for a Task. Sequence placement is offered only on create; an existing Task's position is immutable here. */
export function TaskForm({ task, goals, projects, tasks = [], pending, error, onSubmit }: {
  task?: TaskDto
  goals: GoalDto[]
  projects: ProjectDto[]
  tasks?: TaskDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateTaskRequest | UpdateTaskRequest) => void
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
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-task" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="task" />
        <h2 className="mt-2 text-xl font-bold">{task ? 'ویرایش کار' : 'ساخت کار'}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          کار مستقل به تاریخ برنامه‌ریزی نیاز دارد؛ کار وابسته به هدف یا پروژه می‌تواند بدون تاریخ بماند.
        </p>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان کار" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField label="توضیحات (اختیاری)" name="description" multiline maxLength={2000} registration={form.register('description')} error={form.formState.errors.description?.message} />
      <TaskParentSelect
        goals={goals}
        projects={projects}
        currentGoalId={task?.goalId}
        currentProjectId={task?.projectId}
        registration={form.register('parentScope')}
      />
      <div className="form-grid">
        <FormField label="تاریخ برنامه‌ریزی" name="plannedDate" type="date" registration={form.register('plannedDate')} error={form.formState.errors.plannedDate?.message} />
        <FormField label="مهلت (اختیاری)" name="deadline" type="date" registration={form.register('deadline')} error={form.formState.errors.deadline?.message} />
      </div>
      {!task && <TaskSequenceSelect tasks={tasks} parentScope={form.watch('parentScope')} registration={form.register('sequenceChoice')} />}
      {task?.sequenceId && (
        <p className="rounded-lg bg-surface-sunken p-3 text-sm text-text-secondary">
          جایگاه این کار در دنباله حفظ می‌شود. ترتیب: {task.sequenceOrder}
        </p>
      )}
      <FormError error={error} />
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending}>
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

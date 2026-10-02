import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { formatNumber } from '../../../shared/lib/date'
import { DateField } from '../../../shared/ui/DateField'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'
import { type TaskFields, taskCreateFieldsSchema, taskFieldsSchema } from '../types/task.schema'
import type { CreateTaskRequest, TaskDto, UpdateTaskRequest } from '../types/task.types'
import { TaskParentSelect } from './TaskParentSelect'
import { TaskSequenceSelect } from './TaskSequenceSelect'

/**
 * Create/edit form for a Task, rendered as the body of a Sheet. Sequence
 * placement is offered only on create; an existing Task's position is
 * immutable here. On create, a title with no date and no parent is not yet a
 * Task: it is handed to `onCapture` and saved as a quick capture.
 */
export function TaskForm({ task, goals, projects, tasks = [], pending, error, onSubmit, onCapture, onCancel }: {
  task?: TaskDto
  goals: GoalDto[]
  projects: ProjectDto[]
  tasks?: TaskDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateTaskRequest | UpdateTaskRequest) => void
  onCapture?: (title: string) => void
  onCancel: () => void
}) {
  const form = useForm<TaskFields>({
    resolver: zodResolver(onCapture && !task ? taskCreateFieldsSchema : taskFieldsSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      parentScope: task?.goalId ? `goal:${task.goalId}` : task?.projectId ? `project:${task.projectId}` : 'none',
      plannedDate: task?.plannedDate ?? '',
      deadline: task?.deadline ?? '',
      sequenceChoice: 'none',
      isProtected: task?.isProtected ?? false,
    },
  })
  const { errors } = form.formState
  const capturing = Boolean(onCapture) && !task && form.watch('parentScope') === 'none' && !form.watch('plannedDate')
  const submit = form.handleSubmit(values => {
    const [scope, parentId] = values.parentScope.split(':')
    if (onCapture && !task && scope === 'none' && !values.plannedDate) {
      onCapture(values.title)
      return
    }
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
      isProtected: values.isProtected,
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
      <label className="flex items-start gap-3 rounded-xl border border-border-subtle p-3.5">
        <input className="mt-1 size-5 shrink-0 accent-accent" type="checkbox" {...form.register('isProtected')} />
        <span>
          <span className="block text-sm font-bold text-text-primary">این کار محافظت شود</span>
          <span className="block text-xs leading-6 text-text-secondary">در بازبینی، کنار گذاشتن کار محافظت‌شده پیشنهاد نمی‌شود.</span>
        </span>
      </label>
      {capturing && (
        <p className="notice" role="status">
          بدون تاریخ و بدون هدف یا پروژه، این مورد هنوز یک کار نیست. فقط عنوانش به‌صورت یادداشت سریع ذخیره می‌شود و بعداً در «بازبینی» تعیین تکلیف می‌شود.
        </p>
      )}
      <FormError error={error} />
      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره…' : task ? 'ذخیره تغییرات' : capturing ? 'ذخیره یادداشت' : 'ساخت کار'}
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

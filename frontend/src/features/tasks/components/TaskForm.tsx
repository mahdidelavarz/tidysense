import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/services/goals-api'
import type { ProjectDto } from '../../projects/services/projects-api'
import type { CreateTaskRequest, TaskDto, UpdateTaskRequest } from '../services/tasks-api'

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاریخ واردشده معتبر نیست.').or(z.literal(''))

const taskFieldsSchema = z.object({
  title: z.string().trim().min(1, 'عنوان کار الزامی است.').max(200),
  description: z.string().trim().max(2000),
  parentScope: z.string(),
  plannedDate: dateField,
  deadline: dateField,
  sequenceChoice: z.string(),
}).superRefine((value, context) => {
  if (value.parentScope === 'none' && !value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['plannedDate'], message: 'کار مستقل باید تاریخ برنامه‌ریزی داشته باشد.' })
  }
  if (value.deadline && value.plannedDate && value.deadline < value.plannedDate) {
    context.addIssue({ code: 'custom', path: ['deadline'], message: 'مهلت نمی‌تواند پیش از تاریخ برنامه‌ریزی باشد.' })
  }
})

type TaskFields = z.infer<typeof taskFieldsSchema>

type TaskFormProps = {
  task?: TaskDto
  goals: GoalDto[]
  projects: ProjectDto[]
  tasks?: TaskDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateTaskRequest | UpdateTaskRequest) => void
}

export function TaskForm({ task, goals, projects, tasks = [], pending, error, onSubmit }: TaskFormProps) {
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
    const request = {
      title: values.title,
      description: nullable(values.description),
      goalId: scope === 'goal' ? parentId : null,
      projectId: scope === 'project' ? parentId : null,
      plannedDate: nullable(values.plannedDate),
      deadline: nullable(values.deadline),
      ...sequence,
      ...(task ? { expectedVersion: task.version } : {}),
    }
    onSubmit(request)
  })
  const errors = Object.values(form.formState.errors).map(value => value?.message)
  const sequenceOptions = sequenceChoices(tasks, form.watch('parentScope'))

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
      <FormField
        label="عنوان کار"
        name="title"
        required
        maxLength={200}
        registration={form.register('title')}
        error={form.formState.errors.title?.message}
      />
      <FormField
        label="توضیحات (اختیاری)"
        name="description"
        multiline
        maxLength={2000}
        registration={form.register('description')}
        error={form.formState.errors.description?.message}
      />
      <label className="field-label">
        وابستگی
        <select className="field-input" {...form.register('parentScope')}>
          <option value="none">کار مستقل</option>
          {goals.filter(goal => goal.status === 'ACTIVE' || goal.id === task?.goalId).map(goal => (
            <option key={goal.id} value={`goal:${goal.id}`}>هدف: {goal.title}</option>
          ))}
          {projects.filter(project => project.status === 'ACTIVE' || project.id === task?.projectId).map(project => (
            <option key={project.id} value={`project:${project.id}`}>پروژه: {project.title}</option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <FormField
          label="تاریخ برنامه‌ریزی"
          name="plannedDate"
          type="date"
          registration={form.register('plannedDate')}
          error={form.formState.errors.plannedDate?.message}
        />
        <FormField
          label="مهلت (اختیاری)"
          name="deadline"
          type="date"
          registration={form.register('deadline')}
          error={form.formState.errors.deadline?.message}
        />
      </div>
      {!task && (
        <label className="field-label">
          ترتیب انجام (اختیاری)
          <span className="field-hint">کارهای بعدی تا تکمیل همه کارهای پیشین دنباله مسدود می‌مانند.</span>
          <select className="field-input" {...form.register('sequenceChoice')}>
            <option value="none">بدون ترتیب</option>
            <option value="new">شروع دنباله جدید</option>
            {sequenceOptions.map(option => (
              <option key={option.value} value={option.value}>ادامه پس از «{option.label}»</option>
            ))}
          </select>
        </label>
      )}
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

function nullable(value: string) {
  return value || null
}

function parseSequence(value: string): Pick<CreateTaskRequest, 'sequenceId' | 'sequenceOrder'> {
  if (value === 'new') return { sequenceId: crypto.randomUUID(), sequenceOrder: 10 }
  if (value.startsWith('sequence:')) {
    const [, sequenceId, order] = value.split(':')
    return { sequenceId, sequenceOrder: Number(order) }
  }
  return { sequenceId: null, sequenceOrder: null }
}

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
      choices.set(task.sequenceId, {
        value: `sequence:${task.sequenceId}:${order + 10}`,
        label: task.title,
        order,
      })
    }
  }
  return [...choices.values()]
}

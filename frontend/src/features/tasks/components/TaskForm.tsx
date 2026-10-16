import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toApiError } from '../../../shared/api/http'
import { emptyToNull } from '../../../shared/lib/forms'
import { addDays } from 'date-fns-jalali'
import { formatNumber, parseIsoDate, toIsoDate } from '../../../shared/lib/date'
import { DateField } from '../../../shared/ui/DateField'
import { DayChoice } from '../../../shared/ui/DayChoice'
import { FormError, FormField, MoreFields, SwitchField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import type { ProjectDto } from '../../projects/types/project.types'
import { type TaskFields, taskCreateFieldsSchema, taskFieldsSchema } from '../types/task.schema'
import { useNewTaskSequencePreview } from '../hooks/task-hooks'
import { type CreateTaskRequest, newTaskId, type TaskDto, type UpdateTaskRequest } from '../types/task.types'
import { ParentChoice } from './ParentChoice'
import { TaskParentSelect } from './TaskParentSelect'
import { TaskSequenceSelect } from './TaskSequenceSelect'
import { followCandidates, SequenceSteps } from './TaskSequenceSheet'

/**
 * Create/edit form for a Task, rendered as the body of a Sheet. On create a
 * Task may be set to follow another («بعد از…»): the server previews the order
 * it will make, and the Task is created already in that order, in one request,
 * or not at all. An existing Task's place in a sequence is changed from its
 * page, not here. On create, the day and the owner are one-press choices and
 * the day starts at today, so a title alone is a Task for today; a title with
 * no date and no owner is not yet a Task: it is handed to `onCapture` and
 * saved as a quick capture.
 */
export function TaskForm({ task, today, parentScope, goals, projects, tasks = [], pending, error, onSubmit, onCapture, onCancel }: {
  task?: TaskDto
  /** Today's ISO local date: a new Task is for today unless another day (or none) is chosen. */
  today?: string
  /** The owner a new Task starts under, when it is made from that owner's page. */
  parentScope?: string
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
      parentScope: task?.goalId ? `goal:${task.goalId}` : task?.projectId ? `project:${task.projectId}` : parentScope ?? 'none',
      plannedDate: task ? task.plannedDate ?? '' : today ?? '',
      deadline: task?.deadline ?? '',
      sequenceChoice: 'none',
      isProtected: task?.isProtected ?? false,
    },
  })
  const { errors } = form.formState
  const capturing = Boolean(onCapture) && !task && form.watch('parentScope') === 'none' && !form.watch('plannedDate')
  // «بعد از…» counts only while the chosen Task belongs to the chosen owner: changing the owner leaves it unchosen.
  const [scope, parentId] = form.watch('parentScope').split(':')
  const goalId = scope === 'goal' ? parentId : null
  const projectId = scope === 'project' ? parentId : null
  const choice = form.watch('sequenceChoice')
  const chosen = !task && choice.startsWith('after:') ? choice.slice(6) : undefined
  const predecessorId = chosen && followCandidates({ id: '', goalId, projectId }, tasks).some(item => item.id === chosen)
    ? chosen
    : undefined
  const followPreview = useNewTaskSequencePreview()
  const { mutate: askFollow, reset: clearFollow } = followPreview
  useEffect(() => {
    if (predecessorId) askFollow({ predecessorId, goalId, projectId, title: null })
    else clearFollow()
  }, [predecessorId, goalId, projectId, askFollow, clearFollow])
  // Refused because the order changed since it was shown: show what is true now.
  const refusedCode = error ? toApiError(error).code : undefined
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a stale refusal asks again; a changed choice is the effect above.
  useEffect(() => {
    if (predecessorId && (refusedCode === 'CONFLICT_STALE_VERSION' || refusedCode === 'SEQUENCE_PREVIEW_STALE'))
      askFollow({ predecessorId, goalId, projectId, title: null })
  }, [error])
  const shown = predecessorId && followPreview.data?.steps.some(step => step.taskId === predecessorId)
    ? followPreview.data
    : undefined
  const waitingForPreview = Boolean(predecessorId) && (!shown || followPreview.isPending)
  const submit = form.handleSubmit(values => {
    const [scope, parentId] = values.parentScope.split(':')
    if (onCapture && !task && scope === 'none' && !values.plannedDate) {
      onCapture(values.title)
      return
    }
    if (waitingForPreview) return
    const sequence = task
      ? { sequenceId: task.sequenceId, sequenceOrder: task.sequenceOrder }
      : { sequenceId: null, sequenceOrder: null }
    // Exactly the order that was shown; refused, and nothing made, if any Task in it changed since.
    const follow = predecessorId && shown ? { predecessorId, expectedMembers: shown.expectedMembers } : null
    onSubmit({
      title: values.title,
      description: emptyToNull(values.description),
      goalId: scope === 'goal' ? parentId : null,
      projectId: scope === 'project' ? parentId : null,
      plannedDate: emptyToNull(values.plannedDate),
      deadline: emptyToNull(values.deadline),
      ...sequence,
      isProtected: values.isProtected,
      ...(task ? { expectedVersion: task.version } : follow ? { follow } : {}),
    })
  })

  return (
    <form className="form-stack" onSubmit={submit} noValidate aria-busy={pending}>
      <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
      {task || !today ? (
        <FormField label="عنوان کار" name="title" required autoFocus prominent maxLength={200} placeholder="چه کاری باید انجام شود؟" registration={form.register('title')} error={errors.title?.message} />
      ) : (
        <FormField label="چه کاری باید انجام شود؟" name="title" required autoFocus prominent maxLength={200} placeholder="مثلاً: ارسال فاکتور مهر" registration={form.register('title')} error={errors.title?.message} />
      )}
      <Controller
        control={form.control}
        name="plannedDate"
        render={({ field }) => task || !today
          ? <DateField label="تاریخ برنامه‌ریزی" value={field.value} onChange={field.onChange} error={errors.plannedDate?.message} />
          : <DayChoice label="کی؟" value={field.value} today={today} onChange={field.onChange} error={errors.plannedDate?.message} />}
      />
      <Controller
        control={form.control}
        name="parentScope"
        render={({ field }) => task ? (
          <TaskParentSelect
            goals={goals}
            projects={projects}
            currentGoalId={task.goalId}
            currentProjectId={task.projectId}
            value={field.value}
            onChange={field.onChange}
          />
        ) : <ParentChoice goals={goals} projects={projects} value={field.value} onChange={field.onChange} />}
      />
      <MoreFields
        summary={task ? 'توضیحات، مهلت و محافظت' : 'همه اختیاری‌اند؛ بیشتر کارها به این‌ها نیاز ندارند'}
        defaultOpen={Boolean(task && (task.description || task.deadline || task.isProtected))}
        forceOpen={Boolean(errors.description || errors.deadline)}
      >
        <FormField label="توضیحات (اختیاری)" name="description" multiline maxLength={2000} registration={form.register('description')} error={errors.description?.message} />
        <Controller
          control={form.control}
          name="deadline"
          render={({ field }) => <DateField label="مهلت (اختیاری)" value={field.value} onChange={field.onChange} error={errors.deadline?.message} />}
        />
        {!task && (
          <Controller
            control={form.control}
            name="sequenceChoice"
            render={({ field }) => <TaskSequenceSelect tasks={tasks} parentScope={form.watch('parentScope')} value={field.value} onChange={field.onChange} />}
          />
        )}
        {predecessorId && followPreview.isPending && <p className="text-xs text-text-secondary" role="status">در حال پیش‌نمایش…</p>}
        {shown && !followPreview.isPending && (
          <SequenceSteps steps={shown.steps} currentId={newTaskId} heading="ترتیب بعد از ساخت" currentTitle={form.watch('title')} />
        )}
        {predecessorId && <FormError error={followPreview.error} />}
        <SwitchField
          label="این کار محافظت شود"
          description="در بازبینی، کنار گذاشتن کار محافظت‌شده پیشنهاد نمی‌شود."
          registration={form.register('isProtected')}
        />
      </MoreFields>
      {task?.sequenceId && task.sequenceOrder != null && (
        <p className="notice">جایگاه این کار در دنباله حفظ می‌شود (ترتیب {formatNumber(Number(task.sequenceOrder))}).</p>
      )}
      {capturing && (
        <p className="notice" role="status">
          بدون تاریخ و بدون هدف یا پروژه، این مورد هنوز یک کار نیست. فقط عنوانش به‌صورت یادداشت سریع ذخیره می‌شود و بعداً در «بازبینی» تعیین تکلیف می‌شود.
        </p>
      )}
      <FormError error={error} previewed={Boolean(predecessorId)} />
      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
        <button className="primary-button" type="submit" disabled={pending || waitingForPreview}>
          {pending ? 'در حال ذخیره…' : task ? 'ذخیره تغییرات' : capturing ? 'ذخیره یادداشت' : submitLabel(form.watch('plannedDate'), today)}
        </button>
      </div>
    </form>
  )
}

/** The create button says where the Task lands when that is today or tomorrow. */
function submitLabel(plannedDate: string, today?: string) {
  if (today && plannedDate === today) return 'افزودن به امروز'
  if (today && plannedDate && plannedDate === toIsoDate(addDays(parseIsoDate(today), 1))) return 'افزودن به فردا'
  return 'ساخت کار'
}

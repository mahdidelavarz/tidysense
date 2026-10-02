import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { DateField } from '../../../shared/ui/DateField'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import { type ProjectFields, projectFieldsSchema } from '../types/project.schema'
import type { CreateProjectRequest, ProjectDto, UpdateProjectRequest } from '../types/project.types'

/** Create/edit form for a Project, rendered as the body of a Sheet. Passing `project` switches it to edit mode. */
export function ProjectForm({ project, goals, pending, error, onSubmit, onCancel }: {
  project?: ProjectDto
  goals: GoalDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateProjectRequest | UpdateProjectRequest) => void
  onCancel: () => void
}) {
  const form = useForm<ProjectFields>({
    resolver: zodResolver(projectFieldsSchema),
    defaultValues: {
      title: project?.title ?? '',
      completionMeaning: project?.completionMeaning ?? '',
      goalId: project?.goalId ?? '',
      targetDate: project?.targetDate ?? '',
      reviewDate: project?.reviewDate ?? '',
    },
  })
  const { errors } = form.formState
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    completionMeaning: emptyToNull(values.completionMeaning),
    goalId: emptyToNull(values.goalId),
    targetDate: emptyToNull(values.targetDate),
    reviewDate: emptyToNull(values.reviewDate),
    ...(project ? { expectedVersion: project.version } : {}),
  }))
  // Only active Goals can take a Project, plus the one this Project already belongs to.
  const selectableGoals = goals.filter(goal => goal.status === 'ACTIVE' || goal.id === project?.goalId)

  return (
    <form className="form-stack" onSubmit={submit} noValidate aria-busy={pending}>
      <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
      <FormField label="عنوان پروژه" name="title" required maxLength={200} registration={form.register('title')} error={errors.title?.message} />
      <FormField
        label="معنای تکمیل (اختیاری)"
        name="completionMeaning"
        multiline
        maxLength={2000}
        registration={form.register('completionMeaning')}
        hint="چه زمانی این تلاش را تمام‌شده می‌دانید؟"
      />
      <label className="field-label">
        هدف بالادست (اختیاری)
        <select className="field-input" {...form.register('goalId')}>
          <option value="">بدون هدف</option>
          {selectableGoals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
        </select>
      </label>
      <div className="form-grid">
        <Controller
          control={form.control}
          name="targetDate"
          render={({ field }) => <DateField label="تاریخ هدف (اختیاری)" value={field.value} onChange={field.onChange} error={errors.targetDate?.message} />}
        />
        <Controller
          control={form.control}
          name="reviewDate"
          render={({ field }) => <DateField label="تاریخ بازبینی (اختیاری)" value={field.value} onChange={field.onChange} error={errors.reviewDate?.message} />}
        />
      </div>
      <FormError error={error} />
      <div className="sheet-actions">
        <button className="secondary-button" type="button" disabled={pending} onClick={onCancel}>انصراف</button>
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره…' : project ? 'ذخیره تغییرات' : 'ساخت پروژه'}
        </button>
      </div>
    </form>
  )
}

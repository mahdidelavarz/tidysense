import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import { type ProjectFields, projectFieldsSchema } from '../types/project.schema'
import type { ProjectDto, UpdateProjectRequest } from '../types/project.types'

/** Edit form for an existing active Project, preloaded from its current fields. */
export function ProjectEditForm({ project, goals, pending, error, onSubmit }: {
  project: ProjectDto
  goals: GoalDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: UpdateProjectRequest) => void
}) {
  const form = useForm<ProjectFields>({
    resolver: zodResolver(projectFieldsSchema),
    defaultValues: {
      title: project.title,
      completionMeaning: project.completionMeaning ?? '',
      goalId: project.goalId ?? '',
      targetDate: project.targetDate ?? '',
      reviewDate: project.reviewDate,
    },
  })
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    completionMeaning: emptyToNull(values.completionMeaning),
    goalId: emptyToNull(values.goalId),
    targetDate: emptyToNull(values.targetDate),
    reviewDate: emptyToNull(values.reviewDate),
    expectedVersion: project.version,
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-project" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="project" />
        <h2 className="mt-2 text-xl font-bold">ویرایش پروژه</h2>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان پروژه" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField label="معنای تکمیل" name="completionMeaning" multiline maxLength={2000} registration={form.register('completionMeaning')} />
      <label className="field-label">
        هدف بالادست
        <select className="field-input" {...form.register('goalId')} disabled={goals.length === 0 && !project.goalId}>
          <option value="">بدون هدف</option>
          {goals.filter(goal => goal.status === 'ACTIVE' || goal.id === project.goalId).map(goal => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <FormField label="تاریخ هدف" name="targetDate" type="date" registration={form.register('targetDate')} error={form.formState.errors.targetDate?.message} />
        <FormField label="تاریخ بازبینی" name="reviewDate" type="date" registration={form.register('reviewDate')} error={form.formState.errors.reviewDate?.message} />
      </div>
      <FormError error={error} />
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending}>{pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button>
      </div>
    </form>
  )
}

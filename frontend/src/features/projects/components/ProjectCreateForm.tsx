import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import type { GoalDto } from '../../goals/types/goal.types'
import { type ProjectFields, projectFieldsSchema } from '../types/project.schema'
import type { CreateProjectRequest } from '../types/project.types'

/** Create-Project form. A Project may optionally attach to one active Goal. */
export function ProjectCreateForm({ goals, pending, error, onSubmit }: {
  goals: GoalDto[]
  pending: boolean
  error: unknown
  onSubmit: (request: CreateProjectRequest) => void
}) {
  const form = useForm<ProjectFields>({
    resolver: zodResolver(projectFieldsSchema),
    defaultValues: { title: '', completionMeaning: '', goalId: '', targetDate: '', reviewDate: '' },
  })
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    completionMeaning: emptyToNull(values.completionMeaning),
    goalId: emptyToNull(values.goalId),
    targetDate: emptyToNull(values.targetDate),
    reviewDate: emptyToNull(values.reviewDate),
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-project" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="project" />
        <h3 className="mt-2 text-xl font-bold">ساخت پروژه</h3>
        <p className="mt-1 text-sm text-text-secondary">پروژه یک تلاش محدود و قابل‌مدیریت است و می‌تواند مستقل باشد.</p>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان پروژه" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField
        label="معنای تکمیل (اختیاری)"
        name="completionMeaning"
        multiline
        maxLength={2000}
        registration={form.register('completionMeaning')}
        hint="توضیح دهید چه زمانی این تلاش را تمام‌شده می‌دانید."
      />
      <label className="field-label">
        هدف بالادست (اختیاری)
        <select className="field-input" {...form.register('goalId')}>
          <option value="">بدون هدف</option>
          {goals.filter(goal => goal.status === 'ACTIVE').map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
        </select>
      </label>
      <div className="form-grid">
        <FormField label="تاریخ هدف (اختیاری)" name="targetDate" type="date" registration={form.register('targetDate')} error={form.formState.errors.targetDate?.message} />
        <FormField label="تاریخ بازبینی (اختیاری)" name="reviewDate" type="date" registration={form.register('reviewDate')} error={form.formState.errors.reviewDate?.message} />
      </div>
      <FormError error={error} />
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending}>{pending ? 'در حال ساخت…' : 'ساخت پروژه'}</button>
      </div>
    </form>
  )
}

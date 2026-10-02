import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import { type GoalFields, goalFieldsSchema } from '../types/goal.schema'
import type { GoalDto, UpdateGoalRequest } from '../types/goal.types'

/** Edit form for an existing active Goal, preloaded from its current fields. */
export function GoalEditForm({ goal, pending, error, onSubmit }: {
  goal: GoalDto
  pending: boolean
  error: unknown
  onSubmit: (request: UpdateGoalRequest) => void
}) {
  const form = useForm<GoalFields>({
    resolver: zodResolver(goalFieldsSchema),
    defaultValues: {
      title: goal.title,
      desiredOutcome: goal.desiredOutcome,
      targetDate: goal.targetDate ?? '',
      reviewDate: goal.reviewDate,
    },
  })
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    desiredOutcome: values.desiredOutcome,
    targetDate: emptyToNull(values.targetDate),
    reviewDate: emptyToNull(values.reviewDate),
    expectedVersion: goal.version,
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-goal" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="goal" />
        <h2 className="mt-2 text-xl font-bold">ویرایش هدف</h2>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان هدف" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField label="نتیجه مطلوب" name="desiredOutcome" required multiline maxLength={2000} registration={form.register('desiredOutcome')} error={form.formState.errors.desiredOutcome?.message} />
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

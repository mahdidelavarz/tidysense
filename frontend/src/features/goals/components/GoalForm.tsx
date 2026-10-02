import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { DateField } from '../../../shared/ui/DateField'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import { type GoalFields, goalFieldsSchema } from '../types/goal.schema'
import type { CreateGoalRequest, GoalDto, UpdateGoalRequest } from '../types/goal.types'

/** Create/edit form for a Goal, rendered as the body of a Sheet. Passing `goal` switches it to edit mode. */
export function GoalForm({ goal, pending, error, onSubmit, onCancel }: {
  goal?: GoalDto
  pending: boolean
  error: unknown
  onSubmit: (request: CreateGoalRequest | UpdateGoalRequest) => void
  onCancel: () => void
}) {
  const form = useForm<GoalFields>({
    resolver: zodResolver(goalFieldsSchema),
    defaultValues: {
      title: goal?.title ?? '',
      desiredOutcome: goal?.desiredOutcome ?? '',
      targetDate: goal?.targetDate ?? '',
      reviewDate: goal?.reviewDate ?? '',
    },
  })
  const { errors } = form.formState
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    desiredOutcome: values.desiredOutcome,
    targetDate: emptyToNull(values.targetDate),
    reviewDate: emptyToNull(values.reviewDate),
    ...(goal ? { expectedVersion: goal.version } : {}),
  }))

  return (
    <form className="form-stack" onSubmit={submit} noValidate aria-busy={pending}>
      <ValidationSummary messages={Object.values(errors).map(value => value?.message)} />
      <FormField label="عنوان هدف" name="title" required maxLength={200} registration={form.register('title')} error={errors.title?.message} />
      <FormField
        label="نتیجه مطلوب"
        name="desiredOutcome"
        required
        multiline
        maxLength={2000}
        registration={form.register('desiredOutcome')}
        error={errors.desiredOutcome?.message}
        hint="روشن بنویسید رسیدن به این هدف برای شما چه معنایی دارد."
      />
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
          {pending ? 'در حال ذخیره…' : goal ? 'ذخیره تغییرات' : 'ساخت هدف'}
        </button>
      </div>
    </form>
  )
}

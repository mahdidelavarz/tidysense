import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { emptyToNull } from '../../../shared/lib/forms'
import { EntityLabel } from '../../../shared/ui/EntityUi'
import { FormError, FormField, ValidationSummary } from '../../../shared/ui/FormUi'
import { type GoalFields, goalFieldsSchema } from '../types/goal.schema'
import type { CreateGoalRequest } from '../types/goal.types'

/** Create-Goal form. Only the Goal feature owns this entity's create flow. */
export function GoalCreateForm({ pending, error, onSubmit }: {
  pending: boolean
  error: unknown
  onSubmit: (request: CreateGoalRequest) => void
}) {
  const form = useForm<GoalFields>({
    resolver: zodResolver(goalFieldsSchema),
    defaultValues: { title: '', desiredOutcome: '', targetDate: '', reviewDate: '' },
  })
  const submit = form.handleSubmit(values => onSubmit({
    title: values.title,
    desiredOutcome: values.desiredOutcome,
    targetDate: emptyToNull(values.targetDate),
    reviewDate: emptyToNull(values.reviewDate),
  }))
  const errors = Object.values(form.formState.errors).map(value => value?.message)

  return (
    <form className="form-card entity-surface entity-goal" onSubmit={submit} noValidate aria-busy={pending}>
      <div>
        <EntityLabel entity="goal" />
        <h3 className="mt-2 text-xl font-bold">ساخت هدف</h3>
        <p className="mt-1 text-sm text-text-secondary">هدف یک نتیجه یا جهت مهم است؛ تحقق آن را خودتان تأیید می‌کنید.</p>
      </div>
      <ValidationSummary messages={errors} />
      <FormField label="عنوان هدف" name="title" required maxLength={200} registration={form.register('title')} error={form.formState.errors.title?.message} />
      <FormField
        label="نتیجه مطلوب"
        name="desiredOutcome"
        required
        multiline
        maxLength={2000}
        registration={form.register('desiredOutcome')}
        error={form.formState.errors.desiredOutcome?.message}
        hint="به‌صورت روشن بنویسید رسیدن به این هدف برای شما چه معنایی دارد."
      />
      <div className="form-grid">
        <FormField label="تاریخ هدف (اختیاری)" name="targetDate" type="date" registration={form.register('targetDate')} error={form.formState.errors.targetDate?.message} />
        <FormField label="تاریخ بازبینی (اختیاری)" name="reviewDate" type="date" registration={form.register('reviewDate')} error={form.formState.errors.reviewDate?.message} />
      </div>
      <FormError error={error} />
      <div className="flex justify-end">
        <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending}>{pending ? 'در حال ساخت…' : 'ساخت هدف'}</button>
      </div>
    </form>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormField } from '../../../shared/ui/FormUi'
import { type IntentionFields, intentionSchema } from '../types/planning.schema'
import { PlanningStartError } from './PlanningStartError'

/**
 * The single open input a planning flow starts from. There is no mandatory
 * Goal form: the user writes what they want to make progress on, and the
 * manual path stays one click away.
 */
export function PlanningIntentForm({ initialIntention, scopeTitle, pending, error, onSubmit, onManual }: {
  initialIntention: string
  /** The Goal or Project this planning is for, when it was opened from one. */
  scopeTitle?: string
  pending: boolean
  error: unknown
  onSubmit: (intention: string) => void
  onManual: () => void
}) {
  const form = useForm<IntentionFields>({
    resolver: zodResolver(intentionSchema),
    defaultValues: { intention: initialIntention },
  })

  return (
    <form className="card form-stack" onSubmit={form.handleSubmit(values => onSubmit(values.intention))} noValidate aria-busy={pending}>
      {scopeTitle && <p className="notice">این برنامه‌ریزی برای «{scopeTitle}» است و موارد تازه زیر همان ساخته می‌شوند.</p>}
      <FormField
        label="می‌خواهید روی چه چیزی پیش بروید؟"
        name="intention"
        required
        multiline
        maxLength={2000}
        hint="یک هدف، یک پروژه، چند کار یا فقط یک جمله آزاد. تا خودتان پیش‌نویس را مرور و تأیید نکنید چیزی ساخته نمی‌شود."
        registration={form.register('intention')}
        error={form.formState.errors.intention?.message}
      />
      <PlanningStartError error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? 'در حال ارسال…' : 'ساخت پیش‌نویس'}
        </button>
        <button className="ghost-button" type="button" disabled={pending} onClick={onManual}>خودم دستی می‌سازم</button>
      </div>
    </form>
  )
}
